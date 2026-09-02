import { prisma } from "../../../database/prisma";
import {
  CreateAddressInput,
  UpdateAddressInput,
} from "./address.types";

// ------------------------------------
// Check customer
// ------------------------------------
const getCustomer = async (
  customerId: number,
  tenantId?: string
) => {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      ...(tenantId ? { tenantId } : {}),
      isActive: true,
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  return customer;
};

// ------------------------------------
// CREATE ADDRESS
// ------------------------------------
export const createAddress = async (
  customerId: number,
  data: CreateAddressInput
) => {
  const customer = await getCustomer(
    customerId,
    data.tenantId
  );

  // If this address becomes default,
  // remove default from previous address.
  if (data.isDefault === true) {
    await prisma.customerAddress.updateMany({
      where: {
        customerId: customer.id,
        tenantId: customer.tenantId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  // If customer has no address,
  // automatically make first address default.
  const addressCount = await prisma.customerAddress.count({
    where: {
      customerId: customer.id,
      tenantId: customer.tenantId,
    },
  });

  const isDefault =
    data.isDefault === true || addressCount === 0;

  return prisma.customerAddress.create({
    data: {
      customerId: customer.id,
      tenantId: customer.tenantId,
      label: data.label,
      addressLine: data.addressLine,
      landmark: data.landmark,
      latitude: data.latitude,
      longitude: data.longitude,
      isDefault,
    },
  });
};

// ------------------------------------
// GET ALL ADDRESSES
// ------------------------------------
export const getCustomerAddresses = async (
  customerId: number
) => {
  const customer = await getCustomer(customerId);

  return prisma.customerAddress.findMany({
    where: {
      customerId: customer.id,
      tenantId: customer.tenantId,
    },
    orderBy: [
      {
        isDefault: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
};

// ------------------------------------
// GET ADDRESS BY ID
// ------------------------------------
export const getAddressById = async (
  customerId: number,
  addressId: number
) => {
  const customer = await getCustomer(customerId);

  const address =
    await prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId: customer.id,
        tenantId: customer.tenantId,
      },
    });

  if (!address) {
    throw new Error("Address not found");
  }

  return address;
};

// ------------------------------------
// UPDATE ADDRESS
// ------------------------------------
export const updateAddress = async (
  customerId: number,
  addressId: number,
  data: UpdateAddressInput
) => {
  const customer = await getCustomer(customerId);

  const existingAddress =
    await prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId: customer.id,
        tenantId: customer.tenantId,
      },
    });

  if (!existingAddress) {
    throw new Error("Address not found");
  }

  // Make this address default
  if (data.isDefault === true) {
    await prisma.customerAddress.updateMany({
      where: {
        customerId: customer.id,
        tenantId: customer.tenantId,
        id: {
          not: addressId,
        },
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  return prisma.customerAddress.update({
    where: {
      id: addressId,
    },
    data,
  });
};

// ------------------------------------
// DELETE ADDRESS
// ------------------------------------
export const deleteAddress = async (
  customerId: number,
  addressId: number
) => {
  const customer = await getCustomer(customerId);

  const existingAddress =
    await prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId: customer.id,
        tenantId: customer.tenantId,
      },
    });

  if (!existingAddress) {
    throw new Error("Address not found");
  }

  await prisma.customerAddress.delete({
    where: {
      id: addressId,
    },
  });

  // If deleted address was default,
  // make the newest remaining address default.
  if (existingAddress.isDefault) {
    const nextAddress =
      await prisma.customerAddress.findFirst({
        where: {
          customerId: customer.id,
          tenantId: customer.tenantId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (nextAddress) {
      await prisma.customerAddress.update({
        where: {
          id: nextAddress.id,
        },
        data: {
          isDefault: true,
        },
      });
    }
  }

  return {
    id: addressId,
    message: "Address deleted successfully",
  };
};

// ------------------------------------
// SET DEFAULT ADDRESS
// ------------------------------------
export const setDefaultAddress = async (
  customerId: number,
  addressId: number
) => {
  const customer = await getCustomer(customerId);

  const address =
    await prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId: customer.id,
        tenantId: customer.tenantId,
      },
    });

  if (!address) {
    throw new Error("Address not found");
  }

  await prisma.customerAddress.updateMany({
    where: {
      customerId: customer.id,
      tenantId: customer.tenantId,
      isDefault: true,
    },
    data: {
      isDefault: false,
    },
  });

  return prisma.customerAddress.update({
    where: {
      id: addressId,
    },
    data: {
      isDefault: true,
    },
  });
};