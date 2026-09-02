import { Request, Response, NextFunction } from "express";
import {
  createBranch as createBranchService,
  getAllBranches as getAllBranchesService,
  getBranchById as getBranchByIdService,
  updateBranch as updateBranchService,
  deleteBranch as deleteBranchService,
} from "./branch.service";

export const createBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const branch = await createBranchService(req.body);

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBranches = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const branches = await getAllBranchesService();

    return res.status(200).json({
      success: true,
      message: "Branches fetched successfully",
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const branch = await getBranchByIdService(String(req.params.id));

    return res.status(200).json({
      success: true,
      message: "Branch fetched successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const branch = await updateBranchService(
      String(req.params.id),
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const branch = await deleteBranchService(String(req.params.id));

    return res.status(200).json({
      success: true,
      message: "Branch deactivated successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};
