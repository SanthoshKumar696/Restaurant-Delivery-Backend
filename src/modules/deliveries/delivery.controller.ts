import { NextFunction, Request, Response } from "express";
import { HttpError } from "../../common/errors/http-error";
import { smsService } from "../../integrations/sms";
import { prisma } from "../../database/prisma";
import {
  acceptDelivery as acceptDeliveryService,
  arriveDelivery as arriveDeliveryService,
  assignDelivery as assignDeliveryService,
  completeDelivery as completeDeliveryService,
  getAdminDelivery as getAdminDeliveryService,
  getAdminDeliveries as getAdminDeliveriesService,
  getCaptainDelivery as getCaptainDeliveryService,
  getCustomerDelivery as getCustomerDeliveryService,
  getMyCompletedDeliveries as getMyCompletedDeliveriesService,
  getMyDashboard as getMyDashboardService,
  getMyDeliveries as getMyDeliveriesService,
  getMyUpcomingDeliveries as getMyUpcomingDeliveriesService,
  pickUpDelivery as pickUpDeliveryService,
  startDelivery as startDeliveryService,
  updateDeliveryLocation as updateDeliveryLocationService,
} from "./delivery.service";

const handle = (action: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    action(req, res).catch(next);
  };

export const assignDelivery = handle(async (req, res) => {
  const data = await assignDeliveryService(Number(req.params.id), req.admin!.tenantId, req.body.captainId);
  return res.status(200).json({ success: true, message: "Captain assigned successfully", data });
});

export const getMyDeliveries = handle(async (req, res) => {
  const data = await getMyDeliveriesService(req.staff!.tenantId, req.staff!.staffId);
  return res.status(200).json({ success: true, message: "Assigned deliveries fetched successfully", items: data });
});

export const getMyDashboard = handle(async (req, res) => {
  const data = await getMyDashboardService(req.staff!.tenantId, req.staff!.staffId);
  return res.status(200).json({ success: true, message: "Delivery dashboard fetched successfully", data });
});

export const getMyUpcomingDeliveries = handle(async (req, res) => {
  const data = await getMyUpcomingDeliveriesService(req.staff!.tenantId, req.staff!.staffId);
  return res.status(200).json({ success: true, message: "Upcoming deliveries fetched successfully", items: data });
});

export const getMyCompletedDeliveries = handle(async (req, res) => {
  const data = await getMyCompletedDeliveriesService(req.staff!.tenantId, req.staff!.staffId);
  return res.status(200).json({ success: true, message: "Completed deliveries fetched successfully", items: data });
});

export const getCaptainDelivery = handle(async (req, res) => {
  const data = await getCaptainDeliveryService(Number(req.params.id), req.staff!.tenantId, req.staff!.staffId);
  return res.status(200).json({ success: true, message: "Delivery fetched successfully", data });
});

export const acceptDelivery = handle(async (req, res) => {
  const data = await acceptDeliveryService(Number(req.params.id), req.staff!.tenantId, req.staff!.staffId);
  return res.status(200).json({ success: true, message: "Delivery accepted", data });
});

export const pickUpDelivery = handle(async (req, res) => {
  const data = await pickUpDeliveryService(Number(req.params.id), req.staff!.tenantId, req.staff!.staffId);
  return res.status(200).json({ success: true, message: "Pickup confirmed", data });
});

export const startDelivery = handle(async (req, res) => {
  const data = await startDeliveryService(Number(req.params.id), req.staff!.tenantId, req.staff!.staffId);
  return res.status(200).json({ success: true, message: "Delivery started", data });
});

export const arriveDelivery = handle(async (req, res) => {
  const data = await arriveDeliveryService(Number(req.params.id), req.staff!.tenantId, req.staff!.staffId);
  return res.status(200).json({ success: true, message: "Captain marked arrived", data });
});

export const updateDeliveryLocation = handle(async (req, res) => {
  const data = await updateDeliveryLocationService(
    Number(req.params.id),
    req.staff!.tenantId,
    req.staff!.staffId,
    req.body.latitude,
    req.body.longitude
  );
  return res.status(200).json({ success: true, message: "Location updated", data });
});

export const completeDelivery = handle(async (req, res) => {
  const data = await completeDeliveryService(Number(req.params.id), req.staff!.tenantId, req.staff!.staffId, req.body.otp);
  return res.status(200).json({ success: true, message: "Delivery completed", data });
});

export const getAdminDeliveries = handle(async (req, res) => {
  const data = await getAdminDeliveriesService(req.admin!.tenantId);
  return res.status(200).json({ success: true, message: "Deliveries fetched successfully", items: data });
});

export const getAdminDelivery = handle(async (req, res) => {
  const data = await getAdminDeliveryService(Number(req.params.id), req.admin!.tenantId);
  return res.status(200).json({ success: true, message: "Delivery fetched successfully", data });
});

export const getCustomerDelivery = handle(async (req, res) => {
  if (Number(req.params.customerId) !== req.customer!.customerId) {
    throw new HttpError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
  }
  const data = await getCustomerDeliveryService(Number(req.params.id), req.customer!.customerId, req.customer!.tenantId);
  return res.status(200).json({ success: true, message: "Delivery tracking fetched successfully", data });
});

export const sendDeliveryOtp = handle(async (req, res) => {
  if (Number(req.params.customerId) !== req.customer!.customerId) {
    throw new HttpError("Order not found", 404, "ORDER_NOT_FOUND");
  }
  const order = await prisma.order.findFirst({
    where: {
      id: Number(req.params.id),
      customerId: req.customer!.customerId,
      tenantId: req.customer!.tenantId,
      fulfillmentType: "DELIVERY",
      delivery: { is: { status: "ARRIVED" } },
    },
    select: { deliveryPhone: true, customer: { select: { phone: true } } },
  });
  if (!order) throw new HttpError("Order not found or not arrived", 404, "ORDER_NOT_FOUND");
  const result = await smsService.sendOtp(order.deliveryPhone ?? order.customer.phone, req.customer!.tenantId, "DELIVERY", String(Number(req.params.id)));
  if (!result.success) throw new HttpError(result.message, 400, result.code ?? "OTP_SEND_FAILED");
  return res.status(200).json({ success: true, message: "Delivery verification code sent" });
});

