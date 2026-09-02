import { Router } from "express";
import { healthCheck } from "../controllers/health.controller";
import { testHealthSchema } from "../utils/validation";
import { validate } from "../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Checks whether the restaurant backend and database are available.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Backend and database are healthy
 *       503:
 *         description: Backend is running but database is unavailable
 */
router.get("/health", healthCheck);

router.post(
  "/validation-test",
  validate(testHealthSchema),
  (_req, res) => {
    return res.json({
      success: true,
      message: "Validation successful",
    });
  }
);
export default router;