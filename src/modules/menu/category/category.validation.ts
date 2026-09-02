import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    tenantId: z
      .string()
      .trim()
      .min(1, "Tenant ID is required"),

    name: z
      .string()
      .trim()
      .min(2, "Category name must be at least 2 characters")
      .max(100, "Category name must not exceed 100 characters"),

    parentCategoryId: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),

    displayOrder: z
      .number()
      .int()
      .min(0)
      .optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive("Invalid category ID"),
  }),

  body: z
    .object({
      tenantId: z.string().trim().min(1, "Tenant ID is required"),
      name: z
        .string()
        .trim()
        .min(2)
        .max(100)
        .optional(),

      parentCategoryId: z
        .number()
        .int()
        .positive()
        .nullable()
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

export const categoryIdSchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive("Invalid category ID"),
  }),
  query: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
  }),
});