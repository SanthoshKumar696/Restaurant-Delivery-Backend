/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate a coupon for a customer
 *     description: Validates a coupon code using the tenant and customer context, calculating the discount server-side.
 *     tags:
 *       - Coupons
 *     security:
 *       - customerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - orderAmount
 *             properties:
 *               code:
 *                 type: string
 *                 example: WELCOME10
 *               orderAmount:
 *                 type: number
 *                 example: 500
 *     responses:
 *       200:
 *         description: Coupon validation succeeded
 *       400:
 *         description: Coupon validation error
 *       401:
 *         description: Customer authentication required
 *       404:
 *         description: Coupon not found
 */
/**
 * @swagger
 * /api/admin/coupons:
 *   post:
 *     summary: Create a coupon
 *     description: Create a tenant-scoped coupon for a restaurant.
 *     tags:
 *       - Coupons
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - discountValue
 *               - minimumOrderAmount
 *               - startDate
 *               - endDate
 *             properties:
 *               code:
 *                 type: string
 *                 example: WELCOME10
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED_AMOUNT]
 *                 example: PERCENTAGE
 *               discountValue:
 *                 type: number
 *                 example: 10
 *               minimumOrderAmount:
 *                 type: number
 *                 example: 300
 *               maximumDiscountAmount:
 *                 type: number
 *                 example: 100
 *               usageLimit:
 *                 type: integer
 *                 example: 1000
 *               perCustomerLimit:
 *                 type: integer
 *                 example: 1
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Coupon created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Admin authentication required
 */
/**
 * @swagger
 * /api/admin/coupons:
 *   get:
 *     summary: List coupons for tenant
 *     description: Returns all coupons for the authenticated admin's tenant.
 *     tags:
 *       - Coupons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: discountType
 *         schema:
 *           type: string
 *           enum: [PERCENTAGE, FIXED_AMOUNT]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupons fetched successfully
 */
/**
 * @swagger
 * /api/admin/coupons/{id}:
 *   get:
 *     summary: Get a coupon by ID
 *     description: Returns a single tenant-scoped coupon.
 *     tags:
 *       - Coupons
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
 *         description: Coupon fetched successfully
 *       404:
 *         description: Coupon not found
 */
/**
 * @swagger
 * /api/admin/coupons/{id}:
 *   put:
 *     summary: Update a coupon
 *     description: Update the tenant-scoped coupon configuration.
 *     tags:
 *       - Coupons
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
 *         description: Coupon updated successfully
 */
/**
 * @swagger
 * /api/admin/coupons/{id}/status:
 *   patch:
 *     summary: Toggle coupon status
 *     description: Soft enable or disable a coupon for the admin's tenant.
 *     tags:
 *       - Coupons
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon status updated successfully
 */

import { Router } from "express";

import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { requireCustomerAuth } from "../../middlewares/customer-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  createCouponController,
  getCouponByIdController,
  listCouponsController,
  updateCouponController,
  updateCouponStatusController,
  validateCouponController,
} from "./coupon.controller";
import {
  adminCouponListSchema,
  couponIdSchema,
  createCouponSchema,
  couponStatusSchema,
  updateCouponSchema,
  validateCouponSchema,
} from "./coupon.validation";

const router = Router();
const adminRouter = Router();

router.post("/coupons/validate", requireCustomerAuth, validate(validateCouponSchema), validateCouponController);

adminRouter.post("/coupons", requireAdminAuth, validate(createCouponSchema), createCouponController);
adminRouter.get("/coupons", requireAdminAuth, validate(adminCouponListSchema), listCouponsController);
adminRouter.get("/coupons/:id", requireAdminAuth, validate(couponIdSchema), getCouponByIdController);
adminRouter.put("/coupons/:id", requireAdminAuth, validate(updateCouponSchema), updateCouponController);
adminRouter.patch("/coupons/:id/status", requireAdminAuth, validate(couponStatusSchema), updateCouponStatusController);

router.use("/admin", adminRouter);

export default router;
