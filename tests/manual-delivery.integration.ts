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

  const externalBaseUrl = process.env.CAPTAIN_TEST_BASE_URL;
  const server = externalBaseUrl ? undefined : createServer(app);
  let baseUrl = externalBaseUrl;
  if (server) {
    initializeDeliverySocket(server);
    server.listen(Number(process.env.PORT) || 0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  }
  if (!baseUrl) throw new Error("Captain test server URL was not configured");
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
    const secondCustomerPhone = `76${suffix}`;
    const secondCustomer = await prisma.customer.create({
      data: { tenantId, phone: secondCustomerPhone, fullName: "Manual Customer Two", isActive: true },
    });
    expectStatus(await request(baseUrl, "/api/auth/customer/send-otp", apiJson(undefined, { tenantId, phone: secondCustomerPhone })), 200, "second customer send OTP");
    const secondCustomerOtp = smsService.getTestOtp(secondCustomerPhone, tenantId, "AUTH");
    assert.match(secondCustomerOtp ?? "", /^\d{6}$/);
    const secondCustomerLogin = await request(baseUrl, "/api/auth/customer/verify-otp", apiJson(undefined, {
      tenantId,
      phone: secondCustomerPhone,
      otp: secondCustomerOtp,
    }));
    expectStatus(secondCustomerLogin, 200, "second customer verify OTP");
    const secondCustomerToken = secondCustomerLogin.body.data.token as string;

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
    expectStatus(await request(baseUrl, "/api/admin/orders/not-an-id/assign-captain", apiJson(adminToken, { captainId: 1 })), 400, "reject invalid order id");
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/accept`, apiJson(adminToken, { tenantId }, "PATCH")), 200, "accept order");
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/status`, apiJson(adminToken, { tenantId, status: "PREPARING" }, "PATCH")), 200, "preparing order");
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/status`, apiJson(adminToken, { tenantId, status: "READY" }, "PATCH")), 200, "ready order");
    const adminOrders = await request(baseUrl, `/api/admin/orders?tenantId=${tenantId}`, apiJson(adminToken));
    expectStatus(adminOrders, 200, "admin receives order");
    const listedOrder = adminOrders.body.data.find((order: any) => order.id === orderId);
    assert.ok(listedOrder, "READY delivery order remains in the admin order list");
    const orderDetails = await request(baseUrl, `/api/admin/orders/${orderId}?tenantId=${tenantId}`, apiJson(adminToken));
    expectStatus(orderDetails, 200, "admin receives order details");
    const unassigned = await prisma.delivery.findUniqueOrThrow({ where: { orderId } });
    assert.equal(unassigned.status, "PENDING");
    assert.equal(unassigned.captainId, null);
    assert.equal(listedOrder.delivery.id, unassigned.id);
    assert.equal(listedOrder.delivery.status, "PENDING");
    assert.equal(listedOrder.delivery.captainId, null);
    assert.equal(orderDetails.body.data.delivery.id, unassigned.id);
    assert.equal(orderDetails.body.data.delivery.captain, null);
    assert.equal(await prisma.deliveryOffer.count({ where: { deliveryId: unassigned.id } }), 0);

    const createStaff = async (name: string, emailSuffix: string, phoneSuffix: number) => {
      const phone = String(7300000000 + phoneSuffix);
      const result = await request(baseUrl, "/api/captains", apiJson(adminToken, {
        fullName: name,
        phone,
        email: `${emailSuffix}.${suffix}@manual.invalid`,
        password: "delivery@123",
        isActive: true,
        branchIds: [branchId],
      }));
      expectStatus(result, 201, `create ${name} Captain after READY`);
      assert.equal(result.body.data.role, "CAPTAIN");
      assert.equal(result.body.data.isActive, true);
      assert.equal(result.body.data.id, result.body.data.staffId);
      assert.ok(!Object.prototype.hasOwnProperty.call(result.body.data, "passwordHash"));
      return { id: result.body.data.id as number, email: `${emailSuffix}.${suffix}@manual.invalid`, phone };
    };
    const dinesh = await createStaff("Dinesh", "dinesh", 11);
    const ramesh = await createStaff("Ramesh", "ramesh", 12);
    const suresh = await createStaff("Suresh", "suresh", 13);
    const inactiveCaptain = await request(baseUrl, "/api/captains", apiJson(adminToken, {
      fullName: "Inactive Captain",
      phone: `74${suffix}`,
      email: `inactive.${suffix}@manual.invalid`,
      password: "delivery@123",
      isActive: false,
      branchIds: [branchId],
    }));
    expectStatus(inactiveCaptain, 201, "create inactive Captain");

    const foreignTenantId = `FOR${suffix}`;
    const foreignAdminUsername = `foreign_admin_${suffix}`;
    await prisma.tenant.create({ data: { id: foreignTenantId, name: "Foreign Manual Tenant", slug: `${foreignTenantId.toLowerCase()}-manual` } });
    await prisma.admin.create({ data: { tenantId: foreignTenantId, username: foreignAdminUsername, name: "Foreign Manual Admin", passwordHash: await bcrypt.hash("ManualAdmin@123", 12), isActive: true } });
    const foreignAdminLogin = await request(baseUrl, "/api/auth/admin/login", apiJson(undefined, { username: foreignAdminUsername, password: "ManualAdmin@123" }));
    expectStatus(foreignAdminLogin, 200, "foreign tenant admin login");
    const foreignCaptain = await request(baseUrl, "/api/captains", apiJson(foreignAdminLogin.body.data.token, {
      fullName: "Foreign Captain",
      phone: `75${suffix}`,
      email: `foreign.${suffix}@manual.invalid`,
      password: "delivery@123",
      isActive: true,
    }));
    expectStatus(foreignCaptain, 201, "create Captain in foreign tenant");

    const captainList = await request(baseUrl, "/api/captains", apiJson(adminToken));
    expectStatus(captainList, 200, "admin fetches tenant captains");
    assert.ok(captainList.body.items.some((captain: any) => captain.id === dinesh.id));
    assert.ok(!captainList.body.items.some((captain: any) => captain.id === foreignCaptain.body.data.id));
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(undefined, { captainId: dinesh.id })), 401, "require admin authentication");
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(adminToken, { captainId: dinesh.id, tenantId: foreignTenantId })), 403, "reject tenant spoofing");
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(adminToken, { captainId: 999999999 })), 404, "reject invalid Captain ID");
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(adminToken, { captainId: foreignCaptain.body.data.id })), 404, "reject foreign tenant Captain");
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(adminToken, { captainId: inactiveCaptain.body.data.id })), 404, "reject inactive Captain");

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
    const foreignCaptainLogin = await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
      tenantId: foreignTenantId,
      email: `foreign.${suffix}@manual.invalid`,
      password: "delivery@123",
    }));
    expectStatus(foreignCaptainLogin, 200, "foreign tenant Captain login");
    const foreignCaptainDeliveries = await request(baseUrl, "/api/delivery/my-deliveries", apiJson(foreignCaptainLogin.body.data.token));
    expectStatus(foreignCaptainDeliveries, 200, "foreign tenant Captain delivery list");
    assert.ok(!foreignCaptainDeliveries.body.items.some((delivery: any) => delivery.id === unassigned.id));

    const staffList = await request(baseUrl, "/api/admin/delivery-staff", apiJson(adminToken));
    expectStatus(staffList, 200, "admin delivery staff");
    assert.deepEqual(new Set(staffList.body.items.map((staff: any) => staff.id)), new Set([dinesh.id, ramesh.id, suresh.id]));
    assert.ok(staffList.body.items.every((staff: any) => !Object.prototype.hasOwnProperty.call(staff, "passwordHash")));

    const assignmentSocket = io(baseUrl, { auth: { token: dineshToken }, transports: ["websocket"] });
    await new Promise<void>((resolve, reject) => { assignmentSocket.once("connect", resolve); assignmentSocket.once("connect_error", reject); });
    const assignmentEvent = new Promise<any>((resolve) => assignmentSocket.once("delivery:assigned", resolve));
    const adminAssignment = await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(adminToken, { captainId: dinesh.id }));
    expectStatus(adminAssignment, 200, "admin assigns Dinesh through Admin Orders");
    assert.equal(adminAssignment.body.data.delivery.id, unassigned.id);
    assert.equal(adminAssignment.body.data.delivery.status, "ASSIGNED");
    assert.equal(adminAssignment.body.data.delivery.captainId, dinesh.id);
    assert.equal(adminAssignment.body.data.delivery.captain.name, "Dinesh");
    assert.equal(adminAssignment.body.data.delivery.captain.email, dinesh.email);
    assert.ok(adminAssignment.body.data.delivery.assignedAt);
    assert.equal((await assignmentEvent).deliveryId, unassigned.id);
    assignmentSocket.disconnect();
    const assigned = await prisma.delivery.findUniqueOrThrow({ where: { id: unassigned.id } });
    assert.equal(assigned.status, "ASSIGNED");
    assert.equal(assigned.captainId, dinesh.id);
    expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(adminToken, { captainId: ramesh.id })), 409, "reassignment rejected");
    const assignedOrderDetails = await request(baseUrl, `/api/admin/orders/${orderId}?tenantId=${tenantId}`, apiJson(adminToken));
    expectStatus(assignedOrderDetails, 200, "admin retrieves assigned order details");
    assert.equal(assignedOrderDetails.body.data.delivery.captainId, dinesh.id);
    assert.equal(assignedOrderDetails.body.data.delivery.status, "ASSIGNED");
    const assignedOrders = await request(baseUrl, `/api/admin/orders?tenantId=${tenantId}`, apiJson(adminToken));
    assert.equal(assignedOrders.body.data.find((order: any) => order.id === orderId).delivery.captainId, dinesh.id);

    const dineshDashboard = await request(baseUrl, "/api/delivery/dashboard", apiJson(dineshToken));
    expectStatus(dineshDashboard, 200, "Dinesh dashboard");
    assert.ok(dineshDashboard.body.data.upcoming.some((delivery: any) => delivery.id === unassigned.id));
    const rameshDashboard = await request(baseUrl, "/api/delivery/dashboard", apiJson(rameshToken));
    expectStatus(rameshDashboard, 200, "Ramesh dashboard");
    assert.ok(!JSON.stringify(rameshDashboard.body.data).includes(String(unassigned.id)));
    const dineshDeliveries = await request(baseUrl, "/api/delivery/my-deliveries", apiJson(dineshToken));
    expectStatus(dineshDeliveries, 200, "Dinesh sees Admin Orders assignment");
    assert.ok(dineshDeliveries.body.items.some((delivery: any) => delivery.id === unassigned.id));
    const adminCaptainDeliveries = await request(baseUrl, `/api/delivery/admin?captainId=${dinesh.id}`, apiJson(adminToken));
    expectStatus(adminCaptainDeliveries, 200, "admin filters deliveries by Captain ID");
    const adminCaptainDelivery = adminCaptainDeliveries.body.items.find((delivery: any) => delivery.deliveryId === unassigned.id);
    assert.equal(adminCaptainDelivery.orderId, orderId);
    assert.equal(adminCaptainDelivery.captainId, dinesh.id);
    expectStatus(await request(baseUrl, "/api/delivery/admin?captainId=not-an-id", apiJson(adminToken)), 400, "invalid Captain ID filter is rejected");
    const dineshUpcoming = await request(baseUrl, "/api/delivery/my-upcoming", apiJson(dineshToken));
    expectStatus(dineshUpcoming, 200, "Dinesh upcoming deliveries");
    const upcomingDelivery = dineshUpcoming.body.items.find((delivery: any) => delivery.id === unassigned.id);
    assert.ok(upcomingDelivery, "assigned delivery appears in upcoming list");
    assert.equal(upcomingDelivery.deliveryId, unassigned.id);
    assert.equal(upcomingDelivery.orderId, orderId);
    assert.equal(upcomingDelivery.captainId, dinesh.id);
    assert.equal(upcomingDelivery.status, "ASSIGNED");
    assert.equal(upcomingDelivery.order.orderNumber, orderResult.body.data.orderNumber);
    assert.equal(upcomingDelivery.order.items.length, 1);
    assert.equal(upcomingDelivery.order.items[0].quantity, 1);
    assert.equal(upcomingDelivery.order.itemCount, 1);
    assert.ok(upcomingDelivery.order.totals.totalAmount > 0);
    assert.equal(upcomingDelivery.order.deliveryAddressLine, "Manual Customer Address");
    assert.equal(upcomingDelivery.order.customer.fullName, "Manual Customer");
    assert.equal(upcomingDelivery.order.paymentStatus, "PENDING");
    assert.equal(upcomingDelivery.order.payment.status, "PENDING");
    assert.ok(upcomingDelivery.assignedAt);
    assert.equal(upcomingDelivery.acceptedAt, null);
    assert.equal(Object.prototype.hasOwnProperty.call(upcomingDelivery, "passwordHash"), false);
    const dineshCurrentBeforeAcceptance = await request(baseUrl, "/api/delivery/my-current", apiJson(dineshToken));
    expectStatus(dineshCurrentBeforeAcceptance, 200, "Dinesh current deliveries before acceptance");
    assert.ok(!dineshCurrentBeforeAcceptance.body.items.some((delivery: any) => delivery.id === unassigned.id));
    const dineshDetail = await request(baseUrl, `/api/delivery/${unassigned.id}`, apiJson(dineshToken));
    expectStatus(dineshDetail, 200, "Dinesh assigned delivery detail");
    assert.equal(dineshDetail.body.data.deliveryId, unassigned.id);
    assert.equal(dineshDetail.body.data.orderId, orderId);
    assert.equal(dineshDetail.body.data.captainId, dinesh.id);
    assert.equal(dineshDetail.body.data.order.items.length, 1);
    assert.equal(dineshDetail.body.data.order.totals.totalAmount, upcomingDelivery.order.totals.totalAmount);
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}`, apiJson(rameshToken)), 403, "other Captain cannot access assigned delivery");
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/accept`, apiJson(rameshToken, {}, "POST")), 403, "other Captain cannot accept assigned delivery");

    const customerSocket = io(baseUrl, { auth: { token: customerToken }, transports: ["websocket"] });
    const adminSocket = io(baseUrl, { auth: { token: adminToken }, transports: ["websocket"] });
    await Promise.all([customerSocket, adminSocket].map((socket) => new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    })));
    assert.equal(await customerSocket.emitWithAck("delivery:subscribe", { orderId }), true);

    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/accept`, apiJson(dineshToken, {}, "POST")), 200, "Dinesh accepts");
    expectStatus(await request(baseUrl, `/api/delivery/${unassigned.id}/accept`, apiJson(dineshToken, {}, "POST")), 409, "duplicate accept rejected");
    const acceptedOfferRecord = await prisma.deliveryOffer.findUniqueOrThrow({
      where: { deliveryId_captainId: { deliveryId: unassigned.id, captainId: dinesh.id } },
    });
    assert.equal(acceptedOfferRecord.status, "ACCEPTED");
    assert.ok(acceptedOfferRecord.respondedAt);
    const dineshUpcomingAfterAcceptance = await request(baseUrl, "/api/delivery/my-upcoming", apiJson(dineshToken));
    assert.ok(!dineshUpcomingAfterAcceptance.body.items.some((delivery: any) => delivery.id === unassigned.id));
    const dineshCurrent = await request(baseUrl, "/api/delivery/my-current", apiJson(dineshToken));
    expectStatus(dineshCurrent, 200, "Dinesh current deliveries after acceptance");
    const acceptedDelivery = dineshCurrent.body.items.find((delivery: any) => delivery.id === unassigned.id);
    assert.ok(acceptedDelivery, "accepted delivery appears in current list");
    assert.equal(acceptedDelivery.status, "ACCEPTED");
    assert.ok(acceptedDelivery.acceptedAt);
    const acceptedOrderDetails = await request(baseUrl, `/api/admin/orders/${orderId}?tenantId=${tenantId}`, apiJson(adminToken));
    expectStatus(acceptedOrderDetails, 200, "admin retrieves order after Captain acceptance");
    assert.equal(acceptedOrderDetails.body.data.delivery.status, "ACCEPTED");
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
    const completedItem = completedList.body.items.find((delivery: any) => delivery.deliveryId === unassigned.id);
    assert.equal(completedItem.orderId, orderId);
    assert.equal(completedItem.captainId, dinesh.id);
    const dineshUpcomingCompleted = await request(baseUrl, "/api/delivery/my-upcoming", apiJson(dineshToken));
    const dineshCurrentCompleted = await request(baseUrl, "/api/delivery/my-current", apiJson(dineshToken));
    assert.ok(!dineshUpcomingCompleted.body.items.some((delivery: any) => delivery.id === unassigned.id));
    assert.ok(!dineshCurrentCompleted.body.items.some((delivery: any) => delivery.id === unassigned.id));
    customerSocket.disconnect();
    adminSocket.disconnect();

    const prepareDeliveryOrder = async (token: string, address: string, deliveryPhone: string, label: string) => {
      const result = await request(baseUrl, "/api/orders", apiJson(token, {
        tenantId: "IGNORED_FRONTEND_TENANT",
        branchId,
        fulfillmentType: "DELIVERY",
        deliveryAddressLine: address,
        deliveryLatitude: 13.08,
        deliveryLongitude: 80.27,
        deliveryPhone,
        items: [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      }));
      expectStatus(result, 201, `${label} customer order`);
      const id = result.body.data.id as number;
      expectStatus(await request(baseUrl, `/api/admin/orders/${id}/assign-captain`, apiJson(adminToken, { captainId: ramesh.id })), 409, `${label} assignment before READY`);
      expectStatus(await request(baseUrl, `/api/admin/orders/${id}/accept`, apiJson(adminToken, { tenantId }, "PATCH")), 200, `${label} admin confirms`);
      expectStatus(await request(baseUrl, `/api/admin/orders/${id}/status`, apiJson(adminToken, { tenantId, status: "PREPARING" }, "PATCH")), 200, `${label} kitchen prepares`);
      expectStatus(await request(baseUrl, `/api/admin/orders/${id}/status`, apiJson(adminToken, { tenantId, status: "READY" }, "PATCH")), 200, `${label} admin marks ready`);
      return { result, id, delivery: await prisma.delivery.findUniqueOrThrow({ where: { orderId: id } }) };
    };
    const secondOrder = await prepareDeliveryOrder(customerToken, "Shared Chennai Address", customerPhone, "same-address order one");
    const secondAssignment = await request(baseUrl, `/api/admin/orders/${secondOrder.id}/assign-captain`, apiJson(adminToken, { captainId: dinesh.id }));
    expectStatus(secondAssignment, 200, "assign Dinesh same-address order one");
    const thirdOrder = await prepareDeliveryOrder(secondCustomerToken, "Shared Chennai Address", secondCustomerPhone, "same-address order two");
    const thirdAssignment = await request(baseUrl, `/api/admin/orders/${thirdOrder.id}/assign-captain`, apiJson(adminToken, { captainId: dinesh.id }));
    expectStatus(thirdAssignment, 200, "assign Dinesh same-address order two");
    assert.notEqual(secondOrder.delivery.id, thirdOrder.delivery.id);
    assert.notEqual(secondOrder.id, thirdOrder.id);
    const busyCaptainList = await request(baseUrl, "/api/captains", apiJson(adminToken));
    expectStatus(busyCaptainList, 200, "admin captain list retains busy active Captain");
    assert.ok(busyCaptainList.body.items.some((captain: any) => captain.id === dinesh.id && captain.isActive));
    const twoUpcoming = await request(baseUrl, "/api/delivery/my-upcoming", apiJson(dineshToken));
    expectStatus(twoUpcoming, 200, "Dinesh sees both same-address orders");
    const sameAddressDeliveries = twoUpcoming.body.items.filter((delivery: any) => [secondOrder.delivery.id, thirdOrder.delivery.id].includes(delivery.id));
    assert.equal(sameAddressDeliveries.length, 2);
    assert.deepEqual(new Set(sameAddressDeliveries.map((delivery: any) => delivery.order.id)), new Set([secondOrder.id, thirdOrder.id]));
    const adminSameAddressDeliveries = await request(baseUrl, `/api/delivery/admin?captainId=${dinesh.id}`, apiJson(adminToken));
    expectStatus(adminSameAddressDeliveries, 200, "admin receives both deliveries filtered by Captain ID");
    const filteredSameAddress = adminSameAddressDeliveries.body.items.filter((delivery: any) => [secondOrder.delivery.id, thirdOrder.delivery.id].includes(delivery.deliveryId));
    assert.equal(filteredSameAddress.length, 2);
    assert.deepEqual(new Set(filteredSameAddress.map((delivery: any) => delivery.orderId)), new Set([secondOrder.id, thirdOrder.id]));
    assert.ok(sameAddressDeliveries.every((delivery: any) => delivery.order.deliveryAddressLine === "Shared Chennai Address"));
    expectStatus(await request(baseUrl, `/api/delivery/${secondOrder.delivery.id}/location`, apiJson(rameshToken, { latitude: 13, longitude: 80 })), 403, "other Captain cannot update Dinesh GPS");
    expectStatus(await request(baseUrl, "/api/admin/delivery-staff", apiJson(rameshToken)), 401, "rider cannot list delivery staff");
    expectStatus(await request(baseUrl, `/api/delivery/${secondOrder.delivery.id}/accept`, apiJson(rameshToken, {}, "POST")), 403, "other Captain cannot accept same-address delivery");
    expectStatus(await request(baseUrl, `/api/delivery/${secondOrder.delivery.id}/accept`, apiJson(dineshToken, {}, "POST")), 200, "Dinesh accepts first same-address delivery");
    const upcomingAfterOneAccepted = await request(baseUrl, "/api/delivery/my-upcoming", apiJson(dineshToken));
    assert.ok(!upcomingAfterOneAccepted.body.items.some((delivery: any) => delivery.id === secondOrder.delivery.id));
    assert.ok(upcomingAfterOneAccepted.body.items.some((delivery: any) => delivery.id === thirdOrder.delivery.id && delivery.status === "ASSIGNED"));
    const firstSameAddressPickup = await request(baseUrl, `/api/delivery/${secondOrder.delivery.id}/picked-up`, apiJson(dineshToken, {}, "POST"));
    expectStatus(firstSameAddressPickup, 200, "Dinesh picks up first same-address delivery");
    expectStatus(await request(baseUrl, `/api/delivery/${secondOrder.delivery.id}/reject`, apiJson(dineshToken, {}, "POST")), 409, "reject after pickup is refused");
    const completeAfterPickup = async (orderId: number, deliveryId: number, label: string) => {
      expectStatus(await request(baseUrl, `/api/delivery/${deliveryId}/out-for-delivery`, apiJson(dineshToken, {}, "POST")), 200, `${label} starts delivery`);
      expectStatus(await request(baseUrl, `/api/delivery/${deliveryId}/arrived`, apiJson(dineshToken, {}, "POST")), 200, `${label} marks arrival`);
      expectStatus(await request(baseUrl, `/api/delivery/customer/${customer.id}/${orderId}/otp`, apiJson(customerToken, {}, "POST")), 200, `${label} sends completion OTP`);
      const completionOtp = smsService.getTestOtp(customerPhone, tenantId, "DELIVERY", String(orderId));
      assert.match(completionOtp ?? "", /^\d{6}$/);
      expectStatus(await request(baseUrl, `/api/delivery/${deliveryId}/complete`, apiJson(dineshToken, { otp: completionOtp }, "POST")), 200, `${label} completes`);
      const stored = await prisma.delivery.findUniqueOrThrow({ where: { id: deliveryId }, include: { order: true } });
      assert.equal(stored.status, "DELIVERED");
      assert.equal(stored.order.status, "COMPLETED");
    };
    await completeAfterPickup(secondOrder.id, secondOrder.delivery.id, "first same-address delivery");
    assert.equal((await prisma.captain.findUniqueOrThrow({ where: { id: dinesh.id } })).currentStatus, "BUSY");
    const thirdStillAssigned = await prisma.delivery.findUniqueOrThrow({ where: { id: thirdOrder.delivery.id } });
    assert.equal(thirdStillAssigned.status, "ASSIGNED");
    assert.equal(thirdStillAssigned.captainId, dinesh.id);
    expectStatus(await request(baseUrl, `/api/delivery/${thirdOrder.delivery.id}/accept`, apiJson(dineshToken, {}, "POST")), 200, "Dinesh accepts second same-address delivery separately");
    expectStatus(await request(baseUrl, `/api/delivery/${thirdOrder.delivery.id}/picked-up`, apiJson(dineshToken, {}, "POST")), 200, "Dinesh picks up second same-address delivery");
    expectStatus(await request(baseUrl, `/api/delivery/${thirdOrder.delivery.id}/out-for-delivery`, apiJson(dineshToken, {}, "POST")), 200, "Dinesh starts second same-address delivery");
    expectStatus(await request(baseUrl, `/api/delivery/${thirdOrder.delivery.id}/arrived`, apiJson(dineshToken, {}, "POST")), 200, "Dinesh arrives for second same-address delivery");
    expectStatus(await request(baseUrl, `/api/delivery/customer/${secondCustomer.id}/${thirdOrder.id}/otp`, apiJson(secondCustomerToken, {}, "POST")), 200, "second customer sends delivery OTP");
    const secondCompletionOtp = smsService.getTestOtp(secondCustomerPhone, tenantId, "DELIVERY", String(thirdOrder.id));
    assert.match(secondCompletionOtp ?? "", /^\d{6}$/);
    expectStatus(await request(baseUrl, `/api/delivery/${thirdOrder.delivery.id}/complete`, apiJson(dineshToken, { otp: secondCompletionOtp }, "POST")), 200, "Dinesh completes second same-address delivery");
    assert.equal((await prisma.captain.findUniqueOrThrow({ where: { id: dinesh.id } })).currentStatus, "AVAILABLE");
    const sameAddressCompleted = await request(baseUrl, "/api/delivery/completed", apiJson(dineshToken));
    expectStatus(sameAddressCompleted, 200, "Dinesh completed same-address deliveries");
    for (const deliveryId of [secondOrder.delivery.id, thirdOrder.delivery.id]) {
      assert.ok(sameAddressCompleted.body.items.some((delivery: any) => delivery.id === deliveryId));
    }

    const rejectedOrder = await prepareDeliveryOrder(customerToken, "Decline Test Address", customerPhone, "declinable order");
    expectStatus(await request(baseUrl, `/api/admin/orders/${rejectedOrder.id}/assign-captain`, apiJson(adminToken, { captainId: suresh.id })), 200, "assign Suresh declinable order");
    const offeredRecord = await prisma.deliveryOffer.findUniqueOrThrow({
      where: { deliveryId_captainId: { deliveryId: rejectedOrder.delivery.id, captainId: suresh.id } },
    });
    assert.equal(offeredRecord.status, "OFFERED");
    assert.equal(offeredRecord.offeredAt?.getTime(), (await prisma.delivery.findUniqueOrThrow({ where: { id: rejectedOrder.delivery.id } })).assignedAt?.getTime());
    const rejected = await request(baseUrl, `/api/delivery/${rejectedOrder.delivery.id}/reject`, apiJson(sureshToken, {}, "POST"));
    expectStatus(rejected, 200, "Suresh rejects assigned delivery");
    assert.equal(rejected.body.data.status, "PENDING");
    assert.equal(rejected.body.data.captain, null);
    const rejectionInDatabase = await prisma.deliveryOffer.findUniqueOrThrow({
      where: { deliveryId_captainId: { deliveryId: rejectedOrder.delivery.id, captainId: suresh.id } },
    });
    assert.equal(rejectionInDatabase.status, "REJECTED");
    assert.ok(rejectionInDatabase.respondedAt);
    const sureshUpcomingAfterRejection = await request(baseUrl, "/api/delivery/my-upcoming", apiJson(sureshToken));
    assert.ok(!sureshUpcomingAfterRejection.body.items.some((delivery: any) => delivery.id === rejectedOrder.delivery.id));
    const adminRejectedDelivery = await request(baseUrl, `/api/delivery/admin/${rejectedOrder.delivery.id}`, apiJson(adminToken));
    expectStatus(adminRejectedDelivery, 200, "admin reviews rejected delivery");
    assert.ok(adminRejectedDelivery.body.data.assignmentHistory.some((entry: any) =>
      entry.captainId === suresh.id && entry.status === "REJECTED" && entry.respondedAt
    ));
    expectStatus(await request(baseUrl, `/api/admin/orders/${rejectedOrder.id}/assign-captain`, apiJson(adminToken, { captainId: ramesh.id })), 200, "admin reassigns rejected delivery");
    const adminReassignedDelivery = await request(baseUrl, `/api/delivery/admin/${rejectedOrder.delivery.id}`, apiJson(adminToken));
    assert.ok(adminReassignedDelivery.body.data.assignmentHistory.some((entry: any) => entry.captainId === suresh.id && entry.status === "REJECTED"));
    expectStatus(await request(baseUrl, `/api/admin/orders/${rejectedOrder.id}/assign-captain`, apiJson(adminToken, { captainId: suresh.id })), 409, "prevent reassignment to rejecting Captain");

    const pickupOrder = await request(baseUrl, "/api/orders", apiJson(customerToken, { tenantId: "IGNORED_FRONTEND_TENANT", branchId, fulfillmentType: "PICKUP", items: [{ productId: product.id, variantId: variant.id, quantity: 1 }] }));
    expectStatus(pickupOrder, 201, "pickup order");
    assert.equal(await prisma.delivery.findUnique({ where: { orderId: pickupOrder.body.data.id } }), null);
    expectStatus(await request(baseUrl, `/api/admin/orders/${pickupOrder.body.data.id}/assign-captain`, apiJson(adminToken, { captainId: dinesh.id })), 409, "reject order without delivery record");

    const missingDeliveryOrder = await request(baseUrl, "/api/orders", apiJson(customerToken, { tenantId: "IGNORED_FRONTEND_TENANT", branchId, fulfillmentType: "DELIVERY", deliveryAddressLine: "Missing Delivery Address", deliveryLatitude: 13.08, deliveryLongitude: 80.27, deliveryPhone: customerPhone, items: [{ productId: product.id, variantId: variant.id, quantity: 1 }] }));
    expectStatus(missingDeliveryOrder, 201, "create delivery order for missing-record validation");
    const missingDeliveryOrderId = missingDeliveryOrder.body.data.id as number;
    for (const status of ["CONFIRMED", "PREPARING", "READY"]) {
      const response = status === "CONFIRMED"
        ? await request(baseUrl, `/api/admin/orders/${missingDeliveryOrderId}/accept`, apiJson(adminToken, { tenantId }, "PATCH"))
        : await request(baseUrl, `/api/admin/orders/${missingDeliveryOrderId}/status`, apiJson(adminToken, { tenantId, status }, "PATCH"));
      expectStatus(response, 200, `move missing-record test order to ${status}`);
    }
    const missingDelivery = await prisma.delivery.findUniqueOrThrow({ where: { orderId: missingDeliveryOrderId } });
    await prisma.delivery.delete({ where: { id: missingDelivery.id } });
    const missingRecordAssignment = await request(baseUrl, `/api/admin/orders/${missingDeliveryOrderId}/assign-captain`, apiJson(adminToken, { captainId: dinesh.id }));
    expectStatus(missingRecordAssignment, 409, "reject READY order with no delivery record");
    assert.equal(missingRecordAssignment.body.error.code, "DELIVERY_RECORD_NOT_FOUND");
    console.log(JSON.stringify({
      passed: true,
      tenantId,
      firstOrderId: orderId,
      firstDeliveryId: unassigned.id,
      captainIds: { dinesh: dinesh.id, ramesh: ramesh.id, suresh: suresh.id },
      sameAddressOrders: [
        { orderId: secondOrder.id, deliveryId: secondOrder.delivery.id, customerId: customer.id },
        { orderId: thirdOrder.id, deliveryId: thirdOrder.delivery.id, customerId: secondCustomer.id },
      ],
      rejectionOrderId: rejectedOrder.id,
      rejectionDeliveryId: rejectedOrder.delivery.id,
    }));
  } finally {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
};

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });