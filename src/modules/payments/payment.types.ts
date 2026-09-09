import { PaymentMethod, PaymentStatus } from "@prisma/client";

export type PaymentMethodValue = keyof typeof PaymentMethod;

export type CreatePaymentInput = {
  orderId: number;
  paymentMethod: PaymentMethod | "CASH_ON_DELIVERY" | "ONLINE";
};

export type PaymentListFilters = {
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  orderId?: number;
};

export type UpdatePaymentStatusInput = {
  status: PaymentStatus;
};

export type CustomerPaymentSummary = {
  id: number;
  orderId: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  referenceId: string | null;
  gatewayName: string | null;
  gatewayPaymentId: string | null;
  gatewayOrderId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
