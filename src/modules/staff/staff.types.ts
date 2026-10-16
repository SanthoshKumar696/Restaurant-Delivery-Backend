import { StaffRole, StaffUser } from "@prisma/client";

export type CreateStaffInput = {
  tenantId: string;
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  role: StaffRole;
  isActive?: boolean;
  branchIds?: string[];
};

export type UpdateStaffInput = {
  fullName?: string;
  phone?: string;
  email?: string | null;
  password?: string;
  role?: StaffRole;
  isActive?: boolean;
  branchIds?: string[];
};

export type StaffResponse = Omit<StaffUser, "passwordHash">;