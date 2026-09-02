import { Category } from "@prisma/client";

export type CreateCategoryInput = {
  tenantId: string;
  name: string;
  parentCategoryId?: number | null;
  displayOrder?: number;
};

export type UpdateCategoryInput = {
  tenantId: string;
  name?: string;
  parentCategoryId?: number | null;
  displayOrder?: number;
  isActive?: boolean;
};

export type CategoryResponse = Category;