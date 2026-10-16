import { z } from "zod";

const identifierLoginBodySchema = z.object({
  identifier: z.string().trim().min(1).max(150),
  password: z.string().min(1).max(100),
}).strict();

const legacyEmailLoginBodySchema = z.object({
  email: z.string().trim().email().max(150),
  password: z.string().min(1).max(100),
}).strict().transform(({ email, password }) => ({ identifier: email, password }));

export const staffLoginSchema = z.object({
  body: z.union([identifierLoginBodySchema, legacyEmailLoginBodySchema]),
});