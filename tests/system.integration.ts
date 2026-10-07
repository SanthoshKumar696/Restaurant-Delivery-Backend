import assert from "node:assert/strict";
import { createServer } from "node:http";
import jwt from "jsonwebtoken";
import { io } from "socket.io-client";
import app from "../src/app";
import { prisma } from "../src/database/prisma";
import { awardLoyaltyForCompletedOrder } from "../src/modules/loyalty/loyalty.service";
import { initializeDeliverySocket } from "../src/realtime/delivery-socket";
import { createSystemFixtures } from "./system-fixtures";

const fixture = "E2E_V1_20260909";
const adminPassword = "E2E-V1-Admin-2026!";

type Json = Record<string, any>;

const tokenForCustomer = (customerId: number, tenantId: string, phone: string) =>
  jwt.sign({ customerId, tenantId, mobileNumber: phone, role: "CUSTOMER" }, process.env.JWT_SECRET!);

const request = async (
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; body: Json }> => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body: Json = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: response.status, body };
};

const apiJson = (token: string | undefined, body?: unknown, method?: string): RequestInit => ({
  method: method ?? (body === undefined ? "GET" : "POST"),
  headers: {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(body !== undefined ? { "content-type": "application/json" } : {}),
  },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});

const expectStatus = (result: { status: number; body: Json }, status: number, label: string) => {
  assert.equal(result.status, status, `${label}: ${JSON.stringify(result.body)}`);
};

const loginAdmin = async (baseUrl: string, username: string) => {
  const result = await request(baseUrl, "/api/auth/admin/login", apiJson(undefined, {
    username,
    password: adminPassword,
  }));
  expectStatus(result, 200, `admin login ${username}`);
  assert.equal(result.body.data.admin.tenantId, username.includes("t001") ? "T001" : "T002");
  return result.body.data.token as string;
};

const ensureOrder = async (
  baseUrl: string,
  token: string,
  customerId: number,
  tenantId: string,
  branchId: string,
  productId: number,
  marker: string,
  variantId?: number
) => {
  const existing = await prisma.order.findFirst({
    where: { tenantId, customerId, branchId, notes: marker },
  });
  if (existing) return existing;

  const result = await request(baseUrl, "/api/orders", apiJson(token, {
    tenantId: "MALICIOUS_TENANT",
    customerId: 999999,
    branchId,
    fulfillmentType: "PICKUP",
    notes: marker,
    subtotal: 1,
    totalAmount: 1,
    discountAmount: 999,
    items: [{ productId, variantId, quantity: 1, unitPrice: 1 }],
  }));
  expectStatus(result, 201, `create ${marker}`);
  assert.equal(result.body.data.tenantId, tenantId);
  assert.equal(result.body.data.customerId, customerId);
  assert.equal(result.body.data.branchId, branchId);
  return result.body.data;
};

const ensurePayment = async (baseUrl: string, token: string, orderId: number) => {
  const existing = await prisma.payment.findUnique({ where: { orderId } });
  if (existing) return existing;
  const result = await request(baseUrl, "/api/payments", apiJson(token, {
    orderId,
    paymentMethod: "CASH_ON_DELIVERY",
  }));
  expectStatus(result, 201, `payment for order ${orderId}`);
  assert.equal(result.body.data.paymentStatus, "PENDING");
  return result.body.data;
};

const completeOrder = async (baseUrl: string, adminToken: string, orderId: number, tenantId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error(`Order ${orderId} not found`);
  const transitions = order.fulfillmentType === "PICKUP"
    ? ["CONFIRMED", "PREPARING", "READY", "COMPLETED"] as const
    : ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"] as const;
  let current = order.status;
  for (const status of transitions) {
    if (current === status) continue;
    const allowedAfter: Record<string, string> = {
      PENDING: "CONFIRMED",
      CONFIRMED: "PREPARING",
      PREPARING: "READY",
      READY: order.fulfillmentType === "PICKUP" ? "COMPLETED" : "OUT_FOR_DELIVERY",
      OUT_FOR_DELIVERY: "COMPLETED",
    };
    if (allowedAfter[current] !== status) continue;
    const result = await request(baseUrl, `/api/admin/orders/${orderId}/status`, apiJson(adminToken, {
      tenantId,
      status,
      note: `${fixture} ${status}`,
    }, "PATCH"));
    expectStatus(result, 200, `order ${orderId} status ${status}`);
    current = status;
  }
  assert.equal(current, "COMPLETED");
};

