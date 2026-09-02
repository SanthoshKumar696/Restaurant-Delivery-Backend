import { prisma } from "../../../database/prisma";
import {
  CreateOrderInput,
  UpdateOrderStatusInput,
} from "./order.types";

export const createOrder = async (data: CreateOrderInput) => {
  // -----------------------------------
  // 1. Check Tenant
  // -----------------------------------
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: data.tenantId,
    },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  if (!tenant.isActive) {
    throw new Error("Tenant is inactive");
  }

  // -----------------------------------
  // 2. Check Branch
  // -----------------------------------
  const branch = await prisma.branch.findUnique({
    where: {
      id: data.branchId,
    },
  });

  if (!branch) {
    throw new Error("Branch not found");
  }

  if (!branch.isActive) {
    throw new Error("Branch is inactive");
  }

  if (branch.tenantId !== data.tenantId) {
    throw new Error("Branch does not belong to this tenant");
  }

  // -----------------------------------
  // 3. Check Customer
  // -----------------------------------
  const customer = await prisma.customer.findUnique({
    where: {
      id: data.customerId,
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  if (!customer.isActive) {
    throw new Error("Customer is inactive");
  }

  if (customer.tenantId !== data.tenantId) {
    throw new Error("Customer does not belong to this tenant");
  }

  // -----------------------------------
  // 4. Get Products
  // -----------------------------------
  const productIds = data.items.map(
    (item) => item.productId
  );

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
      tenantId: data.tenantId,
      isActive: true,
    },
  });

  if (products.length !== productIds.length) {
    throw new Error(
      "One or more products were not found or inactive"
    );
  }

  // -----------------------------------
  // 5. Validate Variants
  // -----------------------------------
  const variantIds = data.items
    .filter((item) => item.variantId)
    .map((item) => item.variantId!);

  const variants =
    variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: {
            id: {
              in: variantIds,
            },
            tenantId: data.tenantId,
            isActive: true,
          },
        })
      : [];

  // -----------------------------------
  // 6. Calculate Subtotal
  // -----------------------------------
  let subtotal = 0;

  const orderItems = data.items.map((item) => {
    const product = products.find(
      (p) => p.id === item.productId
    );

    if (!product) {
      throw new Error(
        `Product ${item.productId} not found`
      );
    }

    let unitPrice = Number(product.basePrice);
    let variantName: string | null = null;

    if (item.variantId) {
      const variant = variants.find(
        (v) => v.id === item.variantId
      );

      if (!variant) {
        throw new Error(
          `Product variant ${item.variantId} not found`
        );
      }

      if (variant.productId !== item.productId) {
        throw new Error(
          `Variant ${item.variantId} does not belong to product ${item.productId}`
        );
      }

      unitPrice = Number(variant.price);
      variantName = variant.name;
    }

    const lineTotal =
      unitPrice * item.quantity;

    subtotal += lineTotal;

    return {
        tenantId: data.tenantId,
      productId: item.productId,
      variantId: item.variantId ?? null,

      productNameSnapshot: product.name,

      variantNameSnapshot: variantName,

      quantity: item.quantity,

      unitPrice,

      discountAmount: 0,

      cgstPercentageSnapshot: 0,
      sgstPercentageSnapshot: 0,
      igstPercentageSnapshot: 0,

      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,

      lineTotal,
    };
  });

  // -----------------------------------
  // 7. Charges
  // -----------------------------------
  const discountAmount = 0;
  const packagingCharge = 0;
  const deliveryCharge =
    data.fulfillmentType === "DELIVERY"
      ? 0
      : 0;

  const cgstAmount = 0;
  const sgstAmount = 0;
  const igstAmount = 0;

  const loyaltyPointsUsed = 0;
  const loyaltyDiscountAmount = 0;

  const totalAmount =
    subtotal -
    discountAmount +
    packagingCharge +
    deliveryCharge +
    cgstAmount +
    sgstAmount +
    igstAmount -
    loyaltyDiscountAmount;

  // -----------------------------------
  // 8. Generate Order Number
  // -----------------------------------
  const lastOrder = await prisma.order.findFirst({
    where: {
      tenantId: data.tenantId,
    },
    orderBy: {
      id: "desc",
    },
    select: {
      orderNumber: true,
    },
  });

  let nextOrderNumber = 1;

  if (lastOrder?.orderNumber) {
    const parsed = Number(lastOrder.orderNumber);

    if (!Number.isNaN(parsed)) {
      nextOrderNumber = parsed + 1;
    }
  }

  const orderNumber = String(nextOrderNumber);

  // -----------------------------------
  // 9. Create Order + Items
  // -----------------------------------
  const order = await prisma.order.create({
    data: {
      tenantId: data.tenantId,
      branchId: data.branchId,
      customerId: data.customerId,

      orderNumber,

      fulfillmentType:
        data.fulfillmentType,

      status: "PENDING",

      paymentStatus: "PENDING",

      subtotal,

      discountAmount,

      packagingCharge,

      deliveryCharge,

      cgstAmount,
      sgstAmount,
      igstAmount,

      loyaltyPointsUsed,

      loyaltyDiscountAmount,

      totalAmount,

      deliveryAddressLine:
        data.deliveryAddressLine,

      deliveryLandmark:
        data.deliveryLandmark,

      deliveryLatitude:
        data.deliveryLatitude,

      deliveryLongitude:
        data.deliveryLongitude,

      deliveryPhone:
        data.deliveryPhone,

      notes: data.notes,

      orderItems: {
        create: orderItems,
      },
    },

    include: {
      orderItems: true,
    },
  });

  // -----------------------------------
  // 10. Create Initial Status History
  // -----------------------------------
  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      tenantId: data.tenantId,
      status: "PENDING",
      note: "Order created",
    },
  });

  return order;
};

