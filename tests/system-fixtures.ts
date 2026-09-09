import bcrypt from "bcrypt";
import { prisma } from "../src/database/prisma";

const fixture = "E2E_V1_20260909";

const ensureTenant = async (id: string, name: string) => {
  const existing = await prisma.tenant.findUnique({ where: { id } });
  return existing ?? prisma.tenant.create({
    data: { id, name, slug: `${id.toLowerCase()}-e2e-v1` },
  });
};

const ensureBranch = async (id: string, tenantId: string, name: string) => {
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (existing) {
    if (existing.tenantId !== tenantId) {
      throw new Error(`Branch ID belongs to another tenant: ${id}`);
    }
    return existing;
  }

  return prisma.branch.create({
    data: {
      id,
      tenantId,
      name,
      addressLine: "E2E Test Address",
      city: "Test City",
    },
  });
};

const ensureCategory = async (tenantId: string, name: string) => {
  const existing = await prisma.category.findFirst({ where: { tenantId, name } });
  return existing ?? prisma.category.create({
    data: { tenantId, name, displayOrder: 0 },
  });
};

const ensureProduct = async (
  tenantId: string,
  categoryId: number,
  name: string,
  basePrice: number
) => {
  const existing = await prisma.product.findFirst({ where: { tenantId, name } });
  return existing ?? prisma.product.create({
    data: {
      tenantId,
      categoryId,
      name,
      basePrice,
      description: fixture,
      isVeg: false,
    },
  });
};

const ensureVariant = async (
  tenantId: string,
  productId: number,
  name: string,
  price: number
) => {
  const existing = await prisma.productVariant.findFirst({
    where: { tenantId, productId, name },
  });
  return existing ?? prisma.productVariant.create({
    data: { tenantId, productId, name, price },
  });
};

const ensureBranchProduct = async (
  tenantId: string,
  branchId: string,
  productId: number,
  priceOverride: number
) => {
  const existing = await prisma.branchProduct.findFirst({
    where: { branchId, productId },
  });
  return existing ?? prisma.branchProduct.create({
    data: {
      tenantId,
      branchId,
      productId,
      priceOverride,
      isAvailable: true,
    },
  });
};

const ensureCustomer = async (tenantId: string, phone: string, fullName: string) => {
  const existing = await prisma.customer.findUnique({
    where: { tenantId_phone: { tenantId, phone } },
  });
  return existing ?? prisma.customer.create({
    data: {
      tenantId,
      phone,
      fullName,
      email: `${phone}@e2e.invalid`,
      isActive: true,
    },
  });
};

const ensureAdmin = async (tenantId: string, username: string, name: string) => {
  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) return existing;

  return prisma.admin.create({
    data: {
      tenantId,
      username,
      name,
      passwordHash: await bcrypt.hash("E2E-V1-Admin-2026!", 12),
      isActive: true,
    },
  });
};

const ensureAddonGroup = async (tenantId: string, name: string) => {
  const existing = await prisma.addonGroup.findFirst({ where: { tenantId, name } });
  return existing ?? prisma.addonGroup.create({
    data: { tenantId, name, maxSelect: 3 },
  });
};

const ensureAddonItem = async (
  tenantId: string,
  addonGroupId: number,
  name: string,
  price: number
) => {
  const existing = await prisma.addonGroupItem.findFirst({
    where: { tenantId, addonGroupId, name },
  });
  return existing ?? prisma.addonGroupItem.create({
    data: { tenantId, addonGroupId, name, price },
  });
};