const testCaptainDeliveryFlow = async (
  baseUrl: string,
  adminToken: string,
  otherAdminToken: string,
  customerToken: string,
  customerId: number,
  branchId: string,
  productId: number,
  variantId: number
) => {
  const phone = () => String(9000000000 + Math.floor(Math.random() * 90000000));
  const managerPhone = phone();
  const manager = await request(baseUrl, "/api/staff", apiJson(adminToken, {
    tenantId: "T001",
    fullName: "E2E Manager",
    phone: managerPhone,
    email: `${managerPhone}@e2e.invalid`,
    password: "Manager@123",
    role: "MANAGER",
    isActive: true,
  }));
  expectStatus(manager, 201, "create manager");
  assert.equal(manager.body.data.role, "MANAGER");
  assert.equal(manager.body.data.isActive, true);
  assert.equal("passwordHash" in manager.body.data, false);

  const captains = [] as Array<{ id: number; phone: string; token: string }>;
  for (const name of ["Captain 1", "Captain 2", "Captain 3"]) {
    const captainPhone = phone();
    const created = await request(baseUrl, "/api/captains", apiJson(adminToken, {
      fullName: name,
      phone: captainPhone,
      email: `${captainPhone}@e2e.invalid`,
      password: "Captain@123",
      isActive: true,
      branchIds: [branchId],
    }));
    expectStatus(created, 201, `create ${name}`);
    assert.equal(created.body.data.role, "CAPTAIN");
    assert.equal(created.body.data.isActive, true);
    assert.equal("passwordHash" in created.body.data, false);
    captains.push({ id: created.body.data.id, phone: captainPhone, token: "" });
  }

  const crossTenantPhone = phone();
  const crossTenantCaptain = await request(baseUrl, "/api/captains", apiJson(otherAdminToken, {
    fullName: "Cross Tenant Captain",
    phone: crossTenantPhone,
    email: `${crossTenantPhone}@e2e.invalid`,
    password: "Captain@123",
  }));
  expectStatus(crossTenantCaptain, 201, "create other-tenant Captain");
  await prisma.captain.updateMany({ where: { tenantId: "T001" }, data: { currentStatus: "OFFLINE" } });

  const staffList = await request(baseUrl, "/api/staff", apiJson(adminToken));
  expectStatus(staffList, 200, "tenant-scoped staff list");
  assert.ok(staffList.body.data.some((staff: any) => staff.id === manager.body.data.id));
  assert.ok(staffList.body.data.every((staff: any) => staff.tenantId === "T001"));
  assert.ok(staffList.body.data.every((staff: any) => !("passwordHash" in staff)));

  const captainList = await request(baseUrl, "/api/captains", apiJson(adminToken));
  expectStatus(captainList, 200, "captain list");
  for (const captain of captains) assert.ok(captainList.body.items.some((item: any) => item.id === captain.id));
  assert.ok(captainList.body.items.every((item: any) => item.role === "CAPTAIN"));
  expectStatus(await request(baseUrl, `/api/captains/${captains[0].id}`, apiJson(adminToken)), 200, "captain detail");
  expectStatus(await request(baseUrl, `/api/staff/${manager.body.data.id}`, apiJson(adminToken)), 200, "staff detail");
  const foreignCaptain = await request(baseUrl, `/api/captains/${crossTenantCaptain.body.data.id}`, apiJson(adminToken));
  expectStatus(foreignCaptain, 404, "cross-tenant captain detail");

  const inactive = await request(baseUrl, `/api/captains/${captains[2].id}`, apiJson(adminToken, { isActive: false }, "PUT"));
  expectStatus(inactive, 200, "deactivate Captain 3");
  assert.equal(inactive.body.data.isActive, false);
  const available = await request(baseUrl, "/api/captains/available", apiJson(adminToken));
  expectStatus(available, 200, "available captains");
  assert.ok(!available.body.items.some((item: any) => item.id === captains[2].id));
  const inactiveLogin = await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
    tenantId: "T001",
    phone: captains[2].phone,
    password: "Captain@123",
  }));
  expectStatus(inactiveLogin, 401, "inactive Captain login denied");

  for (const captain of captains.slice(0, 2)) {
    const login = await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
      tenantId: "T001",
      phone: captain.phone,
      password: "Captain@123",
    }));
    expectStatus(login, 200, "Captain login");
    assert.equal(login.body.data.staff.role, "CAPTAIN");
    assert.ok(jwt.decode(login.body.data.token)?.toString());
    const payload = jwt.decode(login.body.data.token) as { staffId: number; tenantId: string; role: string };
    assert.equal(payload.staffId, captain.id);
    assert.equal(payload.tenantId, "T001");
    assert.equal(payload.role, "CAPTAIN");
    captain.token = login.body.data.token;
    expectStatus(await request(baseUrl, "/api/staff", apiJson(captain.token)), 401, "Captain denied admin staff API");
  }

  const invalidDeliveryOrder = await request(baseUrl, "/api/orders", apiJson(customerToken, {
    tenantId: "T001",
    branchId,
    fulfillmentType: "DELIVERY",
    items: [{ productId, variantId, quantity: 1 }],
  }));
  expectStatus(invalidDeliveryOrder, 400, "delivery requires address and coordinates");

  const createdOrder = await request(baseUrl, "/api/orders", apiJson(customerToken, {
    tenantId: "T001",
    branchId,
    fulfillmentType: "DELIVERY",
    deliveryAddressLine: "E2E Delivery Address",
    deliveryLatitude: 13.0827,
    deliveryLongitude: 80.2707,
    deliveryPhone: "9000000001",
    notes: `${fixture} Captain delivery flow`,
    items: [{ productId, variantId, quantity: 1 }],
  }));
  expectStatus(createdOrder, 201, "create delivery order");
  const orderId = createdOrder.body.data.id as number;
  const delivery = await prisma.delivery.findUnique({ where: { orderId } });
  assert.ok(delivery, "delivery order must create one pending delivery");
  assert.equal(delivery.status, "PENDING");
  assert.equal(Number(createdOrder.body.data.deliveryLatitude), 13.0827);
  assert.equal(Number(createdOrder.body.data.deliveryLongitude), 80.2707);
  expectStatus(await request(baseUrl, `/api/delivery/${delivery.id}/assign`, apiJson(adminToken, { captainId: captains[0].id })), 409, "delivery cannot be assigned before order ready");

  const accepted = await request(baseUrl, `/api/admin/orders/${orderId}/accept`, apiJson(adminToken, { tenantId: "T001" }, "PATCH"));
  expectStatus(accepted, 200, "accept delivery order");
  for (const status of ["PREPARING", "READY"]) {
    const updated = await request(baseUrl, `/api/admin/orders/${orderId}/status`, apiJson(adminToken, { tenantId: "T001", status }, "PATCH"));
    expectStatus(updated, 200, `set delivery order ${status}`);
  }

  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}/assign`, apiJson(adminToken, { captainId: captains[2].id })), 404, "inactive Captain cannot be assigned");
  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}/assign`, apiJson(adminToken, { captainId: crossTenantCaptain.body.data.id })), 404, "cross-tenant Captain cannot be assigned");
  const captainSocket = io(baseUrl, { auth: { token: captains[0].token }, transports: ["websocket"] });
  try {
    await new Promise<void>((resolve, reject) => {
      captainSocket.once("connect", resolve);
      captainSocket.once("connect_error", reject);
    });
    const assignmentEvent = new Promise<any>((resolve) => captainSocket.once("delivery:assigned", resolve));
    const assignment = await request(baseUrl, `/api/delivery/${delivery!.id}/assign`, apiJson(adminToken, { captainId: captains[0].id }));
    expectStatus(assignment, 200, "assign delivery after ready");
    assert.equal(assignment.body.data.status, "ASSIGNED");
    assert.equal(assignment.body.data.captain.id, captains[0].id);
    assert.deepEqual(await assignmentEvent, { deliveryId: delivery!.id, orderId });
  } finally {
    captainSocket.disconnect();
  }
  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}/assign`, apiJson(adminToken, { captainId: captains[1].id })), 409, "duplicate assignment denied");
  expectStatus(await request(baseUrl, `/api/captains/${captains[0].id}`, apiJson(adminToken, { isActive: false }, "PUT")), 409, "assigned Captain cannot be deactivated");
  expectStatus(await request(baseUrl, `/api/staff/${captains[0].id}`, apiJson(adminToken, { role: "STAFF" }, "PUT")), 409, "assigned Captain role cannot be changed");
  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}`, apiJson(captains[1].token)), 403, "other Captain denied delivery detail");
  const myDeliveries = await request(baseUrl, "/api/delivery/my-deliveries", apiJson(captains[0].token));
  expectStatus(myDeliveries, 200, "Captain delivery list");
  assert.ok(myDeliveries.body.items.some((item: any) => item.id === delivery!.id));

  for (const action of ["accept", "picked-up", "out-for-delivery"] as const) {
    const result = await request(baseUrl, `/api/delivery/${delivery!.id}/${action}`, apiJson(captains[0].token, {}, "POST"));
    expectStatus(result, 200, `Captain ${action}`);
  }
  const location = await request(baseUrl, `/api/delivery/${delivery!.id}/location`, apiJson(captains[0].token, { latitude: 13.08, longitude: 80.26 }));
  expectStatus(location, 200, "Captain GPS update");
  assert.equal(location.body.data.deliveryId, delivery!.id);
  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}/location`, apiJson(captains[1].token, { latitude: 13.08, longitude: 80.26 })), 403, "other Captain GPS denied");
  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}/location`, apiJson(captains[0].token, { latitude: 100, longitude: 0 })), 400, "invalid GPS rejected");

  const customerTracking = await request(baseUrl, `/api/orders/customer/${customerId}/${orderId}/delivery`, apiJson(customerToken));
  expectStatus(customerTracking, 200, "customer tracking");
  assert.equal(customerTracking.body.data.deliveryId, delivery!.id);
  assert.equal(customerTracking.body.data.currentLocation.latitude.toString(), "13.08");
  const otherCustomerTracking = await request(baseUrl, `/api/orders/customer/${customerId + 999}/${orderId}/delivery`, apiJson(customerToken));
  expectStatus(otherCustomerTracking, 404, "customer ID mismatch tracking denied");
  const adminTracking = await request(baseUrl, `/api/delivery/admin/${delivery!.id}`, apiJson(adminToken));
  expectStatus(adminTracking, 200, "admin tracking");
  assert.equal(Number(adminTracking.body.data.currentLocation.longitude), 80.26);

  const customerSocket = io(baseUrl, { auth: { token: customerToken }, transports: ["websocket"] });
  const adminSocket = io(baseUrl, { auth: { token: adminToken }, transports: ["websocket"] });
  try {
    await Promise.all([customerSocket, adminSocket].map((socket) => new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("connect_error", reject);
    })));
    assert.equal(await customerSocket.emitWithAck("delivery:subscribe", { orderId }), true);
    assert.equal(await customerSocket.emitWithAck("delivery:subscribe", { orderId: orderId + 100000 }), false);

    const nextCustomerLocation = new Promise<any>((resolve) => customerSocket.once("delivery:location_updated", resolve));
    const nextAdminLocation = new Promise<any>((resolve) => adminSocket.once("delivery:location_updated", resolve));
    const realtimeUpdate = await request(baseUrl, `/api/delivery/${delivery!.id}/location`, apiJson(captains[0].token, { latitude: 13.081, longitude: 80.269 }));
    expectStatus(realtimeUpdate, 200, "realtime Captain GPS update");
    const [customerEvent, adminEvent] = await Promise.all([nextCustomerLocation, nextAdminLocation]);
    for (const event of [customerEvent, adminEvent]) {
      assert.deepEqual(Object.keys(event).sort(), ["deliveryId", "latitude", "longitude", "timestamp"]);
      assert.equal(event.deliveryId, delivery!.id);
      assert.equal(event.latitude, 13.081);
      assert.equal(event.longitude, 80.269);
    }

    const customerStatus = new Promise<any>((resolve) => customerSocket.once("delivery:status_updated", resolve));
    const adminStatus = new Promise<any>((resolve) => adminSocket.once("delivery:status_updated", resolve));
    const arrived = await request(baseUrl, `/api/delivery/${delivery!.id}/arrived`, apiJson(captains[0].token, {}, "POST"));
    expectStatus(arrived, 200, "Captain arrived");
    const [customerStatusEvent, adminStatusEvent] = await Promise.all([customerStatus, adminStatus]);
    for (const event of [customerStatusEvent, adminStatusEvent]) {
      assert.deepEqual(Object.keys(event).sort(), ["deliveryId", "status", "timestamp"]);
      assert.equal(event.deliveryId, delivery!.id);
      assert.equal(event.status, "ARRIVED");
    }
  } finally {
    customerSocket.disconnect();
    adminSocket.disconnect();
  }

  const badOtp = await request(baseUrl, `/api/delivery/${delivery!.id}/complete`, apiJson(captains[0].token, { otp: "000000" }));
  expectStatus(badOtp, 400, "invalid delivery OTP rejected");

  const pickupOrder = await request(baseUrl, "/api/orders", apiJson(customerToken, {
    tenantId: "T001",
    branchId,
    fulfillmentType: "PICKUP",
    notes: `${fixture} Captain flow pickup no delivery`,
    items: [{ productId, variantId, quantity: 1 }],
  }));
  expectStatus(pickupOrder, 201, "create pickup order");
  assert.equal(await prisma.delivery.findUnique({ where: { orderId: pickupOrder.body.data.id } }), null);
  expectStatus(await request(baseUrl, `/api/orders/customer/${customerId}/${pickupOrder.body.data.id}/delivery`, apiJson(customerToken)), 404, "pickup has no tracking");
  expectStatus(await request(baseUrl, `/api/admin/orders/${pickupOrder.body.data.id}/accept`, apiJson(adminToken, { tenantId: "T001" }, "PATCH")), 200, "accept pickup order");
  for (const status of ["PREPARING", "READY", "COMPLETED"]) {
    expectStatus(
      await request(baseUrl, `/api/admin/orders/${pickupOrder.body.data.id}/status`, apiJson(adminToken, { tenantId: "T001", status }, "PATCH")),
      200,
      `complete pickup order ${status}`
    );
  }
  assert.equal((await prisma.order.findUnique({ where: { id: pickupOrder.body.data.id }, select: { status: true } }))?.status, "COMPLETED");

  return { orderId, deliveryId: delivery!.id, captainId: captains[0].id, captains };
};

