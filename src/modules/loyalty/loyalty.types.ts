export type LoyaltySummary = {
  customerId: number;
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
};

export type LoyaltyTransactionRecord = {
  id: number;
  type: "EARN" | "REDEEM" | "ADJUST" | "EXPIRE";
  points: number;
  balanceAfter: number;
  orderId: number | null;
  description: string | null;
  createdAt: Date;
};

export type RedemptionValidationInput = {
  points: number;
};

export type RedemptionValidationResult = {
  points: number;
  discountAmount: number;
  remainingPoints: number;
};

export type AdminAdjustmentInput = {
  points: number;
  description?: string;
};
