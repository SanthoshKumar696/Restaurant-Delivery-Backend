import { z } from "zod";

export const createBannerSchema = z.object({
  body: z.object({
    tenantId: z.string().min(1, "Tenant ID is required"),
    title: z.string().trim().min(1, "Title is required").max(150),
    description: z.string().trim().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    offerText: z.string().trim().optional(),
    couponCode: z.string().trim().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    displayOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateBannerSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(150).optional(),
    description: z.string().trim().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
    offerText: z.string().trim().optional(),
    couponCode: z.string().trim().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    displayOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, "Banner ID must be a number"),
  }),
});

export const bannerIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Banner ID must be a number"),
  }),
});

export const bannerStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, "Banner ID must be a number"),
  }),
});

export const getBannersSchema = z.object({
  query: z.object({
    tenantId: z.string().min(1, "Tenant ID is required").optional(),
  }),
});