// -----------------------------------
// GET CUSTOMER ORDERS
// -----------------------------------

export const getCustomerOrders = async (
  customerId: number,
  tenantId: string
) => {
  // Validate customer and tenant relationship
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  if (customer.tenantId !== tenantId) {
    throw new Error("Customer does not belong to this tenant");
  }

  return prisma.order.findMany({
    where: {
      customerId,
      tenantId,
    },

    orderBy: {
      placedAt: "desc",
    },

    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      fulfillmentType: true,
      totalAmount: true,
      placedAt: true,
    },
  });
};

// -----------------------------------
// GET ALL ORDERS (DEPRECATED - DO NOT USE)
// -----------------------------------

export const getAllOrders = async () => {
  // This function should not be used for customer endpoints
  // It returns all orders from all customers
  console.warn(
    "WARNING: getAllOrders() should not be used for customer-facing APIs. Use getCustomerOrders() instead."
  );

  return prisma.order.findMany({
    orderBy: {
      placedAt: "desc",
    },

    include: {
      orderItems: true,
    },
  });
};

// -----------------------------------
// GET ORDER BY ID (CUSTOMER-SPECIFIC)
// -----------------------------------

export const getOrderById = async (
  id: number,
  customerId: number,
  tenantId: string
) => {
  // Validate customer and tenant relationship
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  if (customer.tenantId !== tenantId) {
    throw new Error("Customer does not belong to this tenant");
  }

  const order = await prisma.order.findUnique({
    where: {
      id,
    },

    include: {
      orderItems: {
        select: {
          id: true,
          productNameSnapshot: true,
          variantNameSnapshot: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
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
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Verify that the order belongs to this customer
  if (order.customerId !== customerId || order.tenantId !== tenantId) {
    throw new Error("Order does not belong to this customer");
  }

  return order;
};

// -----------------------------------
// UPDATE ORDER STATUS
// -----------------------------------

export const updateOrderStatus = async (
  id: number,
  data: UpdateOrderStatusInput
) => {
  const existingOrder =
    await prisma.order.findUnique({
      where: {
        id,
      },
    });

  if (!existingOrder) {
    throw new Error("Order not found");
  }

  const updatedOrder =
    await prisma.order.update({
      where: {
        id,
      },

      data: {
        status: data.status,

        confirmedAt:
          data.status === "CONFIRMED"
            ? new Date()
            : undefined,

        readyAt:
          data.status === "READY"
            ? new Date()
            : undefined,

        completedAt:
          data.status === "COMPLETED"
            ? new Date()
            : undefined,

        cancelledAt:
          data.status === "CANCELLED"
            ? new Date()
            : undefined,

        cancelReason:
          data.status === "CANCELLED"
            ? data.note
            : undefined,
      },
    });

  // Status history
  await prisma.orderStatusHistory.create({
    data: {
      orderId: id,
      tenantId: existingOrder.tenantId,
      status: data.status,
      note: data.note,
    },
  });

  return updatedOrder;
};

// -----------------------------------
// CANCEL ORDER (CUSTOMER-SPECIFIC)
// -----------------------------------

export const cancelOrder = async (
  id: number,
  customerId: number,
  tenantId: string
) => {
  // Validate customer and tenant relationship
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  if (customer.tenantId !== tenantId) {
    throw new Error("Customer does not belong to this tenant");
  }

  const existingOrder =
    await prisma.order.findUnique({
      where: {
        id,
      },
    });

  if (!existingOrder) {
    throw new Error("Order not found");
  }

  // Verify order belongs to this customer
  if (existingOrder.customerId !== customerId || existingOrder.tenantId !== tenantId) {
    throw new Error("Order does not belong to this customer");
  }

  if (
    existingOrder.status === "COMPLETED"
  ) {
    throw new Error(
      "Completed order cannot be cancelled"
    );
  }

  if (
    existingOrder.status === "CANCELLED"
  ) {
    throw new Error(
      "Order is already cancelled"
    );
  }

  if (existingOrder.status === "REJECTED") {
    throw new Error("Rejected order cannot be cancelled");
  }

  const order =
    await prisma.order.update({
      where: {
        id,
      },

      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: "Cancelled by customer",
      },
    });

  await prisma.orderStatusHistory.create({
    data: {
      orderId: id,
      tenantId: existingOrder.tenantId,
      status: "CANCELLED",
      note: "Cancelled by customer",
    },
  });

  return order;
};