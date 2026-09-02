import { z } from "zod";

export const createProductAddonGroupSchema = z.object({
  body: z.object({
    tenantId: z
      .string()
      .trim()
      .min(1, "Tenant ID is required"),

    productId: z
      .number()
      .int()
      .positive("Product ID must be a positive number"),

    addonGroupId: z
      .number()
      .int()
      .positive("Addon Group ID must be a positive number"),
  }),
});

export const updateProductAddonGroupSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, "Invalid Product Addon Group ID"),
  }),

  body: z
    .object({
      tenantId: z.string().trim().min(1, "Tenant ID is required"),
      productId: z
        .number()
        .int()
        .positive("Product ID must be a positive number")
        .optional(),

      addonGroupId: z
        .number()
        .int()
        .positive("Addon Group ID must be a positive number")
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required for update",
    }),
});

export const productAddonGroupIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, "Invalid Product Addon Group ID"),
  }),
  query: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
  }),
});