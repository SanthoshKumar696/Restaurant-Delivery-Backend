/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create a payment for an order
 *     description: Initializes a customer payment using the server-side order amount.
 *     tags:
 *       - Payments
 *     security:
 *       - customerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - paymentMethod
 *             properties:
 *               orderId:
 *                 type: integer
 *                 example: 101
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH_ON_DELIVERY, ONLINE]
 *                 example: CASH_ON_DELIVERY
 *     responses:
 *       201:
 *         description: Payment initialized successfully
 *       400:
 *         description: Validation error or invalid payment method
 *       403:
 *         description: Order does not belong to the customer or tenant mismatch
 *       404:
 *         description: Order not found
 *       409:
 *         description: Payment already exists for this order
 *       401:
 *         description: Customer authentication required
 */
/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get customer payment details
 *     description: Fetch a payment that belongs to the authenticated customer and tenant.
 *     tags:
 *       - Payments
 *     security:
 *       - customerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Payment fetched successfully
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Customer authentication required
 */

import { Router } from "express";

import { requireCustomerAuth } from "../../middlewares/customer-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createPayment, getPaymentById } from "./payment.controller";
import { createPaymentSchema, paymentIdSchema } from "./payment.validation";

const router = Router();

router.post("/", requireCustomerAuth, validate(createPaymentSchema), createPayment);
router.get("/:id", requireCustomerAuth, validate(paymentIdSchema), getPaymentById);

export default router;
