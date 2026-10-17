import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { HttpError } from "../../common/errors/http-error";
import { prisma } from "../../database/prisma";
import {
  CreateStaffInput,
  UpdateStaffInput,
} from "./staff.types";
import { ensureUniqueStaffEmail, normalizeStaffEmail } from "./staff-email";

const validateBranchIds = async (tenantId: string, branchIds: string[] = []) => {
  const uniqueBranchIds = [...new Set(branchIds)];
  const branches = uniqueBranchIds.length
    ? await prisma.branch.findMany({
        where: { id: { in: uniqueBranchIds } },
        select: { id: true, tenantId: true, isActive: true },
      })
    : [];

  const foundBranchIds = new Set(branches.map((branch) => branch.id));
  const missingBranchIds = uniqueBranchIds.filter((branchId) => !foundBranchIds.has(branchId));
  if (missingBranchIds.length) {
    throw new HttpError(
      `Branch not found: ${missingBranchIds.join(", ")}`,
      404,
      "BRANCH_NOT_FOUND"
    );
  }

  if (branches.some((branch) => branch.tenantId !== tenantId)) {
    throw new HttpError("One or more branches do not belong to this tenant", 403, "BRANCH_ACCESS_DENIED");
  }

  if (branches.some((branch) => !branch.isActive)) {
    throw new HttpError("One or more branches are inactive", 403, "BRANCH_INACTIVE");
  }

  return uniqueBranchIds;
};

const replaceBranchAssignments = async (
  tx: Prisma.TransactionClient,
  tenantId: string,
  ownerId: number,
  branchIds: string[],
  captain: boolean
) => {
  if (captain) {
    await tx.captainBranchAssignment.deleteMany({ where: { captainId: ownerId, tenantId } });
    if (branchIds.length) {
      await tx.captainBranchAssignment.createMany({
        data: branchIds.map((branchId) => ({ captainId: ownerId, tenantId, branchId })),
      });
    }
    return;
  }

  await tx.staffBranchAssignment.deleteMany({ where: { staffId: ownerId, tenantId } });
  if (branchIds.length) {
    await tx.staffBranchAssignment.createMany({
      data: branchIds.map((branchId) => ({ staffId: ownerId, tenantId, branchId })),
    });
  }
};

const ensureCaptainHasNoActiveDeliveries = async (staffId: number, tenantId: string) => {
  const activeDelivery = await prisma.delivery.findFirst({
    where: {
      captainId: staffId,
      tenantId,
      status: { notIn: ["DELIVERED", "FAILED", "CANCELLED"] },
    },
    select: { id: true },
  });
  if (activeDelivery) {
    throw new HttpError("Captain with an active delivery cannot be deactivated or have their role changed", 409, "CAPTAIN_HAS_ACTIVE_DELIVERY");
  }
};

/**
 * CREATE STAFF USER
 */
export const createStaff = async (data: CreateStaffInput) => {
  const digits = data.phone.replace(/\D/g, "");
  const normalizedPhone = digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith("0")
      ? digits.slice(1)
      : digits;

  // Check tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: data.tenantId,
    },
  });

  if (!tenant) {
    throw new HttpError("Tenant not found", 404, "TENANT_NOT_FOUND");
  }

  // Check duplicate phone within the same tenant
  const existingStaff = await prisma.staffUser.findUnique({
    where: {
      tenantId_phone: {
        tenantId: data.tenantId,
        phone: normalizedPhone,
      },
    },
  });

  if (existingStaff) {
    throw new HttpError("Staff user with this phone number already exists for this tenant", 409, "STAFF_PHONE_CONFLICT");
  }

  const email = normalizeStaffEmail(data.email);
  await ensureUniqueStaffEmail(email);

  const branchIds = await validateBranchIds(data.tenantId, data.branchIds);
  if (data.role === "CAPTAIN" && branchIds.length === 0) {
    throw new HttpError("At least one authorized branch is required for a Captain", 400, "CAPTAIN_BRANCH_REQUIRED");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  const staff = await prisma.$transaction(async (tx) => {
    const createdStaff = await tx.staffUser.create({
      data: {
        tenantId: data.tenantId,
        fullName: data.fullName,
        phone: normalizedPhone,
        email,
        passwordHash,
        role: data.role,
        isActive: data.isActive,
      },
    });

    let branchAssignments: { branch: { id: string; name: string } }[] = [];
    if (data.role === "CAPTAIN") {
      await tx.captain.create({
        data: {
          id: createdStaff.id,
          tenantId: data.tenantId,
          captainBranchAssignments: {
            create: branchIds.map((branchId) => ({ tenantId: data.tenantId, branchId })),
          },
        },
      });
      branchAssignments = await tx.captainBranchAssignment.findMany({
        where: { captainId: createdStaff.id, tenantId: data.tenantId, branch: { tenantId: data.tenantId } },
        select: { branch: { select: { id: true, name: true } } },
      });
    } else if (branchIds.length) {
      await tx.staffBranchAssignment.createMany({
        data: branchIds.map((branchId) => ({
          staffId: createdStaff.id,
          tenantId: data.tenantId,
          branchId,
        })),
      });
      branchAssignments = await tx.staffBranchAssignment.findMany({
        where: { staffId: createdStaff.id, tenantId: data.tenantId, branch: { tenantId: data.tenantId } },
        select: { branch: { select: { id: true, name: true } } },
      });
    }

    return {
      ...createdStaff,
      branchAssignments: branchAssignments.map(({ branch }) => ({ id: branch.id, name: branch.name })),
    };
  });

  // Never return passwordHash
  const { passwordHash: _, ...staffResponse } = staff;

  const responseBranchIds = staff.branchAssignments.map(({ id }) => id);
  return {
    ...staffResponse,
    branchIds: responseBranchIds,
    ...(responseBranchIds.length === 1 ? { branchId: responseBranchIds[0] } : {}),
    ...(staff.role === "CAPTAIN" ? { captainId: staff.id } : {}),
  };
};

