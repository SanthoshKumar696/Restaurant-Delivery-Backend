import { prisma } from "../../database/prisma";
import {
  CreateBranchInput,
  UpdateBranchInput,
} from "./branch.types";

export const createBranch = async (data: CreateBranchInput) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: data.tenantId },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const [{ nextval }] = await prisma.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('branch_id_seq') AS nextval
  `;
  const branchId = `B${String(nextval).padStart(3, "0")}`;

  return prisma.branch.create({
    data: {
      id: branchId,
      tenantId: data.tenantId,
      name: data.name,
      addressLine: data.addressLine,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      phone: data.phone,
      deliveryEnabled: data.deliveryEnabled,
      pickupEnabled: data.pickupEnabled,
    },
  });
};

export const getAllBranches = async () => {
  return prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
  });
};

export const getBranchById = async (id: string) => {
  const branch = await prisma.branch.findUnique({ where: { id } });

  if (!branch) {
    throw new Error("Branch not found");
  }

  return branch;
};

export const updateBranch = async (id: string, data: UpdateBranchInput) => {
  const existingBranch = await prisma.branch.findUnique({ where: { id } });

  if (!existingBranch) {
    throw new Error("Branch not found");
  }

  return prisma.branch.update({
    where: { id },
    data,
  });
};

export const deleteBranch = async (id: string) => {
  const existingBranch = await prisma.branch.findUnique({ where: { id } });

  if (!existingBranch) {
    throw new Error("Branch not found");
  }

  return prisma.branch.update({
    where: { id },
    data: { isActive: false },
  });
};


