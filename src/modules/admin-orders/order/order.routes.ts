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
  assignCaptainToAdminOrder,
} from "./order.controller";

import {
  adminOrderStatusListSchema,
  getAdminOrderByIdSchema,
  adminOrderStatusUpdateSchema,
  adminOrderAcceptSchema,
  adminOrderRejectSchema,
  adminOrderCancelSchema,
  assignCaptainToAdminOrderSchema,
} from "./order.validation";

const router = Router();

/**
 * @swagger
 * /api/admin/orders/{orderId}/assign-captain:
 *   post:
 *     summary: Assign or safely reassign a Captain to a ready order
 *     description: Assigns an unassigned READY delivery or reassigns an ASSIGNED delivery before acceptance. The existing delivery record is retained. orderId is the customer Order ID; captainId is the Captain Management ID from GET /api/captains.
 *     tags:
 *       - Admin Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: Customer Order record ID, not a Delivery record ID.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 188
 *     requestBody:
 *       required: true
 *       description: Captain Management ID selected from GET /api/captains.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - captainId
 *             properties:
 *               captainId:
 *                 type: integer
 *                 description: Captain profile ID returned as id by GET /api/captains; it shares its primary key with the linked StaffUser.
 *                 example: 303
 *     responses:
 *       200:
 *         description: Captain assigned; returns the updated order and delivery assignment details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, message, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Captain assigned successfully
 *                 data:
 *                   type: object
 *                   required: [id, orderNumber, status, delivery]
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 188
 *                     orderNumber:
 *                       type: string
 *                       example: ORD-20261013-001
 *                     status:
 *                       type: string
 *                       example: READY
 *                     delivery:
 *                       type: object
 *                       required: [id, status, captainId, captain, assignedAt]
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 130
 *                         status:
 *                           type: string
 *                           example: ASSIGNED
 *                         captainId:
 *                           type: integer
 *                           nullable: true
 *                           example: 303
 *                         captain:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 303
 *                             name:
 *                               type: string
 *                               example: Alex Rider
 *                             email:
 *                               type: string
 *                               nullable: true
 *                               example: alex.rider@example.com
 *                             phone:
 *                               type: string
 *                               example: "9876543210"
 *                         assignedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         previousCaptain:
 *                           type: object
 *                           nullable: true
 *                           description: Previous Captain on reassignment; null for an initial assignment.
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                             email:
 *                               type: string
 *                               nullable: true
 *                             phone:
 *                               type: string
 *       400:
 *         description: Invalid order ID or captain ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: VALIDATION_ERROR
 *       401:
 *         description: Admin authentication is required.
 *       403:
 *         description: Admin tenant or Captain branch access is denied.
 *       404:
 *         description: Order or active Captain was not found in the authenticated tenant.
 *       409:
 *         description: Order is not READY, has no delivery record, the delivery has been accepted or progressed, or the Captain has already rejected the delivery.
 */
router.post(
  "/:orderId/assign-captain",
  requireAdminAuth,
  validate(assignCaptainToAdminOrderSchema),
  assignCaptainToAdminOrder
);

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all admin orders
 *     description: Admin order management API - Returns all orders for the restaurant tenant.
 *     tags:
 *       - Admin Orders
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
  "/status/:status",
  requireAdminAuth,
  validate(adminOrderStatusListSchema),
  getOrdersByStatus
);

router.get(
  "/:id",
  requireAdminAuth,
  getAdminOrderById
);

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: Updates order status using the existing status workflow. Delivery orders must progress through CONFIRMED, PREPARING, then READY; skipping a transition is rejected.
 *     tags:
 *       - Admin Orders
 *     security:
 *       - bearerAuth: []
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
 *                 example: READY
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
 *         description: Invalid status value or request validation failed
 *       409:
 *         description: Invalid order status transition; CONFIRMED orders must move to PREPARING before READY.
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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