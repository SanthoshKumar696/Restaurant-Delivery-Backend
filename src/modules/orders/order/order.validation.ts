import { z } from "zod";

export const createOrderSchema = z.object({
  body: z.object({
    tenantId: z
      .string()
      .min(1, "Tenant ID is required"),

    branchId: z
      .string()
      .min(1, "Branch ID is required"),

    customerId: z
      .number()
      .int()
      .positive("Customer ID must be a positive number"),

    fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),

    deliveryAddressLine: z
      .string()
      .trim()
      .optional(),

    deliveryLandmark: z
      .string()
      .trim()
      .optional(),

    deliveryLatitude: z
      .number()
      .optional(),

    deliveryLongitude: z
      .number()
      .optional(),

    deliveryPhone: z
      .string()
      .trim()
      .optional(),

    notes: z
      .string()
      .trim()
      .optional(),

    items: z
      .array(
        z.object({
          productId: z
            .number()
            .int()
            .positive(),

          variantId: z
            .number()
            .int()
            .positive()
            .optional(),

          quantity: z
            .number()
            .int()
            .positive(),
        })
      )
      .min(1, "At least one order item is required"),
  }),
});

export const getCustomerOrdersSchema = z.object({
  params: z.object({
    customerId: z
      .string()
      .regex(/^\d+$/, "Invalid customer ID"),
  }),
  query: z.object({
    tenantId: z.string().min(1, "Tenant ID is required"),
  }),
});

export const getOrderByIdSchema = z.object({
  params: z.object({
    customerId: z
      .string()
      .regex(/^\d+$/, "Invalid customer ID"),
    id: z
      .string()
      .regex(/^\d+$/, "Invalid order ID"),
  }),
  query: z.object({
    tenantId: z.string().min(1, "Tenant ID is required"),
  }),
});

export const cancelOrderSchema = z.object({
  params: z.object({
    customerId: z
      .string()
      .regex(/^\d+$/, "Invalid customer ID"),
    id: z
      .string()
      .regex(/^\d+$/, "Invalid order ID"),
  }),
  query: z.object({
    tenantId: z.string().min(1, "Tenant ID is required"),
  }),
  body: z.object({
    tenantId: z.string().optional(),
  }),
});