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
      notes: true,
      paymentStatus: true,
      subtotal: true,
      discountAmount: true,
      packagingCharge: true,
      deliveryCharge: true,
      cgstAmount: true,
      sgstAmount: true,
      igstAmount: true,
      totalAmount: true,
      payment: { select: { paymentMethod: true, paymentStatus: true } },
      customer: { select: { fullName: true, phone: true } },
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
    },
  },
  captain: {
    select: {
      id: true,
      staffUser: { select: { fullName: true, phone: true, isActive: true } },
    },
  },
} as const;

const adminDeliveryDetails = {
  ...deliveryDetails,
  offers: {
    orderBy: { offeredAt: "desc" as const },
    select: {
      id: true,
      captainId: true,
      status: true,
      offeredAt: true,
      respondedAt: true,
      captain: { select: { staffUser: { select: { fullName: true } } } },
    },
  },
} as const;

const getCurrentLocation = async (captainId: number, tenantId: string, after?: Date | null) =>
  prisma.captainLocation.findFirst({
    where: { captainId, tenantId, ...(after ? { recordedAt: { gte: after } } : {}) },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    select: { latitude: true, longitude: true, recordedAt: true },
  });

const toDeliveryResponse = async (delivery: any, includeAssignmentHistory = false) => ({
  id: delivery.id,
  deliveryId: delivery.id,
  orderId: delivery.order.id,
  captainId: delivery.captainId,
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
    instructions: delivery.order.notes,
    paymentStatus: delivery.order.paymentStatus,
    payment: {
      method: delivery.order.payment?.paymentMethod ?? null,
      status: delivery.order.payment?.paymentStatus ?? delivery.order.paymentStatus,
    },
    itemCount: delivery.order.orderItems.reduce((count: number, item: { quantity: number }) => count + item.quantity, 0),
    totals: {
      subtotal: Number(delivery.order.subtotal),
      discountAmount: Number(delivery.order.discountAmount),
      packagingCharge: Number(delivery.order.packagingCharge),
      deliveryCharge: Number(delivery.order.deliveryCharge),
      cgstAmount: Number(delivery.order.cgstAmount),
      sgstAmount: Number(delivery.order.sgstAmount),
      igstAmount: Number(delivery.order.igstAmount),
      totalAmount: Number(delivery.order.totalAmount),
    },
    items: delivery.order.orderItems.map((item: {
      id: number;
      productNameSnapshot: string;
      variantNameSnapshot: string | null;
      quantity: number;
      unitPrice: { toString(): string };
      lineTotal: { toString(): string };
    }) => ({
      id: item.id,
      productName: item.productNameSnapshot,
      variantName: item.variantNameSnapshot,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
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
  ...(includeAssignmentHistory ? {
    assignmentHistory: delivery.offers.map((offer: {
      id: number;
      captainId: number;
      status: string;
      offeredAt: Date;
      respondedAt: Date | null;
      captain: { staffUser: { fullName: string } };
    }) => ({
      id: offer.id,
      captainId: offer.captainId,
      captainName: offer.captain.staffUser.fullName,
      status: offer.status,
      offeredAt: offer.offeredAt,
      respondedAt: offer.respondedAt,
    })),
  } : {}),
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

  const assignment = await prisma.$transaction(async (tx) => {
    const current = await tx.delivery.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        status: true,
        captainId: true,
        assignedAt: true,
        acceptedAt: true,
        pickedUpAt: true,
        outForDeliveryAt: true,
        arrivedAt: true,
        deliveredAt: true,
        captain: {
          select: {
            id: true,
            staffUser: { select: { fullName: true, email: true, phone: true } },
          },
        },
        order: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            fulfillmentType: true,
          },
        },
      },
    });
    if (!current || current.order.tenantId !== tenantId) {
      throw new HttpError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
    }
    if (current.order.fulfillmentType !== "DELIVERY") {
      throw new HttpError("Pickup orders cannot be assigned to a Captain", 409, "PICKUP_NOT_ASSIGNABLE");
    }
    if (current.order.status !== "READY") {
      throw new HttpError("Delivery can only be assigned when the order is ready", 409, "ORDER_NOT_READY");
    }

    const captain = await tx.captain.findFirst({
      where: { id: captainId, tenantId, staffUser: { role: "CAPTAIN", isActive: true } },
      include: {
        captainBranchAssignments: {
          where: { tenantId, branch: { tenantId } },
          select: { tenantId: true, branchId: true },
        },
      },
    });
    if (!captain) throw new HttpError("Active Captain not found", 404, "CAPTAIN_NOT_FOUND");
    if (!captain.captainBranchAssignments.some(
      (branchAssignment) => branchAssignment.tenantId === tenantId &&
        branchAssignment.branchId === delivery.order.branchId
    )) {
      throw new HttpError("Captain is not assigned to this branch", 403, "CAPTAIN_BRANCH_ACCESS_DENIED");
    }

    const hasNoProgressTimestamps = !current.acceptedAt && !current.pickedUpAt &&
      !current.outForDeliveryAt && !current.arrivedAt && !current.deliveredAt;
    const initialAssignment = current.status === "PENDING" && current.captainId === null && hasNoProgressTimestamps;
    const reassignment = current.status === "ASSIGNED" && current.captainId !== null &&
      current.captainId !== captainId && hasNoProgressTimestamps;
    if (!initialAssignment && !reassignment) {
      throw new HttpError("Delivery is already assigned or no longer assignable", 409, "DELIVERY_NOT_ASSIGNABLE");
    }

    const priorOffer = await tx.deliveryOffer.findUnique({
      where: { deliveryId_captainId: { deliveryId: id, captainId } },
      select: { status: true },
    });
    if (priorOffer?.status === "REJECTED") {
      throw new HttpError("This Captain has already rejected the delivery", 409, "CAPTAIN_PREVIOUSLY_REJECTED");
    }
    if (priorOffer?.status === "ACCEPTED") {
      throw new HttpError("This Captain has already accepted the delivery", 409, "DELIVERY_NOT_ASSIGNABLE");
    }
    if (reassignment && current.captainId !== null) {
      const previousOffer = await tx.deliveryOffer.findUnique({
        where: { deliveryId_captainId: { deliveryId: id, captainId: current.captainId } },
        select: { status: true },
      });
      if (previousOffer?.status === "ACCEPTED") {
        throw new HttpError("Accepted deliveries cannot be reassigned", 409, "DELIVERY_NOT_ASSIGNABLE");
      }
      if (previousOffer?.status === "REJECTED") {
        throw new HttpError("Delivery assignment history is inconsistent", 409, "DELIVERY_NOT_ASSIGNABLE");
      }
    }

    const assignedAt = new Date();
    const result = await tx.delivery.updateMany({
      where: {
        id,
        tenantId,
        status: current.status,
        captainId: current.captainId,
        acceptedAt: null,
        pickedUpAt: null,
        outForDeliveryAt: null,
        arrivedAt: null,
        deliveredAt: null,
      },
      data: {
        captainId,
        status: "ASSIGNED",
        assignedAt,
        acceptedAt: null,
        pickedUpAt: null,
        outForDeliveryAt: null,
        arrivedAt: null,
        deliveredAt: null,
      },
    });
    if (result.count !== 1) {
      throw new HttpError("Delivery state changed; reload and retry", 409, "DELIVERY_STATE_CHANGED");
    }

    if (reassignment && current.captainId !== null) {
      await tx.deliveryOffer.upsert({
        where: { deliveryId_captainId: { deliveryId: id, captainId: current.captainId } },
        update: { tenantId, status: "CANCELLED", respondedAt: assignedAt },
        create: {
          deliveryId: id,
          captainId: current.captainId,
          tenantId,
          status: "CANCELLED",
          offeredAt: current.assignedAt ?? assignedAt,
          respondedAt: assignedAt,
        },
      });
    }
    await tx.deliveryOffer.upsert({
      where: { deliveryId_captainId: { deliveryId: id, captainId } },
      update: { tenantId, status: "OFFERED", offeredAt: assignedAt, respondedAt: null },
      create: { deliveryId: id, captainId, tenantId, status: "OFFERED", offeredAt: assignedAt },
    });
    await tx.captain.update({ where: { id: captainId }, data: { currentStatus: "BUSY" } });

    if (reassignment && current.captainId !== null) {
      const otherActiveDelivery = await tx.delivery.findFirst({
        where: { tenantId, captainId: current.captainId, status: { notIn: terminalDeliveryStatuses } },
        select: { id: true },
      });
      await tx.captain.update({
        where: { id: current.captainId },
        data: { currentStatus: otherActiveDelivery ? "BUSY" : "AVAILABLE" },
      });
    }

    return {
      previousCaptain: reassignment && current.captain
        ? {
            id: current.captain.id,
            fullName: current.captain.staffUser.fullName,
            email: current.captain.staffUser.email,
            phone: current.captain.staffUser.phone,
          }
        : null,
    };
  });
  emitDeliveryAssigned(tenantId, captainId, id, delivery.order.id);
  return {
    ...await toDeliveryResponse(await findDelivery(id, tenantId)),
    previousCaptain: assignment.previousCaptain,
  };
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

