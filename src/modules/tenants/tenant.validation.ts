import { z } from "zod";

const tenantId = z.string().regex(/^T\d{3,}$/, "Invalid tenant ID");

export const createTenantSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Tenant name must be at least 2 characters")
      .max(150, "Tenant name must not exceed 150 characters"),

    slug: z
      .string()
      .trim()
      .min(2, "Tenant slug must be at least 2 characters")
      .max(100, "Tenant slug must not exceed 100 characters")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must contain only lowercase letters, numbers and hyphens"
      ),

    logoUrl: z
      .string()
      .trim()
      .url("Logo URL must be a valid URL")
      .optional(),
  }),
});

export const updateTenantSchema = z.object({
  params: z.object({
    id: tenantId,
  }),

  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Tenant name must be at least 2 characters")
        .max(150, "Tenant name must not exceed 150 characters")
        .optional(),

      slug: z
        .string()
        .trim()
        .min(2, "Tenant slug must be at least 2 characters")
        .max(100, "Tenant slug must not exceed 100 characters")
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          "Slug must contain only lowercase letters, numbers and hyphens"
        )
        .optional(),

      logoUrl: z
        .string()
        .trim()
        .url("Logo URL must be a valid URL")
        .nullable()
        .optional(),

      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required for update",
    }),
});

export const tenantIdSchema = z.object({
  params: z.object({
    id: tenantId,
  }),
});