import { z } from "zod";

export const testHealthSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
  }),
  params: z.object({}),
  query: z.object({}),
});