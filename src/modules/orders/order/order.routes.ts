import { Router } from "express";

import { requireCustomerAuth } from "../../../middlewares/customer-auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";

import {
  createOrder,
  getCustomerOrders,
  getOrderById,
  cancelOrder,
} from "./order.controller";

import {
  createOrderSchema,
  getCustomerOrdersSchema,
  getOrderByIdSchema,
  cancelOrderSchema,
} from "./order.validation";

const router = Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new customer order
 *     description: Creates a new order for a customer with order items.
 *     tags:
 *       - Orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - branchId
 *               - customerId
 *               - fulfillmentType
 *               - items
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               branchId:
 *                 type: string
 *                 example: B001
 *               customerId:
 *                 type: integer
 *                 example: 1
 *               fulfillmentType:
 *                 type: string
 *                 enum:
 *                   - DELIVERY
 *                   - PICKUP
 *                 example: DELIVERY
 *               deliveryAddressLine:
 *                 type: string
 *                 example: 123 Main Street
 *               deliveryLandmark:
 *                 type: string
 *                 example: Near Bus Stand
 *               deliveryLatitude:
 *                 type: number
 *                 example: 12.9716
 *               deliveryLongitude:
 *                 type: number
 *                 example: 77.5946
 *               deliveryPhone:
 *                 type: string
 *                 example: 919876543210
 *               notes:
 *                 type: string
 *                 example: Please deliver quickly
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     variantId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Tenant, branch, customer or product not found
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireCustomerAuth,
  validate(createOrderSchema),
  createOrder
);

/**
 * @swagger
 * /api/orders/customer/{customerId}:
 *   get:
 *     summary: Get customer's orders
 *     description: Returns all orders for a specific customer.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: customerId
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
 *         description: Orders fetched successfully
 *       400:
 *         description: Invalid customer ID or missing tenant ID
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/customer/:customerId",
  requireCustomerAuth,
  validate(getCustomerOrdersSchema),
  getCustomerOrders
);

/**
 * @swagger
 * /api/orders/customer/{customerId}/{id}:
 *   get:
 *     summary: Get customer order details
 *     description: Returns a specific order with items and status history for a customer.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: id
 *         required: true
 *         description: Order ID
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
 *         description: Invalid order ID or customer ID
 *       403:
 *         description: Order does not belong to this customer
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/customer/:customerId/:id",
  requireCustomerAuth,
  validate(getOrderByIdSchema),
  getOrderById
);

/**
 * @swagger
 * /api/orders/customer/{customerId}/{id}/cancel:
 *   patch:
 *     summary: Cancel customer order
 *     description: Cancels an order that belongs to the customer if allowed.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled
 *       403:
 *         description: Order does not belong to this customer
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/customer/:customerId/:id/cancel",
  validate(cancelOrderSchema),
  cancelOrder
);

export default router;