import { prisma } from "../../../database/prisma";

import {
  CreateAddonGroupItemInput,
  UpdateAddonGroupItemInput,
} from "./addon-group-items.types";

// CREATE
export const createAddonGroupItem = async (
  data: CreateAddonGroupItemInput
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

  // Check addon group
  const addonGroup = await prisma.addonGroup.findUnique({
    where: {
      id: data.addonGroupId,
    },
  });

  if (!addonGroup) {
    throw new Error("Addon group not found");
  }

  // Make sure addon group belongs to same tenant
  if (addonGroup.tenantId !== data.tenantId) {
    throw new Error(
      "Addon group does not belong to this tenant"
    );
  }

  const addonGroupItem =
    await prisma.addonGroupItem.create({
      data: {
        addonGroupId: data.addonGroupId,
        tenantId: data.tenantId,
        name: data.name,
        price: data.price ?? 0,
        isActive: data.isActive ?? true,
      },
    });

  return addonGroupItem;
};

// GET ALL
export const getAllAddonGroupItems = async (
  tenantId: string,
  addonGroupId?: number
) => {
  const where: any = { tenantId };

  if (addonGroupId) {
    where.addonGroupId = addonGroupId;
  }

  return prisma.addonGroupItem.findMany({
    where,
    orderBy: {
      id: "asc",
    },
  });
};

// GET BY ID
export const getAddonGroupItemById = async (
  id: number,
  tenantId: string
) => {
  const addonGroupItem =
    await prisma.addonGroupItem.findUnique({
      where: {
        id,
        tenantId,
      },
    });

  if (!addonGroupItem) {
    throw new Error("Addon group item not found");
  }

  return addonGroupItem;
};

// UPDATE
export const updateAddonGroupItem = async (
  id: number,
  tenantId: string,
  data: UpdateAddonGroupItemInput
) => {
  const existingItem =
    await prisma.addonGroupItem.findUnique({
      where: {
        id,
        tenantId,
      },
    });

  if (!existingItem) {
    throw new Error("Addon group item not found");
  }

  const { tenantId: _tenantId, ...updateData } = data;

  return prisma.addonGroupItem.update({
    where: {
      id,
    },
    data: updateData,
  });
};

// DELETE / DEACTIVATE
export const deleteAddonGroupItem = async (
  id: number,
  tenantId: string
) => {
  const existingItem =
    await prisma.addonGroupItem.findUnique({
      where: {
        id,
        tenantId,
      },
    });

  if (!existingItem) {
    throw new Error("Addon group item not found");
  }

  return prisma.addonGroupItem.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });
};