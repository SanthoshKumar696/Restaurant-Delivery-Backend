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
 *     description: Creates a staff user in the authenticated admin's tenant. Set role to CAPTAIN and provide at least one authorized branch ID to create the linked Captain profile. The password is securely hashed using bcrypt.
 *     tags:
 *       - Staff
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phone
 *               - password
 *               - role
 *             properties:
 *               tenantId:
 *                 type: string
 *                 description: Optional assertion of the tenant. The server always derives the tenant from the authenticated admin and rejects a different value.
 *                 example: T032
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
 *                   - MANAGER
 *                   - SUPPORT
 *                 example: STAFF
 *               branchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Exact Branch.id values from the database, belonging to the authenticated admin's tenant. IDs are opaque and must not be constructed by prefixing the tenant ID. Required for role CAPTAIN.
 *                 example: ["B031"]
 *     responses:
 *       201:
 *         description: Staff user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 42
 *                     tenantId:
 *                       type: string
 *                       example: T032
 *                     role:
 *                       type: string
 *                       example: CAPTAIN
 *                     captainId:
 *                       type: integer
 *                       description: Present for CAPTAIN; equals the linked StaffUser ID.
 *                       example: 42
 *                     branchAssignments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Exact Branch.id from the database.
 *                             example: B031
 *                           name:
 *                             type: string
 *                             example: Main Branch
 *                     branchIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["B031"]
 *                     branchId:
 *                       type: string
 *                       description: Present when exactly one branch is assigned.
 *                       example: B031
 *       400:
 *         description: Validation failed
 *       403:
 *         description: Tenant mismatch, inaccessible branch, or inactive branch
 *       404:
 *         description: Branch not found
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
 *     description: Returns staff users belonging to the authenticated admin's tenant.
 *     tags:
 *       - Staff
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *                   - MANAGER
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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