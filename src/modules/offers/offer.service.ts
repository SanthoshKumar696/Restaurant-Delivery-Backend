import { DiscountType, Prisma } from "@prisma/client";

import { logger } from "../../common/logger/logger";
import { prisma } from "../../database/prisma";
import { CreateOfferInput, OfferAssignmentInput, UpdateOfferInput } from "./offer.types";

const normalizeOfferName = (name: string) => name.trim();

const getDiscountValueNumber = (value: number | null | undefined) => Number(value ?? 0);

const getOfferDiscountForProduct = (discountType: DiscountType, discountValue: number | null, amount: number, maximumDiscountAmount?: number | null) => {
  if (discountType === "BUY_ONE_GET_ONE") {
    return 0;
  }

  if (discountType === "PERCENTAGE") {
    const raw = (amount * (discountValue ?? 0)) / 100;
    const capped = maximumDiscountAmount !== null && maximumDiscountAmount !== undefined ? Math.min(raw, maximumDiscountAmount) : raw;
    return Number(Math.max(0, Math.min(capped, amount)).toFixed(2));
  }

  if (discountType === "FIXED_AMOUNT") {
    const raw = discountValue ?? 0;
    return Number(Math.max(0, Math.min(raw, amount)).toFixed(2));
  }

  return 0;
};

const isOfferActiveNow = (offer: { isActive: boolean; validFrom: Date; validTo: Date }) => {
  const now = new Date();
  return offer.isActive && now >= offer.validFrom && now <= offer.validTo;
};

export const createOffer = async (tenantId: string, createdBy: number | null, data: CreateOfferInput) => {
  const name = normalizeOfferName(data.name);

  if (!name) {
    throw new Error("INVALID_OFFER_NAME");
  }

  if (data.offerType === "PERCENTAGE" && (getDiscountValueNumber(data.discountValue) <= 0 || getDiscountValueNumber(data.discountValue) > 100)) {
    throw new Error("INVALID_DISCOUNT_VALUE");
  }

  if (data.offerType === "FIXED_AMOUNT" && getDiscountValueNumber(data.discountValue) <= 0) {
    throw new Error("INVALID_DISCOUNT_VALUE");
  }

  if (data.offerType === "BUY_ONE_GET_ONE" && data.discountValue !== undefined && data.discountValue !== null && data.discountValue !== 0) {
    throw new Error("INVALID_DISCOUNT_VALUE");
  }

  if (data.minimumOrderAmount !== undefined && data.minimumOrderAmount !== null && data.minimumOrderAmount < 0) {
    throw new Error("INVALID_MINIMUM_ORDER_AMOUNT");
  }

  if (data.maximumDiscountAmount !== undefined && data.maximumDiscountAmount !== null && data.maximumDiscountAmount < 0) {
    throw new Error("INVALID_MAXIMUM_DISCOUNT_AMOUNT");
  }

  if (data.priority !== undefined && data.priority < 0) {
    throw new Error("INVALID_PRIORITY");
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("INVALID_DATE_RANGE");
  }

  if (endDate <= startDate) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const existing = await prisma.offer.findFirst({
    where: { tenantId, title: name },
  });

  if (existing) {
    throw new Error("OFFER_ALREADY_EXISTS");
  }

  const offer = await prisma.offer.create({
    data: {
      tenantId,
      title: name,
      description: data.description ?? null,
      discountType: data.offerType,
      discountValue: data.discountValue !== undefined && data.discountValue !== null ? data.discountValue : 0,
      minOrderValue: data.minimumOrderAmount ?? 0,
      maxDiscountAmount: data.maximumDiscountAmount ?? null,
      validFrom: startDate,
      validTo: endDate,
      isActive: data.isActive ?? true,
      priority: data.priority ?? 1,
      createdBy,
      bannerImageUrl: null,
      isPopup: false,
      usageLimit: null,
      perCustomerUsageLimit: 1,
      targetSegment: "ALL",
    },
  });

  logger.info(`[Offer] Created offer ${offer.id} for tenant ${tenantId}`);
  return offer;
};

