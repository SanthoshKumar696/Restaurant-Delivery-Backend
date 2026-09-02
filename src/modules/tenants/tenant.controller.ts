import { Request, Response, NextFunction } from "express";

import {
  createTenant as createTenantService,
  getAllTenants as getAllTenantsService,
  getTenantById as getTenantByIdService,
  updateTenant as updateTenantService,
  deleteTenant as deleteTenantService,
  getTenantBranches as getTenantBranchesService,
} from "./tenant.service";

// CREATE TENANT
export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenant = await createTenantService(req.body);

    return res.status(201).json({
      success: true,
      message: "Tenant created successfully",
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL TENANTS
export const getAllTenants = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenants = await getAllTenantsService();

    return res.status(200).json({
      success: true,
      message: "Tenants fetched successfully",
      data: tenants,
    });
  } catch (error) {
    next(error);
  }
};

// GET TENANT BY ID
export const getTenantById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = String(req.params.id);

    const tenant = await getTenantByIdService(tenantId);

    return res.status(200).json({
      success: true,
      message: "Tenant fetched successfully",
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE TENANT
export const updateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = String(req.params.id);

    const tenant = await updateTenantService(
      tenantId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Tenant updated successfully",
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE / DEACTIVATE TENANT
export const deleteTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = String(req.params.id);

    const tenant = await deleteTenantService(tenantId);

    return res.status(200).json({
      success: true,
      message: "Tenant deactivated successfully",
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL BRANCHES UNDER TENANT
export const getTenantBranches = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const branches = await getTenantBranchesService(
      String(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: "Tenant branches fetched successfully",
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};