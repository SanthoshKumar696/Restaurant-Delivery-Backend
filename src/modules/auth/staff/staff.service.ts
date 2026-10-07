import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../../../database/prisma";
import { HttpError } from "../../../common/errors/http-error";
import { StaffRole } from "@prisma/client";

export const loginStaff = async (data: {
  tenantId: string;
  phone?: string;
  email?: string;
  password: string;
}) => {
  const staff = await prisma.staffUser.findFirst({
    where: {
      tenantId: data.tenantId,
      OR: [
        ...(data.phone ? [{ phone: data.phone }] : []),
        ...(data.email ? [{ email: data.email }] : []),
      ],
    },
  });
  if (!staff || !staff.isActive) throw new HttpError("Invalid phone number or password", 401, "INVALID_CREDENTIALS");

  const passwordMatches = await bcrypt.compare(data.password, staff.passwordHash);
  if (!passwordMatches) throw new HttpError("Invalid phone number or password", 401, "INVALID_CREDENTIALS");

  if (staff.role === "CAPTAIN") {
    const captain = await prisma.captain.findFirst({
      where: { id: staff.id, tenantId: staff.tenantId },
      select: { id: true },
    });
    if (!captain) throw new HttpError("Captain profile is not configured", 403, "CAPTAIN_PROFILE_MISSING");
  }

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

  const { passwordHash: _passwordHash, ...safeStaff } = staff;
  return { token, staff: safeStaff };
};