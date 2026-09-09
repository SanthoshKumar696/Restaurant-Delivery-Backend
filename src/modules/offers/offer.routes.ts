/**
 * @swagger
 * /api/admin/offers:
 *   post:
 *     summary: Create an offer
 *     description: Create a tenant-scoped offer for a restaurant.
 *     tags:
 *       - Offers
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - offerType
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *                 example: Weekend Special
 *               description:
 *                 type: string
 *                 example: 20% off selected items
 *               offerType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED_AMOUNT, BUY_ONE_GET_ONE]
 *                 example: PERCENTAGE
 *               discountValue:
 *                 type: number
 *                 example: 20
 *               minimumOrderAmount:
 *                 type: number
 *                 example: 300
 *               maximumDiscountAmount:
 *                 type: number
 *                 example: 150
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               priority:
 *                 type: integer
 *                 example: 1
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Offer created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Admin authentication required
 */
/**
 * @swagger
 * /api/admin/offers:
 *   get:
 *     summary: List offers for tenant
 *     description: Returns active and inactive offers for the admin tenant.
 *     tags:
 *       - Offers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: offerType
 *         schema:
 *           type: string
 *           enum: [PERCENTAGE, FIXED_AMOUNT, BUY_ONE_GET_ONE]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offers fetched successfully
 */
/**
 * @swagger
 * /api/admin/offers/{id}:
 *   get:
 *     summary: Get an offer by ID
 *     description: Returns a single tenant-scoped offer with product mappings.
 *     tags:
 *       - Offers
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
 *         description: Offer fetched successfully
 *       404:
 *         description: Offer not found
 */
/**
 * @swagger
 * /api/admin/offers/{id}:
 *   put:
 *     summary: Update an offer
 *     description: Updates tenant-scoped offer details.
 *     tags:
 *       - Offers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Offer updated successfully
 */
/**
 * @swagger
 * /api/admin/offers/{id}/status:
 *   patch:
 *     summary: Toggle offer status
 *     description: Enable or disable a tenant-scoped offer.
 *     tags:
 *       - Offers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Offer status updated successfully
 */
/**
 * @swagger
 * /api/offers:
 *   get:
 *     summary: Get active offers for a tenant
 *     description: Public endpoint returning active public offers for a tenant.
 *     tags:
 *       - Offers
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Active offers fetched successfully
 *       400:
 *         description: Tenant ID is required
 */
/**
 * @swagger
 * /api/offers/{id}:
 *   get:
 *     summary: Get active offer details by ID
 *     description: Public endpoint returning an active offer for a tenant.
 *     tags:
 *       - Offers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offer fetched successfully
 *       404:
 *         description: Offer not found
 */

import { Router } from "express";

import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  assignOfferProductController,
  createOfferController,
  getOfferByIdController,
  getPublicOfferByIdController,
  getPublicOffersController,
  listOffersController,
  removeOfferProductController,
  updateOfferController,
  updateOfferStatusController,
} from "./offer.controller";
import {
  createOfferSchema,
  offerIdSchema,
  offerStatusSchema,
  productAssignmentSchema,
  publicOfferByIdSchema,
  publicOfferQuerySchema,
  updateOfferSchema,
} from "./offer.validation";

const router = Router();
const adminRouter = Router();

adminRouter.post("/offers", requireAdminAuth, validate(createOfferSchema), createOfferController);
adminRouter.get("/offers", requireAdminAuth, listOffersController);
adminRouter.get("/offers/:id", requireAdminAuth, validate(offerIdSchema), getOfferByIdController);
adminRouter.put("/offers/:id", requireAdminAuth, validate(updateOfferSchema), updateOfferController);
adminRouter.patch("/offers/:id/status", requireAdminAuth, validate(offerStatusSchema), updateOfferStatusController);
adminRouter.post("/offers/:id/products", requireAdminAuth, validate(productAssignmentSchema), assignOfferProductController);
adminRouter.delete("/offers/:id/products/:productId", requireAdminAuth, validate(productAssignmentSchema), removeOfferProductController);

router.get("/offers", validate(publicOfferQuerySchema), getPublicOffersController);
router.get("/offers/:id", validate(publicOfferByIdSchema), getPublicOfferByIdController);
router.use("/admin", adminRouter);

export default router;
