import { z } from "zod";

export const createProductVariantSchema = z.object({
  body: z.object({
    productId: z
      .number()
      .int()
      .positive("Product ID is required"),

    tenantId: z
      .string()
      .trim()
      .min(1, "Tenant ID is required"),

    name: z
      .string()
      .trim()
      .min(1, "Variant name is required")
      .max(100),

    price: z
      .number()
      .positive("Price must be greater than 0"),

    displayOrder: z
      .number()
      .int()
      .min(0)
      .optional(),
  }),
});

export const updateProductVariantSchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive("Invalid variant ID"),
  }),

  body: z
    .object({
      tenantId: z.string().trim().min(1, "Tenant ID is required"),
      name: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional(),

      price: z
        .number()
        .positive()
        .optional(),

      displayOrder: z
        .number()
        .int()
        .min(0)
        .optional(),

      isActive: z
        .boolean()
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required for update",
    }),
});

export const productVariantIdSchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive("Invalid variant ID"),
  }),
  query: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
  }),
});