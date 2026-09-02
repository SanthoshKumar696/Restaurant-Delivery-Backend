import { prisma } from "../../../database/prisma";

import {
  CreateProductAddonGroupInput,
  UpdateProductAddonGroupInput,
} from "./product-addon-group.types";

// CREATE
export const createProductAddonGroup = async (
  data: CreateProductAddonGroupInput
) => {
  // 1. Check tenant
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: data.tenantId,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  if (!tenant.isActive) {
    throw new Error("Tenant is inactive");
  }

  // 2. Check product
  const product = await prisma.product.findUnique({
    where: {
      id: data.productId,
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  // 3. Make sure product belongs to tenant
  if (product.tenantId !== data.tenantId) {
    throw new Error("Product does not belong to this tenant");
  }

  // 4. Check addon group
  const addonGroup = await prisma.addonGroup.findUnique({
    where: {
      id: data.addonGroupId,
    },
  });

  if (!addonGroup) {
    throw new Error("Addon group not found");
  }

  // 5. Make sure addon group belongs to tenant
  if (addonGroup.tenantId !== data.tenantId) {
    throw new Error("Addon group does not belong to this tenant");
  }

  // 6. Check duplicate relationship
  const existing = await prisma.productAddonGroup.findUnique({
    where: {
      productId_addonGroupId: {
        productId: data.productId,
        addonGroupId: data.addonGroupId,
      },
    },
  });

  if (existing) {
    throw new Error(
      "This addon group is already assigned to this product"
    );
  }

  // 7. Create relationship
  return prisma.productAddonGroup.create({
    data: {
      tenantId: data.tenantId,
      productId: data.productId,
      addonGroupId: data.addonGroupId,
    },

    include: {
      product: true,
      addonGroup: {
        include: {
          addonGroupItems: true,
        },
      },
    },
  });
};

// GET ALL
export const getAllProductAddonGroups = async (tenantId: string) => {
  return prisma.productAddonGroup.findMany({
    where: { tenantId },
    orderBy: { id: "desc" },
    include: {
      product: true,
      addonGroup: { include: { addonGroupItems: true } },
      tenant: true,
    },
  });
};

// GET BY ID
export const getProductAddonGroupById = async (id: number, tenantId: string) => {
  const relation = await prisma.productAddonGroup.findFirst({
    where: { id, tenantId },
    include: {
      product: true,
      addonGroup: { include: { addonGroupItems: true } },
      tenant: true,
    },
  });

  if (!relation) {
    throw new Error("Product addon group mapping not found");
  }

  return relation;
};

// UPDATE
export const updateProductAddonGroup = async (
  id: number,
  tenantId: string,
  data: UpdateProductAddonGroupInput
) => {
  const existing = await prisma.productAddonGroup.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error("Product addon group mapping not found");
  }

  const productId = data.productId ?? existing.productId;
  const addonGroupId = data.addonGroupId ?? existing.addonGroupId;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  const addonGroup = await prisma.addonGroup.findUnique({ where: { id: addonGroupId } });

  if (!product) throw new Error("Product not found");
  if (product.tenantId !== tenantId) throw new Error("Product does not belong to this tenant");
  if (!addonGroup) throw new Error("Addon group not found");
  if (addonGroup.tenantId !== tenantId) throw new Error("Addon group does not belong to this tenant");

  const duplicate = await prisma.productAddonGroup.findFirst({
    where: { tenantId, productId, addonGroupId, NOT: { id } },
  });
  if (duplicate) throw new Error("This addon group is already assigned to this product");

  return prisma.productAddonGroup.update({
    where: { id },
    data: { productId, addonGroupId },
    include: { product: true, addonGroup: { include: { addonGroupItems: true } } },
  });
};

// DELETE
export const deleteProductAddonGroup = async (id: number, tenantId: string) => {
  const existing = await prisma.productAddonGroup.findFirst({ where: { id, tenantId } });
  if (!existing) throw new Error("Product addon group mapping not found");
  return prisma.productAddonGroup.delete({ where: { id } });
};