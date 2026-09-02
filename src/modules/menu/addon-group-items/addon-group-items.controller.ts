import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createAddonGroupItem as createAddonGroupItemService,
  getAllAddonGroupItems as getAllAddonGroupItemsService,
  getAddonGroupItemById as getAddonGroupItemByIdService,
  updateAddonGroupItem as updateAddonGroupItemService,
  deleteAddonGroupItem as deleteAddonGroupItemService,
} from "./addon-group-items.service";

// CREATE
export const createAddonGroupItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const addonGroupItem =
      await createAddonGroupItemService(req.body);

    return res.status(201).json({
      success: true,
      message: "Addon group item created successfully",
      data: addonGroupItem,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getAllAddonGroupItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      typeof req.query.tenantId === "string"
        ? req.query.tenantId
        : "";

    const addonGroupId =
      typeof req.query.addonGroupId === "string"
        ? Number(req.query.addonGroupId)
        : undefined;

    const items =
      await getAllAddonGroupItemsService(
        tenantId,
        addonGroupId
      );

    return res.status(200).json({
      success: true,
      message: "Addon group items fetched successfully",
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// GET BY ID
export const getAddonGroupItemById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const addonGroupItem =
      await getAddonGroupItemByIdService(id, String(req.query.tenantId));

    return res.status(200).json({
      success: true,
      message: "Addon group item fetched successfully",
      data: addonGroupItem,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE
export const updateAddonGroupItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const addonGroupItem =
      await updateAddonGroupItemService(
        id,
        req.body.tenantId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Addon group item updated successfully",
      data: addonGroupItem,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE / DEACTIVATE
export const deleteAddonGroupItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const addonGroupItem =
      await deleteAddonGroupItemService(id, String(req.query.tenantId));

    return res.status(200).json({
      success: true,
      message: "Addon group item deactivated successfully",
      data: addonGroupItem,
    });
  } catch (error) {
    next(error);
  }
};