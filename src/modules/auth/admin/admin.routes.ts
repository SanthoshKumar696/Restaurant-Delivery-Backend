/**
 * @swagger
 * /api/auth/admin/signup:
 *   post:
 *     summary: Admin signup
 *     description: Register a new administrator for a single restaurant tenant.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - name
 *               - tenantId
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *               name:
 *                 type: string
 *                 example: Restaurant Admin
 *               tenantId:
 *                 type: string
 *                 example: T001
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Admin already exists
 *       404:
 *         description: Tenant not found
 */
/**
 * @swagger
 * /api/auth/admin/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticate an admin and return a JWT token.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin12345
 *     responses:
 *       200:
 *         description: Admin login successful
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid credentials
 */

import { Router } from "express";

import { validate } from "../../../middlewares/validate.middleware";
import {
  loginAdminController,
  signupAdminController,
} from "./admin.controller";
import { adminLoginSchema, adminSignupSchema } from "./admin.validation";

const router = Router();

router.post("/admin/signup", validate(adminSignupSchema), signupAdminController);
router.post("/admin/login", validate(adminLoginSchema), loginAdminController);

export default router;
