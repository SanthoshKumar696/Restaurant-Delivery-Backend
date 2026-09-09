import { NextFunction, Request, Response } from "express";

import { errorResponse, successResponse } from "../../utils/response";
import {
  createReview,
  deleteAdminReview,
  deleteReview,
  getAdminReviewById,
  getAdminReviews,
  getCustomerReviews,
  getProductReviewsPublic,
  getReviewByIdForCustomer,
  updateAdminReviewStatus,
  updateReview,
} from "./review.service";

const getStatusFromError = (error: unknown) => (error instanceof Error ? error.message : "UNKNOWN_ERROR");

export const createReviewController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await createReview(req.customer!.customerId, req.customer!.tenantId, req.body);
    return successResponse(res, "Review created successfully", result, 201);
  } catch (error) {
    const message = getStatusFromError(error);
    const map: Record<string, { message: string; status: number; code: string }> = {
      INVALID_RATING: { message: "Rating must be an integer between 1 and 5", status: 400, code: "INVALID_RATING" },
      INVALID_REVIEW_COMMENT: { message: "Review comment is invalid", status: 400, code: "INVALID_REVIEW_COMMENT" },
      ORDER_NOT_FOUND: { message: "Order not found", status: 404, code: "ORDER_NOT_FOUND" },
      ORDER_NOT_COMPLETED: { message: "This order is not eligible for review yet", status: 400, code: "ORDER_NOT_COMPLETED" },
      CUSTOMER_NOT_ORDER_OWNER: { message: "You can only review your own orders", status: 403, code: "CUSTOMER_NOT_ORDER_OWNER" },
      PRODUCT_NOT_FOUND: { message: "Product not found", status: 404, code: "PRODUCT_NOT_FOUND" },
      PRODUCT_NOT_IN_ORDER: { message: "This product is not present in the selected order", status: 400, code: "PRODUCT_NOT_IN_ORDER" },
      REVIEW_ALREADY_EXISTS: { message: "You have already reviewed this product for this order", status: 409, code: "REVIEW_ALREADY_EXISTS" },
      TENANT_ACCESS_DENIED: { message: "Tenant access denied", status: 403, code: "TENANT_ACCESS_DENIED" },
    };

    const payload = map[message];
    if (payload) {
      return errorResponse(res, payload.message, payload.status, payload.code);
    }

    return next(error);
  }
};

export const getProductReviewsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Number(req.params.productId);
    const tenantId = String(req.query.tenantId ?? "").trim();

    if (!tenantId) {
      return errorResponse(res, "Tenant ID is required", 400, "TENANT_ID_REQUIRED");
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const result = await getProductReviewsPublic(tenantId, productId, page, limit);
    return successResponse(res, "Product reviews fetched successfully", result, 200);
  } catch (error) {
    const message = getStatusFromError(error);
    if (message === "TENANT_ID_REQUIRED") {
      return errorResponse(res, "Tenant ID is required", 400, "TENANT_ID_REQUIRED");
    }
    return next(error);
  }
};

export const getMyReviewsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await getCustomerReviews(req.customer!.customerId, req.customer!.tenantId);
    return successResponse(res, "Your reviews fetched successfully", reviews, 200);
  } catch (error) {
    return next(error);
  }
};

export const getReviewByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = Number(req.params.id);
    const review = await getReviewByIdForCustomer(req.customer!.customerId, req.customer!.tenantId, reviewId);
    return successResponse(res, "Review fetched successfully", review, 200);
  } catch (error) {
    const message = getStatusFromError(error);
    if (message === "REVIEW_NOT_FOUND") {
      return errorResponse(res, "Review not found", 404, "REVIEW_NOT_FOUND");
    }
    if (message === "REVIEW_NOT_ALLOWED") {
      return errorResponse(res, "You are not allowed to view this review", 403, "REVIEW_NOT_ALLOWED");
    }
    return next(error);
  }
};

