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
 *     description: No bearer token is required. Send a staff email or phone number in identifier with the password. Email matching is case-insensitive. Phone numbers must resolve to exactly one staff account across tenants. The former email property remains as a deprecated compatibility alias. Active staff credentials are verified against the stored bcrypt hash; the response includes safe staff, tenant, branch, and linked Captain identifiers where applicable.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [identifier, password]
 *                 additionalProperties: false
 *                 properties:
 *                   identifier:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 150
 *                     description: Staff email (case-insensitive) or phone number. No separate tenant, phone, or branch field is accepted.
 *                     example: captain@example.com
 *                   password:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 100
 *                     format: password
 *                     example: Captain@123
 *               - type: object
 *                 deprecated: true
 *                 required: [email, password]
 *                 additionalProperties: false
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                     maxLength: 150
 *                     deprecated: true
 *                     description: Legacy email-only compatibility alias. Use identifier for new callers.
 *                     example: captain@example.com
 *                   password:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 100
 *                     format: password
 *                     example: Captain@123
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
 *                       required: [staffId, tenantId, fullName, email, role, branchAssignments, branchIds]
 *                       properties:
 *                         id:
 *                           type: integer
 *                           description: Legacy-compatible alias of staffId.
 *                           example: 23
 *                         staffId:
 *                           type: integer
 *                           description: Authenticated StaffUser primary key.
 *                           example: 23
 *                         tenantId:
 *                           type: string
 *                           example: T001
 *                         fullName:
 *                           type: string
 *                           example: Sam Captain
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
 *                         branchAssignments:
 *                           type: array
 *                           items:
 *                             type: object
 *                             required: [id, name]
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: T001-B001
 *                               name:
 *                                 type: string
 *                                 example: Main Branch
 *                         branchIds:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: [T001-B001]
 *                         branchId:
 *                           type: string
 *                           description: Included only when the staff member has exactly one authorized branch.
 *                           example: T001-B001
 *                         captainId:
 *                           type: integer
 *                           description: Included only for staff linked to a valid Captain profile.
 *                           example: 23
 *       400:
 *         description: Validation failed; provide identifier and password (or the deprecated email and password shape) with no extra request properties.
 *       401:
 *         description: Identifier or password is invalid, the staff account is inactive, or the phone identifier is ambiguous.
 *       403:
 *         description: Captain staff account has no linked Captain profile.
 *       500:
 *         description: Server authentication configuration is unavailable.
 */
router.post("/staff/login", validate(staffLoginSchema), loginStaff);

export default router;