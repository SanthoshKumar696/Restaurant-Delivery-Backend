import { z } from "zod";

export const staffLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email().max(150),
    password: z.string().min(1).max(100),
  }).strict(),
});