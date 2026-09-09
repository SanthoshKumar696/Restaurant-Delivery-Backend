import { z } from "zod";

export const offerTypeEnum = ["PERCENTAGE", "FIXED_AMOUNT", "BUY_ONE_GET_ONE"] as const;

export const createOfferSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, "Offer name is required"),
    description: z.string().trim().optional().nullable(),
    offerType: z.enum(offerTypeEnum),
    discountValue: z.coerce
      .number({ message: "Discount value must be a number" })
      .nullable()
      .optional(),
    minimumOrderAmount: z.coerce
      .number({ message: "Minimum order amount must be a number" })
      .nonnegative("Minimum order amount cannot be negative")
      .nullable()
      .optional(),
    maximumDiscountAmount: z.coerce
      .number({ message: "Maximum discount amount must be a number" })
      .nonnegative("Maximum discount amount cannot be negative")
      .nullable()
      .optional(),
    startDate: z.string().datetime("Start date must be a valid ISO date-time"),
    endDate: z.string().datetime("End date must be a valid ISO date-time"),
    priority: z.coerce.number().int("Priority must be an integer").nonnegative("Priority cannot be negative").optional(),
    isActive: z.boolean().optional(),
  }).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  }).refine((data) => {
    if (data.offerType === "PERCENTAGE") {
      return data.discountValue !== undefined && data.discountValue !== null && data.discountValue > 0 && data.discountValue <= 100;
    }

    if (data.offerType === "FIXED_AMOUNT") {
      return data.discountValue !== undefined && data.discountValue !== null && data.discountValue > 0;
    }

    if (data.offerType === "BUY_ONE_GET_ONE") {
      return data.discountValue === undefined || data.discountValue === null || data.discountValue === 0;
    }

    return true;
  }, {
    message: "Invalid discount configuration for offer type",
    path: ["discountValue"],
  }),
});

export const updateOfferSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid offer ID"),
  }),
  body: z.object({
    name: z.string().trim().min(1, "Offer name is required").optional(),
    description: z.string().trim().optional().nullable(),
    offerType: z.enum(offerTypeEnum).optional(),
    discountValue: z.coerce
      .number({ message: "Discount value must be a number" })
      .nullable()
      .optional(),
    minimumOrderAmount: z.coerce
      .number({ message: "Minimum order amount must be a number" })
      .nonnegative("Minimum order amount cannot be negative")
      .nullable()
      .optional(),
    maximumDiscountAmount: z.coerce
      .number({ message: "Maximum discount amount must be a number" })
      .nonnegative("Maximum discount amount cannot be negative")
      .nullable()
      .optional(),
    startDate: z.string().datetime("Start date must be a valid ISO date-time").optional(),
    endDate: z.string().datetime("End date must be a valid ISO date-time").optional(),
    priority: z.coerce.number().int("Priority must be an integer").nonnegative("Priority cannot be negative").optional(),
    isActive: z.boolean().optional(),
  }).refine((data) => {
    if (!data.startDate || !data.endDate) {
      return true;
    }
    return new Date(data.endDate) > new Date(data.startDate);
  }, {
    message: "End date must be after start date",
    path: ["endDate"],
  }).refine((data) => {
    if (data.offerType === undefined) {
      return true;
    }
    if (data.offerType === "PERCENTAGE") {
      return data.discountValue !== undefined && data.discountValue !== null && data.discountValue > 0 && data.discountValue <= 100;
    }
    if (data.offerType === "FIXED_AMOUNT") {
      return data.discountValue !== undefined && data.discountValue !== null && data.discountValue > 0;
    }
    if (data.offerType === "BUY_ONE_GET_ONE") {
      return data.discountValue === undefined || data.discountValue === null || data.discountValue === 0;
    }
    return true;
  }, {
    message: "Invalid discount configuration for offer type",
    path: ["discountValue"],
  }),
});

export const offerIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid offer ID"),
  }),
});

export const offerStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid offer ID"),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const productAssignmentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid offer ID"),
  }),
  body: z.object({
    productId: z.coerce.number().int("Product ID must be an integer").positive("Product ID must be positive"),
  }),
});

export const publicOfferQuerySchema = z.object({
  query: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
  }),
});

export const publicOfferByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid offer ID"),
  }),
  query: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
  }),
});
