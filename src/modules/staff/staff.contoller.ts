import { Request, Response, NextFunction } from "express";

import {
  createStaff as createStaffService,
  getAllStaff as getAllStaffService,
  getStaffById as getStaffByIdService,
  getStaffByTenant as getStaffByTenantService,
  updateStaff as updateStaffService,
  deleteStaff as deleteStaffService,
} from "./staff.service";

/**
 * CREATE STAFF USER
 */
export const createStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const staff = await createStaffService(req.body);

    return res.status(201).json({
      success: true,
      message: "Staff user created successfully",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET ALL STAFF USERS
 */
export const getAllStaff = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const staffUsers = await getAllStaffService();

    return res.status(200).json({
      success: true,
      message: "Staff users fetched successfully",
      data: staffUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET STAFF USER BY ID
 */
export const getStaffById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const staff = await getStaffByIdService(
      Number(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: "Staff user fetched successfully",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET STAFF USERS BY TENANT
 */
export const getStaffByTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const staffUsers = await getStaffByTenantService(
      String(req.params.tenantId)
    );

    return res.status(200).json({
      success: true,
      message: "Tenant staff users fetched successfully",
      data: staffUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE STAFF USER
 */
export const updateStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const staff = await updateStaffService(
      Number(req.params.id),
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Staff user updated successfully",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DEACTIVATE STAFF USER
 */
export const deleteStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const staff = await deleteStaffService(
      Number(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: "Staff user deactivated successfully",
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};