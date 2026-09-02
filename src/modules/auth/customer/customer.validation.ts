import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(10, "Phone number is required")
  .max(15, "Phone number is too long")
  .refine((value) => /^[6-9]\d{9}$/.test(value.replace(/\D/g, "")), {
    message: "Invalid Indian mobile number format",
  });

export const sendOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema.optional(),
    mobileNumber: phoneSchema.optional(),
    tenantId: z.string().min(1, "Tenant ID is required").optional().default("T001"),
  }).refine((data) => data.phone || data.mobileNumber, {
    message: "Phone number is required",
    path: ["phone"],
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema.optional(),
    mobileNumber: phoneSchema.optional(),
    otp: z.string().trim().regex(/^[0-9]{4,6}$/, "OTP must be 4 to 6 digits"),
    tenantId: z.string().min(1, "Tenant ID is required").optional().default("T001"),
  }).refine((data) => data.phone || data.mobileNumber, {
    message: "Phone number is required",
    path: ["phone"],
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema.optional(),
    mobileNumber: phoneSchema.optional(),
    tenantId: z.string().min(1, "Tenant ID is required").optional().default("T001"),
  }).refine((data) => data.phone || data.mobileNumber, {
    message: "Phone number is required",
    path: ["phone"],
  }),
});
