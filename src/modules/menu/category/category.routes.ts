import { Router } from "express";

import { requireTenantContext } from "../../../middlewares/tenant-context.middleware";
import { validate } from "../../../middlewares/validate.middleware";

import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "./category.controller";

import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} from "./category.validation";

const router = Router();

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category
 *     description: Creates a new menu category for a tenant.
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
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
 *                 example: Pizza
 *               parentCategoryId:
 *                 type: integer
 *                 nullable: true
 *                 example: null
 *               displayOrder:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Tenant or parent category not found
 */
router.post(
  "/",
  requireTenantContext,
  validate(createCategorySchema),
  createCategory
);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags:
 *       - Categories
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 */
router.get("/", requireTenantContext, getAllCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags:
 *       - Categories
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
 *         description: Category fetched successfully
 *       404:
 *         description: Category not found
 */
router.get(
  "/:id",
  requireTenantContext,
  validate(categoryIdSchema),
  getCategoryById
);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags:
 *       - Categories
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
 *                 example: Updated Pizza
 *               parentCategoryId:
 *                 type: integer
 *                 nullable: true
 *                 example: null
 *               displayOrder:
 *                 type: integer
 *                 example: 2
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id",
  requireTenantContext,
  validate(updateCategorySchema),
  updateCategory
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Deactivate category
 *     tags:
 *       - Categories
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Category deactivated successfully
 *       404:
 *         description: Category not found
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  requireTenantContext,
  validate(categoryIdSchema),
  deleteCategory
);

export default router;