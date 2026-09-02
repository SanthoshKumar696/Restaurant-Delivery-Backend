import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  getAdminOrders as getAdminOrdersService,
  getOrdersByStatus as getOrdersByStatusService,
  getAdminOrderById as getAdminOrderByIdService,
  updateAdminOrderStatus as updateAdminOrderStatusService,
  acceptAdminOrder as acceptAdminOrderService,
  rejectAdminOrder as rejectAdminOrderService,
  cancelAdminOrder as cancelAdminOrderService,
} from "./order.service";
import { OrderStatus, PaymentStatus } from "@prisma/client";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

// -----------------------------------
// GET ALL ADMIN ORDERS
// -----------------------------------

export const getAdminOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      typeof req.query.tenantId === "string"
        ? req.query.tenantId.trim()
        : "";

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "tenantId is required",
        error: { code: "TENANT_ID_REQUIRED", statusCode: 400 },
      });
    }

    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    const paymentStatus =
      typeof req.query.paymentStatus === "string"
        ? req.query.paymentStatus
        : undefined;

    if (status && !ORDER_STATUSES.includes(status as OrderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
        error: {
          code: "INVALID_ORDER_STATUS",
          statusCode: 400,
          details: `Supported statuses: ${ORDER_STATUSES.join(", ")}`,
        },
      });
    }

    if (
      paymentStatus &&
      !PAYMENT_STATUSES.includes(paymentStatus as PaymentStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
        error: {
          code: "INVALID_PAYMENT_STATUS",
          statusCode: 400,
          details: `Supported payment statuses: ${PAYMENT_STATUSES.join(", ")}`,
        },
      });
    }

    const orders =
      await getAdminOrdersService({
        tenantId,

        status: status as OrderStatus | undefined,
        paymentStatus: paymentStatus as PaymentStatus | undefined,
      }, req.admin!.adminId);

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Admin Orders GET failed", {
      requestId: req.get("X-Request-Id"),
      method: req.method,
      url: req.originalUrl,
      adminId: req.admin?.adminId,
      tenantId: req.query.tenantId,
      status: req.query.status,
      paymentStatus: req.query.paymentStatus,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      error,
    });
    const fetchError = new Error("Failed to fetch admin orders");
    Object.assign(fetchError, {
      code: "ADMIN_ORDERS_FETCH_FAILED",
      cause: error,
      requestId: req.get("X-Request-Id"),
    });
    next(fetchError);
  }
};

// -----------------------------------
// GET ORDERS BY STATUS
// -----------------------------------

export const getOrdersByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      typeof req.query.tenantId === "string"
        ? req.query.tenantId.trim()
        : "";

    const status =
      req.params.status as OrderStatus;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
        error: { code: "TENANT_ID_REQUIRED", statusCode: 400 },
      });
    }

    const orders =
      await getOrdersByStatusService(tenantId, status);

    return res.status(200).json({
      success: true,
      message: `Orders with status ${status} fetched successfully`,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------
// GET ADMIN ORDER BY ID
// -----------------------------------

export const getAdminOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const tenantId =
      typeof req.query.tenantId === "string"
        ? req.query.tenantId.trim()
        : "";

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
        error: { code: "TENANT_ID_REQUIRED", statusCode: 400 },
      });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
        error: { code: "INVALID_ORDER_ID", statusCode: 400 },
      });
    }

    const order =
      await getAdminOrderByIdService(
        id,
        tenantId,
        req.admin!.adminId
      );

    return res.status(200).json({
      success: true,
      message:
        "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    console.error("Admin order details GET failed", {
      requestId: req.get("X-Request-Id"),
      method: req.method,
      url: req.originalUrl,
      adminId: req.admin?.adminId,
      tenantId: req.query.tenantId,
      orderId: req.params.id,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    const fetchError = new Error("Failed to fetch admin order details");
    Object.assign(fetchError, {
      code: "ADMIN_ORDER_DETAILS_FETCH_FAILED",
      cause: error,
      requestId: req.get("X-Request-Id"),
    });
    next(fetchError);
  }
};

// -----------------------------------
// UPDATE ORDER STATUS
// -----------------------------------

export const updateAdminOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const tenantId =
      String(req.body.tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const order =
      await updateAdminOrderStatusService(
        id,
        tenantId,
        {
          status: req.body.status,
          note: req.body.note,
          changedBy: req.body.changedBy,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------
// ACCEPT ORDER
// -----------------------------------

export const acceptAdminOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const tenantId =
      String(req.body.tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const order =
      await acceptAdminOrderService(
        id,
        tenantId,
        req.body.note
      );

    return res.status(200).json({
      success: true,
      message: "Order accepted successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------
// REJECT ORDER
// -----------------------------------

export const rejectAdminOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const tenantId =
      String(req.body.tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const order =
      await rejectAdminOrderService(
        id,
        tenantId,
        req.body.note
      );

    return res.status(200).json({
      success: true,
      message: "Order rejected successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------
// CANCEL ORDER
// -----------------------------------

export const cancelAdminOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const tenantId =
      String(req.body.tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const order =
      await cancelAdminOrderService(
        id,
        tenantId,
        req.body.note
      );

    return res.status(200).json({
      success: true,
      message:
        "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};