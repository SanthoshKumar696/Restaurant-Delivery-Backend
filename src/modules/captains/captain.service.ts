import bcrypt from "bcrypt";
import { HttpError } from "../../common/errors/http-error";
import { prisma } from "../../database/prisma";
import { ensureUniqueStaffEmail, normalizeStaffEmail } from "../staff/staff-email";

type CreateCaptainInput = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  isActive?: boolean;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  branchIds?: string[];
};

type UpdateCaptainInput = Partial<Omit<CreateCaptainInput, "password" | "email">> & {
  email?: string | null;
  password?: string;
};

const ensureUniqueStaffIdentity = async (tenantId: string, phone?: string, email?: string | null, excludeId?: number) => {
  if (phone) {
    const existingByPhone = await prisma.staffUser.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
      select: { id: true },
    });
    if (existingByPhone && existingByPhone.id !== excludeId) {
      throw new HttpError("Staff user with this phone number already exists for this tenant", 409, "STAFF_PHONE_CONFLICT");
    }
  }

  await ensureUniqueStaffEmail(email, excludeId);
};

const validateBranches = async (tenantId: string, branchIds: string[] = []) => {
  const uniqueBranchIds = [...new Set(branchIds)];
  const branches = uniqueBranchIds.length
    ? await prisma.branch.findMany({
        where: { tenantId, id: { in: uniqueBranchIds } },
        select: { id: true },
      })
    : [];

  if (branches.length !== uniqueBranchIds.length) {
    throw new HttpError("One or more branches do not belong to this tenant", 403, "BRANCH_ACCESS_DENIED");
  }

  return uniqueBranchIds;
};

const captainSelect = {
  id: true,
  tenantId: true,
  vehicleType: true,
  vehicleNumber: true,
  currentStatus: true,
  staffUser: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  },
  captainBranchAssignments: {
    select: { branch: { select: { id: true, name: true } } },
  },
} as const;

const toCaptainResponse = (captain: any) => ({
  id: captain.id,
  captainId: captain.id,
  staffId: captain.staffUser.id,
  fullName: captain.staffUser.fullName,
  phone: captain.staffUser.phone,
  email: captain.staffUser.email,
  role: captain.staffUser.role,
  isActive: captain.staffUser.isActive,
  vehicleType: captain.vehicleType,
  vehicleNumber: captain.vehicleNumber,
  currentStatus: captain.currentStatus,
  branchAssignments: captain.captainBranchAssignments.map(
    (assignment: any) => assignment.branch
  ),
});

export const createCaptain = async (
  tenantId: string,
  data: CreateCaptainInput
) => {
  const branchIds = await validateBranches(tenantId, data.branchIds);

  await ensureUniqueStaffIdentity(tenantId, data.phone, data.email);
  const email = normalizeStaffEmail(data.email);

  const passwordHash = await bcrypt.hash(data.password, 12);
  const captain = await prisma.$transaction(async (tx) => {
    const staff = await tx.staffUser.create({
      data: {
        tenantId,
        fullName: data.fullName,
        phone: data.phone,
        email,
        passwordHash,
        role: "CAPTAIN",
        isActive: data.isActive,
      },
    });
    await tx.captain.create({
      data: {
        id: staff.id,
        tenantId,
        vehicleType: data.vehicleType,
        vehicleNumber: data.vehicleNumber,
        captainBranchAssignments: {
          create: branchIds.map((branchId) => ({ tenantId, branchId })),
        },
      },
    });
    return tx.captain.findFirstOrThrow({
      where: { id: staff.id, tenantId },
      select: captainSelect,
    });
  });

  return toCaptainResponse(captain);
};

export const getCaptains = async (tenantId: string) => {
  const captains = await prisma.captain.findMany({
    where: { tenantId, staffUser: { role: "CAPTAIN" } },
    orderBy: { id: "asc" },
    select: captainSelect,
  });
  return captains.map(toCaptainResponse);
};

export const getAvailableCaptains = async (tenantId: string) => {
  const captains = await prisma.captain.findMany({
    where: {
      tenantId,
      currentStatus: "AVAILABLE",
      staffUser: { role: "CAPTAIN", isActive: true },
      deliveries: { none: { status: { notIn: ["DELIVERED", "FAILED", "CANCELLED"] } } },
    },
    orderBy: { id: "asc" },
    select: captainSelect,
  });
  return captains.map((captain) => ({
    ...toCaptainResponse(captain),
    availability: "AVAILABLE" as const,
  }));
};

