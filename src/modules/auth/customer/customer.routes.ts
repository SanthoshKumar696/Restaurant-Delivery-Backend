import { Router } from "express";

import { validate } from "../../../middlewares/validate.middleware";
import {
  resendOtpController,
  sendOtpController,
  verifyOtpController,
} from "./customer.controller";
import { resendOtpSchema, sendOtpSchema, verifyOtpSchema } from "./customer.validation";

const router = Router();

/**
 * @swagger
 * /api/auth/customer/send-otp:
 *   post:
 *     summary: Send OTP to customer mobile number
 *     description: Sends a one-time password (OTP) to the customer's mobile number for authentication.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - tenantId
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               tenantId:
 *                 type: string
 *                 example: T001
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Tenant not found
 */
router.post("/customer/send-otp", validate(sendOtpSchema), sendOtpController);

/**
 * @swagger
 * /api/auth/customer/verify-otp:
 *   post:
 *     summary: Verify OTP and authenticate customer
 *     description: Verifies the OTP and returns a JWT token for customer authentication. Auto-creates customer if doesn't exist.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *               - tenantId
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               tenantId:
 *                 type: string
 *                 example: T001
 *     responses:
 *       200:
 *         description: OTP verified successfully, customer authenticated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: OTP verification failed
 *       403:
 *         description: Customer account is inactive
 *       404:
 *         description: Tenant not found
 */
router.post("/customer/verify-otp", validate(verifyOtpSchema), verifyOtpController);

/**
 * @swagger
 * /api/auth/customer/resend-otp:
 *   post:
 *     summary: Resend OTP to the customer phone number
 *     description: Resends a one-time password for customer authentication after a cooldown period.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - tenantId
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               tenantId:
 *                 type: string
 *                 example: T001
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Tenant not found
 */
router.post("/customer/resend-otp", validate(resendOtpSchema), resendOtpController);

export default router;
