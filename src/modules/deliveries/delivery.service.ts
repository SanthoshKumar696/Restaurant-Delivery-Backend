import { DeliveryStatus, OrderStatus } from "@prisma/client";
import { HttpError } from "../../common/errors/http-error";
import { prisma } from "../../database/prisma";
import { smsService } from "../../integrations/sms";
import { emitDeliveryAssigned, emitDeliveryLocation, emitDeliveryStatus } from "../../realtime/delivery-socket";
import { awardLoyaltyForCompletedOrder } from "../loyalty/loyalty.service";

const terminalDeliveryStatuses: DeliveryStatus[] = ["DELIVERED", "FAILED", "CANCELLED"];
const deliveryDetails = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      tenantId: true,
      branchId: true,
      customerId: true,
      fulfillmentType: true,
      status: true,
      deliveryAddressLine: true,
      deliveryLandmark: true,
      deliveryLatitude: true,
      deliveryLongitude: true,
      deliveryPhone: true,
      customer: { select: { fullName: true, phone: true } },
    },
  },
  captain: {
    select: {
      id: true,
      staffUser: { select: { fullName: true, phone: true, isActive: true } },
    },
  },
} as const;

const getCurrentLocation = async (captainId: number, tenantId: string, after?: Date | null) =>
  prisma.captainLocation.findFirst({
    where: { captainId, tenantId, ...(after ? { recordedAt: { gte: after } } : {}) },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    select: { latitude: true, longitude: true, recordedAt: true },
  });

const toDeliveryResponse = async (delivery: any) => ({
  id: delivery.id,
  order: {
    id: delivery.order.id,
    orderNumber: delivery.order.orderNumber,
    status: delivery.order.status,
    fulfillmentType: delivery.order.fulfillmentType,
    customer: delivery.order.customer,
    deliveryAddressLine: delivery.order.deliveryAddressLine,
    deliveryLandmark: delivery.order.deliveryLandmark,
    deliveryLatitude: delivery.order.deliveryLatitude?.toString() ?? null,
    deliveryLongitude: delivery.order.deliveryLongitude?.toString() ?? null,
    deliveryPhone: delivery.order.deliveryPhone,
  },
  captain: delivery.captain
    ? { id: delivery.captain.id, fullName: delivery.captain.staffUser.fullName }
    : null,
  status: delivery.status,
  assignedAt: delivery.assignedAt,
  acceptedAt: delivery.acceptedAt,
  pickedUpAt: delivery.pickedUpAt,
  outForDeliveryAt: delivery.outForDeliveryAt,
  arrivedAt: delivery.arrivedAt,
  deliveredAt: delivery.deliveredAt,
  currentLocation: delivery.captainId && delivery.status !== "DELIVERED"
    ? await getCurrentLocation(delivery.captainId, delivery.tenantId, delivery.outForDeliveryAt)
    : null,
});

const findDelivery = async (id: number, tenantId: string) => {
  const delivery = await prisma.delivery.findFirst({
    where: { id, tenantId },
    include: deliveryDetails,
  });
  if (!delivery) throw new HttpError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
  if (delivery.order.tenantId !== tenantId) throw new HttpError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
  return delivery;
};

const findAssignedDelivery = async (id: number, tenantId: string, captainId: number) => {
  const delivery = await findDelivery(id, tenantId);
  if (delivery.captainId !== captainId) {
    throw new HttpError("Delivery is not assigned to this Captain", 403, "DELIVERY_ACCESS_DENIED");
  }
  return delivery;
};

export const assignDelivery = async (id: number, tenantId: string, captainId: number) => {
  const delivery = await findDelivery(id, tenantId);
  if (delivery.order.fulfillmentType !== "DELIVERY") {
    throw new HttpError("Pickup orders cannot be assigned to a Captain", 409, "PICKUP_NOT_ASSIGNABLE");
  }
  if (delivery.order.status !== "READY") {
    throw new HttpError("Delivery can only be assigned when the order is ready", 409, "ORDER_NOT_READY");
  }
  if (delivery.status !== "PENDING" || delivery.captainId !== null) {
    throw new HttpError("Delivery is already assigned or no longer assignable", 409, "DELIVERY_NOT_ASSIGNABLE");
  }

  const captain = await prisma.captain.findFirst({
    where: { id: captainId, tenantId, staffUser: { role: "CAPTAIN", isActive: true } },
    include: { captainBranchAssignments: { select: { branchId: true } } },
  });
  if (!captain) throw new HttpError("Active Captain not found", 404, "CAPTAIN_NOT_FOUND");
  if (captain.captainBranchAssignments.length && !captain.captainBranchAssignments.some((assignment) => assignment.branchId === delivery.order.branchId)) {
    throw new HttpError("Captain is not assigned to this branch", 403, "CAPTAIN_BRANCH_ACCESS_DENIED");
  }

  const activeDelivery = await prisma.delivery.findFirst({
    where: {
      captainId,
      tenantId,
      id: { not: id },
      status: { notIn: terminalDeliveryStatuses },
    },
    select: { id: true },
  });
  if (activeDelivery) throw new HttpError("Captain already has an active delivery", 409, "CAPTAIN_BUSY");

  const assigned = await prisma.$transaction(async (tx) => {
    const result = await tx.delivery.updateMany({
      where: { id, tenantId, status: "PENDING", captainId: null },
      data: { captainId, status: "ASSIGNED", assignedAt: new Date() },
    });
    if (result.count === 1) {
      await tx.captain.update({ where: { id: captainId }, data: { currentStatus: "BUSY" } });
    }
    return result;
  });
  if (assigned.count !== 1) throw new HttpError("Delivery is already assigned", 409, "DELIVERY_NOT_ASSIGNABLE");
  emitDeliveryAssigned(tenantId, captainId, id, delivery.order.id);
  return toDeliveryResponse(await findDelivery(id, tenantId));
};

