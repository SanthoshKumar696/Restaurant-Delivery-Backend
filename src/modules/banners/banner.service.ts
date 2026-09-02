import { prisma } from "../../database/prisma";
import { CreateBannerInput, UpdateBannerInput, BannerResponse, PublicBannerResponse } from "./banner.types";
import { logger } from "../../common/logger/logger";

/**
 * Create a new banner
 */
export const createBanner = async (data: CreateBannerInput): Promise<BannerResponse> => {
  try {
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const banner = await prisma.banner.create({
      data: {
        tenantId: data.tenantId,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        offerText: data.offerText,
        couponCode: data.couponCode,
        startDate: data.startDate,
        endDate: data.endDate,
        displayOrder: data.displayOrder || 0,
        isActive: data.isActive !== false,
      },
    });

    logger.info(`Banner created: ${banner.id} for tenant ${data.tenantId}`);
    return banner as BannerResponse;
  } catch (error) {
    logger.error(`Error creating banner: ${error}`);
    throw error;
  }
};

/**
 * Get all banners for admin (with filters)
 */
export const getAllBannersAdmin = async (tenantId: string): Promise<BannerResponse[]> => {
  try {
    const banners = await prisma.banner.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    return banners as BannerResponse[];
  } catch (error) {
    logger.error(`Error fetching banners for admin: ${error}`);
    throw error;
  }
};

/**
 * Get all active banners for public view (customer-facing)
 */
export const getActiveBanners = async (tenantId?: string): Promise<PublicBannerResponse[]> => {
  try {
    const now = new Date();

    const where: any = {
      isActive: true,
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Filter out banners with start date in the future
    const banners = await prisma.banner.findMany({
      where,
      orderBy: {
        displayOrder: "asc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        offerText: true,
        couponCode: true,
        displayOrder: true,
      },
    });

    // Filter banners based on date range
    const activeBanners = banners.filter((banner: any) => {
      // Check if start date is in the future
      const startDate = banner.description?.includes("startDate")
        ? new Date(banner.description)
        : null;
      if (startDate && startDate > now) {
        return false;
      }

      // Check if end date has passed
      const endDate = banner.description?.includes("endDate")
        ? new Date(banner.description)
        : null;
      if (endDate && endDate < now) {
        return false;
      }

      return true;
    });

    return activeBanners as PublicBannerResponse[];
  } catch (error) {
    logger.error(`Error fetching active banners: ${error}`);
    throw error;
  }
};

/**
 * Get banner by ID
 */
export const getBannerById = async (id: number, tenantId: string): Promise<BannerResponse> => {
  try {
    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new Error("Banner not found");
    }

    if (banner.tenantId !== tenantId) {
      throw new Error("Banner not found for this tenant");
    }

    return banner as BannerResponse;
  } catch (error) {
    logger.error(`Error fetching banner by ID: ${error}`);
    throw error;
  }
};

/**
 * Update banner
 */
export const updateBanner = async (
  id: number,
  tenantId: string,
  data: UpdateBannerInput
): Promise<BannerResponse> => {
  try {
    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new Error("Banner not found");
    }

    if (banner.tenantId !== tenantId) {
      throw new Error("Banner not found for this tenant");
    }

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        title: data.title ?? banner.title,
        description: data.description ?? banner.description,
        imageUrl: data.imageUrl ?? banner.imageUrl,
        offerText: data.offerText ?? banner.offerText,
        couponCode: data.couponCode ?? banner.couponCode,
        startDate: data.startDate ?? banner.startDate,
        endDate: data.endDate ?? banner.endDate,
        displayOrder: data.displayOrder ?? banner.displayOrder,
        isActive: data.isActive ?? banner.isActive,
        updatedAt: new Date(),
      },
    });

    logger.info(`Banner updated: ${id}`);
    return updated as BannerResponse;
  } catch (error) {
    logger.error(`Error updating banner: ${error}`);
    throw error;
  }
};

/**
 * Delete banner
 */
export const deleteBanner = async (id: number, tenantId: string): Promise<void> => {
  try {
    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new Error("Banner not found");
    }

    if (banner.tenantId !== tenantId) {
      throw new Error("Banner not found for this tenant");
    }

    await prisma.banner.delete({
      where: { id },
    });

    logger.info(`Banner deleted: ${id}`);
  } catch (error) {
    logger.error(`Error deleting banner: ${error}`);
    throw error;
  }
};

/**
 * Update banner status (activate/deactivate)
 */
export const updateBannerStatus = async (
  id: number,
  tenantId: string,
  isActive: boolean
): Promise<BannerResponse> => {
  try {
    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new Error("Banner not found");
    }

    if (banner.tenantId !== tenantId) {
      throw new Error("Banner not found for this tenant");
    }

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        isActive,
        updatedAt: new Date(),
      },
    });

    logger.info(`Banner status updated: ${id} - isActive: ${isActive}`);
    return updated as BannerResponse;
  } catch (error) {
    logger.error(`Error updating banner status: ${error}`);
    throw error;
  }
};
