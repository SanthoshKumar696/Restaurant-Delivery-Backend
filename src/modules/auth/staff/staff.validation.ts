import { z } from "zod";

const staffIdentifierSchema = z
  .string()
  .trim()
  .min(1, "Identifier is required")
  .max(150, "Identifier must be at most 150 characters")
  .refine((value) => {
    if (value.includes("@")) {
      return z.string().email().safeParse(value).success;
    }

    return /^[+]?\d[\d\s().-]{5,20}$/.test(value);
  }, "Identifier must be a valid email or phone number");

const identifierLoginBodySchema = z.object({
  identifier: staffIdentifierSchema,
  password: z.string().min(1, "Password is required").max(100, "Password must be at most 100 characters"),
}).strict();

const legacyEmailLoginBodySchema = z.object({
  email: z.string().trim().email("Email must be valid").max(150, "Email must be at most 150 characters"),
  password: z.string().min(1, "Password is required").max(100, "Password must be at most 100 characters"),
}).strict().transform(({ email, password }) => ({ identifier: email, password }));

export const staffLoginSchema = z.object({
  body: z.union([identifierLoginBodySchema, legacyEmailLoginBodySchema]),
});