export const getAdminDeliveries = async (tenantId: string, captainId?: number) => {
  const deliveries = await prisma.delivery.findMany({
    where: { tenantId, ...(captainId === undefined ? {} : { captainId }) },
    orderBy: { id: "desc" },
    include: adminDeliveryDetails,
  });
  return Promise.all(deliveries.map((delivery) => toDeliveryResponse(delivery, true)));
};

export const getAdminDelivery = async (id: number, tenantId: string) => {
  const delivery = await prisma.delivery.findFirst({
    where: { id, tenantId },
    include: adminDeliveryDetails,
  });
  if (!delivery || delivery.order.tenantId !== tenantId) {
    throw new HttpError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
  }
  return toDeliveryResponse(delivery, true);
};

export const rejectDelivery = async (id: number, tenantId: string, captainId: number) => {
  const delivery = await findAssignedDelivery(id, tenantId, captainId);
  if (delivery.status !== "ASSIGNED") {
    throw new HttpError("Only an assigned, unaccepted delivery can be rejected", 409, "DELIVERY_REJECTION_NOT_ALLOWED");
  }

  const respondedAt = new Date();
  await prisma.$transaction(async (tx) => {
    const result = await tx.delivery.updateMany({
      where: { id, tenantId, captainId, status: "ASSIGNED" },
      data: { status: "PENDING", captainId: null, assignedAt: null },
    });
    if (result.count !== 1) throw new HttpError("Delivery state changed; reload and retry", 409, "DELIVERY_STATE_CHANGED");
    await tx.deliveryOffer.upsert({
      where: { deliveryId_captainId: { deliveryId: id, captainId } },
      update: { tenantId, status: "REJECTED", respondedAt },
      create: {
        deliveryId: id,
        captainId,
        tenantId,
        status: "REJECTED",
        offeredAt: delivery.assignedAt ?? respondedAt,
        respondedAt,
      },
    });
    const otherActiveDelivery = await tx.delivery.findFirst({
      where: { tenantId, captainId, status: { notIn: terminalDeliveryStatuses } },
      select: { id: true },
    });
    if (!otherActiveDelivery) {
      await tx.captain.update({ where: { id: captainId }, data: { currentStatus: "AVAILABLE" } });
    }
  });
  emitDeliveryStatus(tenantId, delivery.order.id, delivery.order.customerId, {
    deliveryId: id,
    status: "PENDING",
    timestamp: respondedAt,
  });
  return toDeliveryResponse(await findDelivery(id, tenantId));
};

