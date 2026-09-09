import { DiscountType, Prisma } from "@prisma/client";

import { logger } from "../../common/logger/logger";
import { prisma } from "../../database/prisma";
import {
  CreateCouponInput,
  CouponValidationInput,
  CouponValidationResult,
  UpdateCouponInput,
} from "./coupon.types";

const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

const calculateCouponDiscount = (
  discountType: DiscountType,
  discountValue: number,
  eligibleAmount: number,
  maximumDiscountAmount?: number | null
) => {
  let discount = 0;

  if (discountType === "PERCENTAGE") {
    discount = (eligibleAmount * discountValue) / 100;
    if (maximumDiscountAmount !== null && maximumDiscountAmount !== undefined) {
      discount = Math.min(discount, maximumDiscountAmount);
    }
  }

  if (discountType === "FIXED_AMOUNT") {
    discount = Math.min(discountValue, eligibleAmount);
  }

  return Number(Math.max(0, Math.min(discount, eligibleAmount)).toFixed(2));
};

export const createCoupon = async (tenantId: string, createdBy: number | null, data: CreateCouponInput) => {
  const code = normalizeCouponCode(data.code);

  const existing = await prisma.coupon.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });

  if (existing) {
    throw new Error("COUPON_ALREADY_EXISTS");
  }

  if (data.discountType === "PERCENTAGE" && (data.discountValue <= 0 || data.discountValue > 100)) {
    throw new Error("INVALID_DISCOUNT_VALUE");
  }

  if (data.discountType === "FIXED_AMOUNT" && data.discountValue <= 0) {
    throw new Error("INVALID_DISCOUNT_VALUE");
  }

  if (data.minimumOrderAmount < 0) {
    throw new Error("INVALID_MINIMUM_ORDER_AMOUNT");
  }

  if (data.maximumDiscountAmount !== null && data.maximumDiscountAmount !== undefined && data.maximumDiscountAmount < 0) {
    throw new Error("INVALID_MAXIMUM_DISCOUNT_AMOUNT");
  }

  if (data.usageLimit !== null && data.usageLimit !== undefined && data.usageLimit <= 0) {
    throw new Error("INVALID_USAGE_LIMIT");
  }

  if (data.perCustomerLimit !== null && data.perCustomerLimit !== undefined && data.perCustomerLimit <= 0) {
    throw new Error("INVALID_PER_CUSTOMER_LIMIT");
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("INVALID_DATE_RANGE");
  }

  if (endDate <= startDate) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const coupon = await prisma.coupon.create({
    data: {
      tenantId,
      code,
      description: data.description ?? null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minimumOrderAmount,
      maxDiscountAmount: data.maximumDiscountAmount ?? null,
      usageLimit: data.usageLimit ?? null,
      perCustomerUsageLimit: data.perCustomerLimit ?? 1,
      validFrom: startDate,
      validTo: endDate,
      isActive: data.isActive ?? true,
      createdBy,
    },
  });

  logger.info("[Coupon] Coupon created");
  return coupon;
};

export const listCoupons = async (tenantId: string, filters?: { isActive?: boolean; discountType?: DiscountType; search?: string }) => {
  const where: Prisma.CouponWhereInput = {
    tenantId,
  };

  if (typeof filters?.isActive === "boolean") {
    where.isActive = filters.isActive;
  }

  if (filters?.discountType) {
    where.discountType = filters.discountType;
  }

  if (filters?.search) {
    where.code = {
      contains: normalizeCouponCode(filters.search),
      mode: "insensitive",
    };
  }

  return prisma.coupon.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
};

export const getCouponById = async (tenantId: string, couponId: number) => {
  const coupon = await prisma.coupon.findFirst({
    where: {
      id: couponId,
      tenantId,
    },
  });

  if (!coupon) {
    throw new Error("COUPON_NOT_FOUND");
  }

  return coupon;
};

