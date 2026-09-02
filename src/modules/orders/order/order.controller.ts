import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createOrder as createOrderService,
  getCustomerOrders as getCustomerOrdersService,
  getOrderById as getOrderByIdService,
  updateOrderStatus as updateOrderStatusService,
  cancelOrder as cancelOrderService,
} from "./order.service";

// -----------------------------------
// CREATE ORDER
// -----------------------------------

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const order =
      await createOrderService(req.body);

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------
// GET CUSTOMER ORDERS
// -----------------------------------

export const getCustomerOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = Number(
      req.params.customerId
    );

    const tenantId = String(req.query.tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const orders =
      await getCustomerOrdersService(customerId, tenantId);

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------
// GET ORDER BY ID (CUSTOMER-SPECIFIC)
// -----------------------------------

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = Number(
      req.params.customerId
    );

    const orderId = Number(req.params.id);

    const tenantId = String(req.query.tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const order =
      await getOrderByIdService(orderId, customerId, tenantId);

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------
// UPDATE ORDER STATUS (CUSTOMER-SPECIFIC)
// -----------------------------------

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = Number(
      req.params.customerId
    );

    const orderId = Number(req.params.id);

    // Customers should not be able to update order status
    return res.status(403).json({
      success: false,
      message: "Customers cannot update order status",
    });
  } catch (error) {
    next(error);
  }
};

// -----------------------------------
// CANCEL ORDER (CUSTOMER-SPECIFIC)
// -----------------------------------

export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = Number(
      req.params.customerId
    );

    const orderId = Number(req.params.id);

    const tenantId = String(req.body.tenantId || req.query.tenantId);

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const order =
      await cancelOrderService(orderId, customerId, tenantId);

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};