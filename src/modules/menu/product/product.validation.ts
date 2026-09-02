import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    tenantId: z
      .string()
      .trim()
      .min(1, "Tenant ID is required"),

    categoryId: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),

    name: z
      .string()
      .trim()
      .min(2)
      .max(150),

    description: z
      .string()
      .optional(),

    imageUrl: z
      .string()
      .url()
      .optional(),

    basePrice: z
      .number()
      .positive("Base price must be greater than 0"),

    isVeg: z
      .boolean()
      .optional(),

    isRecommended: z
      .boolean()
      .optional(),

    isBestSeller: z
      .boolean()
      .optional(),

    displayOrder: z
      .number()
      .int()
      .min(0)
      .optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive(),
  }),

  body: z
    .object({
      tenantId: z.string().trim().min(1, "Tenant ID is required"),
      categoryId: z
        .number()
        .int()
        .positive()
        .nullable()
        .optional(),

      name: z
        .string()
        .trim()
        .min(2)
        .max(150)
        .optional(),

      description: z
        .string()
        .nullable()
        .optional(),

      imageUrl: z
        .string()
        .url()
        .nullable()
        .optional(),

      basePrice: z
        .number()
        .positive()
        .optional(),

      isVeg: z
        .boolean()
        .optional(),

      isRecommended: z
        .boolean()
        .optional(),

      isBestSeller: z
        .boolean()
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

export const productIdSchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive("Invalid product ID"),
  }),
  query: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
  }),
});