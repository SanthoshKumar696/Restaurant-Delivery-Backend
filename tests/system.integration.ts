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
  assert.deepEqual(manager.body.data.branchIds, []);
  assert.deepEqual(manager.body.data.branchAssignments, []);
  assert.equal("passwordHash" in manager.body.data, false);
  const tenantMismatch = await request(baseUrl, "/api/staff", apiJson(adminToken, {
    tenantId: "T002",
    fullName: "Cross-tenant Staff",
    phone: phone(),
    password: "Manager@123",
    role: "STAFF",
  }));
  expectStatus(tenantMismatch, 403, "staff creation rejects a mismatched tenant");
  assert.equal(tenantMismatch.body.error.code, "TENANT_ACCESS_DENIED");

  const captains = [] as Array<{ id: number; phone: string; token: string }>;
  for (const name of ["Captain 1", "Captain 2", "Captain 3"]) {
    const captainPhone = phone();
    const created = await request(baseUrl, "/api/staff", apiJson(adminToken, {
      tenantId: "T001",
      fullName: name,
      phone: captainPhone,
      email: `${captainPhone}@e2e.invalid`,
      password: "Captain@123",
      role: "CAPTAIN",
      isActive: true,
      branchIds: [branchId],
    }));
    expectStatus(created, 201, `create ${name}`);
    assert.equal(created.body.data.role, "CAPTAIN");
    assert.equal(created.body.data.isActive, true);
    assert.deepEqual(created.body.data.branchIds, [branchId]);
    assert.deepEqual(created.body.data.branchAssignments.map((branch: any) => branch.id), [branchId]);
    assert.equal(created.body.data.captainId, created.body.data.id);
    assert.equal("passwordHash" in created.body.data, false);
    const linkedCaptain = await prisma.captain.findUniqueOrThrow({ where: { id: created.body.data.id } });
    assert.equal(linkedCaptain.tenantId, "T001");
    assert.equal(await prisma.captain.count({ where: { id: created.body.data.id } }), 1);
    captains.push({ id: created.body.data.id, phone: captainPhone, token: "" });
  }

  expectStatus(await request(baseUrl, "/api/captains", apiJson(adminToken, {
    fullName: "Duplicate Captain Route",
    phone: phone(),
    email: `${phone()}@e2e.invalid`,
    password: "Captain@123",
  })), 404, "separate Captain account-creation route is removed");
  expectStatus(await request(baseUrl, "/api/staff", apiJson(adminToken, {
    fullName: "Unauthorized Branch Captain",
    phone: phone(),
    password: "Captain@123",
    role: "CAPTAIN",
    branchIds: ["B001"],
  })), 403, "Captain creation rejects another tenant's branch");
  const unknownBranch = await request(baseUrl, "/api/staff", apiJson(adminToken, {
    fullName: "Unknown Branch Captain",
    phone: phone(),
    password: "Captain@123",
    role: "CAPTAIN",
    branchIds: ["NO-SUCH-BRANCH"],
  }));
  expectStatus(unknownBranch, 404, "Captain creation rejects an unknown branch ID");
  assert.equal(unknownBranch.body.error.code, "BRANCH_NOT_FOUND");

  const crossTenantPhone = phone();
  const duplicateEmailCaptain = await request(baseUrl, "/api/staff", apiJson(otherAdminToken, {
    fullName: "Duplicate Email Captain",
    phone: crossTenantPhone,
    email: `${captains[0].phone}@e2e.invalid`,
    password: "Captain@123",
    role: "CAPTAIN",
    branchIds: ["B001"],
  }));
  expectStatus(duplicateEmailCaptain, 409, "staff emails are unique across tenants");

  const crossTenantCaptain = await request(baseUrl, "/api/staff", apiJson(otherAdminToken, {
    fullName: "Cross Tenant Captain",
    phone: captains[0].phone,
    email: `${crossTenantPhone}@e2e.invalid`,
    password: "Captain@123",
    role: "CAPTAIN",
    branchIds: ["B001"],
  }));
  expectStatus(crossTenantCaptain, 201, "create other-tenant Captain through staff management");
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
    identifier: `${captains[2].phone}@e2e.invalid`,
    password: "Captain@123",
  }));
  expectStatus(inactiveLogin, 401, "inactive Captain login denied");

  expectStatus(await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
    identifier: `${captains[0].phone}@e2e.invalid`,
    password: "Incorrect@123",
  })), 401, "invalid staff password denied");
  expectStatus(await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
    identifier: "missing.staff@example.invalid",
    password: "Captain@123",
  })), 401, "unknown staff email denied");
  expectStatus(await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
    password: "Captain@123",
  })), 400, "missing staff identifier rejected");
  expectStatus(await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
    identifier: `${captains[0].phone}@e2e.invalid`,
  })), 400, "missing staff password rejected");

  for (const captain of captains.slice(0, 2)) {
    const login = await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
      identifier: ` ${captain.phone.toUpperCase()}@E2E.INVALID `,
      password: "Captain@123",
    }));
    expectStatus(login, 200, "Captain login");
    assert.equal(login.body.data.staff.role, "CAPTAIN");
    assert.equal(login.body.data.staff.staffId, captain.id);
    assert.equal(login.body.data.staff.captainId, captain.id);
    assert.equal(login.body.data.staff.tenantId, "T001");
    assert.equal(login.body.data.staff.branchId, branchId);
    assert.deepEqual(login.body.data.staff.branchIds, [branchId]);
    assert.equal("passwordHash" in login.body.data.staff, false);
    assert.ok(jwt.decode(login.body.data.token)?.toString());
    const payload = jwt.decode(login.body.data.token) as { staffId: number; tenantId: string; role: string };
    assert.equal(payload.staffId, captain.id);
    assert.equal(payload.tenantId, "T001");
    assert.equal(payload.role, "CAPTAIN");
    captain.token = login.body.data.token;
    expectStatus(await request(baseUrl, "/api/staff", apiJson(captain.token)), 401, "Captain denied admin staff API");
    expectStatus(await request(baseUrl, "/api/captains/me", apiJson(captain.token)), 200, "Captain token resolves linked profile");
  }
  const phoneLogin = await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
    identifier: captains[1].phone,
    password: "Captain@123",
  }));
  expectStatus(phoneLogin, 200, "phone identifier login");
  assert.equal(phoneLogin.body.data.staff.staffId, captains[1].id);
  const ambiguousPhoneLogin = await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
    identifier: captains[0].phone,
    password: "Captain@123",
  }));
  expectStatus(ambiguousPhoneLogin, 401, "ambiguous cross-tenant phone login is rejected");

  const managerLogin = await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
    identifier: manager.body.data.email,
    password: "Manager@123",
  }));
  expectStatus(managerLogin, 200, "non-Captain staff login");
  assert.equal(managerLogin.body.data.staff.staffId, manager.body.data.id);
  assert.equal(managerLogin.body.data.staff.tenantId, "T001");
  assert.equal(managerLogin.body.data.staff.role, "MANAGER");
  assert.deepEqual(managerLogin.body.data.staff.branchIds, []);
  const legacyEmailLogin = await request(baseUrl, "/api/auth/staff/login", apiJson(undefined, {
    email: manager.body.data.email,
    password: "Manager@123",
  }));
  expectStatus(legacyEmailLogin, 200, "legacy email login compatibility");

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
  const pendingOrders = await request(baseUrl, "/api/admin/orders?tenantId=T001&status=PENDING", apiJson(adminToken));
  expectStatus(pendingOrders, 200, "admin pending order list");
  assert.ok(pendingOrders.body.data.some((order: any) => order.id === orderId));
  const delivery = await prisma.delivery.findUnique({ where: { orderId } });
  assert.ok(delivery, "delivery order must create one pending delivery");
  assert.equal(delivery.status, "PENDING");
  assert.equal(Number(createdOrder.body.data.deliveryLatitude), 13.0827);
  assert.equal(Number(createdOrder.body.data.deliveryLongitude), 80.2707);
  expectStatus(await request(baseUrl, `/api/delivery/${delivery.id}/assign`, apiJson(adminToken, { captainId: captains[0].id })), 409, "delivery cannot be assigned before order ready");
  const pendingReady = await request(baseUrl, `/api/admin/orders/${orderId}/status`, apiJson(adminToken, { tenantId: "T001", status: "READY" }, "PATCH"));
  expectStatus(pendingReady, 409, "pending order cannot skip to READY");
  assert.equal(pendingReady.body.error.code, "INVALID_ORDER_TRANSITION");
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status, "PENDING");
  const invalidStatus = await request(baseUrl, `/api/admin/orders/${orderId}/status`, apiJson(adminToken, { tenantId: "T001", status: "NOT_A_STATUS" }, "PATCH"));
  expectStatus(invalidStatus, 400, "invalid status is rejected");
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status, "PENDING");

  const accepted = await request(baseUrl, `/api/admin/orders/${orderId}/accept`, apiJson(adminToken, { tenantId: "T001" }, "PATCH"));
  expectStatus(accepted, 200, "accept delivery order");
  assert.equal(accepted.body.data.status, "CONFIRMED");
  const skippedPreparing = await request(baseUrl, `/api/admin/orders/${orderId}/status`, apiJson(adminToken, { tenantId: "T001", status: "READY" }, "PATCH"));
  expectStatus(skippedPreparing, 409, "confirmed order must pass through PREPARING");
  assert.equal(skippedPreparing.body.error.code, "INVALID_ORDER_TRANSITION");
  assert.equal(skippedPreparing.body.message, "Order must be moved to PREPARING before it can be marked READY");
  const confirmedOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(confirmedOrder.status, "CONFIRMED");
  assert.equal(confirmedOrder.readyAt, null);
  assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { orderId } })).status, "PENDING");
  for (const status of ["PREPARING", "READY"]) {
    const updated = await request(baseUrl, `/api/admin/orders/${orderId}/status`, apiJson(adminToken, { tenantId: "T001", status }, "PATCH"));
    expectStatus(updated, 200, `set delivery order ${status}`);
    assert.equal(updated.body.data.status, status, `PATCH response reports ${status}`);
  }
  assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { orderId } })).status, "PENDING", "READY must not prematurely advance delivery status");
  const readyOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(readyOrder.status, "READY", "READY status is persisted");
  assert.ok(readyOrder.readyAt, "READY timestamp is persisted");
  const readyOrderDetails = await request(baseUrl, `/api/admin/orders/${orderId}?tenantId=T001`, apiJson(adminToken));
  expectStatus(readyOrderDetails, 200, "retrieve order after READY transition");
  assert.equal(readyOrderDetails.body.data.status, "READY", "Admin Orders detail reflects READY status");
  assert.ok(readyOrderDetails.body.data.readyAt, "Admin Orders detail includes READY timestamp");

  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}/assign`, apiJson(adminToken, { captainId: captains[2].id })), 404, "inactive Captain cannot be assigned");
  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}/assign`, apiJson(adminToken, { captainId: crossTenantCaptain.body.data.id })), 404, "cross-tenant Captain cannot be assigned");
  const captainSocket = io(baseUrl, { auth: { token: captains[0].token }, transports: ["websocket"] });
  try {
    await new Promise<void>((resolve, reject) => {
      captainSocket.once("connect", resolve);
      captainSocket.once("connect_error", reject);
    });
    const assignmentEvent = new Promise<any>((resolve) => captainSocket.once("delivery:assigned", resolve));
    const assignment = await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(adminToken, { captainId: captains[0].id }));
    expectStatus(assignment, 200, "assign delivery after ready");
    assert.equal(assignment.body.data.delivery.status, "ASSIGNED");
    assert.equal(assignment.body.data.delivery.captain.id, captains[0].id);
    assert.deepEqual(await assignmentEvent, { deliveryId: delivery!.id, orderId });
  } finally {
    captainSocket.disconnect();
  }
  const reassignment = await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(adminToken, { captainId: captains[1].id }));
  expectStatus(reassignment, 200, "reassign before Captain acceptance");
  assert.equal(reassignment.body.data.delivery.id, delivery!.id);
  assert.equal(reassignment.body.data.delivery.captainId, captains[1].id);
  assert.equal(reassignment.body.data.delivery.previousCaptain.id, captains[0].id);
  assert.equal(reassignment.body.data.delivery.previousCaptain.name, "Captain 1");
  assert.equal(await prisma.delivery.count({ where: { orderId } }), 1, "reassignment retains one delivery record");
  const reassignedDelivery = await prisma.delivery.findUniqueOrThrow({ where: { orderId } });
  assert.equal(reassignedDelivery.id, delivery!.id);
  assert.equal(reassignedDelivery.captainId, captains[1].id);
  const cancelledOffer = await prisma.deliveryOffer.findUniqueOrThrow({
    where: { deliveryId_captainId: { deliveryId: delivery!.id, captainId: captains[0].id } },
  });
  assert.equal(cancelledOffer.status, "CANCELLED");
  expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(adminToken, { captainId: captains[1].id })), 409, "same Captain reassignment denied");
  expectStatus(await request(baseUrl, `/api/captains/${captains[1].id}`, apiJson(adminToken, { isActive: false }, "PUT")), 409, "assigned Captain cannot be deactivated");
  expectStatus(await request(baseUrl, `/api/staff/${captains[1].id}`, apiJson(adminToken, { role: "STAFF" }, "PUT")), 409, "assigned Captain role cannot be changed");
  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}`, apiJson(captains[0].token)), 403, "previous Captain denied delivery detail");
  const previousCaptainDeliveries = await request(baseUrl, "/api/delivery/my-upcoming", apiJson(captains[0].token));
  expectStatus(previousCaptainDeliveries, 200, "previous Captain upcoming list");
  assert.ok(!previousCaptainDeliveries.body.items.some((item: any) => item.id === delivery!.id));
  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}`, apiJson(captains[1].token)), 200, "new Captain sees reassigned delivery");
  const myDeliveries = await request(baseUrl, "/api/delivery/my-deliveries", apiJson(captains[1].token));
  expectStatus(myDeliveries, 200, "Captain delivery list");
  assert.ok(myDeliveries.body.items.some((item: any) => item.id === delivery!.id));

  const acceptedDelivery = await request(baseUrl, `/api/delivery/${delivery!.id}/accept`, apiJson(captains[1].token, {}, "POST"));
  expectStatus(acceptedDelivery, 200, "new Captain accepts reassigned delivery");
  expectStatus(await request(baseUrl, `/api/admin/orders/${orderId}/assign-captain`, apiJson(adminToken, { captainId: captains[0].id })), 409, "accepted delivery cannot be reassigned");
  for (const action of ["picked-up", "out-for-delivery"] as const) {
    const result = await request(baseUrl, `/api/delivery/${delivery!.id}/${action}`, apiJson(captains[1].token, {}, "POST"));
    expectStatus(result, 200, `Captain ${action}`);
  }
  const location = await request(baseUrl, `/api/delivery/${delivery!.id}/location`, apiJson(captains[1].token, { latitude: 13.08, longitude: 80.26 }));
  expectStatus(location, 200, "Captain GPS update");
  assert.equal(location.body.data.deliveryId, delivery!.id);
  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}/location`, apiJson(captains[0].token, { latitude: 13.08, longitude: 80.26 })), 403, "previous Captain GPS denied");
  expectStatus(await request(baseUrl, `/api/delivery/${delivery!.id}/location`, apiJson(captains[1].token, { latitude: 100, longitude: 0 })), 400, "invalid GPS rejected");

  const customerTracking = await request(baseUrl, `/api/delivery/customer/${customerId}/${orderId}`, apiJson(customerToken));
  expectStatus(customerTracking, 200, "customer tracking");
  assert.equal(customerTracking.body.data.deliveryId, delivery!.id);
  assert.equal(customerTracking.body.data.currentLocation.latitude.toString(), "13.08");
  const otherCustomerTracking = await request(baseUrl, `/api/delivery/customer/${customerId + 999}/${orderId}`, apiJson(customerToken));
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
    const realtimeUpdate = await request(baseUrl, `/api/delivery/${delivery!.id}/location`, apiJson(captains[1].token, { latitude: 13.081, longitude: 80.269 }));
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
    const arrived = await request(baseUrl, `/api/delivery/${delivery!.id}/arrived`, apiJson(captains[1].token, {}, "POST"));
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

  const badOtp = await request(baseUrl, `/api/delivery/${delivery!.id}/complete`, apiJson(captains[1].token, { otp: "000000" }));
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
  expectStatus(await request(baseUrl, `/api/delivery/customer/${customerId}/${pickupOrder.body.data.id}`, apiJson(customerToken)), 404, "pickup has no tracking");
  expectStatus(await request(baseUrl, `/api/admin/orders/${pickupOrder.body.data.id}/accept`, apiJson(adminToken, { tenantId: "T001" }, "PATCH")), 200, "accept pickup order");
  for (const status of ["PREPARING", "READY", "COMPLETED"]) {
    expectStatus(
      await request(baseUrl, `/api/admin/orders/${pickupOrder.body.data.id}/status`, apiJson(adminToken, { tenantId: "T001", status }, "PATCH")),
      200,
      `complete pickup order ${status}`
    );
  }
  assert.equal((await prisma.order.findUnique({ where: { id: pickupOrder.body.data.id }, select: { status: true } }))?.status, "COMPLETED");
  const terminalTransition = await request(baseUrl, `/api/admin/orders/${pickupOrder.body.data.id}/status`, apiJson(adminToken, { tenantId: "T001", status: "READY" }, "PATCH"));
  expectStatus(terminalTransition, 409, "terminal order cannot transition back to READY");
  assert.equal(terminalTransition.body.error.code, "INVALID_ORDER_TRANSITION");
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: pickupOrder.body.data.id } })).status, "COMPLETED");

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

    const multiBranchPhone = String(7000000000 + Math.floor(Math.random() * 90000000));
    const multiBranchStaff = await request(baseUrl, "/api/staff", apiJson(t2AdminToken, {
      tenantId: "T002",
      fullName: "Multi-branch E2E Staff",
      phone: multiBranchPhone,
      email: `${multiBranchPhone}@e2e.invalid`,
      password: "Staff@123",
      role: "STAFF",
      branchIds: fixtures.t2Branches.map((branch) => branch.id),
    }));
    expectStatus(multiBranchStaff, 201, "create staff with multiple tenant branches");
    assert.equal(multiBranchStaff.body.data.tenantId, "T002");
    assert.deepEqual(
      multiBranchStaff.body.data.branchIds.sort(),
      fixtures.t2Branches.map((branch) => branch.id).sort()
    );
    assert.deepEqual(
      multiBranchStaff.body.data.branchAssignments.map((branch: any) => branch.id).sort(),
      fixtures.t2Branches.map((branch) => branch.id).sort()
    );
    const multiBranchAssignments = await prisma.staffBranchAssignment.findMany({
      where: { staffId: multiBranchStaff.body.data.id, tenantId: "T002" },
      select: { branchId: true },
    });
    assert.deepEqual(
      multiBranchAssignments.map((assignment) => assignment.branchId).sort(),
      fixtures.t2Branches.map((branch) => branch.id).sort()
    );

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
