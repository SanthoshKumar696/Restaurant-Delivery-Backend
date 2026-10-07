import bcrypt from "bcrypt";
import { HttpError } from "../../common/errors/http-error";
import { prisma } from "../../database/prisma";
import {
  CreateStaffInput,
  UpdateStaffInput,
} from "./staff.types";

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
        phone: data.phone,
      },
    },
  });

  if (existingStaff) {
    throw new HttpError("Staff user with this phone number already exists for this tenant", 409, "STAFF_PHONE_CONFLICT");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  const staff = await prisma.$transaction(async (tx) => {
    const createdStaff = await tx.staffUser.create({
      data: {
        tenantId: data.tenantId,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        passwordHash,
        role: data.role,
        isActive: data.isActive,
      },
    });

    if (data.role === "CAPTAIN") {
      await tx.captain.create({
        data: { id: createdStaff.id, tenantId: data.tenantId },
      });
    }

    return createdStaff;
  });

  // Never return passwordHash
  const { passwordHash: _, ...staffResponse } = staff;

  return staffResponse;
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
    updateData.email = data.email;
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

    if (data.role === "CAPTAIN") {
      await tx.captain.upsert({
        where: { id },
        create: { id, tenantId },
        update: {},
      });
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