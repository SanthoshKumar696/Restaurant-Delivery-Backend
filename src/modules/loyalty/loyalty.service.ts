import { LoyaltyTxnType, Prisma } from "@prisma/client";

import { logger } from "../../common/logger/logger";
import { prisma } from "../../database/prisma";
import {
  AdminAdjustmentInput,
  LoyaltySummary,
  LoyaltyTransactionRecord,
  RedemptionValidationInput,
  RedemptionValidationResult,
} from "./loyalty.types";

const EARNING_UNIT_AMOUNT = 100;
const POINTS_PER_100 = 10;

const getLoyaltyDescription = (type: LoyaltyTxnType, note?: string | null) => {
  if (note) {
    return note;
  }

  if (type === "EARN") return "Order completion points earned";
  if (type === "REDEEM") return "Points redeemed";
  if (type === "ADJUST") return "Manual adjustment";
  if (type === "EXPIRE") return "Points expired";
  return "Loyalty update";
};

export const ensureLoyaltyAccount = async (tenantId: string, customerId: number) => {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      tenantId,
      isActive: true,
    },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  return prisma.loyaltyAccount.upsert({
    where: {
      tenantId_customerId: {
        tenantId,
        customerId,
      },
    },
    create: {
      tenantId,
      customerId,
      balance: 0,
    },
    update: {},
  });
};

export const getCustomerLoyaltySummary = async (tenantId: string, customerId: number): Promise<LoyaltySummary> => {
  const account = await ensureLoyaltyAccount(tenantId, customerId);

  const transactions = await prisma.loyaltyTransaction.findMany({
    where: {
      loyaltyAccountId: account.id,
      tenantId,
    },
    select: {
      type: true,
      points: true,
    },
  });

  const lifetimeEarned = transactions
    .filter((txn) => txn.type === "EARN")
    .reduce((sum, txn) => sum + Math.max(0, txn.points), 0);

  const lifetimeRedeemed = transactions
    .filter((txn) => txn.type === "REDEEM")
    .reduce((sum, txn) => sum + Math.abs(Math.min(0, txn.points)), 0);

  return {
    customerId,
    pointsBalance: account.balance,
    lifetimeEarned,
    lifetimeRedeemed,
  };
};

export const getCustomerLoyaltyTransactions = async (tenantId: string, customerId: number): Promise<LoyaltyTransactionRecord[]> => {
  const account = await ensureLoyaltyAccount(tenantId, customerId);

  const transactions = await prisma.loyaltyTransaction.findMany({
    where: {
      loyaltyAccountId: account.id,
      tenantId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      type: true,
      points: true,
      balanceAfter: true,
      orderId: true,
      note: true,
      createdAt: true,
    },
  });

  return transactions.map((txn) => ({
    id: txn.id,
    type: txn.type,
    points: txn.points,
    balanceAfter: txn.balanceAfter,
    orderId: txn.orderId,
    description: txn.note,
    createdAt: txn.createdAt,
  }));
};

export const validateCustomerRedemption = async (
  tenantId: string,
  customerId: number,
  input: RedemptionValidationInput
): Promise<RedemptionValidationResult> => {
  const amount = Number(input.points);

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("INVALID_POINT_AMOUNT");
  }

  const account = await ensureLoyaltyAccount(tenantId, customerId);

  if (account.balance < amount) {
    throw new Error("INSUFFICIENT_LOYALTY_POINTS");
  }

  return {
    points: amount,
    discountAmount: amount,
    remainingPoints: account.balance - amount,
  };
};

export const redeemLoyaltyPoints = async ({
  tenantId,
  customerId,
  points,
  orderId,
  description,
}: {
  tenantId: string;
  customerId: number;
  points: number;
  orderId?: number | null;
  description?: string;
}) => {
  if (!Number.isInteger(points) || points <= 0) {
    throw new Error("INVALID_POINT_AMOUNT");
  }

  return prisma.$transaction(async (tx) => {
    const account = await tx.loyaltyAccount.findUnique({
      where: {
        tenantId_customerId: {
          tenantId,
          customerId,
        },
      },
    });

    if (!account) {
      throw new Error("LOYALTY_NOT_FOUND");
    }

    if (account.balance < points) {
      throw new Error("INSUFFICIENT_LOYALTY_POINTS");
    }

    const balanceAfter = account.balance - points;

    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        balance: balanceAfter,
        updatedAt: new Date(),
      },
    });

    const transaction = await tx.loyaltyTransaction.create({
      data: {
        loyaltyAccountId: account.id,
        tenantId,
        orderId: orderId ?? null,
        type: "REDEEM",
        points: -points,
        balanceAfter,
        note: description ?? getLoyaltyDescription("REDEEM"),
      },
    });

    logger.info(`[Loyalty] Redeemed ${points} points for customer ${customerId} in tenant ${tenantId}`);

    return {
      id: transaction.id,
      points: -points,
      balanceAfter,
      description: transaction.note,
    };
  });
};

