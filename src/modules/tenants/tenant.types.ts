import { Tenant } from "@prisma/client";

export type CreateTenantInput = {
  name: string;
  slug: string;
  logoUrl?: string;
};

export type UpdateTenantInput = {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  isActive?: boolean;
};

export type TenantResponse = Tenant;