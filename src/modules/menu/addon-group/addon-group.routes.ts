import { Router } from "express";

import { requireTenantContext } from "../../../middlewares/tenant-context.middleware";
import { validate } from "../../../middlewares/validate.middleware";

import {
  createAddonGroup,
  getAllAddonGroups,
  getAddonGroupById,
  updateAddonGroup,
  deleteAddonGroup,
} from "./addon-group.controller";

import {
  createAddonGroupSchema,
  updateAddonGroupSchema,
  addonGroupIdSchema,
} from "./addon-group.validation";

const router = Router();

/**
 * @swagger
 * /api/addon-groups:
 *   post:
 *     summary: Create a new addon group
 *     description: Creates an addon group for a tenant.
 *     tags:
 *       - Add-on Groups
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - name
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               name:
 *                 type: string
 *                 example: Extra Toppings
 *               minSelect:
 *                 type: integer
 *                 example: 0
 *               maxSelect:
 *                 type: integer
 *                 example: 3
 *               isRequired:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Addon group created successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Tenant not found
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireTenantContext,
  validate(createAddonGroupSchema),
  createAddonGroup
);

/**
 * @swagger
 * /api/addon-groups:
 *   get:
 *     summary: Get all addon groups
 *     description: Returns all addon groups for the requested tenant.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         description: Tenant ID
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Addon groups fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  requireTenantContext,
  getAllAddonGroups
);

/**
 * @swagger
 * /api/addon-groups/{id}:
 *   get:
 *     summary: Get addon group by ID
 *     description: Returns a single addon group.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Addon group ID
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
 *         description: Addon group fetched successfully
 *       400:
 *         description: Invalid addon group ID
 *       404:
 *         description: Addon group not found
 */
router.get(
  "/:id",
  requireTenantContext,
  validate(addonGroupIdSchema),
  getAddonGroupById
);

/**
 * @swagger
 * /api/addon-groups/{id}:
 *   put:
 *     summary: Update addon group
 *     description: Updates an existing addon group.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Addon group ID
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
 *                 example: Extra Toppings
 *               minSelect:
 *                 type: integer
 *                 example: 0
 *               maxSelect:
 *                 type: integer
 *                 example: 5
 *               isRequired:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Addon group updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Addon group not found
 */
router.put(
  "/:id",
  requireTenantContext,
  validate(updateAddonGroupSchema),
  updateAddonGroup
);

/**
 * @swagger
 * /api/addon-groups/{id}:
 *   delete:
 *     summary: Delete addon group
 *     description: Deletes an addon group when it has no associated addon items.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Addon group ID
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Addon group deleted successfully
 *       400:
 *         description: Invalid addon group ID
 *       404:
 *         description: Addon group not found
 *       409:
 *         description: Addon group contains addon items
 */
router.delete(
  "/:id",
  requireTenantContext,
  validate(addonGroupIdSchema),
  deleteAddonGroup
);

export default router;