export const updateCoupon = async (
  tenantId: string,
  couponId: number,
  data: UpdateCouponInput
) => {
  const coupon = await getCouponById(tenantId, couponId);

  const nextData: Prisma.CouponUpdateInput = {
    description: data.description ?? undefined,
    discountValue: data.discountValue ?? undefined,
    minOrderValue: data.minimumOrderAmount ?? undefined,
    maxDiscountAmount: data.maximumDiscountAmount ?? undefined,
    usageLimit: data.usageLimit ?? undefined,
    perCustomerUsageLimit: data.perCustomerLimit ?? undefined,
    isActive: data.isActive ?? undefined,
  };

  if (data.startDate) {
    nextData.validFrom = new Date(data.startDate);
  }

  if (data.endDate) {
    nextData.validTo = new Date(data.endDate);
  }

  if (
    (data.startDate || data.endDate) &&
    !(data.startDate && data.endDate) &&
    ((data.startDate && new Date(data.startDate) >= new Date(coupon.validTo)) || (data.endDate && new Date(data.endDate) <= new Date(coupon.validFrom)))
  ) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const validFrom = data.startDate ? new Date(data.startDate) : coupon.validFrom;
  const validTo = data.endDate ? new Date(data.endDate) : coupon.validTo;

  if (validTo <= validFrom) {
    throw new Error("INVALID_DATE_RANGE");
  }

  const updated = await prisma.coupon.update({
    where: { id: couponId },
    data: nextData,
  });

  logger.info("[Coupon] Coupon updated");
  return updated;
};

export const disableCoupon = async (tenantId: string, couponId: number, isActive: boolean) => {
  const coupon = await getCouponById(tenantId, couponId);

  const updated = await prisma.coupon.update({
    where: { id: couponId },
    data: { isActive },
  });

  logger.info("[Coupon] Coupon status updated");
  return updated;
};

export const validateCouponForCustomer = async (
  tenantId: string,
  customerId: number,
  input: CouponValidationInput
): Promise<CouponValidationResult> => {
  const code = normalizeCouponCode(input.code);

  const coupon = await prisma.coupon.findFirst({
    where: {
      tenantId,
      code,
    },
  });

  if (!coupon) {
    throw new Error("COUPON_NOT_FOUND");
  }

  if (!coupon.isActive) {
    throw new Error("COUPON_INACTIVE");
  }

  const now = new Date();
  if (now < coupon.validFrom) {
    throw new Error("COUPON_NOT_STARTED");
  }

  if (now > coupon.validTo) {
    throw new Error("COUPON_EXPIRED");
  }

  const eligibleAmount = Number(input.orderAmount);
  if (eligibleAmount < Number(coupon.minOrderValue)) {
    throw new Error("MINIMUM_ORDER_AMOUNT_NOT_MET");
  }

  const usageLimit = coupon.usageLimit ?? null;
  if (usageLimit !== null) {
    const usedCount = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, tenantId },
    });

    if (usedCount >= usageLimit) {
      throw new Error("COUPON_USAGE_LIMIT_REACHED");
    }
  }

  const customerUsageCount = await prisma.couponRedemption.count({
    where: {
      couponId: coupon.id,
      tenantId,
      customerId,
    },
  });

  if (customerUsageCount >= coupon.perCustomerUsageLimit) {
    throw new Error("CUSTOMER_COUPON_LIMIT_REACHED");
  }

  const discountAmount = calculateCouponDiscount(
    coupon.discountType,
    Number(coupon.discountValue),
    eligibleAmount,
    coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null
  );

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    discountAmount,
    eligibleAmount,
    finalAmount: Number((eligibleAmount - discountAmount).toFixed(2)),
    minimumOrderAmount: Number(coupon.minOrderValue),
    maximumDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
  };
};

export const consumeCouponUsage = async (
  tenantId: string,
  customerId: number,
  orderId: number,
  couponId: number,
  discountAmount: number
) => {
  const existing = await prisma.couponRedemption.findFirst({
    where: {
      couponId,
      tenantId,
      customerId,
      orderId,
    },
  });

  if (existing) {
    return existing;
  }

  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
  });

  if (!coupon || coupon.tenantId !== tenantId) {
    throw new Error("TENANT_ACCESS_DENIED");
  }

  return prisma.$transaction(async (tx) => {
    const usageLimit = coupon.usageLimit ?? null;
    if (usageLimit !== null) {
      const currentUses = await tx.couponRedemption.count({
        where: { couponId },
      });

      if (currentUses >= usageLimit) {
        throw new Error("COUPON_USAGE_LIMIT_REACHED");
      }
    }

    const customerUses = await tx.couponRedemption.count({
      where: {
        couponId,
        customerId,
      },
    });

    if (customerUses >= coupon.perCustomerUsageLimit) {
      throw new Error("CUSTOMER_COUPON_LIMIT_REACHED");
    }

    const result = await tx.couponRedemption.create({
      data: {
        tenantId,
        couponId,
        customerId,
        orderId,
        discountAmount,
      },
    });

    await tx.coupon.update({
      where: { id: couponId },
      data: {
        // usage count is inferred from CouponRedemption count in V1
      },
    });

    return result;
  });
};
