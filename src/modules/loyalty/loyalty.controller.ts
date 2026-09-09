import { NextFunction, Request, Response } from "express";

import { prisma } from "../../database/prisma";
import { errorResponse, successResponse } from "../../utils/response";
import {
  adjustCustomerLoyalty,
  getCustomerLoyaltySummary,
  getCustomerLoyaltyTransactions,
  validateCustomerRedemption,
} from "./loyalty.service";

export const getCustomerLoyaltyController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getCustomerLoyaltySummary(req.customer!.tenantId, req.customer!.customerId);
    return successResponse(res, "Loyalty balance fetched successfully", result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loyalty fetch failed";
    if (message === "CUSTOMER_NOT_FOUND") {
      return errorResponse(res, "Customer not found", 404, "CUSTOMER_NOT_FOUND");
    }
    return next(error);
  }
};

export const getCustomerLoyaltyTransactionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getCustomerLoyaltyTransactions(req.customer!.tenantId, req.customer!.customerId);
    return successResponse(res, "Loyalty transaction history fetched successfully", result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loyalty history fetch failed";
    if (message === "CUSTOMER_NOT_FOUND") {
      return errorResponse(res, "Customer not found", 404, "CUSTOMER_NOT_FOUND");
    }
    return next(error);
  }
};

export const validateCustomerRedemptionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await validateCustomerRedemption(req.customer!.tenantId, req.customer!.customerId, req.body);
    return successResponse(res, "Loyalty redemption validation succeeded", result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loyalty redemption validation failed";
    if (message === "INVALID_POINT_AMOUNT") {
      return errorResponse(res, "Points must be a positive integer", 400, "INVALID_POINT_AMOUNT");
    }
    if (message === "INSUFFICIENT_LOYALTY_POINTS") {
      return errorResponse(res, "Insufficient loyalty points", 400, "INSUFFICIENT_LOYALTY_POINTS");
    }
    if (message === "CUSTOMER_NOT_FOUND") {
      return errorResponse(res, "Customer not found", 404, "CUSTOMER_NOT_FOUND");
    }
    return next(error);
  }
};

export const getAdminCustomerLoyaltyController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = Number(req.params.customerId);
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, fullName: true, phone: true, tenantId: true },
    });

    if (!customer || customer.tenantId !== req.admin!.tenantId) {
      return errorResponse(res, "Customer not found for this tenant", 404, "CUSTOMER_NOT_FOUND");
    }

    const summary = await getCustomerLoyaltySummary(req.admin!.tenantId, customerId);
    return successResponse(res, "Customer loyalty balance fetched successfully", {
      customerId: customer.id,
      customerName: customer.fullName,
      phone: customer.phone,
      pointsBalance: summary.pointsBalance,
      lifetimeEarned: summary.lifetimeEarned,
      lifetimeRedeemed: summary.lifetimeRedeemed,
    }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin loyalty fetch failed";
    if (message === "CUSTOMER_NOT_FOUND") {
      return errorResponse(res, "Customer not found", 404, "CUSTOMER_NOT_FOUND");
    }
    return next(error);
  }
};

export const getAdminCustomerLoyaltyTransactionsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = Number(req.params.customerId);
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, tenantId: true },
    });

    if (!customer || customer.tenantId !== req.admin!.tenantId) {
      return errorResponse(res, "Customer not found for this tenant", 404, "CUSTOMER_NOT_FOUND");
    }

    const transactions = await getCustomerLoyaltyTransactions(req.admin!.tenantId, customerId);
    return successResponse(res, "Customer loyalty transactions fetched successfully", transactions, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin loyalty transactions fetch failed";
    if (message === "CUSTOMER_NOT_FOUND") {
      return errorResponse(res, "Customer not found", 404, "CUSTOMER_NOT_FOUND");
    }
    return next(error);
  }
};

export const adjustAdminCustomerLoyaltyController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = Number(req.params.customerId);
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, tenantId: true },
    });

    if (!customer || customer.tenantId !== req.admin!.tenantId) {
      return errorResponse(res, "Customer not found for this tenant", 404, "CUSTOMER_NOT_FOUND");
    }

    const result = await adjustCustomerLoyalty(req.admin!.tenantId, customerId, req.body);
    return successResponse(res, "Customer loyalty adjusted successfully", result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin loyalty adjustment failed";
    if (message === "INVALID_POINT_AMOUNT") {
      return errorResponse(res, "Points must be a non-zero integer", 400, "INVALID_POINT_AMOUNT");
    }
    if (message === "INSUFFICIENT_LOYALTY_POINTS") {
      return errorResponse(res, "Adjustment would make the loyalty balance negative", 400, "INSUFFICIENT_LOYALTY_POINTS");
    }
    if (message === "LOYALTY_NOT_FOUND") {
      return errorResponse(res, "Loyalty account not found", 404, "LOYALTY_NOT_FOUND");
    }
    return next(error);
  }
};
