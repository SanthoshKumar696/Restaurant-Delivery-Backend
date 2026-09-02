import { z } from "zod";

const staffRoles = [
  "TENANT_OWNER",
  "BRANCH_MANAGER",
  "STAFF",
  "CAPTAIN",
  "SUPPORT",
] as const;

/**
 * Create Staff User
 */
export const createStaffSchema = z.object({
  body: z.object({
    tenantId: z
      .string()
      .trim()
      .min(1, "Tenant ID is required")
      .max(20, "Tenant ID must not exceed 20 characters")
      .regex(/^T\d+$/, "Invalid tenant ID. Example: T001"),

    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(150, "Full name must not exceed 150 characters"),

    phone: z
      .string()
      .trim()
      .min(10, "Phone number must be at least 10 characters")
      .max(20, "Phone number must not exceed 20 characters"),

    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .max(150, "Email must not exceed 150 characters")
      .optional(),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must not exceed 100 characters"),

    role: z.enum(staffRoles),
  }),
});

/**
 * Update Staff User
 */
export const updateStaffSchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int("Staff ID must be an integer")
      .positive("Staff ID must be greater than 0"),
  }),

  body: z
    .object({
      fullName: z
        .string()
        .trim()
        .min(2, "Full name must be at least 2 characters")
        .max(150, "Full name must not exceed 150 characters")
        .optional(),

      phone: z
        .string()
        .trim()
        .min(10, "Phone number must be at least 10 characters")
        .max(20, "Phone number must not exceed 20 characters")
        .optional(),

      email: z
        .string()
        .trim()
        .email("Invalid email address")
        .max(150, "Email must not exceed 150 characters")
        .nullable()
        .optional(),

      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password must not exceed 100 characters")
        .optional(),

      role: z.enum(staffRoles).optional(),

      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required for update",
    }),
});

/**
 * Staff ID
 */
export const staffIdSchema = z.object({
  params: z.object({
    id: z.coerce
      .number()
      .int("Staff ID must be an integer")
      .positive("Staff ID must be greater than 0"),
  }),
});

/**
 * Tenant ID
 */
export const tenantStaffSchema = z.object({
  params: z.object({
    tenantId: z
      .string()
      .trim()
      .min(1, "Tenant ID is required")
      .max(20, "Tenant ID must not exceed 20 characters")
      .regex(/^T\d+$/, "Invalid tenant ID. Example: T001"),
  }),
});