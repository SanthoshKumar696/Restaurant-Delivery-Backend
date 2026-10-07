import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { requireCaptainAuth } from "../../middlewares/staff-auth.middleware";
import { requireCustomerAuth } from "../../middlewares/customer-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  acceptDelivery,
  arriveDelivery,
  assignDelivery,
  completeDelivery,
  getAdminDeliveries,
  getAdminDelivery,
  getCaptainDelivery,
  getCustomerDelivery,
  getMyDeliveries,
  getMyCompletedDeliveries,
  getMyDashboard,
  getMyUpcomingDeliveries,
  pickUpDelivery,
  sendDeliveryOtp,
  startDelivery,
  updateDeliveryLocation,
} from "./delivery.controller";
import {
  assignDeliverySchema,
  completeDeliverySchema,
  customerDeliverySchema,
  deliveryIdSchema,
  deliveryLocationSchema,
} from "./delivery.validation";

const router = Router();

/**
 * @swagger
 * /api/delivery/my-deliveries:
 *   get:
 *     summary: List deliveries assigned to the authenticated Captain
 *     tags: [Deliveries]
 *     security: [{ staffAuth: [] }]
 * /api/delivery/admin:
 *   get:
 *     summary: List deliveries for the authenticated admin tenant
 *     tags: [Deliveries]
 *     security: [{ bearerAuth: [] }]
 * /api/delivery/admin/{id}:
 *   get:
 *     summary: Get delivery details and latest location for the admin tenant
 *     tags: [Deliveries]
 *     security: [{ bearerAuth: [] }]
 * /api/delivery/{id}/assign:
 *   post:
 *     summary: Manually assign a ready delivery to a Captain
 *     tags: [Deliveries]
 *     security: [{ bearerAuth: [] }]
 * /api/delivery/{id}:
 *   get:
 *     summary: Get a delivery assigned to the authenticated Captain
 *     tags: [Deliveries]
 *     security: [{ staffAuth: [] }]
 * /api/delivery/{id}/accept:
 *   post:
 *     summary: Accept an assigned delivery
 *     tags: [Deliveries]
 *     security: [{ staffAuth: [] }]
 * /api/delivery/{id}/picked-up:
 *   post:
 *     summary: Confirm restaurant pickup
 *     tags: [Deliveries]
 *     security: [{ staffAuth: [] }]
 * /api/delivery/{id}/out-for-delivery:
 *   post:
 *     summary: Start delivery and enable tracking
 *     tags: [Deliveries]
 *     security: [{ staffAuth: [] }]
 * /api/delivery/{id}/location:
 *   post:
 *     summary: Record Captain GPS coordinates
 *     tags: [Deliveries]
 *     security: [{ staffAuth: [] }]
 * /api/delivery/{id}/arrived:
 *   post:
 *     summary: Mark delivery arrived
 *     tags: [Deliveries]
 *     security: [{ staffAuth: [] }]
 * /api/delivery/{id}/complete:
 *   post:
 *     summary: Complete an arrived delivery with customer OTP
 *     tags: [Deliveries]
 *     security: [{ staffAuth: [] }]
 * /api/delivery/customer/{customerId}/{id}:
 *   get:
 *     summary: Get tracking for the authenticated customer's delivery
 *     tags: [Deliveries]
 *     security: [{ customerAuth: [] }]
 * /api/delivery/customer/{customerId}/{id}/otp:
 *   post:
 *     summary: Send delivery completion OTP to the order phone
 *     tags: [Deliveries]
 *     security: [{ customerAuth: [] }]
 */
router.get("/my-deliveries", requireCaptainAuth, getMyDeliveries);
router.get("/dashboard", requireCaptainAuth, getMyDashboard);
router.get("/my-current", requireCaptainAuth, getMyDeliveries);
router.get("/my-upcoming", requireCaptainAuth, getMyUpcomingDeliveries);
router.get("/completed", requireCaptainAuth, getMyCompletedDeliveries);
router.get("/admin", requireAdminAuth, getAdminDeliveries);
router.get("/admin/:id", requireAdminAuth, validate(deliveryIdSchema), getAdminDelivery);
router.post("/:id/assign", requireAdminAuth, validate(assignDeliverySchema), assignDelivery);
router.get("/:id", requireCaptainAuth, validate(deliveryIdSchema), getCaptainDelivery);
router.post("/:id/accept", requireCaptainAuth, validate(deliveryIdSchema), acceptDelivery);
router.post("/:id/picked-up", requireCaptainAuth, validate(deliveryIdSchema), pickUpDelivery);
router.post("/:id/out-for-delivery", requireCaptainAuth, validate(deliveryIdSchema), startDelivery);
router.post("/:id/location", requireCaptainAuth, validate(deliveryLocationSchema), updateDeliveryLocation);
router.post("/:id/arrived", requireCaptainAuth, validate(deliveryIdSchema), arriveDelivery);
router.post("/:id/complete", requireCaptainAuth, validate(completeDeliverySchema), completeDelivery);
router.get("/customer/:customerId/:id", requireCustomerAuth, validate(customerDeliverySchema), getCustomerDelivery);
router.post("/customer/:customerId/:id/otp", requireCustomerAuth, validate(customerDeliverySchema), sendDeliveryOtp);

export default router;