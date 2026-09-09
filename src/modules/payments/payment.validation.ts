import { z } from "zod";

const paymentMethodEnum = z.enum(["CASH_ON_DELIVERY", "ONLINE"]);
const paymentStatusEnum = z.enum([
  "PENDING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
]);

export const createPaymentSchema = z.object({
  body: z.object({
    orderId: z.coerce
      .number({ message: "Order ID must be a number" })
      .int("Order ID must be an integer")
      .positive("Order ID must be greater than 0"),
    paymentMethod: paymentMethodEnum,
  }),
});

export const paymentIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid payment ID"),
  }),
});

export const adminPaymentListSchema = z.object({
  query: z.object({
    status: paymentStatusEnum.optional(),
    paymentMethod: paymentMethodEnum.optional(),
    orderId: z
      .string()
      .regex(/^\d+$/, "Invalid order ID")
      .optional(),
  }),
});

export const adminPaymentStatusUpdateSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid payment ID"),
  }),
  body: z.object({
    status: paymentStatusEnum,
  }),
});
