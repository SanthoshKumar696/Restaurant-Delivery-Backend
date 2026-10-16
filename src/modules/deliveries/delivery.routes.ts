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
  getMyCurrentDeliveries,
  getMyDashboard,
  getMyUpcomingDeliveries,
  pickUpDelivery,
  rejectDelivery,
  sendDeliveryOtp,
  startDelivery,
  updateDeliveryLocation,
} from "./delivery.controller";
import {
  adminDeliveriesSchema,
  assignDeliverySchema,
  completeDeliverySchema,
  customerDeliverySchema,
  deliveryIdSchema,
  deliveryLocationSchema,
} from "./delivery.validation";

const router = Router();

/**
 * @swagger
 * /api/delivery/dashboard:
 *   get:
 *     summary: Get the authenticated Captain's delivery dashboard
 *     description: The Captain ID and tenant are derived from the required staffAuth bearer token. No captainId parameter is accepted. Dashboard items include separate deliveryId, orderId, and captainId fields.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     responses:
 *       200:
 *         description: Current, upcoming, and completed deliveries with counts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CaptainDelivery'
 *                     upcoming:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CaptainDelivery'
 *                     completed:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CaptainDelivery'
 *                     counts:
 *                       type: object
 *       401:
 *         description: Captain authentication is required
 *       403:
 *         description: Captain role is required
 * /api/delivery/my-deliveries:
 *   get:
 *     summary: List active deliveries assigned to the authenticated Captain
 *     description: Includes assignments not yet accepted and deliveries in progress. No captainId path or query parameter is accepted; the Captain ID is derived from the required staffAuth token (StaffUser.id equals Captain.id). Use my-upcoming or my-current for status-specific lists.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     responses:
 *       200:
 *         description: Assigned delivery orders with order items, totals, customer and delivery details
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
 *             examples:
 *               assigned:
 *                 summary: Assigned delivery awaiting Captain acceptance
 *                 value:
 *                   success: true
 *                   items:
 *                     - id: 130
 *                       deliveryId: 130
 *                       orderId: 188
 *                       captainId: 303
 *                       status: ASSIGNED
 *                       assignedAt: '2026-10-13T10:00:00.000Z'
 *                       acceptedAt: null
 *                       captain:
 *                         id: 303
 *                         fullName: Sam Captain
 *                       order:
 *                         id: 188
 *                         orderNumber: '000101'
 *                         status: READY
 *                         fulfillmentType: DELIVERY
 *                         items:
 *                           - id: 200
 *                             productName: Veg Burger
 *                             quantity: 2
 *                             unitPrice: 120
 *                             lineTotal: 240
 *                         totals:
 *                           totalAmount: 280
 *       401:
 *         description: Captain authentication is required
 *       403:
 *         description: Captain role is required
 * /api/delivery/my-upcoming:
 *   get:
 *     summary: List assigned deliveries awaiting Captain acceptance
 *     description: No captainId parameter is accepted. The required staffAuth token identifies the Captain; obtain that Captain ID from GET /api/captains/me or the admin Captain list. Each returned delivery's deliveryId is the ID required by delivery detail and action routes.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     responses:
 *       200:
 *         description: Deliveries with ASSIGNED status for the authenticated Captain
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
 *             examples:
 *               assigned:
 *                 summary: Assigned delivery awaiting Captain acceptance
 *                 value:
 *                   success: true
 *                   items:
 *                     - id: 130
 *                       deliveryId: 130
 *                       orderId: 188
 *                       captainId: 303
 *                       status: ASSIGNED
 *                       assignedAt: '2026-10-13T10:00:00.000Z'
 *                       acceptedAt: null
 *                       captain:
 *                         id: 303
 *                         fullName: Sam Captain
 *                       order:
 *                         id: 188
 *                         orderNumber: '000101'
 *                         status: READY
 *                         fulfillmentType: DELIVERY
 *                         items:
 *                           - id: 200
 *                             productName: Veg Burger
 *                             quantity: 2
 *                             unitPrice: 120
 *                             lineTotal: 240
 *                         totals:
 *                           totalAmount: 280
 *       401:
 *         description: Captain authentication is required
 *       403:
 *         description: Captain role is required
 * /api/delivery/my-current:
 *   get:
 *     summary: List accepted deliveries still in progress
 *     description: Includes ACCEPTED, PICKED_UP, OUT_FOR_DELIVERY, and ARRIVED deliveries; excludes ASSIGNED and terminal deliveries. The Captain identity is derived from staffAuth, not supplied in the URL or query.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     responses:
 *       200:
 *         description: Current deliveries for the authenticated Captain
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
 *             examples:
 *               accepted:
 *                 summary: Accepted delivery in progress
 *                 value:
 *                   success: true
 *                   items:
 *                     - id: 130
 *                       deliveryId: 130
 *                       orderId: 188
 *                       captainId: 303
 *                       status: ACCEPTED
 *                       assignedAt: '2026-10-13T10:00:00.000Z'
 *                       acceptedAt: '2026-10-13T10:05:00.000Z'
 *                       captain:
 *                         id: 303
 *                         fullName: Sam Captain
 *                       order:
 *                         id: 188
 *                         orderNumber: '000101'
 *                         status: READY
 *                         fulfillmentType: DELIVERY
 *                         items:
 *                           - id: 200
 *                             productName: Veg Burger
 *                             quantity: 2
 *                             unitPrice: 120
 *                             lineTotal: 240
 *                         totals:
 *                           totalAmount: 280
 *       401:
 *         description: Captain authentication is required
 *       403:
 *         description: Captain role is required
 * /api/delivery/completed:
 *   get:
 *     summary: List successfully completed deliveries
 *     description: Returns only deliveries with delivery status DELIVERED for the authenticated Captain. There is no status query parameter; the current Captain ID is derived from staffAuth. The corresponding Order status is COMPLETED.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     responses:
 *       200:
 *         description: Completed delivery orders for the authenticated Captain
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
 *             examples:
 *               completed:
 *                 summary: Completed delivery
 *                 value:
 *                   success: true
 *                   items:
 *                     - id: 130
 *                       deliveryId: 130
 *                       orderId: 188
 *                       captainId: 303
 *                       status: DELIVERED
 *                       assignedAt: '2026-10-13T10:00:00.000Z'
 *                       acceptedAt: '2026-10-13T10:05:00.000Z'
 *                       deliveredAt: '2026-10-13T10:45:00.000Z'
 *                       captain:
 *                         id: 303
 *                         fullName: Sam Captain
 *                       order:
 *                         id: 188
 *                         orderNumber: '000101'
 *                         status: COMPLETED
 *                         fulfillmentType: DELIVERY
 *                         items:
 *                           - id: 200
 *                             productName: Veg Burger
 *                             quantity: 2
 *                             unitPrice: 120
 *                             lineTotal: 240
 *                         totals:
 *                           totalAmount: 280
 *       401:
 *         description: Captain authentication is required
 *       403:
 *         description: Captain role is required
 * /api/delivery/admin:
 *   get:
 *     summary: List deliveries for the authenticated admin tenant, optionally filtered by Captain
 *     description: Optional captainId filters by the Captain Management ID (also the linked StaffUser.id). Without it, returns all deliveries in the admin's tenant. Tenant scope always comes from bearerAuth.
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: captainId
 *         required: false
 *         description: Captain profile ID from GET /api/captains. This is not a deliveryId or orderId.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 78
 *     responses:
 *       200:
 *         description: Tenant-scoped deliveries; a supplied captainId returns each of that Captain's deliveries as a distinct item.
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
 *         description: Invalid captainId query parameter
 *       401:
 *         description: Admin authentication is required
 *       403:
 *         description: Admin role or tenant access is required
 * /api/delivery/admin/{deliveryId}:
 *   get:
 *     summary: Get delivery details and latest location by deliveryId
 *     description: deliveryId is the Delivery record ID returned as deliveryId by a deliveries list; it is not the linked orderId or captainId.
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID from GET /api/delivery/admin or GET /api/delivery/admin?captainId={captainId}.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 16
 *     responses:
 *       200:
 *         description: Delivery details including deliveryId, orderId, captainId, statuses, and assignment history.
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
 *       404:
 *         description: Delivery not found in the authenticated tenant
 * /api/delivery/{deliveryId}/assign:
 *   post:
 *     summary: Assign or safely reassign a ready delivery to a Captain
 *     description: Assigns a pending delivery or reassigns an assigned delivery before acceptance. The existing Delivery record is retained. deliveryId comes from the admin deliveries list; captainId comes from GET /api/captains.
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID, available from the admin deliveries list.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 16
 *     requestBody:
 *       required: true
 *       description: Captain Management ID selected from GET /api/captains.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - captainId
 *             properties:
 *               captainId:
 *                 type: integer
 *                 minimum: 1
 *                 description: Captain profile ID; the Captain profile shares its ID with the linked StaffUser.
 *                 example: 78
 *     responses:
 *       200:
 *         description: Captain assigned; returns updated delivery record.
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
 *         description: Invalid deliveryId or captainId
 *       401:
 *         description: Admin authentication is required
 *       403:
 *         description: Captain is not eligible for this tenant or branch
 *       404:
 *         description: Active Captain or delivery not found in this tenant
 *       409:
 *         description: Order is not READY, pickup order, delivery has been accepted or progressed, or the Captain has already rejected the delivery
 * /api/delivery/{deliveryId}:
 *   get:
 *     summary: Get one delivery assigned to the authenticated Captain
 *     description: deliveryId identifies the Delivery record (not the order). The linked order is returned as orderId. The authenticated Captain ID is derived from staffAuth and must own this delivery in the same tenant.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID from the assigned-deliveries response.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 16
 *     responses:
 *       200:
 *         description: Assigned delivery with the order details, items, totals, and timestamps
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
 *         description: Invalid delivery ID
 *       401:
 *         description: Captain authentication is required
 *       403:
 *         description: Delivery is not assigned to this Captain
 *       404:
 *         description: Delivery not found in the authenticated tenant
 * /api/delivery/{deliveryId}/accept:
 *   post:
 *     summary: Accept an assigned delivery
 *     description: deliveryId is copied from the assigned-deliveries response. The Captain ID and tenant are derived from staffAuth; no captainId or orderId is accepted as proof of ownership. No request body is required.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID from GET /api/delivery/my-upcoming.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 16
 *     responses:
 *       200:
 *         description: Delivery accepted and updated delivery returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Delivery accepted
 *                 data:
 *                   $ref: '#/components/schemas/CaptainDelivery'
 *       401:
 *         description: Captain authentication is required
 *       403:
 *         description: Delivery is not assigned to this Captain
 *       404:
 *         description: Delivery not found in the authenticated tenant
 *       409:
 *         description: Delivery is not in ASSIGNED status or its state changed concurrently
 * /api/delivery/{deliveryId}/reject:
 *   post:
 *     summary: Reject an assigned delivery
 *     description: Records a rejected DeliveryOffer response and returns the delivery to the unassigned queue for admin review. Only ASSIGNED deliveries can be rejected. deliveryId comes from my-upcoming; Captain ID is derived from staffAuth. No rejection-reason field is supported and no request body is required.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID from GET /api/delivery/my-upcoming.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 16
 *     responses:
 *       200:
 *         description: Rejection recorded; delivery is unassigned and visible to admins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Delivery rejected and returned to the unassigned queue
 *                 data:
 *                   $ref: '#/components/schemas/CaptainDelivery'
 *       400:
 *         description: Invalid delivery ID
 *       401:
 *         description: Captain authentication is required
 *       403:
 *         description: Delivery is not assigned to this Captain
 *       404:
 *         description: Delivery not found in the authenticated tenant
 *       409:
 *         description: Delivery has progressed beyond the eligible rejection state
 * /api/delivery/{deliveryId}/picked-up:
 *   post:
 *     summary: Confirm restaurant pickup
 *     description: deliveryId is from the Captain's current-deliveries response. Captain ownership and tenant are derived from staffAuth; no request body is required.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID from GET /api/delivery/my-current.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 16
 *     responses:
 *       200:
 *         description: Pickup confirmed; updated delivery returned.
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
 *         description: Captain authentication is required
 *       403:
 *         description: Delivery is not assigned to this Captain
 *       404:
 *         description: Delivery not found in the authenticated tenant
 *       409:
 *         description: Delivery is not in ACCEPTED status
 * /api/delivery/{deliveryId}/out-for-delivery:
 *   post:
 *     summary: Start delivery and enable tracking
 *     description: deliveryId is from the Captain's current-deliveries response. Captain ownership and tenant are derived from staffAuth; no request body is required.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID from GET /api/delivery/my-current.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 16
 *     responses:
 *       200:
 *         description: Delivery started; updated delivery returned.
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
 *         description: Captain authentication is required
 *       403:
 *         description: Delivery is not assigned to this Captain
 *       404:
 *         description: Delivery not found in the authenticated tenant
 *       409:
 *         description: Delivery is not PICKED_UP or its linked order is not READY
 * /api/delivery/{deliveryId}/location:
 *   post:
 *     summary: Record Captain GPS coordinates
 *     description: deliveryId is from the Captain's current-deliveries response. Ownership is checked against staffAuth. Coordinates are supplied in the request body.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID from GET /api/delivery/my-current.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 130
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 description: Current GPS latitude in decimal degrees.
 *                 example: 13.0827
 *               longitude:
 *                 type: number
 *                 description: Current GPS longitude in decimal degrees.
 *                 example: 80.2707
 *     responses:
 *       200:
 *         description: Location saved and current coordinates returned.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     deliveryId:
 *                       type: integer
 *                       example: 130
 *                     latitude:
 *                       type: string
 *                     longitude:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid deliveryId or coordinates
 *       401:
 *         description: Captain authentication is required
 *       403:
 *         description: Delivery is not assigned to this Captain
 *       404:
 *         description: Delivery not found in the authenticated tenant
 *       409:
 *         description: Delivery is not currently trackable
 * /api/delivery/{deliveryId}/arrived:
 *   post:
 *     summary: Mark delivery arrived
 *     description: deliveryId is from the Captain's current-deliveries response. Captain ownership and tenant are derived from staffAuth; no request body is required.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID from GET /api/delivery/my-current.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 16
 *     responses:
 *       200:
 *         description: Captain arrival recorded; updated delivery returned.
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
 *         description: Captain authentication is required
 *       403:
 *         description: Delivery is not assigned to this Captain
 *       404:
 *         description: Delivery not found in the authenticated tenant
 *       409:
 *         description: Delivery is not OUT_FOR_DELIVERY
 * /api/delivery/{deliveryId}/complete:
 *   post:
 *     summary: Complete an arrived delivery with customer OTP
 *     description: deliveryId is from the Captain's current-deliveries response. Captain ownership and tenant are derived from staffAuth; the customer's six-digit OTP must be supplied in the request body.
 *     tags: [Deliveries]
 *     security:
 *       - staffAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         description: Delivery record ID from GET /api/delivery/my-current.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 16
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp
 *             properties:
 *               otp:
 *                 type: string
 *                 description: Six-digit code sent to the order's delivery phone by POST /api/delivery/customer/{customerId}/{orderId}/otp.
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Delivery and linked order marked completed; updated delivery returned.
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
 *         description: Invalid OTP or request body
 *       401:
 *         description: Captain authentication is required
 *       403:
 *         description: Delivery is not assigned to this Captain
 *       404:
 *         description: Delivery not found in the authenticated tenant
 *       409:
 *         description: Delivery has not reached ARRIVED or linked order cannot be completed
 * /api/delivery/customer/{customerId}/{orderId}:
 *   get:
 *     summary: Get tracking for a customer's order delivery
 *     description: customerId is the authenticated customer's ID. orderId is the customer's Order record ID (not deliveryId); the server follows Order.delivery to find the delivery.
 *     tags: [Deliveries]
 *     security:
 *       - customerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         description: Customer profile ID from the authenticated customer profile; caller must match this ID.
 *         schema:
 *           type: integer
 *           example: 42
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: Customer Order ID from the customer order response.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 33
 *     responses:
 *       200:
 *         description: Delivery tracking for the specified order.
 *       401:
 *         description: Customer authentication is required
 *       404:
 *         description: Order or delivery not found for this customer and tenant
 * /api/delivery/customer/{customerId}/{orderId}/otp:
 *   post:
 *     summary: Send delivery completion OTP to the order phone
 *     description: orderId identifies the Customer Order; the backend verifies that it belongs to the authenticated customer and has an ARRIVED delivery.
 *     tags: [Deliveries]
 *     security:
 *       - customerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         description: Customer profile ID from the authenticated customer profile; caller must match this ID.
 *         schema:
 *           type: integer
 *           example: 38
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: Customer Order ID from the customer order response.
 *         schema:
 *           type: integer
 *           example: 33
 *     responses:
 *       200:
 *         description: Delivery verification code sent
 *       400:
 *         description: OTP could not be sent
 *       401:
 *         description: Customer authentication is required
 *       404:
 *         description: Order not found or delivery has not arrived
 */
