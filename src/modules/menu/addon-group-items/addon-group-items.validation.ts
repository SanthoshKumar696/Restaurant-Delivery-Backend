import { z } from "zod";

export const createAddonGroupItemSchema = z.object({
  body: z.object({
    addonGroupId: z
      .number()
      .int("Addon group ID must be an integer")
      .positive("Addon group ID must be greater than 0"),

    tenantId: z
      .string()
      .trim()
      .min(1, "Tenant ID is required"),

    name: z
      .string()
      .trim()
      .min(1, "Addon item name is required")
      .max(100, "Addon item name must not exceed 100 characters"),

    price: z
      .number()
      .nonnegative("Price cannot be negative")
      .optional(),

    isActive: z
      .boolean()
      .optional(),
  }),
});

export const updateAddonGroupItemSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(
        /^\d+$/,
        "Invalid addon group item ID"
      ),
  }),

  body: z
    .object({
      tenantId: z.string().trim().min(1, "Tenant ID is required"),
      name: z
        .string()
        .trim()
        .min(1, "Addon item name is required")
        .max(100, "Addon item name must not exceed 100 characters")
        .optional(),

      price: z
        .number()
        .nonnegative("Price cannot be negative")
        .optional(),

      isActive: z
        .boolean()
        .optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      {
        message: "At least one field is required for update",
      }
    ),
});

export const addonGroupItemIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(
        /^\d+$/,
        "Invalid addon group item ID"
      ),
  }),
  query: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
  }),
});