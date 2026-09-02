import { Request, Response } from "express";
import {
  createBanner,
  getAllBannersAdmin,
  getActiveBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  updateBannerStatus,
} from "./banner.service";
import { CreateBannerInput, UpdateBannerInput } from "./banner.types";
import { errorResponse, successResponse } from "../../utils/response";

/**
 * Create a new banner
 */
export const createBannerController = async (req: Request, res: Response) => {
  try {
    const data: CreateBannerInput = req.body;
    const banner = await createBanner(data);
    return successResponse(res, "Banner created successfully", banner, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || "Error creating banner", 400);
  }
};

/**
 * Get all banners for admin
 */
export const getAllBannersAdminController = async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.admin?.tenantId;
    
    if (!tenantId) {
      return errorResponse(res, "Tenant ID is required", 400);
    }

    const banners = await getAllBannersAdmin(tenantId);
    return successResponse(res, "Banners fetched successfully", banners, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Error fetching banners", 400);
  }
};

/**
 * Get active banners (public - customer facing)
 */
export const getActiveBannersController = async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || "T001"; // Default to T001 for single restaurant
    const banners = await getActiveBanners(tenantId);
    return successResponse(res, "Active banners fetched successfully", banners, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Error fetching banners", 400);
  }
};

/**
 * Get banner by ID
 */
export const getBannerByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const bannerId = parseInt(id, 10);
    const tenantId = req.admin?.tenantId;

    if (!tenantId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const banner = await getBannerById(bannerId, tenantId);
    return successResponse(res, "Banner fetched successfully", banner, 200);
  } catch (error: any) {
    if (error.message === "Banner not found" || error.message === "Banner not found for this tenant") {
      return errorResponse(res, "Banner not found", 404);
    }
    return errorResponse(res, error.message || "Error fetching banner", 400);
  }
};

/**
 * Update banner
 */
export const updateBannerController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const bannerId = parseInt(id, 10);
    const tenantId = req.admin?.tenantId;
    const data: UpdateBannerInput = req.body;

    if (!tenantId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const banner = await updateBanner(bannerId, tenantId, data);
    return successResponse(res, "Banner updated successfully", banner, 200);
  } catch (error: any) {
    if (error.message === "Banner not found" || error.message === "Banner not found for this tenant") {
      return errorResponse(res, "Banner not found", 404);
    }
    return errorResponse(res, error.message || "Error updating banner", 400);
  }
};

/**
 * Delete banner
 */
export const deleteBannerController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const bannerId = parseInt(id, 10);
    const tenantId = req.admin?.tenantId;

    if (!tenantId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    await deleteBanner(bannerId, tenantId);
    return successResponse(res, "Banner deleted successfully", {}, 200);
  } catch (error: any) {
    if (error.message === "Banner not found" || error.message === "Banner not found for this tenant") {
      return errorResponse(res, "Banner not found", 404);
    }
    return errorResponse(res, error.message || "Error deleting banner", 400);
  }
};

/**
 * Update banner status
 */
export const updateBannerStatusController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { isActive } = req.body;
    const bannerId = parseInt(id, 10);
    const tenantId = req.admin?.tenantId;

    if (!tenantId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const banner = await updateBannerStatus(bannerId, tenantId, isActive);
    return successResponse(res, "Banner status updated successfully", banner, 200);
  } catch (error: any) {
    if (error.message === "Banner not found" || error.message === "Banner not found for this tenant") {
      return errorResponse(res, "Banner not found", 404);
    }
    return errorResponse(res, error.message || "Error updating banner status", 400);
  }
};
