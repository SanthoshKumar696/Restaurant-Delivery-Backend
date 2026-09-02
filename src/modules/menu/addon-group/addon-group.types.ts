export type CreateAddonGroupInput = {
  tenantId: string;
  name: string;
  minSelect?: number;
  maxSelect?: number;
  isRequired?: boolean;
};

export type UpdateAddonGroupInput = {
  tenantId: string;
  name?: string;
  minSelect?: number;
  maxSelect?: number;
  isRequired?: boolean;
};