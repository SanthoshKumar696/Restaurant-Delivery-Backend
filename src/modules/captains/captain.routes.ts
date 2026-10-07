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
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     summary: List tenant Captains
 *     tags: [Captains]
 *     security: [{ bearerAuth: [] }]
 * /api/captains/available:
 *   get:
 *     summary: List active Captains without an active delivery
 *     tags: [Captains]
 *     security: [{ bearerAuth: [] }]
 * /api/captains/{id}:
 *   get:
 *     summary: Get a tenant Captain
 *     tags: [Captains]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Update Captain profile and branch assignments
 *     tags: [Captains]
 *     security: [{ bearerAuth: [] }]
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