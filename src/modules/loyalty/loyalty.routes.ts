/**
 * @swagger
 * /api/loyalty:
 *   get:
 *     summary: Get customer loyalty balance
 *     description: Returns the authenticated customer's points balance and lifetime totals.
 *     tags:
 *       - Loyalty
 *     security:
 *       - customerAuth: []
 *     responses:
 *       200:
 *         description: Loyalty balance fetched successfully
 *       401:
 *         description: Customer authentication required
 */
/**
 * @swagger
 * /api/loyalty/transactions:
 *   get:
 *     summary: Get customer loyalty history
 *     description: Returns the authenticated customer's loyalty transaction history.
 *     tags:
 *       - Loyalty
 *     security:
 *       - customerAuth: []
 *     responses:
 *       200:
 *         description: Loyalty history fetched successfully
 *       401:
 *         description: Customer authentication required
 */
/**
 * @swagger
 * /api/loyalty/validate-redemption:
 *   post:
 *     summary: Validate loyalty points redemption
 *     description: Validates how many points can be redeemed for a customer before an order is placed.
 *     tags:
 *       - Loyalty
 *     security:
 *       - customerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *                 example: 100
 *     responses:
 *       200:
 *         description: Redemption validated successfully
 *       400:
 *         description: Invalid or insufficient points
 *       401:
 *         description: Customer authentication required
 */
/**
 * @swagger
 * /api/admin/loyalty/customers/{customerId}:
 *   get:
 *     summary: Get customer loyalty balance for admin
 *     description: Returns a customer's loyalty balance for the admin's tenant.
 *     tags:
 *       - Loyalty
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer loyalty balance fetched successfully
 *       401:
 *         description: Admin authentication required
 *       404:
 *         description: Customer not found
 */
/**
 * @swagger
 * /api/admin/loyalty/customers/{customerId}/transactions:
 *   get:
 *     summary: Get customer loyalty transaction history for admin
 *     description: Returns a customer's loyalty transaction history within the admin's tenant.
 *     tags:
 *       - Loyalty
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer loyalty transactions fetched successfully
 *       401:
 *         description: Admin authentication required
 */
/**
 * @swagger
 * /api/admin/loyalty/customers/{customerId}/adjust:
 *   post:
 *     summary: Manually adjust customer loyalty points
 *     description: Adds or removes points for a customer in the admin's tenant.
 *     tags:
 *       - Loyalty
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
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
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *                 example: 100
 *               description:
 *                 type: string
 *                 example: Customer support adjustment
 *     responses:
 *       200:
 *         description: Customer loyalty adjusted successfully
 *       400:
 *         description: Invalid point amount or negative balance
 *       401:
 *         description: Admin authentication required
 */

import { Router } from "express";

import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { requireCustomerAuth } from "../../middlewares/customer-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  adjustAdminCustomerLoyaltyController,
  getAdminCustomerLoyaltyController,
  getAdminCustomerLoyaltyTransactionsController,
  getCustomerLoyaltyController,
  getCustomerLoyaltyTransactionsController,
  validateCustomerRedemptionController,
} from "./loyalty.controller";
import { adminAdjustmentSchema, customerIdSchema, validateRedemptionSchema } from "./loyalty.validation";

const router = Router();
const adminRouter = Router();

router.get("/loyalty", requireCustomerAuth, getCustomerLoyaltyController);
router.get("/loyalty/transactions", requireCustomerAuth, getCustomerLoyaltyTransactionsController);
router.post("/loyalty/validate-redemption", requireCustomerAuth, validate(validateRedemptionSchema), validateCustomerRedemptionController);

adminRouter.get("/customers/:customerId", requireAdminAuth, validate(customerIdSchema), getAdminCustomerLoyaltyController);
adminRouter.get("/customers/:customerId/transactions", requireAdminAuth, validate(customerIdSchema), getAdminCustomerLoyaltyTransactionsController);
adminRouter.post("/customers/:customerId/adjust", requireAdminAuth, validate(adminAdjustmentSchema), adjustAdminCustomerLoyaltyController);

router.use("/admin/loyalty", adminRouter);

export default router;
