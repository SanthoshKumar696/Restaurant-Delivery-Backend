import { NextFunction, Request, Response } from "express";

import { prisma } from "../database/prisma";
import { errorResponse } from "../utils/response";

export const requireTenantContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenantId =
    typeof req.query.tenantId === "string"
      ? req.query.tenantId.trim()
      : typeof req.body?.tenantId === "string"
        ? req.body.tenantId.trim()
        : "";

  if (!tenantId) {
    return errorResponse(
      res,
      "tenantId is required",
      400,
      "TENANT_ID_REQUIRED",
      "Provide tenantId to fetch menu data"
    );
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, isActive: true },
    });

    if (!tenant) {
      return errorResponse(
        res,
        "Tenant not found",
        404,
        "TENANT_NOT_FOUND",
        `No tenant exists with tenantId ${tenantId}`
      );
    }

    if (!tenant.isActive) {
      return errorResponse(res, "Tenant is inactive", 400, "TENANT_INACTIVE");
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
