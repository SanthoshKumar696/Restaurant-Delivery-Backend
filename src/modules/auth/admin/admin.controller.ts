import { NextFunction, Request, Response } from "express";

import { errorResponse, successResponse } from "../../../utils/response";
import { loginAdmin, signupAdmin } from "./admin.service";

export const signupAdminController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin = await signupAdmin(req.body);

    return successResponse(
      res,
      "Admin registered successfully",
      admin,
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Admin registration failed";

    if (message === "Tenant not found") {
      return errorResponse(res, message, 404, "TENANT_NOT_FOUND");
    }

    if (message === "Admin already exists with this username") {
      return errorResponse(res, message, 409, "ADMIN_ALREADY_EXISTS");
    }

    next(error);
    return;
  }
};

export const loginAdminController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await loginAdmin(req.body);

    return successResponse(
      res,
      "Admin login successful",
      result,
      200
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Admin login failed";

    if (message === "Invalid username or password") {
      return errorResponse(res, message, 401, "INVALID_CREDENTIALS");
    }

    if (message === "Admin account is inactive") {
      return errorResponse(res, message, 403, "ADMIN_INACTIVE");
    }

    if (message === "JWT secret is not configured") {
      return errorResponse(res, message, 500, "JWT_SECRET_NOT_CONFIGURED");
    }

    next(error);
    return;
  }
};
