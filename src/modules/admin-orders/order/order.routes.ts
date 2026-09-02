import { Router } from "express";

import { requireAdminAuth } from "../../../middlewares/admin-auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";

import {
  getAdminOrders,
  getOrdersByStatus,
  getAdminOrderById,
  updateAdminOrderStatus,
  acceptAdminOrder,
  rejectAdminOrder,
  cancelAdminOrder,
} from "./order.controller";

import {
  adminOrderStatusListSchema,
  getAdminOrderByIdSchema,
  adminOrderStatusUpdateSchema,
  adminOrderAcceptSchema,
  adminOrderRejectSchema,
  adminOrderCancelSchema,
} from "./order.validation";

const router = Router();

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all admin orders
 *     description: Admin order management API - Returns all orders for the restaurant tenant.
 *     tags:
 *       - Admin Orders
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         example: T001
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - PENDING
 *             - CONFIRMED
 *             - PREPARING
 *             - READY
 *             - OUT_FOR_DELIVERY
 *             - COMPLETED
 *             - CANCELLED
 *             - REJECTED
 *         example: PENDING
 *       - in: query
 *         name: paymentStatus
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - PENDING
 *             - PAID
 *             - FAILED
 *             - REFUNDED
 *             - PARTIALLY_REFUNDED
 *         example: PENDING
 *     responses:
 *       200:
 *         description: Orders fetched successfully
 *       400:
 *         description: Validation failed or missing Tenant ID
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  requireAdminAuth,
  getAdminOrders
);

/**
 * @swagger
 * /api/admin/orders/status/{status}:
 *   get:
 *     summary: Get orders by status
 *     description: Admin order management API - Returns orders filtered by status.
 *     tags:
 *       - Admin Orders
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - pending
 *             - confirmed
 *             - preparing
 *             - ready
 *             - out-for-delivery
 *             - completed
 *             - cancelled
 *             - rejected
 *         example: pending
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Orders fetched successfully
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Get admin order details
 *     description: Admin order management API - Returns complete order details with customer info and status history.
 *     tags:
 *       - Admin Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Order fetched successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  requireAdminAuth,
  getAdminOrderById
);

router.get(
  "/status/:status",
  requireAdminAuth,
  validate(adminOrderStatusListSchema),
  getOrdersByStatus
);

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: Admin order management API - Updates order status with validation of allowed transitions.
 *     tags:
 *       - Admin Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - status
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               status:
 *                 type: string
 *                 enum:
 *                   - PENDING
 *                   - CONFIRMED
 *                   - PREPARING
 *                   - READY
 *                   - OUT_FOR_DELIVERY
 *                   - COMPLETED
 *                   - CANCELLED
 *                   - REJECTED
 *                 example: CONFIRMED
 *               note:
 *                 type: string
 *                 example: Order accepted by restaurant
 *               changedBy:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid status transition or validation failed
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/:id/status",
  requireAdminAuth,
  validate(adminOrderStatusUpdateSchema),
  updateAdminOrderStatus
);

/**
 * @swagger
 * /api/admin/orders/{id}/accept:
 *   patch:
 *     summary: Accept/confirm order
 *     description: Admin order management API - Marks an order as CONFIRMED.
 *     tags:
 *       - Admin Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               note:
 *                 type: string
 *                 example: Order accepted by restaurant
 *     responses:
 *       200:
 *         description: Order accepted successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/:id/accept",
  requireAdminAuth,
  validate(adminOrderAcceptSchema),
  acceptAdminOrder
);

/**
 * @swagger
 * /api/admin/orders/{id}/reject:
 *   patch:
 *     summary: Reject order
 *     description: Admin order management API - Rejects a pending order with optional reason.
 *     tags:
 *       - Admin Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               note:
 *                 type: string
 *                 example: Restaurant is unable to prepare this order at the moment
 *     responses:
 *       200:
 *         description: Order rejected successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/:id/reject",
  requireAdminAuth,
  validate(adminOrderRejectSchema),
  rejectAdminOrder
);

/**
 * @swagger
 * /api/admin/orders/{id}/cancel:
 *   patch:
 *     summary: Cancel order
 *     description: Admin order management API - Cancels an order that has not been completed.
 *     tags:
 *       - Admin Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               note:
 *                 type: string
 *                 example: Cancelled due to out of stock items
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/:id/cancel",
  requireAdminAuth,
  validate(adminOrderCancelSchema),
  cancelAdminOrder
);

export default router;