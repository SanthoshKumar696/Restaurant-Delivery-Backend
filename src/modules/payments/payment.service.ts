import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

import { logger } from "../../common/logger/logger";
import { prisma } from "../../database/prisma";
import { CreatePaymentInput, PaymentListFilters, UpdatePaymentStatusInput } from "./payment.types";

const allowedPaymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["SUCCESS", "FAILED", "CANCELLED"],
  SUCCESS: ["REFUNDED"],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
  PAID: ["REFUNDED"],
  PARTIALLY_REFUNDED: [],
};

const paymentMethodMap = {
  CASH_ON_DELIVERY: "CASH_ON_DELIVERY",
  ONLINE: "ONLINE",
} as const;

const getCurrency = async (tenantId: string) => {
  const tenantSetting = await prisma.tenantSetting.findUnique({
    where: { tenantId },
    select: { currency: true },
  });

  return tenantSetting?.currency ?? "INR";
};

export const createCustomerPayment = async (
  tenantId: string,
  customerId: number,
  data: CreatePaymentInput
) => {
  logger.info("[Payment] Initializing payment");

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    include: {
      payment: true,
      tenant: true,
      customer: true,
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.tenantId !== tenantId) {
    throw new Error("TENANT_ACCESS_DENIED");
  }

  if (order.customerId !== customerId) {
    throw new Error("ORDER_CUSTOMER_MISMATCH");
  }

  if (order.payment) {
    throw new Error("PAYMENT_ALREADY_EXISTS");
  }

  const paymentMethod = paymentMethodMap[data.paymentMethod as keyof typeof paymentMethodMap];

  if (!paymentMethod) {
    throw new Error("INVALID_PAYMENT_METHOD");
  }

  const amount = Number(order.totalAmount);
  const currency = await getCurrency(tenantId);

  const payment = await prisma.payment.create({
    data: {
      tenantId: order.tenantId,
      branchId: order.branchId,
      orderId: order.id,
      customerId: order.customerId,
      paymentMethod,
      paymentStatus: "PENDING",
      amount,
      currency,
      referenceId: null,
      gatewayName: paymentMethod === "ONLINE" ? "UNCONFIGURED" : null,
      gatewayPaymentId: null,
      gatewayOrderId: null,
      paidAt: null,
      failureReason: null,
    },
  });

  logger.info("[Payment] Payment created");

  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    paymentMethod: payment.paymentMethod,
    paymentStatus: payment.paymentStatus,
    amount: Number(payment.amount),
    currency: payment.currency,
    gatewayName: payment.gatewayName,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
};

export const getCustomerPaymentById = async (
  tenantId: string,
  customerId: number,
  paymentId: number
) => {
  logger.info("[Payment] Payment lookup");

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      tenantId,
      customerId,
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error("PAYMENT_NOT_FOUND");
  }

  return payment;
};

export const getAdminPayments = async (
  tenantId: string,
  filters: PaymentListFilters
) => {
  const where: Prisma.PaymentWhereInput = {
    tenantId,
  };

  if (filters.status) {
    where.paymentStatus = filters.status;
  }

  if (filters.paymentMethod) {
    where.paymentMethod = filters.paymentMethod;
  }

  if (filters.orderId) {
    where.orderId = filters.orderId;
  }

  return prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderId: true,
      paymentMethod: true,
      paymentStatus: true,
      amount: true,
      currency: true,
      createdAt: true,
    },
  });
};

export const getAdminPaymentById = async (tenantId: string, paymentId: number) => {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      tenantId,
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          placedAt: true,
          customer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error("PAYMENT_NOT_FOUND");
  }

  return payment;
};

export const updateAdminPaymentStatus = async (
  tenantId: string,
  paymentId: number,
  data: UpdatePaymentStatusInput
) => {
  logger.info("[Payment] Payment status updated");

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      tenantId,
    },
  });

  if (!payment) {
    throw new Error("PAYMENT_NOT_FOUND");
  }

  const currentStatus = payment.paymentStatus;
  const nextStatus = data.status;

  if (
    !allowedPaymentTransitions[currentStatus as PaymentStatus]?.includes(nextStatus) &&
    currentStatus !== nextStatus
  ) {
    throw new Error("INVALID_PAYMENT_STATUS");
  }

  const updatedPayment = await prisma.$transaction(async (tx) => {
    const result = await tx.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: nextStatus,
        paidAt: nextStatus === "SUCCESS" ? new Date() : payment.paidAt,
        failureReason:
          nextStatus === "FAILED" || nextStatus === "CANCELLED"
            ? payment.failureReason ?? "Payment status updated by admin"
            : null,
        updatedAt: new Date(),
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: nextStatus,
      },
    });

    return result;
  });

  return updatedPayment;
};
