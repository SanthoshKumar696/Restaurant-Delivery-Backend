import { prisma } from "../../../database/prisma";
import {
  CreateAddonGroupInput,
  UpdateAddonGroupInput,
} from "./addon-group.types";

// CREATE ADDON GROUP
export const createAddonGroup = async (
  data: CreateAddonGroupInput
) => {
  // Check tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: data.tenantId,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Validate min/max selection
  const minSelect = data.minSelect ?? 0;
  const maxSelect = data.maxSelect ?? 1;

  if (minSelect > maxSelect) {
    throw new Error(
      "Minimum selection cannot be greater than maximum selection"
    );
  }

  return prisma.addonGroup.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      minSelect,
      maxSelect,
      isRequired: data.isRequired ?? false,
    },
  });
};

// GET ALL ADDON GROUPS
export const getAllAddonGroups = async (tenantId: string) => {
  return prisma.addonGroup.findMany({
    where: { tenantId },

    orderBy: {
      id: "desc",
    },
  });
};

// GET ADDON GROUP BY ID
export const getAddonGroupById = async (
  id: number,
  tenantId: string
) => {
  const addonGroup = await prisma.addonGroup.findUnique({
    where: {
      id,
      tenantId,
    },
  });

  if (!addonGroup) {
    throw new Error("Addon group not found");
  }

  return addonGroup;
};

// UPDATE ADDON GROUP
export const updateAddonGroup = async (
  id: number,
  tenantId: string,
  data: UpdateAddonGroupInput
) => {
  const existingAddonGroup =
    await prisma.addonGroup.findUnique({
      where: {
        id,
        tenantId,
      },
    });

  if (!existingAddonGroup) {
    throw new Error("Addon group not found");
  }

  const minSelect =
    data.minSelect ?? existingAddonGroup.minSelect;

  const maxSelect =
    data.maxSelect ?? existingAddonGroup.maxSelect;

  if (minSelect > maxSelect) {
    throw new Error(
      "Minimum selection cannot be greater than maximum selection"
    );
  }

  return prisma.addonGroup.update({
    where: {
      id,
    },

    data: {
      ...(data.name !== undefined && {
        name: data.name,
      }),

      ...(data.minSelect !== undefined && {
        minSelect: data.minSelect,
      }),

      ...(data.maxSelect !== undefined && {
        maxSelect: data.maxSelect,
      }),

      ...(data.isRequired !== undefined && {
        isRequired: data.isRequired,
      }),
    },
  });
};

// DELETE / DEACTIVATE ADDON GROUP
export const deleteAddonGroup = async (
  id: number,
  tenantId: string
) => {
  const existingAddonGroup =
    await prisma.addonGroup.findUnique({
      where: {
        id,
        tenantId,
      },
    });

  if (!existingAddonGroup) {
    throw new Error("Addon group not found");
  }

  // AddonGroup does not currently have isActive.
  // Therefore, remove only if there are no related items.

  const addonItems =
    await prisma.addonGroupItem.count({
      where: {
        addonGroupId: id,
        tenantId,
      },
    });

  if (addonItems > 0) {
    throw new Error(
      "Cannot delete addon group because addon items are associated with it"
    );
  }

  return prisma.addonGroup.delete({
    where: {
      id,
    },
  });
};