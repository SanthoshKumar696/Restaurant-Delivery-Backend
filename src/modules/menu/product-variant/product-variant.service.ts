import { prisma } from "../../../database/prisma";

import {
  CreateProductVariantInput,
  UpdateProductVariantInput,
} from "./product-variant.types";

export const createProductVariant = async (
  data: CreateProductVariantInput
) => {
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: data.tenantId,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const product = await prisma.product.findUnique({
    where: {
      id: data.productId,
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.tenantId !== data.tenantId) {
    throw new Error(
      "Product does not belong to this tenant"
    );
  }

  return prisma.productVariant.create({
    data: {
      productId: data.productId,
      tenantId: data.tenantId,
      name: data.name,
      price: data.price,
      displayOrder: data.displayOrder ?? 0,
    },
  });
};

export const getAllProductVariants = async (tenantId: string) => {
  return prisma.productVariant.findMany({
    where: { tenantId },
    orderBy: {
      displayOrder: "asc",
    },
    include: {
      product: true,
    },
  });
};

export const getProductVariantById = async (
  id: number,
  tenantId: string
) => {
  const variant = await prisma.productVariant.findUnique({
    where: {
      id,
      tenantId,
    },
    include: {
      product: true,
    },
  });

  if (!variant) {
    throw new Error("Product variant not found");
  }

  return variant;
};

export const updateProductVariant = async (
  id: number,
  tenantId: string,
  data: UpdateProductVariantInput
) => {
  const existingVariant =
    await prisma.productVariant.findUnique({
      where: {
        id,
        tenantId,
      },
    });

  if (!existingVariant) {
    throw new Error("Product variant not found");
  }

  const { tenantId: _tenantId, ...updateData } = data;

  return prisma.productVariant.update({
    where: {
      id,
    },
    data: updateData,
  });
};

export const deleteProductVariant = async (
  id: number,
  tenantId: string
) => {
  const existingVariant =
    await prisma.productVariant.findUnique({
      where: {
        id,
        tenantId,
      },
    });

  if (!existingVariant) {
    throw new Error("Product variant not found");
  }

  return prisma.productVariant.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });
};