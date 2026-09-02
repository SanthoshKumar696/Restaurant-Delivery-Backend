import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  createAddress as createAddressService,
  getCustomerAddresses as getCustomerAddressesService,
  getAddressById as getAddressByIdService,
  updateAddress as updateAddressService,
  deleteAddress as deleteAddressService,
  setDefaultAddress as setDefaultAddressService,
} from "./address.service";

export const createAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = Number(
      req.params.id
    );

    const address = await createAddressService(
      customerId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Customer address created successfully",
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------
// GET ALL ADDRESSES
// ------------------------------------
export const getCustomerAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = Number(
      req.params.id
    );

    const addresses =
      await getCustomerAddressesService(customerId);

    return res.status(200).json({
      success: true,
      message: "Customer addresses fetched successfully",
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------
// GET ADDRESS BY ID
// ------------------------------------
export const getAddressById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = Number(
      req.params.id
    );

    const addressId = Number(req.params.addressId);

    const address = await getAddressByIdService(
      customerId,
      addressId
    );

    return res.status(200).json({
      success: true,
      message: "Customer address fetched successfully",
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------
// UPDATE ADDRESS
// ------------------------------------
export const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = Number(
      req.params.id
    );

    const addressId = Number(req.params.addressId);

    const address = await updateAddressService(
      customerId,
      addressId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Customer address updated successfully",
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------
// DELETE ADDRESS
// ------------------------------------
export const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = Number(
      req.params.id
    );

    const addressId = Number(req.params.addressId);

    const result = await deleteAddressService(
      customerId,
      addressId
    );

    return res.status(200).json({
      success: true,
      message: "Customer address deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------
// SET DEFAULT ADDRESS
// ------------------------------------
export const setDefaultAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = Number(
      req.params.id
    );

    const addressId = Number(req.params.addressId);

    const address =
      await setDefaultAddressService(
        customerId,
        addressId
      );

    return res.status(200).json({
      success: true,
      message: "Default address updated successfully",
      data: address,
    });
  } catch (error) {
    next(error);
  }
};