export const createSystemFixtures = async () => {
  await ensureTenant("T001", "E2E Briyani House");
  await ensureTenant("T002", "E2E Multi Branch Kitchen");

  const t1Branch = await ensureBranch("T001-B001", "T001", "E2E Main Branch");
  const t2Branches = [
    await ensureBranch("B001", "T002", "E2E Branch B002 Existing"),
    await ensureBranch("B002", "T002", "E2E Branch B003 Existing"),
    await ensureBranch("T002-B003", "T002", "E2E Branch B004 Equivalent"),
  ];

  const t1Category = await ensureCategory("T001", `${fixture} BRIYANI`);
  const t2Category = await ensureCategory("T002", `${fixture} MULTI BRANCH`);

  const t1Products = [
    await ensureProduct("T001", t1Category.id, `${fixture} Chicken Briyani`, 220),
    await ensureProduct("T001", t1Category.id, `${fixture} Mutton Briyani`, 320),
    await ensureProduct("T001", t1Category.id, `${fixture} Chicken 65`, 180),
    await ensureProduct("T001", t1Category.id, `${fixture} Fresh Lime`, 80),
  ];

  await ensureVariant("T001", t1Products[0].id, "Half", 180);
  await ensureVariant("T001", t1Products[0].id, "Full", 280);
  await ensureVariant("T001", t1Products[1].id, "Half", 260);
  await ensureVariant("T001", t1Products[1].id, "Full", 360);
  for (const product of t1Products) {
    await ensureBranchProduct("T001", t1Branch.id, product.id, Number(product.basePrice));
  }

  const branchMenus = [
    [t2Branches[0].id, [["Chicken Briyani", 180], ["Mutton Briyani", 300], ["Chicken 65", 180]]],
    [t2Branches[1].id, [["Chicken Briyani", 200], ["Fish Briyani", 320], ["Grill Chicken", 280]]],
    [t2Branches[2].id, [["Chicken Briyani", 220], ["Mutton Briyani", 350], ["Grill Chicken", 300]]],
  ] as const;

  const t2Products: Array<{ id: number; branchId: string; name: string }> = [];
  for (const [branchId, menu] of branchMenus) {
    for (const [menuName, price] of menu) {
      const product = await ensureProduct("T002", t2Category.id, `${fixture} ${branchId} ${menuName}`, price);
      await ensureBranchProduct("T002", branchId, product.id, price);
      t2Products.push({ id: product.id, branchId, name: product.name });

      if (menuName === "Chicken Briyani") {
        const fullPrice = branchId === "B001" ? 280 : branchId === "B002" ? 310 : 340;
        await ensureVariant("T002", product.id, "Half", price);
        await ensureVariant("T002", product.id, "Full", fullPrice);
      }
    }
  }

  const t1Addons = await ensureAddonGroup("T001", `${fixture} Extra Add-ons`);
  await ensureAddonItem("T001", t1Addons.id, `${fixture} Extra Egg`, 25);
  await ensureAddonItem("T001", t1Addons.id, `${fixture} Extra Chicken`, 70);
  await ensureAddonItem("T001", t1Addons.id, `${fixture} Raita`, 30);

  const t2Addons = await ensureAddonGroup("T002", `${fixture} Branch Add-ons`);
  await ensureAddonItem("T002", t2Addons.id, `${fixture} Extra Egg`, 25);
  await ensureAddonItem("T002", t2Addons.id, `${fixture} Extra Chicken`, 70);
  await ensureAddonItem("T002", t2Addons.id, `${fixture} Extra Fish`, 80);

  if (!(await prisma.productAddonGroup.findFirst({
    where: { tenantId: "T001", productId: t1Products[0].id, addonGroupId: t1Addons.id },
  }))) {
    await prisma.productAddonGroup.create({
      data: { tenantId: "T001", productId: t1Products[0].id, addonGroupId: t1Addons.id },
    });
  }

  const customers = [
    await ensureCustomer("T001", "7000000001", `${fixture} Customer T001`),
    await ensureCustomer("T002", "7000000002", `${fixture} Customer B002`),
    await ensureCustomer("T002", "7000000003", `${fixture} Customer B003`),
    await ensureCustomer("T002", "7000000004", `${fixture} Customer B004`),
  ];
  const admins = [
    await ensureAdmin("T001", "e2e_v1_t001_admin", `${fixture} Admin T001`),
    await ensureAdmin("T002", "e2e_v1_t002_admin", `${fixture} Admin T002`),
  ];

  return {
    fixture,
    t1Branch,
    t2Branches,
    t1Products,
    t2Products,
    customers,
    admins,
    adminPassword: "E2E-V1-Admin-2026!",
  };
};

if (require.main === module) {
  createSystemFixtures()
    .then((result) => {
      console.log(JSON.stringify({
        fixture: result.fixture,
        t1Branch: result.t1Branch.id,
        t2Branches: result.t2Branches.map((branch) => branch.id),
        t1Products: result.t1Products.map((product) => product.id),
        t2Products: result.t2Products,
        customers: result.customers.map((customer) => ({ id: customer.id, tenantId: customer.tenantId })),
        admins: result.admins.map((admin) => ({ id: admin.id, tenantId: admin.tenantId, username: admin.username })),
      }));
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
