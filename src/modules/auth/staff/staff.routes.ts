import { Router } from "express";
import { validate } from "../../../middlewares/validate.middleware";
import { loginStaff } from "./staff.controller";
import { staffLoginSchema } from "./staff.validation";

const router = Router();

/**
 * @swagger
 * /api/auth/staff/login:
 *   post:
 *     summary: Authenticate an active staff member
 *     description: No bearer token is required. Send tenantId and password, plus phone or email (at least one). Active staff credentials are verified against the stored bcrypt hash. For CAPTAIN users, the linked Captain profile must exist. The response omits passwordHash; the returned token contains staffId, tenantId, and role.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - password
 *             anyOf:
 *               - required: [phone]
 *               - required: [email]
 *             properties:
 *               tenantId:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 20
 *                 description: Tenant identifier for the staff account being authenticated.
 *                 example: T001
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 20
 *                 description: Provide phone or email; at least one is required.
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 150
 *                 description: Provide email or phone; at least one is required.
 *                 example: captain@example.com
 *               password:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 format: password
 *                 example: Captain@123
 *     responses:
 *       200:
 *         description: Staff authenticated. Returns a bearer token and safe staff profile fields without passwordHash.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, message, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Staff login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: 'JWT with staffId, tenantId, and role claims; send as Authorization: Bearer <token>.'
 *                     staff:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           description: StaffUser ID; for a Captain, the shared primary key is also captainId.
 *                           example: 78
 *                         tenantId:
 *                           type: string
 *                           example: T001
 *                         fullName:
 *                           type: string
 *                           example: Captain One
 *                         phone:
 *                           type: string
 *                           example: "9876543210"
 *                         email:
 *                           type: string
 *                           nullable: true
 *                           example: captain@example.com
 *                         role:
 *                           type: string
 *                           example: CAPTAIN
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: Validation failed; tenantId, password, and phone or email are required.
 *       401:
 *         description: Credentials are invalid or staff account is inactive.
 *       403:
 *         description: Captain staff account has no linked Captain profile.
 *       500:
 *         description: Server authentication configuration is unavailable.
 */
router.post("/staff/login", validate(staffLoginSchema), loginStaff);

export default router;