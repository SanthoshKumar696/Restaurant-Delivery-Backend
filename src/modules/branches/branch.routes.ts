import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
} from "./branch.controller";
import {
  branchIdSchema,
  createBranchSchema,
  updateBranchSchema,
} from "./branch.validation";

const router = Router();

/**
 * @swagger
 * /api/branches:
 *   post:
 *     summary: Create a new branch
 *     description: Creates a new restaurant branch for an existing tenant.
 *     tags:
 *       - Branches
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - name
 *               - addressLine
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               name:
 *                 type: string
 *                 example: Main Branch
 *               addressLine:
 *                 type: string
 *                 example: 123 Main Street
 *               city:
 *                 type: string
 *                 example: Mumbai
 *               latitude:
 *                 type: number
 *                 example: 19.0760
 *               longitude:
 *                 type: number
 *                 example: 72.8777
 *               phone:
 *                 type: string
 *                 example: +919876543210
 *               deliveryEnabled:
 *                 type: boolean
 *                 example: true
 *               pickupEnabled:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Branch created successfully. The generated ID is B001.
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Tenant not found
 */
router.post("/", requireAdminAuth, validate(createBranchSchema), createBranch);

/**
 * @swagger
 * /api/branches:
 *   get:
 *     summary: Get all branches
 *     description: Returns all restaurant branches ordered by creation date.
 *     tags:
 *       - Branches
 *     responses:
 *       200:
 *         description: Branches fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get("/", requireAdminAuth, getAllBranches);

/**
 * @swagger
 * /api/branches/{id}:
 *   get:
 *     summary: Get branch by ID
 *     description: Returns a single branch using its Branch ID.
 *     tags:
 *       - Branches
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Branch ID, for example B001
 *         schema:
 *           type: string
 *         example: B001
 *     responses:
 *       200:
 *         description: Branch fetched successfully
 *       400:
 *         description: Invalid branch ID
 *       404:
 *         description: Branch not found
 */
router.get("/:id", requireAdminAuth, validate(branchIdSchema), getBranchById);

/**
 * @swagger
 * /api/branches/{id}:
 *   put:
 *     summary: Update branch
 *     description: Updates an existing branch without changing its ID or tenant.
 *     tags:
 *       - Branches
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Branch ID, for example B001
 *         schema:
 *           type: string
 *         example: B001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Main Branch
 *               addressLine:
 *                 type: string
 *                 example: 456 New Street
 *               city:
 *                 type: string
 *                 nullable: true
 *                 example: Pune
 *               latitude:
 *                 type: number
 *                 nullable: true
 *                 example: 18.5204
 *               longitude:
 *                 type: number
 *                 nullable: true
 *                 example: 73.8567
 *               phone:
 *                 type: string
 *                 nullable: true
 *                 example: +919876543210
 *               deliveryEnabled:
 *                 type: boolean
 *                 example: true
 *               pickupEnabled:
 *                 type: boolean
 *                 example: true
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Branch updated successfully
 *       400:
 *         description: Invalid request or empty update body
 *       404:
 *         description: Branch not found
 */
router.put("/:id", requireAdminAuth, validate(updateBranchSchema), updateBranch);

/**
 * @swagger
 * /api/branches/{id}:
 *   delete:
 *     summary: Deactivate branch
 *     description: Soft deletes a branch by setting isActive to false.
 *     tags:
 *       - Branches
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Branch ID, for example B001
 *         schema:
 *           type: string
 *         example: B001
 *     responses:
 *       200:
 *         description: Branch deactivated successfully
 *       400:
 *         description: Invalid branch ID
 *       404:
 *         description: Branch not found
 */
router.delete("/:id", requireAdminAuth, validate(branchIdSchema), deleteBranch);

export default router;
