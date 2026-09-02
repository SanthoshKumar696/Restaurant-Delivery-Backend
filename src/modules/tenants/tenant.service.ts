import { prisma } from "../../database/prisma";
import {
  CreateTenantInput,
  UpdateTenantInput,
} from "./tenant.types";

export const createTenant = async (data: CreateTenantInput) => {
  const existingTenant = await prisma.tenant.findUnique({
    where: {
      slug: data.slug,
    },
  });

  if (existingTenant) {
    throw new Error("Tenant with this slug already exists");
  }

  const [{ nextval }] = await prisma.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('tenant_id_seq') AS nextval
  `;

  const tenant = await prisma.tenant.create({
    data: {
      id: `T${String(nextval).padStart(3, "0")}`,
      name: data.name,
      slug: data.slug,
      logoUrl: data.logoUrl,
    },
  });

  return tenant;
};

export const getAllTenants = async () => {
  return prisma.tenant.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getTenantById = async (id: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: {
      id,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return tenant;
};

export const updateTenant = async (
  id: string,
  data: UpdateTenantInput
) => {
  const existingTenant = await prisma.tenant.findUnique({
    where: {
      id,
    },
  });

  if (!existingTenant) {
    throw new Error("Tenant not found");
  }

  if (data.slug && data.slug !== existingTenant.slug) {
    const slugExists = await prisma.tenant.findUnique({
      where: {
        slug: data.slug,
      },
    });

    if (slugExists) {
      throw new Error("Tenant with this slug already exists");
    }
  }

  return prisma.tenant.update({
    where: {
      id,
    },
    data,
  });
};

export const deleteTenant = async (id: string) => {
  const existingTenant = await prisma.tenant.findUnique({
    where: {
      id,
    },
  });

  if (!existingTenant) {
    throw new Error("Tenant not found");
  }

  // Soft delete instead of physically deleting the tenant.
  return prisma.tenant.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });
};

export const getTenantBranches = async (tenantId: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: tenantId,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return prisma.branch.findMany({
    where: {
      tenantId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};