export const listOffers = async (tenantId: string, filters?: { isActive?: boolean; offerType?: DiscountType; search?: string; activeNow?: boolean }) => {
  const where: Prisma.OfferWhereInput = {
    tenantId,
  };

  if (typeof filters?.isActive === "boolean") {
    where.isActive = filters.isActive;
  }

  if (filters?.offerType) {
    where.discountType = filters.offerType;
  }

  if (filters?.search) {
    where.title = {
      contains: filters.search,
      mode: "insensitive",
    };
  }

  if (filters?.activeNow) {
    const now = new Date();
    where.isActive = true;
    where.validFrom = { lte: now };
    where.validTo = { gte: now };
  }

  return prisma.offer.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: {
      offerProducts: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
};

export const getOfferById = async (tenantId: string, offerId: number) => {
  const offer = await prisma.offer.findFirst({
    where: { id: offerId, tenantId },
    include: {
      offerProducts: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!offer) {
    throw new Error("OFFER_NOT_FOUND");
  }

  return offer;
};

export const updateOffer = async (tenantId: string, offerId: number, data: UpdateOfferInput) => {
  const offer = await getOfferById(tenantId, offerId);

  if (data.offerType && data.offerType === "PERCENTAGE" && (data.discountValue === undefined || data.discountValue === null || data.discountValue <= 0 || data.discountValue > 100)) {
    throw new Error("INVALID_DISCOUNT_VALUE");
  }

  if (data.offerType && data.offerType === "FIXED_AMOUNT" && (data.discountValue === undefined || data.discountValue === null || data.discountValue <= 0)) {
    throw new Error("INVALID_DISCOUNT_VALUE");
  }

  if (data.offerType && data.offerType === "BUY_ONE_GET_ONE" && data.discountValue !== undefined && data.discountValue !== null && data.discountValue !== 0) {
    throw new Error("INVALID_DISCOUNT_VALUE");
  }

  if (data.minimumOrderAmount !== undefined && data.minimumOrderAmount !== null && data.minimumOrderAmount < 0) {
    throw new Error("INVALID_MINIMUM_ORDER_AMOUNT");
  }

  if (data.maximumDiscountAmount !== undefined && data.maximumDiscountAmount !== null && data.maximumDiscountAmount < 0) {
    throw new Error("INVALID_MAXIMUM_DISCOUNT_AMOUNT");
  }

  if (data.priority !== undefined && data.priority < 0) {
    throw new Error("INVALID_PRIORITY");
  }

  const startDate = data.startDate ? new Date(data.startDate) : offer.validFrom;
  const endDate = data.endDate ? new Date(data.endDate) : offer.validTo;

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("INVALID_DATE_RANGE");
  }

  if (endDate <= startDate) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: {
      title: data.name ?? undefined,
      description: data.description ?? undefined,
      discountType: data.offerType ?? undefined,
      discountValue: data.discountValue ?? undefined,
      minOrderValue: data.minimumOrderAmount ?? undefined,
      maxDiscountAmount: data.maximumDiscountAmount ?? undefined,
      validFrom: startDate,
      validTo: endDate,
      priority: data.priority ?? undefined,
      isActive: data.isActive ?? undefined,
    },
  });

  logger.info(`[Offer] Updated offer ${offerId} for tenant ${tenantId}`);
  return updated;
};

export const setOfferStatus = async (tenantId: string, offerId: number, isActive: boolean) => {
  const offer = await getOfferById(tenantId, offerId);

  const updated = await prisma.offer.update({
    where: { id: offer.id },
    data: { isActive },
  });

  logger.info(`[Offer] ${isActive ? "Enabled" : "Disabled"} offer ${offer.id} for tenant ${tenantId}`);
  return updated;
};

