import { Branch } from "@prisma/client";

export type CreateBranchInput = {
  tenantId: string;
  name: string;
  addressLine: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
};

export type UpdateBranchInput = {
  name?: string;
  addressLine?: string;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  isActive?: boolean;
};

export type BranchResponse = Branch;
