import { z } from "zod";

const deliveryId = z.coerce.number().int().positive();

export const deliveryIdSchema = z.object({
  params: z.object({ deliveryId }),
});

export const adminDeliveriesSchema = z.object({
  query: z.object({
    captainId: z.coerce.number().int().positive().optional(),
  }),
});

export const assignDeliverySchema = z.object({
  params: z.object({ deliveryId }),
  body: z.object({ captainId: z.number().int().positive() }),
});

export const deliveryLocationSchema = z.object({
  params: z.object({ deliveryId }),
  body: z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  }),
});

export const completeDeliverySchema = z.object({
  params: z.object({ deliveryId }),
  body: z.object({ otp: z.string().trim().length(6) }),
});

export const customerDeliverySchema = z.object({
  params: z.object({ customerId: z.coerce.number().int().positive(), orderId: deliveryId }),
});