import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { requireCaptainAuth } from "../../middlewares/staff-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  createCaptain,
  getAvailableCaptains,
  getCaptainAvailability,
  getCaptainById,
  getMyCaptain,
  getCaptains,
  updateCaptain,
  updateCaptainAvailability,
} from "./captain.controller";
import { captainAvailabilitySchema, captainIdSchema, createCaptainSchema, updateCaptainSchema } from "./captain.validation";

const router = Router();

/**
 * @swagger
 * /api/captains:
 *   post:
 *     summary: Create a Captain and linked staff login
 *     tags: [Captains]
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
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Captain One
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: captain.one@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Captain@123
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
 *                 example: TN01AB1234
 *               branchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["T001-B001"]
 *     responses:
 *       201:
 *         description: Captain created successfully
 *   get:
 *     summary: List tenant Captains
 *     tags: [Captains]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Captains fetched successfully
 * /api/captains/available:
 *   get:
 *     summary: List active Captains without an active delivery
 *     tags: [Captains]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available captains fetched successfully
 * /api/captains/{id}:
 *   get:
 *     summary: Get a tenant Captain
 *     tags: [Captains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
 *     responses:
 *       200:
 *         description: Captain fetched successfully
 *   put:
 *     summary: Update Captain profile and branch assignments
 *     tags: [Captains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
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
 *                 example: ["T001-B001"]
 *     responses:
 *       200:
 *         description: Captain updated successfully
 */
router.post("/", requireAdminAuth, validate(createCaptainSchema), createCaptain);
router.get("/", requireAdminAuth, getCaptains);
router.get("/available", requireAdminAuth, getAvailableCaptains);
router.get("/me", requireCaptainAuth, getMyCaptain);
router.get("/availability", requireCaptainAuth, getCaptainAvailability);
router.put("/availability", requireCaptainAuth, validate(captainAvailabilitySchema), updateCaptainAvailability);
router.get("/:id", requireAdminAuth, validate(captainIdSchema), getCaptainById);
router.put("/:id", requireAdminAuth, validate(updateCaptainSchema), updateCaptain);

export default router;