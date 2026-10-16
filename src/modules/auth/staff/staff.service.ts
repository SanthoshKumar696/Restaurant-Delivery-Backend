import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../../../database/prisma";
import { HttpError } from "../../../common/errors/http-error";
import { StaffRole } from "@prisma/client";
import { normalizeStaffEmail } from "../../staff/staff-email";

export const loginStaff = async (data: {
  identifier: string;
  password: string;
}) => {
  const identifier = data.identifier.trim();
  const isEmail = identifier.includes("@");
  const matchingStaff = await prisma.staffUser.findMany({
    where: isEmail
      ? { email: normalizeStaffEmail(identifier) }
      : { phone: identifier },
    select: {
      id: true,
      tenantId: true,
      fullName: true,
      phone: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
      createdAt: true,
      staffBranchAssignments: {
        select: {
          tenantId: true,
          branch: { select: { id: true, name: true, tenantId: true } },
        },
      },
      captain: {
        select: {
          id: true,
          tenantId: true,
          captainBranchAssignments: {
            select: {
              tenantId: true,
              branch: { select: { id: true, name: true, tenantId: true } },
            },
          },
        },
      },
    },
  });

  const staff = matchingStaff[0];
  if (matchingStaff.length !== 1 || !staff || !staff.isActive) {
    throw new HttpError("Invalid identifier or password", 401, "INVALID_CREDENTIALS");
  }

  const passwordMatches = await bcrypt.compare(data.password, staff.passwordHash);
  if (!passwordMatches) throw new HttpError("Invalid identifier or password", 401, "INVALID_CREDENTIALS");

  if (staff.role === "CAPTAIN") {
    if (!staff.captain || staff.captain.tenantId !== staff.tenantId) {
      throw new HttpError("Captain profile is not configured", 403, "CAPTAIN_PROFILE_MISSING");
    }
  }

  const branchAssignments = staff.role === "CAPTAIN" && staff.captain
    ? staff.captain.captainBranchAssignments
    : staff.staffBranchAssignments;
  const branches = branchAssignments
    .filter((assignment) =>
      assignment.tenantId === staff.tenantId &&
      assignment.branch.tenantId === staff.tenantId
    )
    .map(({ branch }) => ({ id: branch.id, name: branch.name }));

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new HttpError("JWT secret is not configured", 500, "JWT_SECRET_NOT_CONFIGURED");

  const payload = {
    staffId: staff.id,
    tenantId: staff.tenantId,
    role: staff.role as StaffRole,
  };
  const token = jwt.sign(payload, jwtSecret, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"],
  });

  const safeStaff = {
    id: staff.id,
    staffId: staff.id,
    tenantId: staff.tenantId,
    fullName: staff.fullName,
    phone: staff.phone,
    email: staff.email,
    role: staff.role,
    isActive: staff.isActive,
    createdAt: staff.createdAt,
    branchAssignments: branches,
    branchIds: branches.map((branch) => branch.id),
    ...(branches.length === 1 ? { branchId: branches[0].id } : {}),
    ...(staff.captain?.tenantId === staff.tenantId ? { captainId: staff.captain.id } : {}),
  };
  return { token, staff: safeStaff };
};