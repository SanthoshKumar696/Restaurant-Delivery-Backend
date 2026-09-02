import { Request, Response, NextFunction } from "express";

import {
  createProductVariant as createProductVariantService,
  getAllProductVariants as getAllProductVariantsService,
  getProductVariantById as getProductVariantByIdService,
  updateProductVariant as updateProductVariantService,
  deleteProductVariant as deleteProductVariantService,
} from "./product-variant.service";

export const createProductVariant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const variant =
      await createProductVariantService(req.body);

    return res.status(201).json({
      success: true,
      message: "Product variant created successfully",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllProductVariants = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const variants =
      await getAllProductVariantsService(String(req.query.tenantId));

    return res.status(200).json({
      success: true,
      message: "Product variants fetched successfully",
      data: variants,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductVariantById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const variant =
      await getProductVariantByIdService(
        Number(req.params.id),
        String(req.query.tenantId)
      );

    return res.status(200).json({
      success: true,
      message: "Product variant fetched successfully",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProductVariant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const variant =
      await updateProductVariantService(
        Number(req.params.id),
        req.body.tenantId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Product variant updated successfully",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProductVariant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const variant =
      await deleteProductVariantService(
        Number(req.params.id),
        String(req.query.tenantId)
      );

    return res.status(200).json({
      success: true,
      message:
        "Product variant deactivated successfully",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};