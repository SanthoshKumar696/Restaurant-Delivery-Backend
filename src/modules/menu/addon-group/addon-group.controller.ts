import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createAddonGroup as createAddonGroupService,
  getAllAddonGroups as getAllAddonGroupsService,
  getAddonGroupById as getAddonGroupByIdService,
  updateAddonGroup as updateAddonGroupService,
  deleteAddonGroup as deleteAddonGroupService,
} from "./addon-group.service";

// CREATE ADDON GROUP
export const createAddonGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const addonGroup =
      await createAddonGroupService(req.body);

    return res.status(201).json({
      success: true,
      message: "Addon group created successfully",
      data: addonGroup,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL ADDON GROUPS
export const getAllAddonGroups = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = String(req.query.tenantId);

    const addonGroups =
      await getAllAddonGroupsService(tenantId);

    return res.status(200).json({
      success: true,
      message: "Addon groups fetched successfully",
      data: addonGroups,
    });
  } catch (error) {
    next(error);
  }
};

// GET ADDON GROUP BY ID
export const getAddonGroupById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const addonGroup =
      await getAddonGroupByIdService(id, String(req.query.tenantId));

    return res.status(200).json({
      success: true,
      message: "Addon group fetched successfully",
      data: addonGroup,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE ADDON GROUP
export const updateAddonGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const addonGroup =
      await updateAddonGroupService(
        id,
        req.body.tenantId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Addon group updated successfully",
      data: addonGroup,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE ADDON GROUP
export const deleteAddonGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const addonGroup =
      await deleteAddonGroupService(id, String(req.query.tenantId));

    return res.status(200).json({
      success: true,
      message: "Addon group deleted successfully",
      data: addonGroup,
    });
  } catch (error) {
    next(error);
  }
};