import { prisma } from "../../../database/prisma";
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  UpdateCustomerProfileInput,
} from "./customer.types";


// CREATE CUSTOMER
export const createCustomer = async (
  data: CreateCustomerInput
) => {
  // Check tenant
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: data.tenantId,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Check duplicate phone under same tenant
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      tenantId_phone: {
        tenantId: data.tenantId,
        phone: data.phone,
      },
    },
  });

  if (existingCustomer) {
    throw new Error(
      "Customer with this phone number already exists"
    );
  }

  return prisma.customer.create({
    data: {
      tenantId: data.tenantId,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      passwordHash: data.passwordHash,
      referralCode: data.referralCode,
      referredBy: data.referredBy,
    },
  });
};

// GET ALL CUSTOMERS
export const getAllCustomers = async () => {
  return prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

// GET CUSTOMERS BY TENANT
export const getCustomersByTenant = async (
  tenantId: string
) => {
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: tenantId,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return prisma.customer.findMany({
    where: {
      tenantId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// GET CUSTOMER BY ID
export const getCustomerById = async (
  id: number
) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id,
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  return customer;
};

// UPDATE CUSTOMER
export const updateCustomer = async (
  id: number,
  data: UpdateCustomerInput
) => {
  const existingCustomer =
    await prisma.customer.findUnique({
      where: {
        id,
      },
    });

  if (!existingCustomer) {
    throw new Error("Customer not found");
  }

  // If phone is changing, check duplicate
  if (
    data.phone &&
    data.phone !== existingCustomer.phone
  ) {
    const phoneExists =
      await prisma.customer.findUnique({
        where: {
          tenantId_phone: {
            tenantId: existingCustomer.tenantId,
            phone: data.phone,
          },
        },
      });

    if (phoneExists) {
      throw new Error(
        "Customer with this phone number already exists"
      );
    }
  }

  return prisma.customer.update({
    where: {
      id,
    },
    data,
  });
};

// DEACTIVATE CUSTOMER
export const deleteCustomer = async (
  id: number
) => {
  const existingCustomer =
    await prisma.customer.findUnique({
      where: {
        id,
      },
    });

  if (!existingCustomer) {
    throw new Error("Customer not found");
  }

  return prisma.customer.update({
    where: {
      id,
    },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
};



/**
 * Get customer profile
 */
export const getCustomerProfile = async (customerId: number) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    select: {
      id: true,
      tenantId: true,
      fullName: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      referralCode: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  return customer;
};

/**
 * Update customer profile
 */
export const updateCustomerProfile = async (
  customerId: number,
  data: UpdateCustomerProfileInput
) => {
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
  });

  if (!existingCustomer) {
    throw new Error("Customer not found");
  }

  const updateData: {
    fullName?: string;
    email?: string | null;
    dateOfBirth?: Date | null;
  } = {};

  if (data.fullName !== undefined) {
    updateData.fullName = data.fullName;
  }

  if (data.email !== undefined) {
    updateData.email = data.email;
  }

  if (data.dateOfBirth !== undefined) {
    updateData.dateOfBirth = data.dateOfBirth;
  }

  return prisma.customer.update({
    where: {
      id: customerId,
    },
    data: updateData,
    select: {
      id: true,
      tenantId: true,
      fullName: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      referralCode: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};