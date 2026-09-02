export type CreateAddressInput = {
  tenantId: string;
  label?: string;
  addressLine: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
};

export type UpdateAddressInput = {
  label?: string | null;
  addressLine?: string;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};