import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";

import { prisma } from "../../../database/prisma";
import { AdminJwtPayload } from "../../../middlewares/admin-auth.middleware";
import {
  AdminLoginInput,
  AdminSignupInput,
  AdminSafeOutput,
} from "./admin.types";

const sanitizeAdmin = (admin: {
  id: number;
  username: string;
  name: string;
  tenantId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AdminSafeOutput => ({
  id: admin.id,
  username: admin.username,
  name: admin.name,
  tenantId: admin.tenantId,
  isActive: admin.isActive,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt,
});

export const signupAdmin = async (
  data: AdminSignupInput
): Promise<AdminSafeOutput> => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: data.tenantId },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const existingAdmin = await prisma.admin.findUnique({
    where: { username: data.username },
  });

  if (existingAdmin) {
    throw new Error("Admin already exists with this username");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const admin = await prisma.admin.create({
    data: {
      username: data.username,
      passwordHash,
      name: data.name,
      tenantId: data.tenantId,
      isActive: true,
    },
  });

  return sanitizeAdmin(admin);
};

export const loginAdmin = async (data: AdminLoginInput) => {
  const admin = await prisma.admin.findUnique({
    where: { username: data.username },
  });

  if (!admin) {
    throw new Error("Invalid username or password");
  }

  if (!admin.isActive) {
    throw new Error("Admin account is inactive");
  }

  const passwordMatches = await bcrypt.compare(data.password, admin.passwordHash);

  if (!passwordMatches) {
    throw new Error("Invalid username or password");
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT secret is not configured");
  }

  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

  const payload: AdminJwtPayload = {
    adminId: admin.id,
    username: admin.username,
    tenantId: admin.tenantId,
    role: "ADMIN",
  };

  const signOptions: SignOptions = {
    expiresIn: jwtExpiresIn as SignOptions["expiresIn"],
  };

  const token = jwt.sign(payload, jwtSecret, signOptions);

  return {
    token,
    admin: sanitizeAdmin(admin),
  };
};
