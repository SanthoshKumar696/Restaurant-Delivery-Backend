import { z } from "zod";

export const staffLoginSchema = z.object({
  body: z.object({
    tenantId: z.string().trim().min(1).max(20),
    phone: z.string().trim().min(10).max(20).optional(),
    email: z.string().trim().email().max(150).optional(),
    password: z.string().min(1).max(100),
  }).refine((data) => Boolean(data.phone || data.email), {
    message: "Phone or email is required",
    path: ["phone"],
  }),
});