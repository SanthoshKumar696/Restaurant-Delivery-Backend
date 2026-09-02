import { z } from "zod";

export const createAddonGroupSchema = z.object({
  body: z
    .object({
      tenantId: z.string().min(1, "Tenant ID is required"),

      name: z
        .string()
        .trim()
        .min(2, "Addon group name must be at least 2 characters")
        .max(100, "Addon group name must not exceed 100 characters"),

      minSelect: z
        .number()
        .int("Minimum selection must be an integer")
        .min(0, "Minimum selection cannot be negative")
        .optional(),

      maxSelect: z
        .number()
        .int("Maximum selection must be an integer")
        .min(1, "Maximum selection must be at least 1")
        .optional(),

      isRequired: z
        .boolean()
        .optional(),
    })
    .refine(
      (data) =>
        data.minSelect === undefined ||
        data.maxSelect === undefined ||
        data.minSelect <= data.maxSelect,
      {
        message: "minSelect cannot be greater than maxSelect",
        path: ["minSelect"],
      }
    ),
});

export const updateAddonGroupSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("Invalid addon group ID"),
  }),

  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Addon group name must be at least 2 characters")
        .max(100, "Addon group name must not exceed 100 characters")
        .optional(),

      minSelect: z
        .number()
        .int("Minimum selection must be an integer")
        .min(0, "Minimum selection cannot be negative")
        .optional(),

      maxSelect: z
        .number()
        .int("Maximum selection must be an integer")
        .min(1, "Maximum selection must be at least 1")
        .optional(),

      isRequired: z
        .boolean()
        .optional(),
    })
    .refine(
      (data) =>
        data.minSelect === undefined ||
        data.maxSelect === undefined ||
        data.minSelect <= data.maxSelect,
      {
        message: "minSelect cannot be greater than maxSelect",
        path: ["minSelect"],
      }
    )
    .refine(
      (data) => Object.keys(data).length > 0,
      {
        message: "At least one field is required for update",
      }
    ),
});

export const addonGroupIdSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("Invalid addon group ID"),
  }),
  query: z.object({
    tenantId: z.string().trim().min(1, "Tenant ID is required"),
  }),
});