export const getCaptainAvailability = async (tenantId: string, staffId: number) => {
  const captain = await prisma.captain.findFirst({
    where: { id: staffId, tenantId, staffUser: { role: "CAPTAIN", isActive: true } },
    select: { id: true, currentStatus: true },
  });
  if (!captain) throw new HttpError("Captain not found", 404, "CAPTAIN_NOT_FOUND");
  const activeDelivery = await prisma.delivery.findFirst({
    where: { captainId: staffId, tenantId, status: { notIn: ["DELIVERED", "FAILED", "CANCELLED"] } },
    select: { id: true },
  });
  return { captainId: captain.id, status: activeDelivery ? "BUSY" : captain.currentStatus };
};

export const updateCaptainAvailability = async (tenantId: string, staffId: number, status: "AVAILABLE" | "OFFLINE") => {
  const captain = await prisma.captain.findFirst({
    where: { id: staffId, tenantId, staffUser: { role: "CAPTAIN", isActive: true } },
    select: { id: true },
  });
  if (!captain) throw new HttpError("Captain not found", 404, "CAPTAIN_NOT_FOUND");
  const activeDelivery = await prisma.delivery.findFirst({
    where: { captainId: staffId, tenantId, status: { notIn: ["DELIVERED", "FAILED", "CANCELLED"] } },
    select: { id: true },
  });
  if (activeDelivery && status === "OFFLINE") throw new HttpError("Complete the active delivery first", 409, "CAPTAIN_BUSY");
  return prisma.captain.update({ where: { id: staffId }, data: { currentStatus: status }, select: { id: true, currentStatus: true } });
};

export const getCaptainById = async (id: number, tenantId: string) => {
  const captain = await prisma.captain.findFirst({
    where: { id, tenantId, staffUser: { role: "CAPTAIN" } },
    select: captainSelect,
  });
  if (!captain) throw new HttpError("Captain not found", 404, "CAPTAIN_NOT_FOUND");
  return toCaptainResponse(captain);
};

export const updateCaptain = async (
  id: number,
  tenantId: string,
  data: UpdateCaptainInput
) => {
  const existing = await prisma.captain.findFirst({
    where: { id, tenantId, staffUser: { role: "CAPTAIN" } },
    select: { id: true, staffUser: { select: { phone: true, email: true } } },
  });
  if (!existing) throw new HttpError("Captain not found", 404, "CAPTAIN_NOT_FOUND");

  if (data.isActive === false) {
    const activeDelivery = await prisma.delivery.findFirst({
      where: { captainId: id, tenantId, status: { notIn: ["DELIVERED", "FAILED", "CANCELLED"] } },
      select: { id: true },
    });
    if (activeDelivery) {
      throw new HttpError("Captain with an active delivery cannot be deactivated", 409, "CAPTAIN_HAS_ACTIVE_DELIVERY");
    }
  }

  const nextPhone = data.phone ?? existing.staffUser.phone;
  const nextEmail = data.email === undefined
    ? existing.staffUser.email
    : normalizeStaffEmail(data.email);

  if (data.phone && data.phone !== existing.staffUser.phone) {
    await ensureUniqueStaffIdentity(tenantId, data.phone, nextEmail, id);
  }

  if (data.email !== undefined && nextEmail !== existing.staffUser.email) {
    await ensureUniqueStaffIdentity(tenantId, nextPhone, nextEmail, id);
  }

  const branchIds = data.branchIds === undefined
    ? undefined
    : await validateBranches(tenantId, data.branchIds);

  const captain = await prisma.$transaction(async (tx) => {
    const { vehicleType, vehicleNumber, branchIds: _branchIds, password, email: _email, ...staffData } = data;
    const staffUpdateData: Record<string, unknown> = { ...staffData };
    if (data.email !== undefined) {
      staffUpdateData.email = nextEmail;
    }
    if (password !== undefined) {
      staffUpdateData.passwordHash = await bcrypt.hash(password, 12);
    }
    if (Object.keys(staffUpdateData).length) {
      await tx.staffUser.update({
        where: { id, tenantId },
        data: staffUpdateData,
      });
    }
    if (vehicleType !== undefined || vehicleNumber !== undefined) {
      await tx.captain.update({
        where: { id },
        data: { vehicleType, vehicleNumber },
      });
    }
    if (branchIds !== undefined) {
      await tx.captainBranchAssignment.deleteMany({ where: { captainId: id, tenantId } });
      if (branchIds.length) {
        await tx.captainBranchAssignment.createMany({
          data: branchIds.map((branchId) => ({ captainId: id, tenantId, branchId })),
        });
      }
    }
    return tx.captain.findFirstOrThrow({
      where: { id, tenantId },
      select: captainSelect,
    });
  });

  return toCaptainResponse(captain);
};

export const getDeliveryStaff = async (tenantId: string) => {
  const staff = await prisma.staffUser.findMany({
    where: { tenantId, role: "CAPTAIN", isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true },
  });
  return staff;
};