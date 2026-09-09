import { prisma } from "../../../database/prisma";

import {
  CreateProductInput,
  UpdateProductInput,
} from "./product.types";

export const createProduct = async (
  data: CreateProductInput
) => {
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: data.tenantId,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: {
        id: data.categoryId,
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    if (category.tenantId !== data.tenantId) {
      throw new Error(
        "Category does not belong to this tenant"
      );
    }
  }

  return prisma.product.create({
    data: {
      tenantId: data.tenantId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      basePrice: data.basePrice,
      isVeg: data.isVeg ?? true,
      isRecommended: data.isRecommended ?? false,
      isBestSeller: data.isBestSeller ?? false,
      displayOrder: data.displayOrder ?? 0,
    },
  });
};

export const getAllProducts = async (tenantId: string, branchId?: string) => {
  const branchProducts = branchId
    ? await prisma.branchProduct.findMany({
        where: { tenantId, branchId, isAvailable: true },
        select: { productId: true, priceOverride: true },
      })
    : [];

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      ...(branchId && branchProducts.length > 0
        ? { id: { in: branchProducts.map((branchProduct) => branchProduct.productId) } }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      category: true,
    },
  });

  if (!branchId || branchProducts.length === 0) {
    return products;
  }

  const priceOverrides = new Map(
    branchProducts.map((branchProduct) => [branchProduct.productId, branchProduct.priceOverride])
  );

  return products.map((product) => ({
    ...product,
    basePrice: priceOverrides.get(product.id) ?? product.basePrice,
  }));
};

export const getProductById = async (id: number, tenantId: string, branchId?: string) => {
  const branchProduct = branchId
    ? await prisma.branchProduct.findFirst({
        where: { tenantId, branchId, productId: id, isAvailable: true },
        select: { priceOverride: true },
      })
    : null;

  const branchHasCatalog = branchId
    ? await prisma.branchProduct.findFirst({
        where: { tenantId, branchId, isAvailable: true },
        select: { id: true },
      })
    : null;

  if (branchId && branchHasCatalog && !branchProduct) {
    throw new Error("Product not found");
  }

  const product = await prisma.product.findUnique({
    where: {
      id,
      tenantId,
    },
    include: {
      category: true,
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  return branchProduct?.priceOverride === null || branchProduct?.priceOverride === undefined
    ? product
    : { ...product, basePrice: branchProduct.priceOverride };
};

export const updateProduct = async (
  id: number,
  tenantId: string,
  data: UpdateProductInput
) => {
  const existingProduct = await prisma.product.findUnique({
    where: {
      id,
      tenantId,
    },
  });

  if (!existingProduct) {
    throw new Error("Product not found");
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: {
        id: data.categoryId,
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    if (category.tenantId !== existingProduct.tenantId) {
      throw new Error(
        "Category does not belong to this tenant"
      );
    }
  }

  const { tenantId: _tenantId, ...updateData } = data;

  return prisma.product.update({
    where: {
      id,
    },
    data: updateData,
  });
};

export const deleteProduct = async (id: number, tenantId: string) => {
  const existingProduct = await prisma.product.findUnique({
    where: {
      id,
      tenantId,
    },
  });

  if (!existingProduct) {
    throw new Error("Product not found");
  }

  return prisma.product.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });
};