router.get("/my-deliveries", requireCaptainAuth, getMyDeliveries);
router.get("/dashboard", requireCaptainAuth, getMyDashboard);
router.get("/my-current", requireCaptainAuth, getMyCurrentDeliveries);
router.get("/my-upcoming", requireCaptainAuth, getMyUpcomingDeliveries);
router.get("/completed", requireCaptainAuth, getMyCompletedDeliveries);
router.get("/admin", requireAdminAuth, validate(adminDeliveriesSchema), getAdminDeliveries);
router.get("/admin/:deliveryId", requireAdminAuth, validate(deliveryIdSchema), getAdminDelivery);
router.post("/:deliveryId/assign", requireAdminAuth, validate(assignDeliverySchema), assignDelivery);
router.get("/:deliveryId", requireCaptainAuth, validate(deliveryIdSchema), getCaptainDelivery);
router.post("/:deliveryId/accept", requireCaptainAuth, validate(deliveryIdSchema), acceptDelivery);
router.post("/:deliveryId/reject", requireCaptainAuth, validate(deliveryIdSchema), rejectDelivery);
router.post("/:deliveryId/picked-up", requireCaptainAuth, validate(deliveryIdSchema), pickUpDelivery);
router.post("/:deliveryId/out-for-delivery", requireCaptainAuth, validate(deliveryIdSchema), startDelivery);
router.post("/:deliveryId/location", requireCaptainAuth, validate(deliveryLocationSchema), updateDeliveryLocation);
router.post("/:deliveryId/arrived", requireCaptainAuth, validate(deliveryIdSchema), arriveDelivery);
router.post("/:deliveryId/complete", requireCaptainAuth, validate(completeDeliverySchema), completeDelivery);
router.get("/customer/:customerId/:orderId", requireCustomerAuth, validate(customerDeliverySchema), getCustomerDelivery);
router.post("/customer/:customerId/:orderId/otp", requireCustomerAuth, validate(customerDeliverySchema), sendDeliveryOtp);

export default router;