import { z } from "zod";

export const createReviewSchema = z.object({
  body: z.object({
    orderId: z.coerce.number({ message: "Order ID must be a number" }).int("Order ID must be an integer").positive("Order ID must be positive"),
    productId: z.coerce.number({ message: "Product ID must be a number" }).int("Product ID must be an integer").positive("Product ID must be positive"),
    rating: z.coerce.number({ message: "Rating must be a number" }).int("Rating must be an integer").min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
    comment: z.string().trim().max(1000, "Comment is too long").optional().transform((value) => value === undefined ? undefined : value.trim()).refine((value) => value === undefined || value.length > 0, {
      message: "Comment cannot be empty",
    }),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const reviewIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid review ID"),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateReviewSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid review ID"),
  }),
  body: z.object({
    rating: z.coerce.number({ message: "Rating must be a number" }).int("Rating must be an integer").min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5").optional(),
    comment: z.string().trim().max(1000, "Comment is too long").optional().transform((value) => value === undefined ? undefined : value.trim()).refine((value) => value === undefined || value.length > 0, {
      message: "Comment cannot be empty",
    }),
  }).refine((value) => value.rating !== undefined || value.comment !== undefined, {
    message: "At least one field must be provided",
    path: ["rating"],
  }),
  query: z.object({}).optional(),
});

export const productReviewsSchema = z.object({
  params: z.object({
    productId: z.string().regex(/^\d+$/, "Invalid product ID"),
  }),
  query: z.object({
    tenantId: z.string().trim().min(1, "TENANT_ID_REQUIRED").optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
  }).refine((value) => Boolean(value.tenantId), {
    message: "TENANT_ID_REQUIRED",
    path: ["tenantId"],
  }),
  body: z.object({}).optional(),
});

export const reviewStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid review ID"),
  }),
  body: z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  }),
  query: z.object({}).optional(),
});

export const adminReviewListSchema = z.object({
  query: z.object({
    productId: z.coerce.number().int().positive().optional(),
    customerId: z.coerce.number().int().positive().optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    orderId: z.coerce.number().int().positive().optional(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
  }),
  params: z.object({}),
  body: z.object({}).optional(),
});
