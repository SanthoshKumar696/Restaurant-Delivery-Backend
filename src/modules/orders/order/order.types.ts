import { OrderStatus, FulfillmentType, PaymentStatus } from "@prisma/client";

export type CreateOrderItemInput = {
  productId: number;
  variantId?: number;
  quantity: number;
};

export type CreateOrderInput = {
  tenantId: string;
  branchId: string;
  customerId: number;
  fulfillmentType: FulfillmentType;

  deliveryAddressLine?: string;
  deliveryLandmark?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryPhone?: string;

  notes?: string;

  items: CreateOrderItemInput[];
};

export type UpdateOrderStatusInput = {
  status: OrderStatus;
  note?: string;
};

export type OrderResponse = {
  id: number;
  tenantId: string;
  branchId: string;
  customerId: number;
  orderNumber: string;
  fulfillmentType: FulfillmentType;
  status: OrderStatus;
};

// Customer Order Response Types
export type OrderItemResponse = {
  id: number;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderStatusHistoryItem = {
  status: OrderStatus;
  note: string | null;
  changedAt: Date;
};

export type CustomerOrderDetailResponse = {
  id: number;
  orderNumber: string;
  fulfillmentType: FulfillmentType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountAmount: number;
  packagingCharge: number;
  deliveryCharge: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  deliveryAddressLine: string | null;
  deliveryLandmark: string | null;
  deliveryLatitude: string | null;
  deliveryLongitude: string | null;
  deliveryPhone: string | null;
  notes: string | null;
  placedAt: Date;
  confirmedAt: Date | null;
  readyAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  orderItems: OrderItemResponse[];
  statusHistory: OrderStatusHistoryItem[];
};

export type CustomerOrderListItem = {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  totalAmount: number;
  placedAt: Date;
};