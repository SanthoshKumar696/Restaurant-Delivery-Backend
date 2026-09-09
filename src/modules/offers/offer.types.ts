import { DiscountType } from "@prisma/client";

export type OfferType = DiscountType;

export type CreateOfferInput = {
  name: string;
  description?: string | null;
  offerType: OfferType;
  discountValue?: number | null;
  minimumOrderAmount?: number | null;
  maximumDiscountAmount?: number | null;
  startDate: string;
  endDate: string;
  priority?: number;
  isActive?: boolean;
};

export type UpdateOfferInput = Partial<{
  name: string;
  description: string | null;
  offerType: OfferType;
  discountValue: number | null;
  minimumOrderAmount: number | null;
  maximumDiscountAmount: number | null;
  startDate: string;
  endDate: string;
  priority: number;
  isActive: boolean;
}>;

export type OfferAssignmentInput = {
  productId: number;
};

export type PublicOfferItem = {
  id: number;
  name: string;
  description: string | null;
  offerType: OfferType;
  discountValue: number | null;
  minimumOrderAmount: number | null;
  maximumDiscountAmount: number | null;
  startDate: string;
  endDate: string;
  products: Array<{ id: number; name: string }>;
};
