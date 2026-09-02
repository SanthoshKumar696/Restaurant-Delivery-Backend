import { prisma } from "../../../database/prisma";
import {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.types";

export const createCategory = async (
  data: CreateCategoryInput
) => {
  // Check tenant
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: data.tenantId,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Check parent category if provided
  if (data.parentCategoryId) {
    const parentCategory = await prisma.category.findUnique({
      where: {
        id: data.parentCategoryId,
      },
    });

    if (!parentCategory) {
      throw new Error("Parent category not found");
    }

    if (parentCategory.tenantId !== data.tenantId) {
      throw new Error(
        "Parent category does not belong to this tenant"
      );
    }
  }

  return prisma.category.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      parentCategoryId: data.parentCategoryId,
      displayOrder: data.displayOrder ?? 0,
    },
  });
};

export const getAllCategories = async (tenantId: string) => {
  return prisma.category.findMany({
    where: { tenantId },
    orderBy: {
      displayOrder: "asc",
    },
  });
};

export const getCategoryById = async (id: number, tenantId: string) => {
  const category = await prisma.category.findUnique({
    where: {
      id,
      tenantId,
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  return category;
};

export const updateCategory = async (
  id: number,
  tenantId: string,
  data: UpdateCategoryInput
) => {
  const existingCategory = await prisma.category.findUnique({
    where: {
      id,
      tenantId,
    },
  });

  if (!existingCategory) {
    throw new Error("Category not found");
  }

  if (data.parentCategoryId) {
    const parentCategory = await prisma.category.findUnique({
      where: {
        id: data.parentCategoryId,
      },
    });

    if (!parentCategory) {
      throw new Error("Parent category not found");
    }

    if (parentCategory.tenantId !== existingCategory.tenantId) {
      throw new Error(
        "Parent category does not belong to this tenant"
      );
    }

    if (data.parentCategoryId === id) {
      throw new Error(
        "Category cannot be its own parent"
      );
    }
  }

  const { tenantId: _tenantId, ...updateData } = data;

  return prisma.category.update({
    where: {
      id,
    },
    data: updateData,
  });
};

export const deleteCategory = async (id: number, tenantId: string) => {
  const existingCategory = await prisma.category.findUnique({
    where: {
      id,
      tenantId,
    },
  });

  if (!existingCategory) {
    throw new Error("Category not found");
  }

  return prisma.category.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });
};