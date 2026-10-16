import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { requireCaptainAuth } from "../../middlewares/staff-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  getAvailableCaptains,
  getCaptainAvailability,
  getCaptainById,
  getMyCaptain,
  getCaptains,
  updateCaptain,
  updateCaptainAvailability,
} from "./captain.controller";
import { captainAvailabilitySchema, captainIdSchema, updateCaptainSchema } from "./captain.validation";

const router = Router();

/**
 * @swagger
 * /api/captains:
 *   get:
 *     summary: List tenant Captains and their Captain IDs
 *     description: Requires an admin bearer token. Tenant scope comes from the authenticated admin. Each item's id is captainId, the ID to use when assigning a delivery or filtering GET /api/delivery/admin; it is also the linked StaffUser.id.
 *     tags: [Captains]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Captains fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CaptainProfile'
 *       401:
 *         description: Admin authentication is required
 *       403:
 *         description: Admin role or tenant access is required
 * /api/captains/available:
 *   get:
 *     summary: List active Captains without an active delivery
 *     description: Requires an admin bearer token. Each item's id is captainId, suitable for the captainId request body in delivery assignment.
 *     tags: [Captains]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available captains fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CaptainProfile'
 *       401:
 *         description: Admin authentication is required
 *       403:
 *         description: Admin role or tenant access is required
 * /api/captains/me:
 *   get:
 *     summary: Get the authenticated Captain profile
 *     description: The Captain ID is derived from the staffAuth token's staffId; it is not supplied as a path or query parameter.
 *     tags: [Captains]
 *     security:
 *       - staffAuth: []
 *     responses:
 *       200:
 *         description: Captain profile, including its Captain ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CaptainProfile'
 *       401:
 *         description: Staff authentication is required
 *       403:
 *         description: Captain role is required
 * /api/captains/availability:
 *   get:
 *     summary: Get the authenticated Captain's availability
 *     description: Captain identity is derived from staffAuth; no captainId is accepted.
 *     tags: [Captains]
 *     security:
 *       - staffAuth: []
 *     responses:
 *       200:
 *         description: Captain availability
 *       401:
 *         description: Staff authentication is required
 *       403:
 *         description: Captain role is required
 *   put:
 *     summary: Update the authenticated Captain's availability
 *     description: Captain identity is derived from staffAuth. Request body contains status AVAILABLE or OFFLINE.
 *     tags: [Captains]
 *     security:
 *       - staffAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, OFFLINE]
 *     responses:
 *       200:
 *         description: Captain availability updated
 *       400:
 *         description: Invalid availability status
 *       401:
 *         description: Staff authentication is required
 *       403:
 *         description: Captain role is required
 * /api/captains/{captainId}:
 *   get:
 *     summary: Get a tenant Captain by captainId
 *     description: Enter the captain ID returned by GET /api/captains. This identifier is also the linked StaffUser ID.
 *     tags: [Captains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: captainId
 *         required: true
 *         description: Captain profile ID returned by GET /api/captains. This is also the linked StaffUser.id; it is not an orderId or deliveryId.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 78
 *     responses:
 *       200:
 *         description: Captain fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CaptainProfile'
 *       400:
 *         description: Invalid captainId
 *       401:
 *         description: Admin authentication is required
 *       404:
 *         description: Captain not found in the authenticated tenant
 *   put:
 *     summary: Update Captain profile and branch assignments by captainId
 *     description: Enter the captain ID returned by GET /api/captains.
 *     tags: [Captains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: captainId
 *         required: true
 *         description: Captain profile ID returned by GET /api/captains. This is also the linked StaffUser.id; it is not an orderId or deliveryId.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 78
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Captain Updated
 *               phone:
 *                 type: string
 *                 example: "9876543211"
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *                 example: captain.updated@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NewCaptain@123
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               vehicleType:
 *                 type: string
 *                 nullable: true
 *                 example: Bike
 *               vehicleNumber:
 *                 type: string
 *                 nullable: true
 *                 example: TN02CD4321
 *               branchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Replace the Captain's branch assignments with IDs of branches in the authenticated admin's tenant.
 *                 example: ["T001-B001"]
 *     responses:
 *       200:
 *         description: Captain updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CaptainProfile'
 *       400:
 *         description: Invalid Captain fields or branch IDs
 *       401:
 *         description: Admin authentication is required
 *       403:
 *         description: Branch does not belong to the authenticated tenant
 *       404:
 *         description: Captain not found in the authenticated tenant
 */
router.get("/", requireAdminAuth, getCaptains);
router.get("/available", requireAdminAuth, getAvailableCaptains);
router.get("/me", requireCaptainAuth, getMyCaptain);
router.get("/availability", requireCaptainAuth, getCaptainAvailability);
router.put("/availability", requireCaptainAuth, validate(captainAvailabilitySchema), updateCaptainAvailability);
router.get("/:captainId", requireAdminAuth, validate(captainIdSchema), getCaptainById);
router.put("/:captainId", requireAdminAuth, validate(updateCaptainSchema), updateCaptain);

export default router;