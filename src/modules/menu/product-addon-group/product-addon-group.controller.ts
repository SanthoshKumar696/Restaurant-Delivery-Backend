import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createProductAddonGroup as createProductAddonGroupService,
  getAllProductAddonGroups as getAllProductAddonGroupsService,
  getProductAddonGroupById as getProductAddonGroupByIdService,
  updateProductAddonGroup as updateProductAddonGroupService,
  deleteProductAddonGroup as deleteProductAddonGroupService,
} from "./product-addon-group.service";

// CREATE
export const createProductAddonGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const relation =
      await createProductAddonGroupService(req.body);

    return res.status(201).json({
      success: true,
      message:
        "Addon group assigned to product successfully",
      data: relation,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getAllProductAddonGroups = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId =
      typeof req.query.tenantId === "string"
        ? req.query.tenantId
        : "";

    const relations =
      await getAllProductAddonGroupsService(tenantId);

    return res.status(200).json({
      success: true,
      message:
        "Product addon group mappings fetched successfully",
      data: relations,
    });
  } catch (error) {
    next(error);
  }
};

// GET BY ID
export const getProductAddonGroupById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const relation =
      await getProductAddonGroupByIdService(id, String(req.query.tenantId));

    return res.status(200).json({
      success: true,
      message:
        "Product addon group mapping fetched successfully",
      data: relation,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE
export const updateProductAddonGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const relation =
      await updateProductAddonGroupService(
        id,
        req.body.tenantId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Product addon group mapping updated successfully",
      data: relation,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE
export const deleteProductAddonGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = Number(req.params.id);

    const relation =
      await deleteProductAddonGroupService(id, String(req.query.tenantId));

    return res.status(200).json({
      success: true,
      message:
        "Addon group removed from product successfully",
      data: relation,
    });
  } catch (error) {
    next(error);
  }
};