export const getMyUpcomingDeliveries = async (tenantId: string, captainId: number) => {
  const deliveries = await prisma.delivery.findMany({
    where: { tenantId, captainId, status: "ASSIGNED" },
    orderBy: { assignedAt: "desc" },
    include: deliveryDetails,
  });
  return Promise.all(deliveries.map((delivery) => toDeliveryResponse(delivery)));
};

export const getMyCurrentDeliveries = async (tenantId: string, captainId: number) => {
  const deliveries = await prisma.delivery.findMany({
    where: {
      tenantId,
      captainId,
      status: { in: ["ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY", "ARRIVED"] },
    },
    orderBy: [{ acceptedAt: "desc" }, { id: "desc" }],
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
    const transitionedAt = new Date();
    if (to === "ACCEPTED") {
      await prisma.$transaction(async (tx) => {
        const result = await tx.delivery.updateMany({
          where: { id, tenantId, captainId, status: from },
          data: { status: to, [timestampField]: transitionedAt },
        });
        if (result.count !== 1) throw new HttpError("Delivery state changed; reload and retry", 409, "DELIVERY_STATE_CHANGED");
        await tx.deliveryOffer.upsert({
          where: { deliveryId_captainId: { deliveryId: id, captainId } },
          update: { tenantId, status: "ACCEPTED", respondedAt: transitionedAt },
          create: {
            deliveryId: id,
            captainId,
            tenantId,
            status: "ACCEPTED",
            offeredAt: delivery.assignedAt ?? transitionedAt,
            respondedAt: transitionedAt,
          },
        });
      });
    } else {
      const result = await prisma.delivery.updateMany({
        where: { id, tenantId, captainId, status: from },
        data: { status: to, [timestampField]: transitionedAt },
      });
      if (result.count !== 1) throw new HttpError("Delivery state changed; reload and retry", 409, "DELIVERY_STATE_CHANGED");
    }
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
    const otherActiveDelivery = await tx.delivery.findFirst({
      where: { tenantId, captainId, id: { not: id }, status: { notIn: terminalDeliveryStatuses } },
      select: { id: true },
    });
    await tx.captain.update({
      where: { id: captainId },
      data: { currentStatus: otherActiveDelivery ? "BUSY" : "AVAILABLE" },
    });
  });
  await awardLoyaltyForCompletedOrder(tenantId, delivery.order.id);
  emitDeliveryStatus(tenantId, delivery.order.id, delivery.order.customerId, {
    deliveryId: id,
    status: "DELIVERED",
    timestamp: deliveredAt,
  });
  return toDeliveryResponse(await findDelivery(id, tenantId));
};