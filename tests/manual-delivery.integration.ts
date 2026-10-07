import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { createServer } from "node:http";
import jwt from "jsonwebtoken";
import { io } from "socket.io-client";
import app from "../src/app";
import { prisma } from "../src/database/prisma";
import { smsService } from "../src/integrations/sms";
import { initializeDeliverySocket } from "../src/realtime/delivery-socket";

process.env.DELIVERY_TEST_OTP = "true";

type Json = Record<string, any>;

const request = async (baseUrl: string, path: string, options: RequestInit = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body: Json = {};
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
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

const main = async () => {
  const suffix = Date.now().toString().slice(-8);
  const tenantId = `MAN${suffix}`;
  const branchId = `MAN-B-${suffix}`;
  const customerPhone = `73${suffix}`;
  const adminUsername = `manual_admin_${suffix}`;
  await prisma.tenant.create({ data: { id: tenantId, name: "Manual Delivery Test", slug: `${tenantId.toLowerCase()}-manual` } });
  await prisma.branch.create({ data: { id: branchId, tenantId, name: "Manual Branch", addressLine: "Manual Test Address", city: "Test City" } });
  const category = await prisma.category.create({ data: { tenantId, name: "Manual Food", displayOrder: 0 } });
  const product = await prisma.product.create({ data: { tenantId, categoryId: category.id, name: "Manual Biryani", basePrice: 200, isVeg: false } });
  const variant = await prisma.productVariant.create({ data: { tenantId, productId: product.id, name: "Regular", price: 220 } });
  await prisma.branchProduct.create({ data: { tenantId, branchId, productId: product.id, priceOverride: 220, isAvailable: true } });
  const customer = await prisma.customer.create({ data: { tenantId, phone: customerPhone, fullName: "Manual Customer", isActive: true } });
  await prisma.admin.create({ data: { tenantId, username: adminUsername, name: "Manual Admin", passwordHash: await bcrypt.hash("ManualAdmin@123", 12), isActive: true } });

  const server = createServer(app);
  initializeDeliverySocket(server);
  server.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const adminLogin = await request(baseUrl, "/api/auth/admin/login", apiJson(undefined, { username: adminUsername, password: "ManualAdmin@123" }));
    expectStatus(adminLogin, 200, "admin login");
    const adminToken = adminLogin.body.data.token as string;
    expectStatus(await request(baseUrl, "/api/auth/customer/send-otp", apiJson(undefined, { tenantId, phone: customerPhone })), 200, "customer send OTP");
    const customerOtp = smsService.getTestOtp(customerPhone, tenantId, "AUTH");
    assert.match(customerOtp ?? "", /^\d{6}$/);
    const customerLogin = await request(baseUrl, "/api/auth/customer/verify-otp", apiJson(undefined, { tenantId, phone: customerPhone, otp: customerOtp }));
    expectStatus(customerLogin, 200, "customer verify OTP");
    const customerToken = customerLogin.body.data.token as string;
    assert.equal(customerLogin.body.data.customer.id, customer.id);

    expectStatus(await request(baseUrl, `/api/categories?tenantId=${tenantId}`), 200, "customer menu categories");
    const menu = await request(baseUrl, `/api/products?tenantId=${tenantId}&branchId=${branchId}`);
    expectStatus(menu, 200, "customer menu products");
    assert.ok(menu.body.data.some((item: any) => item.id === product.id));

    const orderResult = await request(baseUrl, "/api/orders", apiJson(customerToken, {
      tenantId: "IGNORED_FRONTEND_TENANT",
      branchId,
      fulfillmentType: "DELIVERY",
      deliveryAddressLine: "Manual Customer Address",
      deliveryLatitude: 13.0827,
      deliveryLongitude: 80.2707,
      deliveryPhone: customerPhone,
      items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
    }));
    expectStatus(orderResult, 201, "manual delivery order");
    const orderId = orderResult.body.data.id as number;
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/accept`, apiJson(adminToken, { tenantId }, "PATCH")), 200, "accept order");
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/status`, apiJson(adminToken, { tenantId, status: "PREPARING" }, "PATCH")), 200, "preparing order");
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/status`, apiJson(adminToken, { tenantId, status: "READY" }, "PATCH")), 200, "ready order");
    const adminOrders = await request(baseUrl, `/api/admin/orders?tenantId=${tenantId}`, apiJson(adminToken));
    expectStatus(adminOrders, 200, "admin receives order");
    assert.ok(JSON.stringify(adminOrders.body).includes(String(orderId)));
    const unassigned = await prisma.delivery.findUniqueOrThrow({ where: { orderId } });
    assert.equal(unassigned.status, "PENDING");
    assert.equal(unassigned.captainId, null);
    assert.equal(await prisma.deliveryOffer.count({ where: { deliveryId: unassigned.id } }), 0);

    const createStaff = async (name: string, emailSuffix: string, phoneSuffix: number) => {
      const phone = String(7300000000 + phoneSuffix);
      const result = await request(baseUrl, "/api/staff", apiJson(adminToken, {
        tenantId,
        fullName: name,
        phone,
        email: `${emailSuffix}.${suffix}@manual.invalid`,
        password: "delivery@123",
        role: "CAPTAIN",
        isActive: true,
      }));
      expectStatus(result, 201, `create ${name} after READY`);
      assert.equal(result.body.data.tenantId, tenantId);
      assert.equal(result.body.data.role, "CAPTAIN");
      assert.equal(result.body.data.isActive, true);
      assert.ok(!Object.prototype.hasOwnProperty.call(result.body.data, "passwordHash"));
      return { id: result.body.data.id as number, email: `${emailSuffix}.${suffix}@manual.invalid`, phone };
    };
    const dinesh = await createStaff("Dinesh", "dinesh", 11);
    const ramesh = await createStaff("Ramesh", "ramesh", 12);
    const suresh = await createStaff("Suresh", "suresh", 13);

    const loginByEmail = async (email: string) => {
      const result = await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, { tenantId, email, password: "delivery@123" }));
      expectStatus(result, 200, `staff email login ${email}`);
      const payload = jwt.decode(result.body.data.token) as { staffId: number; tenantId: string; role: string };
      assert.equal(payload.tenantId, tenantId);
      assert.equal(payload.role, "CAPTAIN");
      return result.body.data.token as string;
    };
    const dineshToken = await loginByEmail(dinesh.email);
    const rameshToken = await loginByEmail(ramesh.email);
    const sureshToken = await loginByEmail(suresh.email);

    const staffList = await request(baseUrl, "/api/admin/delivery-staff", apiJson(adminToken));
    expectStatus(staffList, 200, "admin delivery staff");
    assert.deepEqual(new Set(staffList.body.items.map((staff: any) => staff.id)), new Set([dinesh.id, ramesh.id, suresh.id]));
    assert.ok(staffList.body.items.every((staff: any) => !Object.prototype.hasOwnProperty.call(staff, "passwordHash")));

    const assignmentSocket = io(baseUrl, { auth: { token: dineshToken }, transports: ["websocket"] });
    await new Promise<void>((resolve, reject) => { assignmentSocket.once("connect", resolve); assignmentSocket.once("connect_error", reject); });
    const assignmentEvent = new Promise<any>((resolve) => assignmentSocket.once("delivery:assigned", resolve));
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/assign`, apiJson(adminToken, { captainId: dinesh.id })), 200, "admin assigns Dinesh");
    assert.equal((await assignmentEvent).deliveryId, unassigned.id);
    assignmentSocket.disconnect();
    const assigned = await prisma.delivery.findUniqueOrThrow({ where: { id: unassigned.id } });
    assert.equal(assigned.status, "ASSIGNED");
    assert.equal(assigned.captainId, dinesh.id);
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/assign`, apiJson(adminToken, { captainId: ramesh.id })), 409, "duplicate assignment rejected");

    const dineshDashboard = await request(baseUrl, "/api/delivery/dashboard", apiJson(dineshToken));
    expectStatus(dineshDashboard, 200, "Dinesh dashboard");
    assert.ok(dineshDashboard.body.data.upcoming.some((delivery: any) => delivery.id === unassigned.id));
    const rameshDashboard = await request(baseUrl, "/api/delivery/dashboard", apiJson(rameshToken));
    expectStatus(rameshDashboard, 200, "Ramesh dashboard");
    assert.ok(!JSON.stringify(rameshDashboard.body.data).includes(String(unassigned.id)));

    const customerSocket = io(baseUrl, { auth: { token: customerToken }, transports: ["websocket"] });
    const adminSocket = io(baseUrl, { auth: { token: adminToken }, transports: ["websocket"] });
    await Promise.all([customerSocket, adminSocket].map((socket) => new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    })));
    assert.equal(await customerSocket.emitWithAck("delivery:subscribe", { orderId }), true);

    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/accept`, apiJson(dineshToken, {}, "POST")), 200, "Dinesh accepts");
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/accept`, apiJson(dineshToken, {}, "POST")), 409, "duplicate accept rejected");
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/picked-up`, apiJson(dineshToken, {}, "POST")), 200, "Dinesh pickup");
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/picked-up`, apiJson(dineshToken, {}, "POST")), 409, "duplicate pickup rejected");
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/out-for-delivery`, apiJson(dineshToken, {}, "POST")), 200, "Dinesh starts delivery");
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/out-for-delivery`, apiJson(dineshToken, {}, "POST")), 409, "duplicate start rejected");
    const customerLocationEvent = new Promise<any>((resolve) => customerSocket.once("delivery:location_updated", resolve));
    const adminLocationEvent = new Promise<any>((resolve) => adminSocket.once("delivery:location_updated", resolve));
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/location`, apiJson(dineshToken, { latitude: 13.0812, longitude: 80.2741 })), 200, "Dinesh GPS");
    assert.equal((await customerLocationEvent).deliveryId, unassigned.id);
    assert.equal((await adminLocationEvent).deliveryId, unassigned.id);
    expectStatus(await request(baseUrl, `/api/orders/customer/${customer.id}/${orderId}/delivery`, apiJson(customerToken)), 200, "customer tracking");
    expectStatus(await request(baseUrl, `/api/admin/delivery/${unassigned.id}`, apiJson(adminToken)), 200, "admin tracking");
    const customerStatusEvent = new Promise<any>((resolve) => customerSocket.once("delivery:status_updated", resolve));
    const adminStatusEvent = new Promise<any>((resolve) => adminSocket.once("delivery:status_updated", resolve));
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/arrived`, apiJson(dineshToken, {}, "POST")), 200, "Dinesh arrived");
    assert.equal((await customerStatusEvent).status, "ARRIVED");
    assert.equal((await adminStatusEvent).status, "ARRIVED");
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/arrived`, apiJson(dineshToken, {}, "POST")), 409, "duplicate arrival rejected");
    expectStatus(await request(baseUrl, `/api/delivery/customer/${customer.id}/${orderId}/otp`, apiJson(customerToken, {}, "POST")), 200, "send delivery OTP");
    const otp = smsService.getTestOtp(customerPhone, tenantId, "DELIVERY", String(orderId));
    assert.match(otp ?? "", /^\d{6}$/);
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/complete`, apiJson(dineshToken, { otp }, "POST")), 200, "Dinesh completes");
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/complete`, apiJson(dineshToken, { otp }, "POST")), 409, "duplicate completion rejected");
    const completed = await prisma.delivery.findUniqueOrThrow({ where: { id: unassigned.id }, include: { order: true } });
    assert.equal(completed.status, "DELIVERED");
    assert.equal(completed.order.status, "COMPLETED");
    const completedList = await request(baseUrl, "/api/delivery/completed", apiJson(dineshToken));
    expectStatus(completedList, 200, "Dinesh completed deliveries");
    assert.ok(completedList.body.items.some((delivery: any) => delivery.id === unassigned.id));
    customerSocket.disconnect();
    adminSocket.disconnect();

    const secondOrder = await request(baseUrl, "/api/orders", apiJson(customerToken, { tenantId: "IGNORED_FRONTEND_TENANT", branchId, fulfillmentType: "DELIVERY", deliveryAddressLine: "Second Address", deliveryLatitude: 13.08, deliveryLongitude: 80.27, deliveryPhone: customerPhone, items: [{ productId: product.id, variantId: variant.id, quantity: 1 }] }));
    expectStatus(secondOrder, 201, "second manual order");
    const secondId = secondOrder.body.data.id as number;
    await request(baseUrl, `/api/admin/orders/${secondId}/accept`, apiJson(adminToken, { tenantId }, "PATCH"));
    await request(baseUrl, `/api/admin/orders/${secondId}/status`, apiJson(adminToken, { tenantId, status: "PREPARING" }, "PATCH"));
    await request(baseUrl, `/api/admin/orders/${secondId}/status`, apiJson(adminToken, { tenantId, status: "READY" }, "PATCH"));
    const secondDelivery = await prisma.delivery.findUniqueOrThrow({ where: { orderId: secondId } });
    expectStatus(await request(baseUrl, `/api/delivery/${secondDelivery.id}/assign`, apiJson(adminToken, { captainId: ramesh.id })), 200, "assign Ramesh second order");
    const dineshAfter = await request(baseUrl, "/api/delivery/my-deliveries", apiJson(dineshToken));
    assert.ok(!dineshAfter.body.items.some((delivery: any) => delivery.id === secondDelivery.id));
    expectStatus(await request(baseUrl, `/api/delivery/${secondDelivery.id}/location`, apiJson(dineshToken, { latitude: 13, longitude: 80 })), 403, "Dinesh cannot update Ramesh GPS");
    expectStatus(await request(baseUrl, "/api/admin/delivery-staff", apiJson(rameshToken)), 401, "rider cannot list delivery staff");

    const pickupOrder = await request(baseUrl, "/api/orders", apiJson(customerToken, { tenantId: "IGNORED_FRONTEND_TENANT", branchId, fulfillmentType: "PICKUP", items: [{ productId: product.id, variantId: variant.id, quantity: 1 }] }));
    expectStatus(pickupOrder, 201, "pickup order");
    assert.equal(await prisma.delivery.findUnique({ where: { orderId: pickupOrder.body.data.id } }), null);
    console.log(JSON.stringify({ passed: true, architecture: "MANUAL_ASSIGNMENT_ONLY", tenantId, orderId, deliveryId: unassigned.id, dineshId: dinesh.id, rameshId: ramesh.id, sureshId: suresh.id }));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
};

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });