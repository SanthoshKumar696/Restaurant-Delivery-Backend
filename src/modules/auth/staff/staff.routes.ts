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
 *     tags: [Auth]
 */
router.post("/staff/login", validate(staffLoginSchema), loginStaff);

export default router;