export const getMyDeliveries = async (tenantId: string, captainId: number) => {
  const deliveries = await prisma.delivery.findMany({
    where: { tenantId, captainId, status: { notIn: terminalDeliveryStatuses } },
    orderBy: { id: "desc" },
    include: deliveryDetails,
  });
  return Promise.all(deliveries.map((delivery) => toDeliveryResponse(delivery)));
};

export const getCaptainDelivery = async (id: number, tenantId: string, captainId: number) =>
  toDeliveryResponse(await findAssignedDelivery(id, tenantId, captainId));

export const getAdminDeliveries = async (tenantId: string) => {
  const deliveries = await prisma.delivery.findMany({
    where: { tenantId },
    orderBy: { id: "desc" },
    include: deliveryDetails,
  });
  return Promise.all(deliveries.map((delivery) => toDeliveryResponse(delivery)));
};

export const getAdminDelivery = async (id: number, tenantId: string) =>
  toDeliveryResponse(await findDelivery(id, tenantId));

export const getMyUpcomingDeliveries = async (tenantId: string, captainId: number) => {
  const deliveries = await prisma.delivery.findMany({
    where: { tenantId, captainId, status: "ASSIGNED" },
    orderBy: { assignedAt: "desc" },
    include: deliveryDetails,
  });
  return Promise.all(deliveries.map((delivery) => toDeliveryResponse(delivery)));
};

export const getMyCompletedDeliveries = async (tenantId: string, captainId: number) => {
  const deliveries = await prisma.delivery.findMany({
    where: { tenantId, captainId, status: "DELIVERED" },
    orderBy: { deliveredAt: "desc" },
    include: deliveryDetails,
  });
  return Promise.all(deliveries.map((delivery) => toDeliveryResponse(delivery)));
};

export const getMyDashboard = async (tenantId: string, captainId: number) => {
  const deliveries = await prisma.delivery.findMany({
    where: { tenantId, captainId, status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY", "ARRIVED", "DELIVERED"] } },
    orderBy: { id: "desc" },
    include: deliveryDetails,
  });
  const responses = await Promise.all(deliveries.map((delivery) => toDeliveryResponse(delivery)));
  const current = responses.filter((delivery) => delivery.status !== "ASSIGNED" && delivery.status !== "DELIVERED");
  const upcoming = responses.filter((delivery) => delivery.status === "ASSIGNED");
  const completed = responses.filter((delivery) => delivery.status === "DELIVERED");
  return {
    current,
    upcoming,
    completed,
    counts: { current: current.length, upcoming: upcoming.length, completed: completed.length },
  };
};

export const getCustomerDelivery = async (orderId: number, customerId: number, tenantId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId, tenantId, fulfillmentType: "DELIVERY" },
    select: { delivery: { select: { id: true } } },
  });
  if (!order?.delivery) throw new HttpError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
  const delivery = await findDelivery(order.delivery.id, tenantId);
  return {
    deliveryId: delivery.id,
    orderId,
    status: delivery.status,
    captain: delivery.captain
      ? { fullName: delivery.captain.staffUser.fullName }
      : null,
    currentLocation: delivery.captainId && delivery.status !== "DELIVERED"
      ? await getCurrentLocation(delivery.captainId, tenantId, delivery.outForDeliveryAt)
      : null,
  };
};

