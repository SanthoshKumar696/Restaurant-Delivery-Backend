export type CreateAddonGroupItemInput = {
  addonGroupId: number;
  tenantId: string;
  name: string;
  price?: number;
  isActive?: boolean;
};

export type UpdateAddonGroupItemInput = {
  tenantId: string;
  name?: string;
  price?: number;
  isActive?: boolean;
};