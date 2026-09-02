import { Router } from "express";

import { requireTenantContext } from "../../../middlewares/tenant-context.middleware";
import { validate } from "../../../middlewares/validate.middleware";

import {
  createProductVariant,
  getAllProductVariants,
  getProductVariantById,
  updateProductVariant,
  deleteProductVariant,
} from "./product-variant.controller";

import {
  createProductVariantSchema,
  updateProductVariantSchema,
  productVariantIdSchema,
} from "./product-variant.validation";

const router = Router();

/**
 * @swagger
 * /api/product-variants:
 *   post:
 *     summary: Create a product variant
 *     description: Creates a size or variant for an existing product.
 *     tags:
 *       - Product Variants
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - tenantId
 *               - name
 *               - price
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 1
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               name:
 *                 type: string
 *                 example: Medium
 *               price:
 *                 type: number
 *                 example: 299
 *               displayOrder:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Product variant created successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Tenant or product not found
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireTenantContext,
  validate(createProductVariantSchema),
  createProductVariant
);

/**
 * @swagger
 * /api/product-variants:
 *   get:
 *     summary: Get all product variants
 *     tags:
 *       - Product Variants
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Product variants fetched successfully
 */
router.get("/", requireTenantContext, getAllProductVariants);

/**
 * @swagger
 * /api/product-variants/{id}:
 *   get:
 *     summary: Get product variant by ID
 *     tags:
 *       - Product Variants
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Product variant fetched successfully
 *       404:
 *         description: Product variant not found
 */
router.get(
  "/:id",
  requireTenantContext,
  validate(productVariantIdSchema),
  getProductVariantById
);

/**
 * @swagger
 * /api/product-variants/{id}:
 *   put:
 *     summary: Update product variant
 *     tags:
 *       - Product Variants
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
 *               name:
 *                 type: string
 *                 example: Large
 *               price:
 *                 type: number
 *                 example: 399
 *               displayOrder:
 *                 type: integer
 *                 example: 2
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Product variant updated successfully
 *       404:
 *         description: Product variant not found
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id",
  requireTenantContext,
  validate(updateProductVariantSchema),
  updateProductVariant
);

/**
 * @swagger
 * /api/product-variants/{id}:
 *   delete:
 *     summary: Deactivate product variant
 *     tags:
 *       - Product Variants
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Product variant deactivated successfully
 *       404:
 *         description: Product variant not found
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  requireTenantContext,
  validate(productVariantIdSchema),
  deleteProductVariant
);

export default router;