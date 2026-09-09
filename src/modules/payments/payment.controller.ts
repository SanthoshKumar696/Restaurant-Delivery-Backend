import { NextFunction, Request, Response } from "express";

import { errorResponse, successResponse } from "../../utils/response";
import {
  createCustomerPayment,
  getAdminPaymentById,
  getAdminPayments,
  getCustomerPaymentById,
  updateAdminPaymentStatus,
} from "./payment.service";

export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const payment = await createCustomerPayment(
      req.customer!.tenantId,
      req.customer!.customerId,
      req.body
    );

    return successResponse(
      res,
      req.body.paymentMethod === "ONLINE"
        ? "Payment initialized successfully. Online payment gateway is not configured yet."
        : "Payment initialized successfully",
      payment,
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment creation failed";

    if (message === "ORDER_NOT_FOUND") {
      return errorResponse(res, "Order not found", 404, "ORDER_NOT_FOUND");
    }

    if (message === "TENANT_ACCESS_DENIED") {
      return errorResponse(res, "Tenant access denied", 403, "TENANT_ACCESS_DENIED");
    }

    if (message === "ORDER_CUSTOMER_MISMATCH") {
      return errorResponse(res, "Order does not belong to the authenticated customer", 403, "ORDER_CUSTOMER_MISMATCH");
    }

    if (message === "PAYMENT_ALREADY_EXISTS") {
      return errorResponse(res, "A payment is already associated with this order", 409, "PAYMENT_ALREADY_EXISTS");
    }

    if (message === "INVALID_PAYMENT_METHOD") {
      return errorResponse(res, "Invalid payment method", 400, "INVALID_PAYMENT_METHOD");
    }

    return next(error);
  }
};

export const getPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentId = Number(req.params.id);
    const payment = await getCustomerPaymentById(
      req.customer!.tenantId,
      req.customer!.customerId,
      paymentId
    );

    return successResponse(res, "Payment fetched successfully", payment, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment lookup failed";

    if (message === "PAYMENT_NOT_FOUND") {
      return errorResponse(res, "Payment not found", 404, "PAYMENT_NOT_FOUND");
    }

    return next(error);
  }
};

export const listAdminPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const paymentMethod = typeof req.query.paymentMethod === "string" ? req.query.paymentMethod : undefined;
    const orderId = typeof req.query.orderId === "string" ? Number(req.query.orderId) : undefined;

    const payments = await getAdminPayments(req.admin!.tenantId, {
      status: status as any,
      paymentMethod: paymentMethod as any,
      orderId: Number.isInteger(orderId) && orderId! > 0 ? orderId : undefined,
    });

    return successResponse(res, "Payments fetched successfully", payments, 200);
  } catch (error) {
    return next(error);
  }
};

export const getAdminPaymentByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentId = Number(req.params.id);
    const payment = await getAdminPaymentById(req.admin!.tenantId, paymentId);

    return successResponse(res, "Payment details fetched successfully", payment, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment lookup failed";

    if (message === "PAYMENT_NOT_FOUND") {
      return errorResponse(res, "Payment not found", 404, "PAYMENT_NOT_FOUND");
    }

    return next(error);
  }
};

export const updatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentId = Number(req.params.id);
    const payment = await updateAdminPaymentStatus(req.admin!.tenantId, paymentId, req.body);

    return successResponse(res, "Payment status updated successfully", payment, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment update failed";

    if (message === "PAYMENT_NOT_FOUND") {
      return errorResponse(res, "Payment not found", 404, "PAYMENT_NOT_FOUND");
    }

    if (message === "INVALID_PAYMENT_STATUS") {
      return errorResponse(res, "Invalid payment status transition", 400, "INVALID_PAYMENT_STATUS");
    }

    return next(error);
  }
};
