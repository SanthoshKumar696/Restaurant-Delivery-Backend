import { Router } from "express";

import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

import {
  createStaff,
  getAllStaff,
  getStaffById,
  getStaffByTenant,
  updateStaff,
  deleteStaff,
} from "./staff.contoller";

import {
  createStaffSchema,
  updateStaffSchema,
  staffIdSchema,
  tenantStaffSchema,
} from "./staff.validation";

const router = Router();

/**
 * @swagger
 * /api/staff:
 *   post:
 *     summary: Create a staff user
 *     description: Creates a new staff user under an existing tenant. The password is securely hashed using bcrypt.
 *     tags:
 *       - Staff
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - fullName
 *               - phone
 *               - password
 *               - role
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               fullName:
 *                 type: string
 *                 example: Raj Kumar
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 example: raj@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *               role:
 *                 type: string
 *                 enum:
 *                   - TENANT_OWNER
 *                   - BRANCH_MANAGER
 *                   - STAFF
 *                   - CAPTAIN
 *                   - SUPPORT
 *                 example: STAFF
 *     responses:
 *       201:
 *         description: Staff user created successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  requireAdminAuth,
  validate(createStaffSchema),
  createStaff
);

/**
 * @swagger
 * /api/staff:
 *   get:
 *     summary: Get all staff users
 *     description: Returns all staff users across all tenants.
 *     tags:
 *       - Staff
 *     responses:
 *       200:
 *         description: Staff users fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get("/", requireAdminAuth, getAllStaff);

/**
 * @swagger
 * /api/staff/{id}:
 *   get:
 *     summary: Get staff user by ID
 *     description: Returns a single staff user using the numeric staff ID.
 *     tags:
 *       - Staff
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Numeric Staff ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Staff user fetched successfully
 *       400:
 *         description: Invalid staff ID
 *       404:
 *         description: Staff user not found
 */
router.get(
  "/:id",
  requireAdminAuth,
  validate(staffIdSchema),
  getStaffById
);

/**
 * @swagger
 * /api/staff/{id}:
 *   put:
 *     summary: Update staff user
 *     description: Updates an existing staff user. Password is re-hashed when a new password is supplied.
 *     tags:
 *       - Staff
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Numeric Staff ID
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Updated Staff Name
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 nullable: true
 *                 example: updated@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NewPassword@123
 *               role:
 *                 type: string
 *                 enum:
 *                   - TENANT_OWNER
 *                   - BRANCH_MANAGER
 *                   - STAFF
 *                   - CAPTAIN
 *                   - SUPPORT
 *                 example: BRANCH_MANAGER
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Staff user updated successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Staff user not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  requireAdminAuth,
  validate(updateStaffSchema),
  updateStaff
);

/**
 * @swagger
 * /api/staff/{id}:
 *   delete:
 *     summary: Deactivate staff user
 *     description: Soft deletes a staff user by setting isActive to false.
 *     tags:
 *       - Staff
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Numeric Staff ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Staff user deactivated successfully
 *       400:
 *         description: Invalid staff ID
 *       404:
 *         description: Staff user not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
  requireAdminAuth,
  validate(staffIdSchema),
  deleteStaff
);

/**
 * @swagger
 * /api/staff/tenant/{tenantId}:
 *   get:
 *     summary: Get staff users by tenant
 *     description: Returns all staff users belonging to a specific tenant.
 *     tags:
 *       - Staff
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         description: Tenant ID
 *         schema:
 *           type: string
 *           example: T001
 *     responses:
 *       200:
 *         description: Tenant staff users fetched successfully
 *       400:
 *         description: Invalid tenant ID
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/tenant/:tenantId",
  requireAdminAuth,
  validate(tenantStaffSchema),
  getStaffByTenant
);

export default router;