import { z } from "zod";

export const customerId = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive("Invalid customer ID"),
  }),
});

export const addressIdSchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive("Invalid customer ID"),

    addressId: z.coerce
      .number()
      .int()
      .positive("Invalid address ID"),
  }),
});

export const createAddressSchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive("Invalid customer ID"),
  }),

  body: z.object({
    tenantId: z
      .string()
      .trim()
      .min(1, "Tenant ID is required"),

    label: z
      .string()
      .trim()
      .max(50, "Label must not exceed 50 characters")
      .optional(),

    addressLine: z
      .string()
      .trim()
      .min(3, "Address is required")
      .max(500, "Address must not exceed 500 characters"),

    landmark: z
      .string()
      .trim()
      .max(150, "Landmark must not exceed 150 characters")
      .optional(),

    latitude: z
      .number()
      .min(-90)
      .max(90)
      .optional(),

    longitude: z
      .number()
      .min(-180)
      .max(180)
      .optional(),

    isDefault: z
      .boolean()
      .optional(),
  }),
});

export const updateAddressSchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int()
      .positive("Invalid customer ID"),

    addressId: z.coerce
      .number()
      .int()
      .positive("Invalid address ID"),
  }),

  body: z
    .object({
      label: z
        .string()
        .trim()
        .max(50, "Label must not exceed 50 characters")
        .nullable()
        .optional(),

      addressLine: z
        .string()
        .trim()
        .min(3, "Address must be at least 3 characters")
        .max(500, "Address must not exceed 500 characters")
        .optional(),

      landmark: z
        .string()
        .trim()
        .max(150, "Landmark must not exceed 150 characters")
        .nullable()
        .optional(),

      latitude: z
        .number()
        .min(-90)
        .max(90)
        .nullable()
        .optional(),

      longitude: z
        .number()
        .min(-180)
        .max(180)
        .nullable()
        .optional(),

      isDefault: z
        .boolean()
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required for update",
    }),
});