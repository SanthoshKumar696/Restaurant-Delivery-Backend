import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { prisma } from "../src/database/prisma";
import { awardLoyaltyForCompletedOrder } from "../src/modules/loyalty/loyalty.service";
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
  const transitions = ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"] as const;
  let current = order.status;
  for (const status of transitions) {
    if (current === status) continue;
    const allowedAfter: Record<string, string> = {
      PENDING: "CONFIRMED",
      CONFIRMED: "PREPARING",
      PREPARING: "READY",
      READY: "OUT_FOR_DELIVERY",
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

const main = async () => {
  const fixtures = await createSystemFixtures();
  const server = app.listen(0);
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
    console.log(JSON.stringify({ passed: true, t1OrderId: t1Order.id, t2OrderIds: t2Orders.map((order: any) => order.id), t1ReviewId: review.id, t1Points: loyalty.body.data.pointsBalance, branchPrices: branchPrices.map(row => ({ branchId: row.branchId, price: Number(row.priceOverride) })) }));
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
