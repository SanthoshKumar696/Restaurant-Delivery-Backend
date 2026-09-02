import { Router } from "express";

import { requireTenantContext } from "../../../middlewares/tenant-context.middleware";
import { validate } from "../../../middlewares/validate.middleware";

import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "./product.controller";

import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
} from "./product.validation";

const router = Router();

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product
 *     description: Creates a new menu product for a tenant.
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - name
 *               - basePrice
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               categoryId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: Margherita Pizza
 *               description:
 *                 type: string
 *                 example: Classic cheese pizza
 *               imageUrl:
 *                 type: string
 *                 example: https://example.com/pizza.jpg
 *               basePrice:
 *                 type: number
 *                 example: 299.00
 *               isVeg:
 *                 type: boolean
 *                 example: true
 *               isRecommended:
 *                 type: boolean
 *                 example: true
 *               isBestSeller:
 *                 type: boolean
 *                 example: false
 *               displayOrder:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Tenant or category not found
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  requireTenantContext,
  validate(createProductSchema),
  createProduct
);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Products fetched successfully
 */
router.get("/", requireTenantContext, getAllProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags:
 *       - Products
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
 *         description: Product fetched successfully
 *       404:
 *         description: Product not found
 */
router.get(
  "/:id",
  requireTenantContext,
  validate(productIdSchema),
  getProductById
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product
 *     tags:
 *       - Products
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
 *               categoryId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: Updated Pizza
 *               description:
 *                 type: string
 *               basePrice:
 *                 type: number
 *                 example: 349
 *               isVeg:
 *                 type: boolean
 *               isRecommended:
 *                 type: boolean
 *               isBestSeller:
 *                 type: boolean
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id",
  requireTenantContext,
  validate(updateProductSchema),
  updateProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Deactivate product
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Product deactivated successfully
 *       404:
 *         description: Product not found
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  requireTenantContext,
  validate(productIdSchema),
  deleteProduct
);

export default router;