/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: List tenant payments
 *     description: Returns payments for the admin's tenant, with optional filters.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED, CANCELLED, REFUNDED]
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [CASH_ON_DELIVERY, ONLINE]
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payments fetched successfully
 *       401:
 *         description: Admin authentication required
 */
/**
 * @swagger
 * /api/admin/payments/{id}:
 *   get:
 *     summary: Get payment details
 *     description: Returns payment and customer/order summary for the admin's tenant.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment details fetched successfully
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Admin authentication required
 */
/**
 * @swagger
 * /api/admin/payments/{id}/status:
 *   patch:
 *     summary: Update payment status
 *     description: Safely updates the payment status when the transition is allowed.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, SUCCESS, FAILED, CANCELLED, REFUNDED]
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Invalid payment status transition
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Admin authentication required
 */

import { Router } from "express";

import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  getAdminPaymentByIdController,
  listAdminPayments,
  updatePaymentStatus,
} from "./payment.controller";
import {
  adminPaymentListSchema,
  adminPaymentStatusUpdateSchema,
  paymentIdSchema,
} from "./payment.validation";

const router = Router();

router.get("/", requireAdminAuth, validate(adminPaymentListSchema), listAdminPayments);
router.get("/:id", requireAdminAuth, validate(paymentIdSchema), getAdminPaymentByIdController);
router.patch(
  "/:id/status",
  requireAdminAuth,
  validate(adminPaymentStatusUpdateSchema),
  updatePaymentStatus
);

export default router;
