import bcrypt from "bcrypt";
import { prisma } from "../../database/prisma";
import {
  CreateStaffInput,
  UpdateStaffInput,
} from "./staff.types";

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
    throw new Error("Tenant not found");
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
    throw new Error(
      "Staff user with this phone number already exists for this tenant"
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  const staff = await prisma.staffUser.create({
    data: {
      tenantId: data.tenantId,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      passwordHash,
      role: data.role,
    },
  });

  // Never return passwordHash
  const { passwordHash: _, ...staffResponse } = staff;

  return staffResponse;
};

/**
 * GET ALL STAFF USERS
 */
export const getAllStaff = async () => {
  const staffUsers = await prisma.staffUser.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return staffUsers.map(({ passwordHash: _, ...staff }) => staff);
};

/**
 * GET STAFF USER BY ID
 */
export const getStaffById = async (id: number) => {
  const staff = await prisma.staffUser.findUnique({
    where: {
      id,
    },
  });

  if (!staff) {
    throw new Error("Staff user not found");
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
    throw new Error("Tenant not found");
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
  data: UpdateStaffInput
) => {
  const existingStaff = await prisma.staffUser.findUnique({
    where: {
      id,
    },
  });

  if (!existingStaff) {
    throw new Error("Staff user not found");
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
      throw new Error(
        "Staff user with this phone number already exists for this tenant"
      );
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

  const updatedStaff = await prisma.staffUser.update({
    where: {
      id,
    },
    data: updateData,
  });

  const { passwordHash: _, ...staffResponse } = updatedStaff;

  return staffResponse;
};

/**
 * DEACTIVATE STAFF USER
 */
export const deleteStaff = async (id: number) => {
  const existingStaff = await prisma.staffUser.findUnique({
    where: {
      id,
    },
  });

  if (!existingStaff) {
    throw new Error("Staff user not found");
  }

  const staff = await prisma.staffUser.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });

  const { passwordHash: _, ...staffResponse } = staff;

  return staffResponse;
};