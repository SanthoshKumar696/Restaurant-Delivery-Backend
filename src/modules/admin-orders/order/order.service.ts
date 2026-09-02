import { prisma } from "../../../database/prisma";
import {
  AdminOrderListFilter,
  AdminOrderListItem,
  AdminOrderDetailResponse,
  AdminOrderStatusUpdateInput,
} from "./order.types";
import { OrderStatus } from "@prisma/client";

// -----------------------------------
// GET ALL ADMIN ORDERS
// -----------------------------------

export const getAdminOrders = async (
  filters: AdminOrderListFilter,
  adminId: number
): Promise<AdminOrderListItem[]> => {
  const where: any = {};

  // Tenant validation - required
  if (!filters.tenantId) {
    throw new Error("Tenant ID is required");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: filters.tenantId },
    select: { id: true },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${filters.tenantId}`);
  }

  const admin = await prisma.admin.findFirst({
    where: {
      id: adminId,
      tenantId: filters.tenantId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!admin) {
    throw new Error("Admin account is inactive or not found");
  }

  where.tenantId = filters.tenantId;

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.paymentStatus) {
    where.paymentStatus = filters.paymentStatus;
  }

  const orders = await prisma.order.findMany({
    where,

    orderBy: {
      placedAt: "desc",
    },

    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      fulfillmentType: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      placedAt: true,
      customer: {
        select: {
          fullName: true,
          phone: true,
        },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customer?.fullName ?? null,
    customerPhone: order.customer?.phone ?? null,
    fulfillmentType: order.fulfillmentType,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: Number(order.totalAmount),
    placedAt: order.placedAt,
  }));
};

// -----------------------------------
// GET ORDERS BY STATUS
// -----------------------------------

export const getOrdersByStatus = async (
  tenantId: string,
  status: OrderStatus
): Promise<AdminOrderListItem[]> => {
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status,
    },

    orderBy: {
      placedAt: "desc",
    },

    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      fulfillmentType: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      placedAt: true,
      customer: {
        select: {
          fullName: true,
          phone: true,
        },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customer?.fullName ?? null,
    customerPhone: order.customer?.phone ?? null,
    fulfillmentType: order.fulfillmentType,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: Number(order.totalAmount),
    placedAt: order.placedAt,
  }));
};

// -----------------------------------
// GET ADMIN ORDER BY ID
// -----------------------------------

export const getAdminOrderById = async (
  id: number,
  tenantId: string,
  adminId?: number
): Promise<AdminOrderDetailResponse> => {
  if (!tenantId) {
    throw new Error("Tenant ID is required");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  if (adminId !== undefined) {
    const admin = await prisma.admin.findFirst({
      where: { id: adminId, tenantId, isActive: true },
      select: { id: true },
    });

    if (!admin) {
      throw new Error("Admin account is inactive or not found");
    }
  }

  const order = await prisma.order.findFirst({
    where: {
      id,
      tenantId,
    },

    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
        },
      },
      orderItems: {
        select: {
          id: true,
          productNameSnapshot: true,
          productId: true,
          variantNameSnapshot: true,
          variantId: true,
          quantity: true,
          unitPrice: true,
          discountAmount: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          lineTotal: true,
          product: { select: { id: true, name: true } },
          productVariant: { select: { id: true, name: true } },
        },
      },
      orderStatusHistory: {
        where: {
          tenantId,
        },
        orderBy: {
          changedAt: "desc",
        },
        select: {
          status: true,
          note: true,
          changedAt: true,
          staffUser: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentType: order.fulfillmentType,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    packagingCharge: Number(order.packagingCharge),
    deliveryCharge: Number(order.deliveryCharge),
    cgstAmount: Number(order.cgstAmount),
    sgstAmount: Number(order.sgstAmount),
    igstAmount: Number(order.igstAmount),
    totalAmount: Number(order.totalAmount),
    notes: order.notes,
    deliveryAddressLine: order.deliveryAddressLine,
    deliveryLandmark: order.deliveryLandmark,
    deliveryLatitude: order.deliveryLatitude?.toString() ?? null,
    deliveryLongitude: order.deliveryLongitude?.toString() ?? null,
    deliveryPhone: order.deliveryPhone,
    placedAt: order.placedAt,
    confirmedAt: order.confirmedAt,
    readyAt: order.readyAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    customer: {
      id: order.customer!.id,
      name: order.customer!.fullName,
      phone: order.customer!.phone,
      email: order.customer!.email,
    },
    orderItems: order.orderItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      productName: item.product?.name ?? null,
      variantId: item.variantId,
      variantNameSnapshot: item.variantNameSnapshot,
      variantName: item.productVariant?.name ?? null,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      discountAmount: Number(item.discountAmount),
      cgstAmount: Number(item.cgstAmount),
      sgstAmount: Number(item.sgstAmount),
      igstAmount: Number(item.igstAmount),
      lineTotal: Number(item.lineTotal),
    })),
    statusHistory: order.orderStatusHistory.map((h) => ({
      status: h.status,
      note: h.note,
      changedAt: h.changedAt,
      changedBy: h.staffUser?.fullName ?? null,
    })),
  };
};

// -----------------------------------
// UPDATE ADMIN ORDER STATUS
// -----------------------------------

export const updateAdminOrderStatus = async (
  id: number,
  tenantId: string,
  data: AdminOrderStatusUpdateInput
): Promise<AdminOrderDetailResponse> => {
  if (!tenantId) {
    throw new Error("Tenant ID is required");
  }

  const existingOrder = await prisma.order.findUnique({
    where: {
      id,
    },
  });

  if (!existingOrder) {
    throw new Error("Order not found");
  }

  if (existingOrder.tenantId !== tenantId) {
    throw new Error("Order does not belong to this tenant");
  }

  // Validate status transition
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ["CONFIRMED", "REJECTED"],
    CONFIRMED: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["OUT_FOR_DELIVERY", "CANCELLED"],
    OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
    REJECTED: [],
  };

  if (!validTransitions[existingOrder.status]?.includes(data.status)) {
    throw new Error(
      `Cannot transition from ${existingOrder.status} to ${data.status}`
    );
  }

  // Update order with new status and appropriate timestamp
  const updateData: any = {
    status: data.status,
  };

  if (data.status === "CONFIRMED") {
    updateData.confirmedAt = new Date();
  } else if (data.status === "READY") {
    updateData.readyAt = new Date();
  } else if (data.status === "COMPLETED") {
    updateData.completedAt = new Date();
  } else if (data.status === "CANCELLED") {
    updateData.cancelledAt = new Date();
  } else if (data.status === "REJECTED") {
    updateData.cancelledAt = new Date();
  }

  if (data.status === "CANCELLED") {
    updateData.cancelReason = data.note || "Cancelled by admin";
  } else if (data.status === "REJECTED") {
    updateData.rejectionReason = data.note || "Rejected by admin";
  }

  const order = await prisma.order.update({
    where: {
      id,
    },
    data: updateData,
  });

  // Create status history record
  await prisma.orderStatusHistory.create({
    data: {
      orderId: id,
      tenantId,
      status: data.status,
      note: data.note,
      changedBy: data.changedBy,
    },
  });

  // Fetch and return updated order details
  return getAdminOrderById(id, tenantId);
};

// -----------------------------------
// ADMIN ACCEPT ORDER
// -----------------------------------

export const acceptAdminOrder = async (
  id: number,
  tenantId: string,
  note?: string
): Promise<AdminOrderDetailResponse> => {
  return updateAdminOrderStatus(id, tenantId, {
    status: "CONFIRMED",
    note: note || "Order accepted by admin",
  });
};

// -----------------------------------
// ADMIN REJECT ORDER
// -----------------------------------

export const rejectAdminOrder = async (
  id: number,
  tenantId: string,
  note?: string
): Promise<AdminOrderDetailResponse> => {
  return updateAdminOrderStatus(id, tenantId, {
    status: "REJECTED",
    note: note || "Order rejected by admin",
  });
};

// -----------------------------------
// ADMIN CANCEL ORDER
// -----------------------------------

export const cancelAdminOrder = async (
  id: number,
  tenantId: string,
  note?: string
): Promise<AdminOrderDetailResponse> => {
  const existingOrder = await prisma.order.findUnique({
    where: {
      id,
    },
  });

  if (!existingOrder) {
    throw new Error("Order not found");
  }

  if (existingOrder.tenantId !== tenantId) {
    throw new Error("Order does not belong to this tenant");
  }

  // Orders that are completed or already rejected cannot be cancelled
  if (existingOrder.status === "COMPLETED") {
    throw new Error("Completed orders cannot be cancelled");
  }

  if (existingOrder.status === "REJECTED") {
    throw new Error("Rejected orders cannot be cancelled");
  }

  return updateAdminOrderStatus(id, tenantId, {
    status: "CANCELLED",
    note: note || "Order cancelled by admin",
  });
};