/**
 * GET ALL STAFF USERS
 */
export const getAllStaff = async (tenantId: string) => {
  const staffUsers = await prisma.staffUser.findMany({
    where: { tenantId },
    orderBy: {
      createdAt: "desc",
    },
  });

  return staffUsers.map(({ passwordHash: _, ...staff }) => staff);
};

/**
 * GET STAFF USER BY ID
 */
export const getStaffById = async (id: number, tenantId: string) => {
  const staff = await prisma.staffUser.findFirst({
    where: { id, tenantId },
  });

  if (!staff) {
    throw new HttpError("Staff user not found", 404, "STAFF_NOT_FOUND");
  }

  const { passwordHash: _, ...staffResponse } = staff;

  return staffResponse;
};

/**
 * GET STAFF USERS BY TENANT
 */
export const getStaffByTenant = async (tenantId: string) => {
  // Check tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: tenantId,
    },
  });

  if (!tenant) {
    throw new HttpError("Tenant not found", 404, "TENANT_NOT_FOUND");
  }

  const staffUsers = await prisma.staffUser.findMany({
    where: {
      tenantId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return staffUsers.map(({ passwordHash: _, ...staff }) => staff);
};

/**
 * UPDATE STAFF USER
 */
export const updateStaff = async (
  id: number,
  tenantId: string,
  data: UpdateStaffInput
) => {
  const existingStaff = await prisma.staffUser.findFirst({
    where: { id, tenantId },
  });

  if (!existingStaff) {
    throw new HttpError("Staff user not found", 404, "STAFF_NOT_FOUND");
  }

  if (
    existingStaff.role === "CAPTAIN" &&
    ((data.role !== undefined && data.role !== "CAPTAIN") || data.isActive === false)
  ) {
    await ensureCaptainHasNoActiveDeliveries(id, tenantId);
  }

  if (data.email !== undefined) {
    await ensureUniqueStaffEmail(data.email, id);
  }

  const branchIds = data.branchIds === undefined
    ? undefined
    : await validateBranchIds(tenantId, data.branchIds);
  const targetRole = data.role ?? existingStaff.role;
  if (targetRole === "CAPTAIN" && branchIds?.length === 0) {
    throw new HttpError("At least one authorized branch is required for a Captain", 400, "CAPTAIN_BRANCH_REQUIRED");
  }

  const staffBranchIds = targetRole !== "CAPTAIN" && branchIds === undefined &&
    existingStaff.role === "CAPTAIN" && data.role !== undefined
    ? (await prisma.captainBranchAssignment.findMany({
        where: { captainId: id, tenantId, branch: { tenantId } },
        select: { branchId: true },
      })).map(({ branchId }) => branchId)
    : undefined;

  if (targetRole === "CAPTAIN" && branchIds === undefined) {
    const existingCaptainBranches = await prisma.captainBranchAssignment.count({
      where: { captainId: id, tenantId, branch: { tenantId } },
    });
    if (existingCaptainBranches === 0) {
      throw new HttpError("At least one authorized branch is required for a Captain", 400, "CAPTAIN_BRANCH_REQUIRED");
    }
  }

  // Check duplicate phone if phone is being changed
  if (data.phone && data.phone !== existingStaff.phone) {
    const phoneExists = await prisma.staffUser.findUnique({
      where: {
        tenantId_phone: {
          tenantId: existingStaff.tenantId,
          phone: data.phone,
        },
      },
    });

    if (phoneExists && phoneExists.id !== id) {
      throw new HttpError("Staff user with this phone number already exists for this tenant", 409, "STAFF_PHONE_CONFLICT");
    }
  }

  const updateData: {
    fullName?: string;
    phone?: string;
    email?: string | null;
    passwordHash?: string;
    role?: UpdateStaffInput["role"];
    isActive?: boolean;
  } = {};

  if (data.fullName !== undefined) {
    updateData.fullName = data.fullName;
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone;
  }

  if (data.email !== undefined) {
    updateData.email = normalizeStaffEmail(data.email);
  }

  if (data.role !== undefined) {
    updateData.role = data.role;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  // Hash new password only when password is provided
  if (data.password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
  }

  const updatedStaff = await prisma.$transaction(async (tx) => {
    const staff = await tx.staffUser.update({
      where: { id, tenantId },
      data: updateData,
    });

    if (targetRole === "CAPTAIN") {
      await tx.captain.upsert({
        where: { id },
        create: { id, tenantId },
        update: {},
      });
    }

    if (branchIds !== undefined) {
      await replaceBranchAssignments(tx, tenantId, id, branchIds, targetRole === "CAPTAIN");
    } else if (staffBranchIds !== undefined) {
      await replaceBranchAssignments(tx, tenantId, id, staffBranchIds, false);
    }

    return staff;
  });

  const { passwordHash: _, ...staffResponse } = updatedStaff;

  return staffResponse;
};

/**
 * DEACTIVATE STAFF USER
 */
export const deleteStaff = async (id: number, tenantId: string) => {
  const existingStaff = await prisma.staffUser.findFirst({
    where: { id, tenantId },
  });

  if (!existingStaff) {
    throw new HttpError("Staff user not found", 404, "STAFF_NOT_FOUND");
  }

  if (existingStaff.role === "CAPTAIN") {
    await ensureCaptainHasNoActiveDeliveries(id, tenantId);
  }

  const staff = await prisma.staffUser.update({
    where: { id, tenantId },
    data: {
      isActive: false,
    },
  });

  const { passwordHash: _, ...staffResponse } = staff;

  return staffResponse;
};