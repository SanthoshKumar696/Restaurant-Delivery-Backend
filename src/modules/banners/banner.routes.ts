import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

import {
  createBannerController,
  getAllBannersAdminController,
  getActiveBannersController,
  getBannerByIdController,
  updateBannerController,
  deleteBannerController,
  updateBannerStatusController,
} from "./banner.controller";

import {
  createBannerSchema,
  updateBannerSchema,
  bannerIdSchema,
  bannerStatusSchema,
} from "./banner.validation";

const router = Router();

/**
 * @swagger
 * /api/banners:
 *   post:
 *     summary: Create a new banner
 *     description: Admin only - Creates a new promotional banner for a tenant.
 *     tags:
 *       - Banners
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - title
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               title:
 *                 type: string
 *                 example: 10% OFF
 *               description:
 *                 type: string
 *                 example: Special discount on all items
 *               imageUrl:
 *                 type: string
 *                 example: https://example.com/banner.jpg
 *               offerText:
 *                 type: string
 *                 example: Use Code OFFER10
 *               couponCode:
 *                 type: string
 *                 example: OFFER10
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-09-01T00:00:00Z
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-09-30T23:59:59Z
 *               displayOrder:
 *                 type: integer
 *                 example: 1
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Banner created successfully
 *       400:
 *         description: Validation failed or invalid request
 *       401:
 *         description: Unauthorized - admin token required
 *       404:
 *         description: Tenant not found
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireAdminAuth,
  validate(createBannerSchema),
  createBannerController
);

/**
 * @swagger
 * /api/banners:
 *   get:
 *     summary: Get active banners (public)
 *     description: Get all active promotional banners. No authentication required. Returns only active banners within the specified date range.
 *     tags:
 *       - Banners
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: false
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Active banners fetched successfully
 *       400:
 *         description: Invalid request
 */
router.get("/", getActiveBannersController);

/**
 * @swagger
 * /api/banners/admin/all:
 *   get:
 *     summary: Get all banners for admin
 *     description: Admin only - Returns all banners (active and inactive) for the tenant.
 *     tags:
 *       - Banners
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: false
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Banners fetched successfully
 *       401:
 *         description: Unauthorized - admin token required
 *     security:
 *       - bearerAuth: []
 */
router.get("/admin/all", requireAdminAuth, getAllBannersAdminController);

/**
 * @swagger
 * /api/banners/{id}:
 *   get:
 *     summary: Get banner by ID
 *     description: Admin only - Get a specific banner by ID.
 *     tags:
 *       - Banners
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Banner fetched successfully
 *       401:
 *         description: Unauthorized - admin token required
 *       404:
 *         description: Banner not found
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id",
  requireAdminAuth,
  validate(bannerIdSchema),
  getBannerByIdController
);

/**
 * @swagger
 * /api/banners/{id}:
 *   put:
 *     summary: Update banner
 *     description: Admin only - Update an existing banner.
 *     tags:
 *       - Banners
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
 *             properties:
 *               title:
 *                 type: string
 *                 example: 15% OFF
 *               description:
 *                 type: string
 *                 example: Updated discount
 *               imageUrl:
 *                 type: string
 *                 example: https://example.com/banner.jpg
 *               offerText:
 *                 type: string
 *                 example: Use Code OFFER15
 *               couponCode:
 *                 type: string
 *                 example: OFFER15
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               displayOrder:
 *                 type: integer
 *                 example: 2
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Banner updated successfully
 *       401:
 *         description: Unauthorized - admin token required
 *       404:
 *         description: Banner not found
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id",
  requireAdminAuth,
  validate(updateBannerSchema),
  updateBannerController
);

/**
 * @swagger
 * /api/banners/{id}:
 *   delete:
 *     summary: Delete banner
 *     description: Admin only - Permanently delete a banner.
 *     tags:
 *       - Banners
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Banner deleted successfully
 *       401:
 *         description: Unauthorized - admin token required
 *       404:
 *         description: Banner not found
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  requireAdminAuth,
  validate(bannerIdSchema),
  deleteBannerController
);

/**
 * @swagger
 * /api/banners/{id}/status:
 *   patch:
 *     summary: Update banner status
 *     description: Admin only - Activate or deactivate a banner.
 *     tags:
 *       - Banners
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
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Banner status updated successfully
 *       401:
 *         description: Unauthorized - admin token required
 *       404:
 *         description: Banner not found
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/:id/status",
  requireAdminAuth,
  validate(bannerStatusSchema),
  updateBannerStatusController
);

export default router;
