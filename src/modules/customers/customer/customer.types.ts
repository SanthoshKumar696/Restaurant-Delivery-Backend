import { Customer } from "@prisma/client";
export type CreateCustomerInput = {
  tenantId: string;
  fullName?: string;
  phone: string;
  email?: string;
  passwordHash?: string;
  referralCode?: string;
  referredBy?: number;
};

export type UpdateCustomerInput = {
  fullName?: string | null;
  phone?: string;
  email?: string | null;
  passwordHash?: string | null;
  isActive?: boolean;
};

export type CustomerResponse = {
  id: number;
  tenantId: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  referralCode: string | null;
  referredBy: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateCustomerProfileInput = {
  fullName?: string;
  email?: string | null;
  dateOfBirth?: Date | null;
};

export type CustomerProfileResponse = Customer;