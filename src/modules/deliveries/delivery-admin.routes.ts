import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { getDeliveryStaff } from "../captains/captain.controller";
import { getAdminDeliveries, getAdminDelivery } from "./delivery.controller";
import { deliveryIdSchema } from "./delivery.validation";

const router = Router();

router.get("/delivery-staff", requireAdminAuth, getDeliveryStaff);
router.get("/delivery", requireAdminAuth, getAdminDeliveries);
router.get("/delivery/:id", requireAdminAuth, validate(deliveryIdSchema), getAdminDelivery);

export default router;