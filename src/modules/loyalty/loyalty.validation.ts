import { z } from "zod";

export const customerIdSchema = z.object({
  params: z.object({
    customerId: z.string().regex(/^\d+$/, "Invalid customer ID"),
  }),
});

export const validateRedemptionSchema = z.object({
  body: z.object({
    points: z.coerce.number({ message: "Points must be a number" }).int("Points must be an integer").positive("Points must be a positive integer"),
  }),
});

export const adminAdjustmentSchema = z.object({
  params: z.object({
    customerId: z.string().regex(/^\d+$/, "Invalid customer ID"),
  }),
  body: z.object({
    points: z.coerce.number({ message: "Points must be a number" }).int("Points must be an integer"),
    description: z.string().trim().min(1, "Description is required").optional(),
  }),
});
