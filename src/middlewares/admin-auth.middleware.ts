import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { errorResponse } from "../utils/response";

export interface AdminJwtPayload {
  adminId: number;
  username: string;
  tenantId: string;
  role: "ADMIN";
}

export const requireAdminAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization ?? req.get("Authorization");

  if (!authHeader) {
    return errorResponse(
      res,
      "Authorization token is required",
      401,
      "MISSING_TOKEN"
    );
  }

  const parts = authHeader.trim().split(/\s+/);
  const scheme = parts[0]?.toLowerCase();
  const token = parts.slice(1).join(" ");

  if (parts.length !== 2 || scheme !== "bearer" || !token) {
    return errorResponse(
      res,
      "Invalid authorization header format. Use: Bearer <token>",
      401,
      "INVALID_TOKEN_FORMAT"
    );
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return errorResponse(
      res,
      "Server authentication configuration is missing",
      500,
      "JWT_SECRET_NOT_CONFIGURED"
    );
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AdminJwtPayload;

    if (
      !decoded ||
      typeof decoded.adminId !== "number" ||
      !decoded.username ||
      !decoded.tenantId ||
      decoded.role !== "ADMIN"
    ) {
      return errorResponse(
        res,
        "Invalid token payload",
        401,
        "INVALID_TOKEN_PAYLOAD"
      );
    }

    req.admin = {
      adminId: decoded.adminId,
      username: decoded.username,
      tenantId: decoded.tenantId,
      role: decoded.role,
    };

    const requestedTenantId =
      typeof req.query.tenantId === "string"
        ? req.query.tenantId
        : typeof req.body?.tenantId === "string"
          ? req.body.tenantId
          : undefined;

    if (requestedTenantId && requestedTenantId !== decoded.tenantId) {
      return errorResponse(
        res,
        "Admin is not authorized for this tenant",
        403,
        "TENANT_ACCESS_DENIED"
      );
    }

    return next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      return errorResponse(
        res,
        "Token has expired",
        401,
        "TOKEN_EXPIRED"
      );
    }

    return errorResponse(
      res,
      "Invalid or malformed token",
      401,
      "INVALID_TOKEN"
    );
  }
};