const main = async () => {
  const fixtures = await createSystemFixtures();
  const server = createServer(app);
  initializeDeliverySocket(server);
  server.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;

  try {
    const t1Customer = fixtures.customers[0];
    const t2Customers = fixtures.customers.slice(1);
    const t1CustomerToken = tokenForCustomer(t1Customer.id, "T001", t1Customer.phone);
    const t2Tokens = t2Customers.map((customer) => tokenForCustomer(customer.id, "T002", customer.phone));
    const t1AdminToken = await loginAdmin(baseUrl, "e2e_v1_t001_admin");
    const t2AdminToken = await loginAdmin(baseUrl, "e2e_v1_t002_admin");

    const onboardingSlug = `public-${Date.now()}`;
    const tenantCreate = await request(baseUrl, "/api/tenants", apiJson(undefined, {
      name: "Public Onboarding Tenant",
      slug: onboardingSlug,
      logoUrl: "https://example.com/logo.png",
    }));
    expectStatus(tenantCreate, 201, "tenant create without JWT");
    const publicTenantId = tenantCreate.body.data.id as string;
    expectStatus(await request(baseUrl, "/api/tenants"), 200, "tenant list without JWT");
    expectStatus(await request(baseUrl, `/api/tenants/${publicTenantId}`), 200, "tenant detail without JWT");

    const publicBranch = await request(baseUrl, "/api/branches", apiJson(undefined, {
      tenantId: publicTenantId,
      name: "Public Onboarding Branch",
      addressLine: "123 Public Street",
      city: "Bengaluru",
      phone: "+919876543210",
      deliveryEnabled: true,
      pickupEnabled: true,
    }));
    expectStatus(publicBranch, 201, "branch create without JWT");

    const tenantUpdate = await request(baseUrl, `/api/tenants/${publicTenantId}`, apiJson(undefined, {
      name: "Updated Public Onboarding Tenant",
      slug: `${onboardingSlug}-updated`,
      logoUrl: "https://example.com/updated-logo.png",
    }, "PUT"));
    expectStatus(tenantUpdate, 200, "tenant update without JWT");

    const tenantDelete = await request(baseUrl, `/api/tenants/${publicTenantId}`, apiJson(undefined, {}, "DELETE"));
    expectStatus(tenantDelete, 200, "tenant delete without JWT");

    const publicMenu = ["categories?tenantId=T001", "products?tenantId=T001", "product-variants?tenantId=T001", "addon-groups?tenantId=T001", "addon-group-items?tenantId=T001", "product-addon-groups?tenantId=T001"];
    for (const path of publicMenu) expectStatus(await request(baseUrl, `/api/${path}`), 200, `public ${path}`);
    expectStatus(await request(baseUrl, "/api/categories"), 400, "missing public tenant");
    expectStatus(await request(baseUrl, "/api/orders", apiJson(undefined, {}, "POST")), 401, "order without customer JWT");

    for (const [index, branch] of fixtures.t2Branches.entries()) {
      const branchProducts = await request(baseUrl, `/api/products?tenantId=T002&branchId=${encodeURIComponent(branch.id)}`);
      expectStatus(branchProducts, 200, `public products ${branch.id}`);
      const fixtureProducts = branchProducts.body.data.filter((product: any) => String(product.name).startsWith(fixture));
      assert.equal(fixtureProducts.length, 3, `${branch.id} should expose only its three catalog products`);
      const chicken = fixtureProducts.find((product: any) => String(product.name).includes("Chicken Briyani"));
      assert.equal(Number(chicken.basePrice), [180, 200, 220][index]);
      const branchVariants = await request(baseUrl, `/api/product-variants?tenantId=T002&branchId=${encodeURIComponent(branch.id)}`);
      expectStatus(branchVariants, 200, `public variants ${branch.id}`);
      assert.ok(branchVariants.body.data.every((variant: any) => fixtureProducts.some((product: any) => product.id === variant.productId)));
    }

    const t1Chicken = fixtures.t1Products.find((product) => product.name.endsWith("Chicken Briyani"));
    if (!t1Chicken) throw new Error("T001 chicken fixture missing");
    const t1Full = await prisma.productVariant.findFirst({ where: { tenantId: "T001", productId: t1Chicken.id, name: "Full" } });
    if (!t1Full) throw new Error("T001 full variant missing");
    const captainDeliveryFlow = await testCaptainDeliveryFlow(
      baseUrl,
      t1AdminToken,
      t2AdminToken,
      t1CustomerToken,
      t1Customer.id,
      fixtures.t1Branch.id,
      t1Chicken.id,
      t1Full.id
    );
    const t1Order = await ensureOrder(baseUrl, t1CustomerToken, t1Customer.id, "T001", fixtures.t1Branch.id, t1Chicken.id, `${fixture} T001 order`, t1Full.id);
    assert.equal(Number(t1Order.subtotal ?? t1Order.totalAmount), 280);
    await ensurePayment(baseUrl, t1CustomerToken, t1Order.id);

    const t1Coupon = await prisma.coupon.findFirst({ where: { tenantId: "T001", code: `${fixture}10` } });
    if (!t1Coupon) {
      const result = await request(baseUrl, "/api/admin/coupons", apiJson(t1AdminToken, {
        code: `${fixture}10`, discountType: "PERCENTAGE", discountValue: 10,
        minimumOrderAmount: 100, maximumDiscountAmount: 100, usageLimit: 10,
        perCustomerLimit: 2, startDate: "2026-01-01T00:00:00.000Z", endDate: "2027-01-01T00:00:00.000Z",
      }));
      expectStatus(result, 201, "create T001 coupon");
    }
    const couponValidation = await request(baseUrl, "/api/coupons/validate", apiJson(t1CustomerToken, { code: `${fixture}10`, orderAmount: 500, discountAmount: 999 }));
    expectStatus(couponValidation, 200, "validate T001 coupon");
    assert.equal(couponValidation.body.data.discountAmount, 50);

    const t2Coupon = await prisma.coupon.findFirst({ where: { tenantId: "T002", code: `${fixture}10` } });
    if (!t2Coupon) {
      const result = await request(baseUrl, "/api/admin/coupons", apiJson(t2AdminToken, {
        code: `${fixture}10`, discountType: "PERCENTAGE", discountValue: 10,
        minimumOrderAmount: 100, maximumDiscountAmount: 100, usageLimit: 10,
        perCustomerLimit: 2, startDate: "2026-01-01T00:00:00.000Z", endDate: "2027-01-01T00:00:00.000Z",
      }));
      expectStatus(result, 201, "create T002 coupon with shared code");
    }
    const t2CouponValidation = await request(baseUrl, "/api/coupons/validate", apiJson(t2Tokens[0], { code: `${fixture}10`, orderAmount: 500 }));
    expectStatus(t2CouponValidation, 200, "validate T002 coupon");
    assert.equal(t2CouponValidation.body.data.discountAmount, 50);

    const t1Offer = await prisma.offer.findFirst({ where: { tenantId: "T001", title: `${fixture} Weekend Special` } });
    if (!t1Offer) {
      const result = await request(baseUrl, "/api/admin/offers", apiJson(t1AdminToken, {
        name: `${fixture} Weekend Special`, offerType: "PERCENTAGE", discountValue: 20,
        startDate: "2026-01-01T00:00:00.000Z", endDate: "2027-01-01T00:00:00.000Z", isActive: true,
      }));
      expectStatus(result, 201, "create T001 offer");
      const offerId = result.body.data.id;
      const assignment = await request(baseUrl, `/api/admin/offers/${offerId}/products`, apiJson(t1AdminToken, { productId: t1Chicken.id }));
      expectStatus(assignment, 201, "assign T001 offer product");
    }
    const publicOffers = await request(baseUrl, "/api/offers?tenantId=T001");
    expectStatus(publicOffers, 200, "public T001 offers");

    const t2OfferProduct = fixtures.t2Products[0];
    const t2Offer = await prisma.offer.findFirst({ where: { tenantId: "T002", title: `${fixture} T002 Weekend Special` } });
    if (!t2Offer) {
      const result = await request(baseUrl, "/api/admin/offers", apiJson(t2AdminToken, {
        name: `${fixture} T002 Weekend Special`, offerType: "PERCENTAGE", discountValue: 15,
        startDate: "2026-01-01T00:00:00.000Z", endDate: "2027-01-01T00:00:00.000Z", isActive: true,
      }));
      expectStatus(result, 201, "create T002 offer");
      expectStatus(await request(baseUrl, `/api/admin/offers/${result.body.data.id}/products`, apiJson(t2AdminToken, { productId: t2OfferProduct.id })), 201, "assign T002 offer product");
    }
    expectStatus(await request(baseUrl, "/api/offers?tenantId=T002"), 200, "public T002 offers");

    await completeOrder(baseUrl, t1AdminToken, t1Order.id, "T001");
    const duplicateAward = await awardLoyaltyForCompletedOrder("T001", t1Order.id);
    assert.equal(duplicateAward?.alreadyAwarded, true);
    const loyalty = await request(baseUrl, "/api/loyalty", apiJson(t1CustomerToken));
    expectStatus(loyalty, 200, "T001 loyalty summary");
    assert.ok(loyalty.body.data.pointsBalance > 0, "completed T001 order should earn points");
    const transactions = await request(baseUrl, "/api/loyalty/transactions", apiJson(t1CustomerToken));
    assert.ok(transactions.body.data.some((transaction: any) => transaction.orderId === t1Order.id && transaction.type === "EARN"));

    const existingReview = await prisma.review.findFirst({ where: { tenantId: "T001", orderId: t1Order.id, productId: t1Chicken.id, customerId: t1Customer.id } });
    const review = existingReview ?? (await request(baseUrl, "/api/reviews", apiJson(t1CustomerToken, { orderId: t1Order.id, productId: t1Chicken.id, rating: 5, comment: `${fixture} review` }))).body.data;
    if (!existingReview) assert.ok(review.id);
    const publicReviews = await request(baseUrl, `/api/reviews/products/${t1Chicken.id}?tenantId=T001`);
    assert.ok(publicReviews.body.data.reviews.some((item: any) => item.id === review.id));
    const hidden = await request(baseUrl, `/api/admin/reviews/${review.id}/status`, apiJson(t1AdminToken, { status: "REJECTED" }, "PATCH"));
    expectStatus(hidden, 200, "hide T001 review");
    const hiddenPublic = await request(baseUrl, `/api/reviews/products/${t1Chicken.id}?tenantId=T001`);
    assert.ok(!hiddenPublic.body.data.reviews.some((item: any) => item.id === review.id));
    expectStatus(await request(baseUrl, `/api/admin/reviews/${review.id}/status`, apiJson(t1AdminToken, { status: "APPROVED" }, "PATCH")), 200, "publish T001 review");

    const t2Orders = [];
    for (let index = 0; index < fixtures.t2Branches.length; index += 1) {
      const branch = fixtures.t2Branches[index];
      const customer = t2Customers[index];
      const token = t2Tokens[index];
      const branchProduct = fixtures.t2Products.find((product) => product.branchId === branch.id && product.name.includes("Chicken Briyani"));
      if (!branchProduct) throw new Error(`Missing product for ${branch.id}`);
      const order = await ensureOrder(baseUrl, token, customer.id, "T002", branch.id, branchProduct.id, `${fixture} T002 ${branch.id} order`);
      await ensurePayment(baseUrl, token, order.id);
      t2Orders.push(order);
    }
    assert.equal(new Set(t2Orders.map((order: any) => order.branchId)).size, 3);

    const t1AdminOrders = await request(baseUrl, "/api/admin/orders?tenantId=T001", apiJson(t1AdminToken));
    const t2AdminOrders = await request(baseUrl, "/api/admin/orders?tenantId=T002", apiJson(t2AdminToken));
    assert.ok(t1AdminOrders.body.data.every((order: any) => order.tenantId === undefined || order.tenantId === "T001"));
    assert.ok(t2AdminOrders.body.data.length >= 3);
    const t1Customers = await request(baseUrl, "/api/customers", apiJson(t1AdminToken));
    const t2CustomersList = await request(baseUrl, "/api/customers", apiJson(t2AdminToken));
    assert.ok(t1Customers.body.data.every((customer: any) => customer.tenantId === "T001"));
    assert.ok(t2CustomersList.body.data.every((customer: any) => customer.tenantId === "T002"));
    const t1Report = await request(baseUrl, "/api/reports/dashboard", apiJson(t1AdminToken));
    const t2Report = await request(baseUrl, "/api/reports/dashboard", apiJson(t2AdminToken));
    assert.equal(t1Report.body.data.totalBranches, 2);
    assert.equal(t2Report.body.data.totalBranches, 3);
    const t2BranchReport = await request(baseUrl, "/api/reports/branches?branchId=B001", apiJson(t2AdminToken));
    assert.ok(t2BranchReport.body.data.every((branch: any) => branch.branchId === "B001"));
    for (const token of t2Tokens) expectStatus(await request(baseUrl, "/api/loyalty", apiJson(token)), 200, "T002 loyalty summary");
    expectStatus(await request(baseUrl, "/api/admin/orders?tenantId=T002", apiJson(t1AdminToken)), 403, "cross-tenant admin orders");
    expectStatus(await request(baseUrl, "/api/customers/999999", apiJson(t1AdminToken)), 404, "cross-tenant/missing CRM ID");
    expectStatus(await request(baseUrl, `/api/payments/999999`, apiJson(t1CustomerToken)), 404, "safe payment ID lookup");
    expectStatus(await request(baseUrl, `/api/reviews/${review.id}`, apiJson(t2Tokens[0])), 403, "cross-customer review access");

    const integrity = await prisma.order.findMany({ where: { notes: { startsWith: fixture } }, select: { id: true, tenantId: true, branchId: true, customerId: true, status: true } });
    assert.ok(integrity.some((order) => order.tenantId === "T001" && order.branchId === fixtures.t1Branch.id));
    assert.equal(integrity.filter((order) => order.tenantId === "T002").length, 3);
    const branchPrices = await prisma.branchProduct.findMany({
      where: { tenantId: "T002", productId: { in: fixtures.t2Products.filter((product) => product.name.includes("Chicken Briyani")).map((product) => product.id) } },
      select: { branchId: true, priceOverride: true },
    });
    assert.equal(branchPrices.length, 3);
    console.log(JSON.stringify({ passed: true, t1OrderId: t1Order.id, captainDeliveryFlow, t2OrderIds: t2Orders.map((order: any) => order.id), t1ReviewId: review.id, t1Points: loyalty.body.data.pointsBalance, branchPrices: branchPrices.map(row => ({ branchId: row.branchId, price: Number(row.priceOverride) })) }));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
