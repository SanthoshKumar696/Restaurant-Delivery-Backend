import { Request, Response, NextFunction } from "express";

import {
  createCategory as createCategoryService,
  getAllCategories as getAllCategoriesService,
  getCategoryById as getCategoryByIdService,
  updateCategory as updateCategoryService,
  deleteCategory as deleteCategoryService,
} from "./category.service";

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await createCategoryService(req.body);

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await getAllCategoriesService(String(req.query.tenantId));

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await getCategoryByIdService(
      Number(req.params.id),
      String(req.query.tenantId)
    );

    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await updateCategoryService(
      Number(req.params.id),
      req.body.tenantId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await deleteCategoryService(
      Number(req.params.id),
      String(req.query.tenantId)
    );

    return res.status(200).json({
      success: true,
      message: "Category deactivated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};