export const awardLoyaltyForCompletedOrder = async (tenantId: string, orderId: number) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      tenantId: true,
      customerId: true,
      subtotal: true,
      discountAmount: true,
      loyaltyDiscountAmount: true,
      status: true,
    },
  });

  if (!order || order.tenantId !== tenantId) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.status !== "COMPLETED") {
    return null;
  }

  const existingEarning = await prisma.loyaltyTransaction.findFirst({
    where: {
      tenantId,
      orderId,
      type: "EARN",
    },
    select: { id: true },
  });

  if (existingEarning) {
    return { alreadyAwarded: true, transactionId: existingEarning.id };
  }

  const eligibleAmount = Number(order.subtotal) - Number(order.discountAmount) - Number(order.loyaltyDiscountAmount);
  const moneyPoints = Math.max(0, Math.floor((eligibleAmount / EARNING_UNIT_AMOUNT) * POINTS_PER_100));

  if (moneyPoints <= 0) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const account = await ensureLoyaltyAccount(tenantId, order.customerId);
    const existingAccount = await tx.loyaltyAccount.findUnique({
      where: {
        tenantId_customerId: {
          tenantId,
          customerId: order.customerId,
        },
      },
    });

    const currentBalance = existingAccount?.balance ?? account.balance ?? 0;
    const balanceAfter = currentBalance + moneyPoints;

    const updatedAccount = await tx.loyaltyAccount.upsert({
      where: {
        tenantId_customerId: {
          tenantId,
          customerId: order.customerId,
        },
      },
      update: {
        balance: balanceAfter,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        customerId: order.customerId,
        balance: balanceAfter,
      },
    });

    const transaction = await tx.loyaltyTransaction.create({
      data: {
        loyaltyAccountId: updatedAccount.id,
        tenantId,
        orderId,
        type: "EARN",
        points: moneyPoints,
        balanceAfter,
        note: getLoyaltyDescription("EARN"),
      },
    });

    logger.info(`[Loyalty] Awarded ${moneyPoints} points to customer ${order.customerId} for completed order ${orderId}`);

    return {
      alreadyAwarded: false,
      pointsEarned: moneyPoints,
      balanceAfter,
      transactionId: transaction.id,
    };
  });
};

export const adjustCustomerLoyalty = async (
  tenantId: string,
  customerId: number,
  input: AdminAdjustmentInput
): Promise<{ points: number; balanceAfter: number; id: number }> => {
  const points = Number(input.points);

  if (!Number.isInteger(points) || points === 0) {
    throw new Error("INVALID_POINT_AMOUNT");
  }

  return prisma.$transaction(async (tx) => {
    const account = await tx.loyaltyAccount.findUnique({
      where: {
        tenantId_customerId: {
          tenantId,
          customerId,
        },
      },
    });

    if (!account) {
      throw new Error("LOYALTY_NOT_FOUND");
    }

    const candidateBalance = account.balance + points;
    if (candidateBalance < 0) {
      throw new Error("INSUFFICIENT_LOYALTY_POINTS");
    }

    const balanceAfter = candidateBalance;

    const updatedAccount = await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        balance: balanceAfter,
        updatedAt: new Date(),
      },
    });

    const transaction = await tx.loyaltyTransaction.create({
      data: {
        loyaltyAccountId: updatedAccount.id,
        tenantId,
        type: "ADJUST",
        points,
        balanceAfter,
        note: input.description ?? getLoyaltyDescription("ADJUST"),
      },
    });

    logger.info(`[Loyalty] Admin adjusted ${points} points for customer ${customerId}`);

    return {
      points,
      balanceAfter,
      id: transaction.id,
    };
  });
};