export const updateReviewController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = Number(req.params.id);
    const updateResult = await updateReview(req.customer!.customerId, req.customer!.tenantId, reviewId, req.body);
    return successResponse(res, "Review updated successfully", updateResult, 200);
  } catch (error) {
    const message = getStatusFromError(error);
    if (message === "REVIEW_NOT_FOUND") {
      return errorResponse(res, "Review not found", 404, "REVIEW_NOT_FOUND");
    }
    if (message === "REVIEW_NOT_ALLOWED") {
      return errorResponse(res, "You are not allowed to update this review", 403, "REVIEW_NOT_ALLOWED");
    }
    if (message === "INVALID_RATING") {
      return errorResponse(res, "Rating must be an integer between 1 and 5", 400, "INVALID_RATING");
    }
    if (message === "INVALID_REVIEW_COMMENT") {
      return errorResponse(res, "Review comment is invalid", 400, "INVALID_REVIEW_COMMENT");
    }
    return next(error);
  }
};

export const deleteReviewController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = Number(req.params.id);
    await deleteReview(req.customer!.customerId, req.customer!.tenantId, reviewId);
    return successResponse(res, "Review deleted successfully", null, 200);
  } catch (error) {
    const message = getStatusFromError(error);
    if (message === "REVIEW_NOT_FOUND") {
      return errorResponse(res, "Review not found", 404, "REVIEW_NOT_FOUND");
    }
    if (message === "REVIEW_NOT_ALLOWED") {
      return errorResponse(res, "You are not allowed to delete this review", 403, "REVIEW_NOT_ALLOWED");
    }
    return next(error);
  }
};

export const getAdminReviewsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      productId: req.query.productId ? Number(req.query.productId) : undefined,
      customerId: req.query.customerId ? Number(req.query.customerId) : undefined,
      rating: req.query.rating !== undefined ? Number(req.query.rating) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      orderId: req.query.orderId ? Number(req.query.orderId) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    };

    const result = await getAdminReviews(req.admin!.tenantId, filters);
    return successResponse(res, "Admin reviews fetched successfully", result, 200);
  } catch (error) {
    return next(error);
  }
};

export const getAdminReviewByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = Number(req.params.id);
    const result = await getAdminReviewById(req.admin!.tenantId, reviewId);
    return successResponse(res, "Review detail fetched successfully", result, 200);
  } catch (error) {
    const message = getStatusFromError(error);
    if (message === "REVIEW_NOT_FOUND") {
      return errorResponse(res, "Review not found", 404, "REVIEW_NOT_FOUND");
    }
    if (message === "TENANT_ACCESS_DENIED") {
      return errorResponse(res, "You do not have access to this review", 403, "TENANT_ACCESS_DENIED");
    }
    return next(error);
  }
};

export const updateAdminReviewStatusController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = Number(req.params.id);
    const status = req.body.status as "PENDING" | "APPROVED" | "REJECTED";
    const result = await updateAdminReviewStatus(req.admin!.tenantId, reviewId, status);
    return successResponse(res, "Review status updated successfully", result, 200);
  } catch (error) {
    const message = getStatusFromError(error);
    if (message === "REVIEW_NOT_FOUND") {
      return errorResponse(res, "Review not found", 404, "REVIEW_NOT_FOUND");
    }
    if (message === "TENANT_ACCESS_DENIED") {
      return errorResponse(res, "You do not have access to this review", 403, "TENANT_ACCESS_DENIED");
    }
    if (message === "INVALID_REVIEW_STATUS") {
      return errorResponse(res, "Review status is invalid", 400, "INVALID_REVIEW_STATUS");
    }
    return next(error);
  }
};

export const deleteAdminReviewController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = Number(req.params.id);
    await deleteAdminReview(req.admin!.tenantId, reviewId);
    return successResponse(res, "Review hidden successfully", null, 200);
  } catch (error) {
    const message = getStatusFromError(error);
    if (message === "REVIEW_NOT_FOUND") {
      return errorResponse(res, "Review not found", 404, "REVIEW_NOT_FOUND");
    }
    if (message === "TENANT_ACCESS_DENIED") {
      return errorResponse(res, "You do not have access to this review", 403, "TENANT_ACCESS_DENIED");
    }
    return next(error);
  }
};