export const assignProductToOffer = async (tenantId: string, offerId: number, input: OfferAssignmentInput) => {
  const offer = await getOfferById(tenantId, offerId);

  const product = await prisma.product.findFirst({
    where: {
      id: input.productId,
      tenantId,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const existing = await prisma.offerProduct.findFirst({
    where: {
      tenantId,
      offerId,
      productId: input.productId,
    },
  });

  if (existing) {
    throw new Error("PRODUCT_ALREADY_ASSIGNED");
  }

  const assignment = await prisma.offerProduct.create({
    data: {
      tenantId,
      offerId,
      productId: input.productId,
    },
  });

  logger.info(`[Offer] Assigned product ${input.productId} to offer ${offerId} in tenant ${tenantId}`);
  return assignment;
};

export const removeProductFromOffer = async (tenantId: string, offerId: number, productId: number) => {
  const offer = await getOfferById(tenantId, offerId);

  const assignment = await prisma.offerProduct.findFirst({
    where: {
      tenantId,
      offerId,
      productId,
    },
  });

  if (!assignment) {
    throw new Error("PRODUCT_NOT_ASSIGNED");
  }

  await prisma.offerProduct.delete({
    where: {
      offerId_productId: {
        offerId,
        productId,
      },
    },
  });

  logger.info(`[Offer] Removed product ${productId} from offer ${offerId} in tenant ${tenantId}`);
  return { success: true };
};

export const getPublicOffers = async (tenantId: string) => {
  const now = new Date();

  const offers = await prisma.offer.findMany({
    where: {
      tenantId,
      isActive: true,
      validFrom: { lte: now },
      validTo: { gte: now },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: {
      offerProducts: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  logger.info(`[Offer] Fetched public offers for tenant ${tenantId} (${offers.length})`);

  return offers.map((offer) => ({
    id: offer.id,
    name: offer.title,
    description: offer.description,
    offerType: offer.discountType,
    discountValue: offer.discountType === "BUY_ONE_GET_ONE" ? null : Number(offer.discountValue),
    minimumOrderAmount: Number(offer.minOrderValue),
    maximumDiscountAmount: offer.maxDiscountAmount !== null ? Number(offer.maxDiscountAmount) : null,
    startDate: offer.validFrom.toISOString(),
    endDate: offer.validTo.toISOString(),
    products: offer.offerProducts.map((item) => ({
      id: item.product.id,
      name: item.product.name,
    })),
  }));
};

export const getPublicOfferById = async (tenantId: string, offerId: number) => {
  const now = new Date();

  const offer = await prisma.offer.findFirst({
    where: {
      id: offerId,
      tenantId,
      isActive: true,
      validFrom: { lte: now },
      validTo: { gte: now },
    },
    include: {
      offerProducts: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!offer) {
    throw new Error("OFFER_NOT_FOUND");
  }

  return {
    id: offer.id,
    name: offer.title,
    description: offer.description,
    offerType: offer.discountType,
    discountValue: offer.discountType === "BUY_ONE_GET_ONE" ? null : Number(offer.discountValue),
    minimumOrderAmount: Number(offer.minOrderValue),
    maximumDiscountAmount: offer.maxDiscountAmount !== null ? Number(offer.maxDiscountAmount) : null,
    startDate: offer.validFrom.toISOString(),
    endDate: offer.validTo.toISOString(),
    products: offer.offerProducts.map((item) => ({
      id: item.product.id,
      name: item.product.name,
    })),
  };
};

export const calculateOfferDiscount = (
  discountType: DiscountType,
  discountValue: number | null,
  amount: number,
  maximumDiscountAmount?: number | null,
  quantity = 1
) => {
  if (discountType === "BUY_ONE_GET_ONE") {
    if (quantity < 2) {
      return 0;
    }

    const freeItemAmount = amount;
    return Number(Math.max(0, freeItemAmount).toFixed(2));
  }

  const discount = getOfferDiscountForProduct(discountType, discountValue, amount, maximumDiscountAmount);
  return Number(Math.max(0, discount).toFixed(2));
};

export const findApplicableOffer = async (tenantId: string, productId: number, amount: number) => {
  const offers = await prisma.offer.findMany({
    where: {
      tenantId,
      isActive: true,
      validFrom: { lte: new Date() },
      validTo: { gte: new Date() },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: {
      offerProducts: true,
    },
  });

  const applicable = offers.filter((offer) => offer.offerProducts.some((mapping) => mapping.productId === productId));

  if (applicable.length === 0) {
    return null;
  }

  const selected = applicable[0];

  return {
    id: selected.id,
    name: selected.title,
    discountType: selected.discountType,
    discountValue: selected.discountType === "BUY_ONE_GET_ONE" ? null : Number(selected.discountValue),
    maximumDiscountAmount: selected.maxDiscountAmount !== null ? Number(selected.maxDiscountAmount) : null,
    priority: selected.priority,
    discount: calculateOfferDiscount(
      selected.discountType,
      selected.discountType === "BUY_ONE_GET_ONE" ? null : Number(selected.discountValue),
      amount,
      selected.maxDiscountAmount !== null ? Number(selected.maxDiscountAmount) : null
    ),
  };
};