const updateCaptainDelivery = async (
  id: number,
  tenantId: string,
  captainId: number,
  from: DeliveryStatus,
  to: DeliveryStatus,
  timestampField: "acceptedAt" | "pickedUpAt" | "outForDeliveryAt" | "arrivedAt"
) => {
  const delivery = await findAssignedDelivery(id, tenantId, captainId);
  if (delivery.status !== from) {
    throw new HttpError(`Cannot transition delivery from ${delivery.status} to ${to}`, 409, "INVALID_DELIVERY_TRANSITION");
  }

  if (to === "OUT_FOR_DELIVERY") {
    if (delivery.order.status !== "READY" || delivery.order.fulfillmentType !== "DELIVERY") {
      throw new HttpError("Order is not ready for delivery", 409, "ORDER_NOT_READY");
    }
    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({ where: { id }, data: { status: to, [timestampField]: new Date() } });
      await tx.order.update({ where: { id: delivery.order.id }, data: { status: "OUT_FOR_DELIVERY" } });
      await tx.orderStatusHistory.create({
        data: {
          orderId: delivery.order.id,
          tenantId,
          status: "OUT_FOR_DELIVERY",
          changedBy: captainId,
          note: "Captain started delivery",
        },
      });
    });
  } else {
    const result = await prisma.delivery.updateMany({
      where: { id, tenantId, captainId, status: from },
      data: { status: to, [timestampField]: new Date() },
    });
    if (result.count !== 1) throw new HttpError("Delivery state changed; reload and retry", 409, "DELIVERY_STATE_CHANGED");
  }

  emitDeliveryStatus(tenantId, delivery.order.id, delivery.order.customerId, {
    deliveryId: id,
    status: to,
    timestamp: new Date(),
  });
  return toDeliveryResponse(await findDelivery(id, tenantId));
};

export const acceptDelivery = (id: number, tenantId: string, captainId: number) =>
  updateCaptainDelivery(id, tenantId, captainId, "ASSIGNED", "ACCEPTED", "acceptedAt");

export const pickUpDelivery = (id: number, tenantId: string, captainId: number) =>
  updateCaptainDelivery(id, tenantId, captainId, "ACCEPTED", "PICKED_UP", "pickedUpAt");

export const startDelivery = (id: number, tenantId: string, captainId: number) =>
  updateCaptainDelivery(id, tenantId, captainId, "PICKED_UP", "OUT_FOR_DELIVERY", "outForDeliveryAt");

export const arriveDelivery = (id: number, tenantId: string, captainId: number) =>
  updateCaptainDelivery(id, tenantId, captainId, "OUT_FOR_DELIVERY", "ARRIVED", "arrivedAt");

export const updateDeliveryLocation = async (
  id: number,
  tenantId: string,
  captainId: number,
  latitude: number,
  longitude: number
) => {
  const delivery = await findAssignedDelivery(id, tenantId, captainId);
  if (delivery.status !== "OUT_FOR_DELIVERY" && delivery.status !== "ARRIVED") {
    throw new HttpError("Location updates are only allowed for active deliveries", 409, "DELIVERY_NOT_TRACKING");
  }
  const recordedAt = new Date();
  const location = await prisma.captainLocation.create({
    data: { captainId, tenantId, latitude, longitude, recordedAt },
    select: { latitude: true, longitude: true, recordedAt: true },
  });
  emitDeliveryLocation(tenantId, delivery.order.id, delivery.order.customerId, {
    deliveryId: id,
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    timestamp: location.recordedAt,
  });
  return {
    deliveryId: id,
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    timestamp: location.recordedAt,
  };
};

export const completeDelivery = async (id: number, tenantId: string, captainId: number, otp: string) => {
  const delivery = await findAssignedDelivery(id, tenantId, captainId);
  if (delivery.status !== "ARRIVED") {
    throw new HttpError("Delivery must be marked arrived before completion", 409, "DELIVERY_NOT_ARRIVED");
  }
  const customerPhone = delivery.order.deliveryPhone ?? delivery.order.customer.phone;
  const otpResult = await smsService.verifyOtp(customerPhone, otp, tenantId, "DELIVERY", String(delivery.order.id));
  if (!otpResult.success) throw new HttpError("Invalid or expired delivery OTP", 400, "INVALID_DELIVERY_OTP");

  const deliveredAt = new Date();
  await prisma.$transaction(async (tx) => {
    const result = await tx.delivery.updateMany({
      where: { id, tenantId, captainId, status: "ARRIVED" },
      data: { status: "DELIVERED", deliveredAt },
    });
    if (result.count !== 1) throw new HttpError("Delivery state changed; reload and retry", 409, "DELIVERY_STATE_CHANGED");
    const orderUpdate = await tx.order.updateMany({
      where: { id: delivery.order.id, tenantId, status: "OUT_FOR_DELIVERY" },
      data: { status: "COMPLETED", completedAt: deliveredAt },
    });
    if (orderUpdate.count !== 1) throw new HttpError("Order is not eligible for completion", 409, "ORDER_NOT_COMPLETABLE");
    await tx.orderStatusHistory.create({
      data: {
        orderId: delivery.order.id,
        tenantId,
        status: "COMPLETED",
        changedBy: captainId,
        note: "Delivery completed with customer OTP",
      },
    });
    await tx.captain.update({ where: { id: captainId }, data: { currentStatus: "AVAILABLE" } });
  });
  await awardLoyaltyForCompletedOrder(tenantId, delivery.order.id);
  emitDeliveryStatus(tenantId, delivery.order.id, delivery.order.customerId, {
    deliveryId: id,
    status: "DELIVERED",
    timestamp: deliveredAt,
  });
  return toDeliveryResponse(await findDelivery(id, tenantId));
};