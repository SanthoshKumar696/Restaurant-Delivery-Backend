import { NextFunction, Request, Response } from "express";
import { errorResponse } from "../utils/response";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("Unhandled error", {
    requestId: req.get("X-Request-Id"),
    method: req.method,
    path: req.originalUrl,
    tenantId: req.query.tenantId ?? req.body?.tenantId,
    adminId: req.admin?.adminId,
    customerId: req.customer?.customerId,
    error: err,
  });

  if (err instanceof Error && err.message.startsWith("Tenant not found:")) {
    const tenantId = err.message.slice("Tenant not found: ".length);
    return errorResponse(
      res,
      "Tenant not found",
      404,
      "TENANT_NOT_FOUND",
      `No tenant exists with tenantId ${tenantId}`
    );
  }

  if (err instanceof Error && err.message === "Customer not found") {
    return errorResponse(res, "Customer not found", 404, "CUSTOMER_NOT_FOUND");
  }

  if (err instanceof Error && err.message === "Branch not found") {
    return errorResponse(res, "Branch not found", 404, "BRANCH_NOT_FOUND");
  }

  if (err instanceof Error && err.message === "Branch does not belong to this tenant") {
    return errorResponse(res, "Branch does not belong to this tenant", 403, "TENANT_ACCESS_DENIED");
  }

  if (err instanceof Error && err.message === "One or more products were not found or inactive") {
    return errorResponse(res, "One or more products were not found or inactive", 404, "PRODUCT_NOT_FOUND");
  }

  if (
    process.env.NODE_ENV !== "production" &&
    err instanceof Error &&
    (err as Error & { code?: string }).code === "ADMIN_ORDERS_FETCH_FAILED"
  ) {
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message === "Order not found") {
      return errorResponse(res, "Order not found", 404, "ORDER_NOT_FOUND");
    }
    return errorResponse(
      res,
      err.message,
      500,
      "ADMIN_ORDERS_FETCH_FAILED",
      cause instanceof Error ? cause.message : "Unexpected admin orders query error"
    );
  }

  if (
    process.env.NODE_ENV !== "production" &&
    err instanceof Error &&
    (err as Error & { code?: string }).code ===
      "ADMIN_ORDER_DETAILS_FETCH_FAILED"
  ) {
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message.startsWith("Tenant not found:")) {
      const tenantId = cause.message.slice("Tenant not found: ".length);
      return errorResponse(
        res,
        "Tenant not found",
        404,
        "TENANT_NOT_FOUND",
        `No tenant exists with tenantId ${tenantId}`
      );
    }
    if (cause instanceof Error && cause.message === "Order not found") {
      return errorResponse(res, "Order not found", 404, "ORDER_NOT_FOUND");
    }
    return errorResponse(
      res,
      err.message,
      500,
      "ADMIN_ORDER_DETAILS_FETCH_FAILED",
      cause instanceof Error ? cause.message : "Unexpected order details query error"
    );
  }

  return errorResponse(
    res,
    "Internal server error",
    500,
    "INTERNAL_SERVER_ERROR"
  );
};