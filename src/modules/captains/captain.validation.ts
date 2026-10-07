import { z } from "zod";

const captainFields = {
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(10).max(20),
  email: z.string().trim().email().max(150).optional(),
  isActive: z.boolean().optional(),
  vehicleType: z.string().trim().max(50).nullable().optional(),
  vehicleNumber: z.string().trim().max(20).nullable().optional(),
  branchIds: z.array(z.string().trim().min(1)).optional(),
};

export const createCaptainSchema = z.object({
  body: z.object({
    ...captainFields,
    password: z.string().min(8).max(100),
  }),
});

export const updateCaptainSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    fullName: captainFields.fullName.optional(),
    phone: captainFields.phone.optional(),
    email: captainFields.email.nullable().optional(),
    isActive: captainFields.isActive,
    vehicleType: captainFields.vehicleType,
    vehicleNumber: captainFields.vehicleNumber,
    branchIds: captainFields.branchIds,
  }).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
  }),
});

export const captainIdSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const captainAvailabilitySchema = z.object({
  body: z.object({ status: z.enum(["AVAILABLE", "OFFLINE"]) }),
});