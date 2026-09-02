import { ProductVariant } from "@prisma/client";

export type CreateProductVariantInput = {
  productId: number;
  tenantId: string;
  name: string;
  price: number;
  displayOrder?: number;
};

export type UpdateProductVariantInput = {
  tenantId: string;
  name?: string;
  price?: number;
  displayOrder?: number;
  isActive?: boolean;
};

export type ProductVariantResponse = ProductVariant;