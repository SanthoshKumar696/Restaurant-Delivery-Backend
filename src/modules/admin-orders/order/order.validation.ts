import { z } from "zod";

export const adminOrderListSchema = z.object({
  query: z.object({
    tenantId: z
      .string()
      .min(1, "Tenant ID is required"),

    status: z
      .enum([
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "OUT_FOR_DELIVERY",
        "COMPLETED",
        "CANCELLED",
        "REJECTED",
      ])
      .optional(),

    paymentStatus: z
      .enum(["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"])
      .optional(),
  }),
});

export const adminOrderStatusListSchema = z.object({
  params: z.object({
    status: z.enum([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ]),
  }),
  query: z.object({
    tenantId: z
      .string()
      .min(1, "Tenant ID is required"),
  }),
});

export const getAdminOrderByIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, "Invalid order ID"),
  }),
  query: z.object({
    tenantId: z
      .string()
      .min(1, "Tenant ID is required"),
  }),
});

export const adminOrderStatusUpdateSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, "Invalid order ID"),
  }),
  body: z.object({
    tenantId: z
      .string()
      .min(1, "Tenant ID is required"),

    status: z.enum([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ]),

    note: z
      .string()
      .trim()
      .optional(),

    changedBy: z
      .number()
      .int()
      .optional(),
  }),
});

export const adminOrderAcceptSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, "Invalid order ID"),
  }),
  body: z.object({
    tenantId: z
      .string()
      .min(1, "Tenant ID is required"),

    note: z
      .string()
      .trim()
      .optional(),
  }),
});

export const adminOrderRejectSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, "Invalid order ID"),
  }),
  body: z.object({
    tenantId: z
      .string()
      .min(1, "Tenant ID is required"),

    note: z
      .string()
      .trim()
      .optional(),
  }),
});

export const adminOrderCancelSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/, "Invalid order ID"),
  }),
  body: z.object({
    tenantId: z
      .string()
      .min(1, "Tenant ID is required"),

    note: z
      .string()
      .trim()
      .optional(),
  }),
});