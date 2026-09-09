import { Router } from "express";

import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { requireCustomerAuth } from "../../middlewares/customer-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

import {
  createReviewController,
  deleteAdminReviewController,
  deleteReviewController,
  getAdminReviewByIdController,
  getAdminReviewsController,
  getMyReviewsController,
  getProductReviewsController,
  getReviewByIdController,
  updateAdminReviewStatusController,
  updateReviewController,
} from "./review.controller";
import {
  adminReviewListSchema,
  createReviewSchema,
  productReviewsSchema,
  reviewIdSchema,
  reviewStatusSchema,
  updateReviewSchema,
} from "./review.validation";

const router = Router();
const adminRouter = Router();

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a product review
 *     description: Authenticated customer can submit a review for a completed order item they purchased.
 *     tags:
 *       - Reviews
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
 *               - productId
 *               - rating
 *             properties:
 *               orderId:
 *                 type: integer
 *                 example: 100
 *               productId:
 *                 type: integer
 *                 example: 10
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: Very tasty and fresh
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Invalid rating, product not in order or review not allowed
 *       401:
 *         description: Customer authentication required
 *       403:
 *         description: Review ownership or tenant access denied
 *       404:
 *         description: Product or order not found
 */
router.post("/reviews", requireCustomerAuth, validate(createReviewSchema), createReviewController);

/**
 * @swagger
 * /api/reviews/my:
 *   get:
 *     summary: Get my reviews
 *     description: Returns all reviews created by the authenticated customer.
 *     tags:
 *       - Reviews
 *     security:
 *       - customerAuth: []
 *     responses:
 *       200:
 *         description: Reviews fetched successfully
 *       401:
 *         description: Customer authentication required
 */
router.get("/reviews/my", requireCustomerAuth, getMyReviewsController);

/**
 * @swagger
 * /api/reviews/products/{productId}:
 *   get:
 *     summary: Get product reviews
 *     description: Returns public reviews for a product for a specific tenant. No authentication required.
 *     tags:
 *       - Reviews
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         example: T001
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Product reviews fetched successfully
 *       400:
 *         description: Missing tenantId or invalid query
 */
router.get("/reviews/products/:productId", validate(productReviewsSchema), getProductReviewsController);

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get a review by ID
 *     description: Returns the authenticated customer's own review details.
 *     tags:
 *       - Reviews
 *     security:
 *       - customerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review fetched successfully
 *       403:
 *         description: Review does not belong to this customer
 *       404:
 *         description: Review not found
 */
router.get("/reviews/:id", requireCustomerAuth, validate(reviewIdSchema), getReviewByIdController);

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Update a review
 *     description: Allows a customer to update their own review rating or comment.
 *     tags:
 *       - Reviews
 *     security:
 *       - customerAuth: []
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
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       400:
 *         description: Invalid update input
 *       403:
 *         description: Review ownership denied
 */
router.put("/reviews/:id", requireCustomerAuth, validate(updateReviewSchema), updateReviewController);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     description: Hides the review for the authenticated customer if it belongs to them.
 *     tags:
 *       - Reviews
 *     security:
 *       - customerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       403:
 *         description: Review ownership denied
 */
router.delete("/reviews/:id", requireCustomerAuth, validate(reviewIdSchema), deleteReviewController);

/**
 * @swagger
 * /api/admin/reviews:
 *   get:
 *     summary: Get all tenant reviews
 *     description: Admin can list reviews within their tenant with optional filters.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: customerId
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: rating
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *     responses:
 *       200:
 *         description: Reviews fetched successfully
 *       401:
 *         description: Admin authentication required
 */
adminRouter.get("/", requireAdminAuth, validate(adminReviewListSchema), getAdminReviewsController);

/**
 * @swagger
 * /api/admin/reviews/{id}:
 *   get:
 *     summary: Get review details for admin
 *     description: Returns review details and safe summary information for a review in the admin's tenant.
 *     tags:
 *       - Reviews
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
 *         description: Review detail fetched successfully
 *       401:
 *         description: Admin authentication required
 */
adminRouter.get("/:id", requireAdminAuth, validate(reviewIdSchema), getAdminReviewByIdController);

/**
 * @swagger
 * /api/admin/reviews/{id}/status:
 *   patch:
 *     summary: Update review status
 *     description: Admin can publish or hide a review by updating its moderation status.
 *     tags:
 *       - Reviews
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
 *                 enum: [PENDING, APPROVED, REJECTED]
 *     responses:
 *       200:
 *         description: Review status updated successfully
 *       401:
 *         description: Admin authentication required
 */
adminRouter.patch("/:id/status", requireAdminAuth, validate(reviewStatusSchema), updateAdminReviewStatusController);

/**
 * @swagger
 * /api/admin/reviews/{id}:
 *   delete:
 *     summary: Hide a review
 *     description: Admin can hide an inappropriate review without permanently deleting the record.
 *     tags:
 *       - Reviews
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
 *         description: Review hidden successfully
 *       401:
 *         description: Admin authentication required
 */
adminRouter.delete("/:id", requireAdminAuth, validate(reviewIdSchema), deleteAdminReviewController);

router.use("/admin/reviews", adminRouter);

export default router;
