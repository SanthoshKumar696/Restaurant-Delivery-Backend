import { z } from "zod";

const deliveryId = z.coerce.number().int().positive();

export const deliveryIdSchema = z.object({
  params: z.object({ id: deliveryId }),
});

export const assignDeliverySchema = z.object({
  params: z.object({ id: deliveryId }),
  body: z.object({ captainId: z.number().int().positive() }),
});

export const deliveryLocationSchema = z.object({
  params: z.object({ id: deliveryId }),
  body: z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  }),
});

export const completeDeliverySchema = z.object({
  params: z.object({ id: deliveryId }),
  body: z.object({ otp: z.string().trim().length(6) }),
});

export const customerDeliverySchema = z.object({
  params: z.object({ customerId: z.coerce.number().int().positive(), id: deliveryId }),
});