import { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { prisma } from "../database/prisma";
import { StaffRole } from "@prisma/client";

type SocketIdentity =
  | { role: "ADMIN"; adminId: number; tenantId: string }
  | { role: "CUSTOMER"; customerId: number; tenantId: string }
  | { role: StaffRole; staffId: number; tenantId: string };

let socketServer: Server | undefined;

export const initializeDeliverySocket = (httpServer: HttpServer) => {
  socketServer = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) ?? "*",
      methods: ["GET", "POST"],
    },
  });

  socketServer.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    const jwtSecret = process.env.JWT_SECRET;
    if (typeof token !== "string" || !jwtSecret) return next(new Error("unauthorized"));

    try {
      const identity = jwt.verify(token, jwtSecret) as SocketIdentity;
      if (!identity.tenantId || !identity.role) return next(new Error("unauthorized"));

      if (identity.role === "ADMIN" && "adminId" in identity) {
        const admin = await prisma.admin.findFirst({
          where: { id: identity.adminId, tenantId: identity.tenantId, isActive: true },
          select: { id: true },
        });
        if (!admin) return next(new Error("unauthorized"));
      } else if (identity.role === "CUSTOMER" && "customerId" in identity) {
        const customer = await prisma.customer.findFirst({
          where: { id: identity.customerId, tenantId: identity.tenantId, isActive: true },
          select: { id: true },
        });
        if (!customer) return next(new Error("unauthorized"));
      } else if ("staffId" in identity) {
        const staff = await prisma.staffUser.findFirst({
          where: { id: identity.staffId, tenantId: identity.tenantId, role: identity.role, isActive: true },
          select: { id: true },
        });
        if (!staff || identity.role !== "CAPTAIN") return next(new Error("unauthorized"));
        const captain = await prisma.captain.findFirst({
          where: { id: identity.staffId, tenantId: identity.tenantId },
          select: { id: true },
        });
        if (!captain) return next(new Error("unauthorized"));
      } else {
        return next(new Error("unauthorized"));
      }

      socket.data.identity = identity;
      return next();
    } catch {
      return next(new Error("unauthorized"));
    }
  });

  socketServer.on("connection", (socket) => {
    const identity = socket.data.identity as SocketIdentity;
    if (identity.role === "ADMIN") {
      socket.join(adminRoom(identity.tenantId));
    } else if (identity.role === "CAPTAIN" && "staffId" in identity) {
      socket.join(captainRoom(identity.tenantId, identity.staffId));
    }

    socket.on("delivery:subscribe", async (input: { orderId?: number }, acknowledge?: (subscribed: boolean) => void) => {
      if (identity.role !== "CUSTOMER" || !Number.isInteger(input?.orderId)) {
        acknowledge?.(false);
        return;
      }
      const order = await prisma.order.findFirst({
        where: {
          id: input.orderId,
          customerId: identity.customerId,
          tenantId: identity.tenantId,
          fulfillmentType: "DELIVERY",
        },
        select: { id: true, delivery: { select: { id: true } } },
      });
      if (order?.delivery) {
        await socket.join(customerRoom(identity.tenantId, order.id, identity.customerId));
        acknowledge?.(true);
      } else {
        acknowledge?.(false);
      }
    });
  });

  return socketServer;
};

const adminRoom = (tenantId: string) => `delivery:tenant:${tenantId}:admins`;
const captainRoom = (tenantId: string, captainId: number) => `delivery:tenant:${tenantId}:captain:${captainId}`;
const customerRoom = (tenantId: string, orderId: number, customerId: number) =>
  `delivery:tenant:${tenantId}:order:${orderId}:customer:${customerId}`;

export const emitDeliveryLocation = (
  tenantId: string,
  orderId: number,
  customerId: number,
  payload: { deliveryId: number; latitude: string; longitude: string; timestamp: Date }
) => {
  const eventPayload = {
    deliveryId: payload.deliveryId,
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    timestamp: payload.timestamp.toISOString(),
  };
  socketServer?.to(adminRoom(tenantId)).emit("delivery:location_updated", eventPayload);
  socketServer?.to(customerRoom(tenantId, orderId, customerId)).emit("delivery:location_updated", eventPayload);
};

export const emitDeliveryStatus = (
  tenantId: string,
  orderId: number,
  customerId: number,
  payload: { deliveryId: number; status: string; timestamp: Date }
) => {
  const eventPayload = {
    deliveryId: payload.deliveryId,
    status: payload.status,
    timestamp: payload.timestamp.toISOString(),
  };
  socketServer?.to(adminRoom(tenantId)).emit("delivery:status_updated", eventPayload);
  socketServer?.to(customerRoom(tenantId, orderId, customerId)).emit("delivery:status_updated", eventPayload);
};

export const emitDeliveryAssigned = (tenantId: string, captainId: number, deliveryId: number, orderId: number) => {
  socketServer?.to(captainRoom(tenantId, captainId)).emit("delivery:assigned", { deliveryId, orderId });
};

