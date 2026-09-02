import { Router } from "express";

import { requireTenantContext } from "../../../middlewares/tenant-context.middleware";
import { validate } from "../../../middlewares/validate.middleware";

import {
  createProductAddonGroup,
  getAllProductAddonGroups,
  getProductAddonGroupById,
  updateProductAddonGroup,
  deleteProductAddonGroup,
} from "./product-addon-group.controller";

import {
  createProductAddonGroupSchema,
  productAddonGroupIdSchema,
  updateProductAddonGroupSchema,
} from "./product-addon-group.validation";

const router = Router();

/**
 * @swagger
 * /api/product-addon-groups:
 *   post:
 *     summary: Assign an addon group to a product
 *     description: Assigns an existing addon group to an existing product.
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
 *               - productId
 *               - addonGroupId
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               productId:
 *                 type: integer
 *                 example: 1
 *               addonGroupId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Addon group assigned to product successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Tenant, product or addon group not found
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireTenantContext,
  validate(createProductAddonGroupSchema),
  createProductAddonGroup
);

/**
 * @swagger
 * /api/product-addon-groups:
 *   get:
 *     summary: Get product addon group mappings
 *     description: Returns all product and addon group mappings. Optionally filter by tenant.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: false
 *         description: Tenant ID
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Product addon group mappings fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  requireTenantContext,
  getAllProductAddonGroups
);

/**
 * @swagger
 * /api/product-addon-groups/{id}:
 *   get:
 *     summary: Get product addon group mapping by ID
 *     description: Returns a single product addon group mapping.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Product addon group mapping ID
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Product addon group mapping fetched successfully
 *       400:
 *         description: Invalid mapping ID
 *       404:
 *         description: Mapping not found
 */
router.get(
  "/:id",
  validate(productAddonGroupIdSchema),
  requireTenantContext,
  getProductAddonGroupById
);

/**
 * @swagger
 * /api/product-addon-groups/{id}:
 *   put:
 *     summary: Update product addon group mapping
 *     description: Changes the product or addon group associated with an existing mapping.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Product addon group mapping ID
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
 *               productId:
 *                 type: integer
 *                 example: 2
 *               addonGroupId:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Product addon group mapping updated successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Mapping, product or addon group not found
 */
router.put(
  "/:id",
  requireTenantContext,
  validate(updateProductAddonGroupSchema),
  updateProductAddonGroup
);

/**
 * @swagger
 * /api/product-addon-groups/{id}:
 *   delete:
 *     summary: Remove addon group from product
 *     description: Removes the relationship between a product and an addon group.
 *     tags:
 *       - Add-on Groups
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Product addon group mapping ID
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Addon group removed from product successfully
 *       400:
 *         description: Invalid mapping ID
 *       404:
 *         description: Mapping not found
 */
router.delete(
  "/:id",
  requireTenantContext,
  validate(productAddonGroupIdSchema),
  deleteProductAddonGroup
);

export default router;