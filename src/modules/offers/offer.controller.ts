import { NextFunction, Request, Response } from "express";

import { errorResponse, successResponse } from "../../utils/response";
import {
  assignProductToOffer,
  createOffer,
  getOfferById,
  getPublicOfferById,
  getPublicOffers,
  listOffers,
  removeProductFromOffer,
  setOfferStatus,
  updateOffer,
} from "./offer.service";

export const createOfferController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const offer = await createOffer(req.admin!.tenantId, req.admin!.adminId, req.body);
    return successResponse(res, "Offer created successfully", offer, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Offer creation failed";

    if (message === "INVALID_OFFER_NAME") {
      return errorResponse(res, "Offer name is required", 400, "INVALID_OFFER_NAME");
    }
    if (message === "INVALID_DISCOUNT_VALUE") {
      return errorResponse(res, "Invalid discount value for offer type", 400, "INVALID_DISCOUNT_VALUE");
    }
    if (message === "INVALID_MINIMUM_ORDER_AMOUNT") {
      return errorResponse(res, "Minimum order amount cannot be negative", 400, "INVALID_MINIMUM_ORDER_AMOUNT");
    }
    if (message === "INVALID_MAXIMUM_DISCOUNT_AMOUNT") {
      return errorResponse(res, "Maximum discount amount cannot be negative", 400, "INVALID_MAXIMUM_DISCOUNT_AMOUNT");
    }
    if (message === "INVALID_PRIORITY") {
      return errorResponse(res, "Priority cannot be negative", 400, "INVALID_PRIORITY");
    }
    if (message === "INVALID_DATE_RANGE") {
      return errorResponse(res, "End date must be after start date", 400, "INVALID_DATE_RANGE");
    }
    if (message === "OFFER_ALREADY_EXISTS") {
      return errorResponse(res, "Offer already exists for this tenant", 409, "OFFER_ALREADY_EXISTS");
    }
    return next(error);
  }
};

export const listOffersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters = {
      isActive: typeof req.query.isActive === "string" ? req.query.isActive === "true" : undefined,
      offerType: typeof req.query.offerType === "string" ? (req.query.offerType as any) : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      activeNow: typeof req.query.activeNow === "string" ? req.query.activeNow === "true" : undefined,
    };

    const offers = await listOffers(req.admin!.tenantId, filters);
    return successResponse(res, "Offers fetched successfully", offers, 200);
  } catch (error) {
    return next(error);
  }
};

export const getOfferByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const offer = await getOfferById(req.admin!.tenantId, Number(req.params.id));
    return successResponse(res, "Offer fetched successfully", offer, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Offer lookup failed";
    if (message === "OFFER_NOT_FOUND") {
      return errorResponse(res, "Offer not found", 404, "OFFER_NOT_FOUND");
    }
    return next(error);
  }
};

export const updateOfferController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const offer = await updateOffer(req.admin!.tenantId, Number(req.params.id), req.body);
    return successResponse(res, "Offer updated successfully", offer, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Offer update failed";
    if (message === "OFFER_NOT_FOUND") {
      return errorResponse(res, "Offer not found", 404, "OFFER_NOT_FOUND");
    }
    if (message === "INVALID_DISCOUNT_VALUE") {
      return errorResponse(res, "Invalid discount value for offer type", 400, "INVALID_DISCOUNT_VALUE");
    }
    if (message === "INVALID_DATE_RANGE") {
      return errorResponse(res, "End date must be after start date", 400, "INVALID_DATE_RANGE");
    }
    return next(error);
  }
};

export const updateOfferStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const offer = await setOfferStatus(req.admin!.tenantId, Number(req.params.id), req.body.isActive);
    return successResponse(res, "Offer status updated successfully", offer, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Offer status update failed";
    if (message === "OFFER_NOT_FOUND") {
      return errorResponse(res, "Offer not found", 404, "OFFER_NOT_FOUND");
    }
    return next(error);
  }
};

export const assignOfferProductController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const assignment = await assignProductToOffer(req.admin!.tenantId, Number(req.params.id), req.body);
    return successResponse(res, "Product assigned to offer", assignment, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Offer product assignment failed";
    if (message === "OFFER_NOT_FOUND") {
      return errorResponse(res, "Offer not found", 404, "OFFER_NOT_FOUND");
    }
    if (message === "PRODUCT_NOT_FOUND") {
      return errorResponse(res, "Product not found", 404, "PRODUCT_NOT_FOUND");
    }
    if (message === "PRODUCT_ALREADY_ASSIGNED") {
      return errorResponse(res, "Product already assigned to this offer", 409, "PRODUCT_ALREADY_ASSIGNED");
    }
    return next(error);
  }
};

export const removeOfferProductController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await removeProductFromOffer(req.admin!.tenantId, Number(req.params.id), Number(req.params.productId));
    return successResponse(res, "Product removed from offer", result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Offer product removal failed";
    if (message === "OFFER_NOT_FOUND") {
      return errorResponse(res, "Offer not found", 404, "OFFER_NOT_FOUND");
    }
    if (message === "PRODUCT_NOT_ASSIGNED") {
      return errorResponse(res, "Product not assigned to this offer", 404, "PRODUCT_NOT_ASSIGNED");
    }
    return next(error);
  }
};

export const getPublicOffersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = typeof req.query.tenantId === "string" ? req.query.tenantId : "";

    if (!tenantId) {
      return errorResponse(res, "Tenant ID is required", 400, "TENANT_ID_REQUIRED");
    }

    const offers = await getPublicOffers(tenantId);
    return successResponse(res, "Active offers fetched successfully", offers, 200);
  } catch (error) {
    return next(error);
  }
};

export const getPublicOfferByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = typeof req.query.tenantId === "string" ? req.query.tenantId : "";

    if (!tenantId) {
      return errorResponse(res, "Tenant ID is required", 400, "TENANT_ID_REQUIRED");
    }

    const offer = await getPublicOfferById(tenantId, Number(req.params.id));
    return successResponse(res, "Offer fetched successfully", offer, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Offer lookup failed";
    if (message === "OFFER_NOT_FOUND") {
      return errorResponse(res, "Offer not found", 404, "OFFER_NOT_FOUND");
    }
    return next(error);
  }
};
