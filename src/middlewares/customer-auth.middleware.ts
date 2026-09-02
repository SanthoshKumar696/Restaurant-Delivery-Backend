import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { errorResponse } from "../utils/response";

export interface CustomerJwtPayload {
  customerId: number;
  mobileNumber: string;
  tenantId: string;
  role: "CUSTOMER";
}

export const requireCustomerAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return errorResponse(
      res,
      "Authorization token is required",
      401,
      "MISSING_TOKEN"
    );
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
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
    const decoded = jwt.verify(token, jwtSecret) as CustomerJwtPayload;

    if (
      !decoded ||
      typeof decoded.customerId !== "number" ||
      !decoded.mobileNumber ||
      !decoded.tenantId ||
      decoded.role !== "CUSTOMER"
    ) {
      return errorResponse(
        res,
        "Invalid token payload",
        401,
        "INVALID_TOKEN_PAYLOAD"
      );
    }

    req.customer = {
      customerId: decoded.customerId,
      mobileNumber: decoded.mobileNumber,
      tenantId: decoded.tenantId,
      role: decoded.role,
    };

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
