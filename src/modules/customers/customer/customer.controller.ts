import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createCustomer as createCustomerService,
  getAllCustomers as getAllCustomersService,
  getCustomersByTenant as getCustomersByTenantService,
  getCustomerById as getCustomerByIdService,
  updateCustomer as updateCustomerService,
  deleteCustomer as deleteCustomerService,
  getCustomerProfile as getCustomerProfileService,
  updateCustomerProfile as updateCustomerProfileService,
} from "./customer.service";

// CREATE CUSTOMER
export const createCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customer =
      await createCustomerService(req.body);

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL CUSTOMERS
export const getAllCustomers = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customers =
      await getAllCustomersService();

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// GET CUSTOMERS BY TENANT
export const getCustomersByTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customers =
      await getCustomersByTenantService(
        String(req.params.tenantId)
      );

    return res.status(200).json({
      success: true,
      message:
        "Tenant customers fetched successfully",
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// GET CUSTOMER BY ID
export const getCustomerById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customer =
      await getCustomerByIdService(
        Number(req.params.id)
      );

    return res.status(200).json({
      success: true,
      message: "Customer fetched successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE CUSTOMER
export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customer =
      await updateCustomerService(
        Number(req.params.id),
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// DEACTIVATE CUSTOMER
export const deleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customer =
      await deleteCustomerService(
        Number(req.params.id)
      );

    return res.status(200).json({
      success: true,
      message: "Customer deactivated successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer profile
 */
export const getCustomerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customer = await getCustomerProfileService(
      Number(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: "Customer profile fetched successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update customer profile
 */
export const updateCustomerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customer = await updateCustomerProfileService(
      Number(req.params.id),
      {
        ...req.body,

        dateOfBirth:
          req.body.dateOfBirth !== undefined &&
          req.body.dateOfBirth !== null
            ? new Date(req.body.dateOfBirth)
            : req.body.dateOfBirth,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Customer profile updated successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};