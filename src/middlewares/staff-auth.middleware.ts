import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { StaffRole } from "@prisma/client";
import { prisma } from "../database/prisma";
import { errorResponse } from "../utils/response";

export interface StaffJwtPayload {
  staffId: number;
  tenantId: string;
  role: StaffRole;
}

export const requireStaffAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const [scheme, token] = authHeader?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) {
    return errorResponse(res, "Authorization token is required", 401, "MISSING_TOKEN");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return errorResponse(res, "Server authentication configuration is missing", 500, "JWT_SECRET_NOT_CONFIGURED");

  try {
    const decoded = jwt.verify(token, jwtSecret) as StaffJwtPayload;
    if (!Number.isInteger(decoded.staffId) || !decoded.tenantId || !decoded.role) {
      return errorResponse(res, "Invalid token payload", 401, "INVALID_TOKEN_PAYLOAD");
    }

    const staff = await prisma.staffUser.findFirst({
      where: { id: decoded.staffId, tenantId: decoded.tenantId, isActive: true, role: decoded.role },
      select: { id: true, tenantId: true, role: true },
    });
    if (!staff) return errorResponse(res, "Staff account is inactive or not found", 401, "STAFF_NOT_FOUND");

    req.staff = { staffId: staff.id, tenantId: staff.tenantId, role: staff.role };
    return next();
  } catch {
    return errorResponse(res, "Invalid or expired token", 401, "INVALID_TOKEN");
  }
};

export const requireCaptainAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await requireStaffAuth(req, res, async (error?: unknown) => {
    if (error) return next(error);
    if (req.staff?.role !== "CAPTAIN") {
      return errorResponse(res, "Captain access is required", 403, "CAPTAIN_ACCESS_REQUIRED");
    }
    return next();
  });
};