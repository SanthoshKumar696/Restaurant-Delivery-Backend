import { NextFunction, Request, Response } from "express";

import { errorResponse, successResponse } from "../../utils/response";
import {
  createCoupon,
  disableCoupon,
  getCouponById,
  listCoupons,
  updateCoupon,
  validateCouponForCustomer,
} from "./coupon.service";

export const createCouponController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const coupon = await createCoupon(req.admin!.tenantId, null, req.body);
    return successResponse(res, "Coupon created successfully", coupon, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coupon creation failed";

    if (message === "COUPON_ALREADY_EXISTS") {
      return errorResponse(res, "Coupon already exists for this tenant", 409, "COUPON_ALREADY_EXISTS");
    }
    if (message === "INVALID_DISCOUNT_VALUE") {
      return errorResponse(res, "Invalid discount value", 400, "INVALID_DISCOUNT_VALUE");
    }
    if (message === "INVALID_MINIMUM_ORDER_AMOUNT") {
      return errorResponse(res, "Minimum order amount cannot be negative", 400, "INVALID_MINIMUM_ORDER_AMOUNT");
    }
    if (message === "INVALID_MAXIMUM_DISCOUNT_AMOUNT") {
      return errorResponse(res, "Maximum discount amount cannot be negative", 400, "INVALID_MAXIMUM_DISCOUNT_AMOUNT");
    }
    if (message === "INVALID_USAGE_LIMIT") {
      return errorResponse(res, "Usage limit must be positive", 400, "INVALID_USAGE_LIMIT");
    }
    if (message === "INVALID_PER_CUSTOMER_LIMIT") {
      return errorResponse(res, "Per customer limit must be positive", 400, "INVALID_PER_CUSTOMER_LIMIT");
    }
    if (message === "INVALID_DATE_RANGE") {
      return errorResponse(res, "End date must be after start date", 400, "INVALID_DATE_RANGE");
    }
    return next(error);
  }
};

export const listCouponsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = {
      isActive: typeof req.query.isActive === "string" ? req.query.isActive === "true" : undefined,
      discountType: typeof req.query.discountType === "string" ? (req.query.discountType as any) : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
    };

    const coupons = await listCoupons(req.admin!.tenantId, filters);
    return successResponse(res, "Coupons fetched successfully", coupons, 200);
  } catch (error) {
    return next(error);
  }
};

export const getCouponByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const coupon = await getCouponById(req.admin!.tenantId, Number(req.params.id));
    return successResponse(res, "Coupon fetched successfully", coupon, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coupon lookup failed";
    if (message === "COUPON_NOT_FOUND") {
      return errorResponse(res, "Coupon not found", 404, "COUPON_NOT_FOUND");
    }
    return next(error);
  }
};

export const updateCouponController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const coupon = await updateCoupon(req.admin!.tenantId, Number(req.params.id), req.body);
    return successResponse(res, "Coupon updated successfully", coupon, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coupon update failed";
    if (message === "COUPON_NOT_FOUND") {
      return errorResponse(res, "Coupon not found", 404, "COUPON_NOT_FOUND");
    }
    if (message === "INVALID_DATE_RANGE") {
      return errorResponse(res, "End date must be after start date", 400, "INVALID_DATE_RANGE");
    }
    return next(error);
  }
};

export const updateCouponStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const coupon = await disableCoupon(req.admin!.tenantId, Number(req.params.id), req.body.isActive);
    return successResponse(res, "Coupon status updated successfully", coupon, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coupon status update failed";
    if (message === "COUPON_NOT_FOUND") {
      return errorResponse(res, "Coupon not found", 404, "COUPON_NOT_FOUND");
    }
    return next(error);
  }
};

export const validateCouponController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await validateCouponForCustomer(req.customer!.tenantId, req.customer!.customerId, req.body);
    return successResponse(res, "Coupon is valid", result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coupon validation failed";

    if (message === "COUPON_NOT_FOUND") {
      return errorResponse(res, "Coupon not found", 404, "COUPON_NOT_FOUND");
    }
    if (message === "COUPON_INACTIVE") {
      return errorResponse(res, "Coupon is inactive", 400, "COUPON_INACTIVE");
    }
    if (message === "COUPON_NOT_STARTED") {
      return errorResponse(res, "Coupon is not active yet", 400, "COUPON_NOT_STARTED");
    }
    if (message === "COUPON_EXPIRED") {
      return errorResponse(res, "Coupon has expired", 400, "COUPON_EXPIRED");
    }
    if (message === "MINIMUM_ORDER_AMOUNT_NOT_MET") {
      return errorResponse(res, "Minimum order amount not met", 400, "MINIMUM_ORDER_AMOUNT_NOT_MET");
    }
    if (message === "COUPON_USAGE_LIMIT_REACHED") {
      return errorResponse(res, "Coupon usage limit reached", 400, "COUPON_USAGE_LIMIT_REACHED");
    }
    if (message === "CUSTOMER_COUPON_LIMIT_REACHED") {
      return errorResponse(res, "Customer coupon limit reached", 400, "CUSTOMER_COUPON_LIMIT_REACHED");
    }
    return next(error);
  }
};
