import { z } from "zod";

export const createBranchSchema = z.object({
  body: z.object({
    tenantId: z
      .string()
      .regex(/^T\d{3,}$/, "Invalid tenant ID. Example: T001"),

    name: z
      .string()
      .trim()
      .min(2, "Branch name must be at least 2 characters")
      .max(150, "Branch name must not exceed 150 characters"),

    addressLine: z
      .string()
      .trim()
      .min(2, "Address is required"),

    city: z.string().trim().optional(),

    latitude: z.number().optional(),

    longitude: z.number().optional(),

    phone: z.string().trim().optional(),

    deliveryEnabled: z.boolean().optional(),

    pickupEnabled: z.boolean().optional(),
  }),
});

export const updateBranchSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^B\d{3,}$/, "Invalid branch ID. Example: B001"),
  }),

  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2)
        .max(150)
        .optional(),

      addressLine: z
        .string()
        .trim()
        .min(2)
        .optional(),

      city: z.string().trim().nullable().optional(),

      latitude: z.number().nullable().optional(),

      longitude: z.number().nullable().optional(),

      phone: z.string().trim().nullable().optional(),

      deliveryEnabled: z.boolean().optional(),

      pickupEnabled: z.boolean().optional(),

      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required for update",
    }),
});

export const branchIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^B\d{3,}$/, "Invalid branch ID. Example: B001"),
  }),
});