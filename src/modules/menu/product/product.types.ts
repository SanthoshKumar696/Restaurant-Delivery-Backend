import { Product } from "@prisma/client";

export type CreateProductInput = {
  tenantId: string;
  categoryId?: number | null;
  name: string;
  description?: string;
  imageUrl?: string;
  basePrice: number;
  isVeg?: boolean;
  isRecommended?: boolean;
  isBestSeller?: boolean;
  displayOrder?: number;
};

export type UpdateProductInput = {
  tenantId: string;
  categoryId?: number | null;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  basePrice?: number;
  isVeg?: boolean;
  isRecommended?: boolean;
  isBestSeller?: boolean;
  displayOrder?: number;
  isActive?: boolean;
};

export type ProductResponse = Product;