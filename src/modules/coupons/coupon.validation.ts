import { z } from "zod";

export const couponCodeSchema = z.string().trim().min(1, "Coupon code is required");

export const createCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1, "Coupon code is required"),
    description: z.string().trim().optional().nullable(),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.coerce
      .number({ message: "Discount value must be a number" })
      .positive("Discount value must be greater than 0"),
    minimumOrderAmount: z.coerce
      .number({ message: "Minimum order amount must be a number" })
      .nonnegative("Minimum order amount cannot be negative"),
    maximumDiscountAmount: z.coerce
      .number({ message: "Maximum discount amount must be a number" })
      .nonnegative("Maximum discount amount cannot be negative")
      .optional()
      .nullable(),
    usageLimit: z.coerce
      .number({ message: "Usage limit must be a number" })
      .int("Usage limit must be an integer")
      .positive("Usage limit must be greater than 0")
      .optional()
      .nullable(),
    perCustomerLimit: z.coerce
      .number({ message: "Per customer limit must be a number" })
      .int("Per customer limit must be an integer")
      .positive("Per customer limit must be greater than 0")
      .optional()
      .nullable(),
    startDate: z.string().datetime("Start date must be a valid ISO date-time"),
    endDate: z.string().datetime("End date must be a valid ISO date-time"),
    isActive: z.boolean().optional(),
  }).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  }).refine((data) => {
    if (data.discountType === "PERCENTAGE") {
      return data.discountValue > 0 && data.discountValue <= 100;
    }
    return true;
  }, {
    message: "Percentage discount must be between 1 and 100",
    path: ["discountValue"],
  }),
});

export const validateCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1, "Coupon code is required"),
    orderAmount: z.coerce
      .number({ message: "Order amount must be a number" })
      .nonnegative("Order amount cannot be negative"),
  }),
});

export const couponIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid coupon ID"),
  }),
});

export const adminCouponListSchema = z.object({
  query: z.object({
    isActive: z.coerce.boolean().optional(),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
    search: z.string().trim().optional(),
  }),
});

export const updateCouponSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid coupon ID"),
  }),
  body: z.object({
    description: z.string().trim().optional().nullable(),
    discountValue: z.coerce
      .number({ message: "Discount value must be a number" })
      .positive("Discount value must be greater than 0")
      .optional(),
    minimumOrderAmount: z.coerce
      .number({ message: "Minimum order amount must be a number" })
      .nonnegative("Minimum order amount cannot be negative")
      .optional(),
    maximumDiscountAmount: z.coerce
      .number({ message: "Maximum discount amount must be a number" })
      .nonnegative("Maximum discount amount cannot be negative")
      .optional()
      .nullable(),
    usageLimit: z.coerce
      .number({ message: "Usage limit must be a number" })
      .int("Usage limit must be an integer")
      .positive("Usage limit must be greater than 0")
      .optional()
      .nullable(),
    perCustomerLimit: z.coerce
      .number({ message: "Per customer limit must be a number" })
      .int("Per customer limit must be an integer")
      .positive("Per customer limit must be greater than 0")
      .optional()
      .nullable(),
    startDate: z.string().datetime("Start date must be a valid ISO date-time").optional(),
    endDate: z.string().datetime("End date must be a valid ISO date-time").optional(),
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
    if (data.discountValue === undefined) {
      return true;
    }
    return data.discountValue > 0;
  }, {
    message: "Discount value must be greater than 0",
    path: ["discountValue"],
  }),
});

export const couponStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid coupon ID"),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});
