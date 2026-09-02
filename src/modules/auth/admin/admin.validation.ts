import { z } from "zod";

export const adminSignupSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3, "Username must be at least 3 characters long"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    name: z.string().trim().min(2, "Name is required"),
    tenantId: z.string().min(1, "Tenant ID is required"),
  }),
});

export const adminLoginSchema = z.object({
  body: z.object({
    username: z.string().trim().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
  }),
});
