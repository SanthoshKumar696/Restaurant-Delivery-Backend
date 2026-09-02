import { Router } from "express";

import { requireTenantContext } from "../../../middlewares/tenant-context.middleware";
import { validate } from "../../../middlewares/validate.middleware";

import {
  createAddonGroupItem,
  getAllAddonGroupItems,
  getAddonGroupItemById,
  updateAddonGroupItem,
  deleteAddonGroupItem,
} from "./addon-group-items.controller";

import {
  createAddonGroupItemSchema,
  updateAddonGroupItemSchema,
  addonGroupItemIdSchema,
} from "./addon-group-items.validation";

const router = Router();

/**
 * @swagger
 * /api/addon-group-items:
 *   post:
 *     summary: Create addon group item
 *     description: Creates an individual item inside an addon group.
 *     tags:
 *       - Add-on Groups
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addonGroupId
 *               - tenantId
 *               - name
 *             properties:
 *               addonGroupId:
 *                 type: integer
 *                 example: 1
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               name:
 *                 type: string
 *                 example: Extra Cheese
 *               price:
 *                 type: number
 *                 example: 30
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Addon group item created successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Tenant or addon group not found
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireTenantContext,
  validate(createAddonGroupItemSchema),
  createAddonGroupItem
);

/**
 * @swagger
 * /api/addon-group-items:
 *   get:
 *     summary: Get addon group items
 *     description: Returns addon group items for the requested tenant.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         example: T001
 *       - in: query
 *         name: addonGroupId
 *         required: false
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Addon group items fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  requireTenantContext,
  getAllAddonGroupItems
);

/**
 * @swagger
 * /api/addon-group-items/{id}:
 *   get:
 *     summary: Get addon group item by ID
 *     description: Returns a single addon group item.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Addon group item ID
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
 *         description: Addon group item fetched successfully
 *       400:
 *         description: Invalid addon group item ID
 *       404:
 *         description: Addon group item not found
 */
router.get(
  "/:id",
  requireTenantContext,
  validate(addonGroupItemIdSchema),
  getAddonGroupItemById
);

/**
 * @swagger
 * /api/addon-group-items/{id}:
 *   put:
 *     summary: Update addon group item
 *     description: Updates an existing addon group item.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Addon group item ID
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
 *               name:
 *                 type: string
 *                 example: Extra Cheese
 *               price:
 *                 type: number
 *                 example: 35
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Addon group item updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Addon group item not found
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id",
  requireTenantContext,
  validate(updateAddonGroupItemSchema),
  updateAddonGroupItem
);

/**
 * @swagger
 * /api/addon-group-items/{id}:
 *   delete:
 *     summary: Deactivate addon group item
 *     description: Soft deletes an addon group item by setting isActive to false.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Addon group item ID
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Addon group item deactivated successfully
 *       400:
 *         description: Invalid addon group item ID
 *       404:
 *         description: Addon group item not found
 */
router.delete(
  "/:id",
  requireTenantContext,
  validate(addonGroupItemIdSchema),
  deleteAddonGroupItem
);

export default router;