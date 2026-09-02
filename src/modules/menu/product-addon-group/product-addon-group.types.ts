export type CreateProductAddonGroupInput = {
  tenantId: string;
  productId: number;
  addonGroupId: number;
};

export type UpdateProductAddonGroupInput = {
  tenantId: string;
  productId?: number;
  addonGroupId?: number;
};

export type ProductAddonGroupResponse = {
  id: number;
  tenantId: string;
  productId: number;
  addonGroupId: number;
};