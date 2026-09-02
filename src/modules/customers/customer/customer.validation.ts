import { z } from "zod";

/**
 * Update customer profile
 */
export const updateCustomerProfileSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .min(2, "Full name must contain at least 2 characters")
      .max(150, "Full name cannot exceed 150 characters")
      .optional(),

    email: z
      .string()
      .email("Invalid email address")
      .max(150, "Email cannot exceed 150 characters")
      .nullable()
      .optional(),

    dateOfBirth: z
      .string()
      .date("Date of birth must be in YYYY-MM-DD format")
      .nullable()
      .optional(),
  }),

  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

/**
 * Customer ID
 */
export const customerIdSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});