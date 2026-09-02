import { OrderStatus, PaymentStatus, FulfillmentType } from "@prisma/client";

export type AdminOrderListFilter = {
  tenantId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
};

export type AdminOrderListItem = {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string | null;
  customerPhone: string | null;
  fulfillmentType: FulfillmentType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  placedAt: Date;
};

export type AdminOrderItemResponse = {
  id: number;
  productId: number | null;
  productNameSnapshot: string;
  productName: string | null;
  variantId: number | null;
  variantNameSnapshot: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
};

export type AdminOrderStatusHistoryItem = {
  status: OrderStatus;
  note: string | null;
  changedAt: Date;
  changedBy: string | null;
};

export type AdminOrderCustomerInfo = {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
};

export type AdminOrderDetailResponse = {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  subtotal: number;
  discountAmount: number;
  packagingCharge: number;
  deliveryCharge: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  notes: string | null;
  deliveryAddressLine: string | null;
  deliveryLandmark: string | null;
  deliveryLatitude: string | null;
  deliveryLongitude: string | null;
  deliveryPhone: string | null;
  placedAt: Date;
  confirmedAt: Date | null;
  readyAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  customer: AdminOrderCustomerInfo;
  orderItems: AdminOrderItemResponse[];
  statusHistory: AdminOrderStatusHistoryItem[];
};

export type AdminOrderStatusUpdateInput = {
  status: OrderStatus;
  note?: string;
  changedBy?: number;
};