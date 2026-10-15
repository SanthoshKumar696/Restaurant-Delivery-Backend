import { Router } from "express";
import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { getDeliveryStaff } from "../captains/captain.controller";
import { getAdminDeliveries, getAdminDelivery } from "./delivery.controller";
import { deliveryIdSchema } from "./delivery.validation";

const router = Router();

router.get("/delivery-staff", requireAdminAuth, getDeliveryStaff);
/**
 * @openapi
 * /api/admin/delivery:
 *   get:
 *     summary: List deliveries for the authenticated admin tenant
 *     description: Each Delivery record is returned separately. Optional captainId is a Captain profile ID from GET /api/captains and does not change tenant scope.
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: captainId
 *         required: false
 *         description: Optional Captain profile ID returned by GET /api/captains.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 78
 *     responses:
 *       200:
 *         description: Tenant-scoped delivery records.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CaptainDelivery'
 *       400:
 *         description: Invalid captainId filter
 *       401:
 *         description: Admin authentication is required
 *       403:
 *         description: Caller is not authorized to list deliveries
 * /api/admin/delivery/{deliveryId}:
 *   get:
 *     summary: Get an admin-visible delivery and linked order
 *     description: deliveryId is the Delivery record ID returned by GET /api/admin/delivery. Tenant scope comes from the authenticated admin.
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID returned by the admin deliveries list; it is not an orderId or captainId.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 16
 *     responses:
 *       200:
 *         description: Delivery record with linked order details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CaptainDelivery'
 *       400:
 *         description: Invalid deliveryId
 *       401:
 *         description: Admin authentication is required
 *       403:
 *         description: Caller is not authorized to view deliveries
 *       404:
 *         description: Delivery is not found in the authenticated tenant
 */
router.get("/delivery", requireAdminAuth, getAdminDeliveries);
router.get("/delivery/:deliveryId", requireAdminAuth, validate(deliveryIdSchema), getAdminDelivery);

export default router;