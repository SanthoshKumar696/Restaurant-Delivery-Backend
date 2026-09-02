import { Router } from "express";

import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";

import {
  createTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
  getTenantBranches,
} from "./tenant.controller";
import {
  createTenantSchema,
  updateTenantSchema,
  tenantIdSchema,
} from "./tenant.validation";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /api/tenants:
 *   post:
 *     summary: Create a new tenant
 *     description: Creates a new restaurant tenant.
 *     tags:
 *       - Tenants
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 example: Test Restaurant
 *                 description: Restaurant/tenant name
 *               slug:
 *                 type: string
 *                 example: test-restaurant
 *                 description: Unique tenant slug
 *               logoUrl:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/logo.png
 *                 description: Tenant logo URL
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *       400:
 *         description: Invalid request data
 *       409:
 *         description: Tenant with this slug already exists
 *       500:
 *         description: Internal server error
 */
router.post("/", requireAdminAuth, createTenant);


/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: Get all tenants
 *     description: Returns all restaurant tenants ordered by creation date.
 *     tags:
 *       - Tenants
 *     responses:
 *       200:
 *         description: Tenants fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get("/", requireAdminAuth, getAllTenants);


/**
 * @swagger
 * /api/tenants/{id}:
 *   get:
 *     summary: Get tenant by ID
 *     description: Returns a single tenant using its Tenant ID.
 *     tags:
 *       - Tenants
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Tenant ID, for example T001
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Tenant fetched successfully
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", requireAdminAuth, getTenantById);


/**
 * @swagger
 * /api/tenants/{id}:
 *   put:
 *     summary: Update tenant
 *     description: Updates an existing tenant.
 *     tags:
 *       - Tenants
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Tenant ID, for example T001
 *         schema:
 *           type: string
 *         example: T001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Restaurant
 *               slug:
 *                 type: string
 *                 example: updated-restaurant
 *               logoUrl:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/new-logo.png
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Tenant updated successfully
 *       404:
 *         description: Tenant not found
 *       409:
 *         description: Tenant with this slug already exists
 *       500:
 *         description: Internal server error
 */
router.put("/:id", requireAdminAuth, updateTenant);


/**
 * @swagger
 * /api/tenants/{id}:
 *   delete:
 *     summary: Deactivate tenant
 *     description: Soft deletes a tenant by setting isActive to false. The tenant is not physically removed from the database.
 *     tags:
 *       - Tenants
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Tenant ID, for example T001
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Tenant deactivated successfully
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", requireAdminAuth, deleteTenant);

/**
 * @swagger
 * /api/tenants/{id}/branches:
 *   get:
 *     summary: Get all branches under a tenant
 *     description: Returns all branches belonging to the specified tenant.
 *     tags:
 *       - Tenants
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Tenant ID
 *         schema:
 *           type: string
 *         example: T002
 *     responses:
 *       200:
 *         description: Tenant branches fetched successfully
 *       400:
 *         description: Invalid tenant ID
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id/branches",
  requireAdminAuth,
  validate(tenantIdSchema),
  getTenantBranches
);

export default router;