import { DiscountType } from "@prisma/client";

export type CreateCouponInput = {
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  startDate: Date | string;
  endDate: Date | string;
  isActive?: boolean;
};

export type UpdateCouponInput = Partial<{
  description: string | null;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
}>;

export type CouponValidationInput = {
  code: string;
  orderAmount: number;
};

export type CouponValidationResult = {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  eligibleAmount: number;
  finalAmount: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
};
