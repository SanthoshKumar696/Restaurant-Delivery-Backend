import { Router } from "express";

import { requireCustomerAuth } from "../../../middlewares/customer-auth.middleware";
import { validate } from "../../../middlewares/validate.middleware";

import {
  createAddress,
  getCustomerAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "./address.controller";

import {
  customerId as customerIdSchema,
  addressIdSchema,
  createAddressSchema,
  updateAddressSchema,
} from "./address.validation";

const router = Router();

/**
 * @swagger
 * /api/customers/{id}/addresses:
 *   post:
 *     summary: Add customer address
 *     description: Adds a new saved address for a customer.
 *     tags:
 *       - Customer App
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Customer ID
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - addressLine
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               label:
 *                 type: string
 *                 example: Home
 *               addressLine:
 *                 type: string
 *                 example: 123 Main Street
 *               landmark:
 *                 type: string
 *                 example: Near Bus Stand
 *               latitude:
 *                 type: number
 *                 example: 12.9716
 *               longitude:
 *                 type: number
 *                 example: 77.5946
 *               isDefault:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Address created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized - customer token required
 *       404:
 *         description: Customer not found
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/addresses",
  requireCustomerAuth,
  validate(createAddressSchema),
  createAddress
);

/**
 * @swagger
 * /api/customers/{id}/addresses:
 *   get:
 *     summary: Get customer addresses
 *     description: Returns all saved addresses belonging to a customer.
 *     tags:
 *       - Customer App
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Addresses fetched successfully
 *       401:
 *         description: Unauthorized - customer token required
 *       404:
 *         description: Customer not found
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/addresses",
  requireCustomerAuth,
  validate(customerIdSchema),
  getCustomerAddresses
);

/**
 * @swagger
 * /api/customers/{id}/addresses/{addressId}:
 *   get:
 *     summary: Get customer address
 *     description: Returns one saved address belonging to the customer.
 *     tags:
 *       - Customer App
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Address fetched successfully
 *       401:
 *         description: Unauthorized - customer token required
 *       404:
 *         description: Address not found
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/address/:id",
  requireCustomerAuth,
  validate(addressIdSchema),
  getAddressById
);

/**
 * @swagger
 * /api/customers/{id}/addresses/{addressId}:
 *   put:
 *     summary: Update customer address
 *     description: Updates a saved customer address.
 *     tags:
 *       - Customer App
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *                 example: Office
 *               addressLine:
 *                 type: string
 *                 example: 456 Business Road
 *               landmark:
 *                 type: string
 *                 example: Near Metro Station
 *               latitude:
 *                 type: number
 *                 example: 13.0827
 *               longitude:
 *                 type: number
 *                 example: 80.2707
 *               isDefault:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       401:
 *         description: Unauthorized - customer token required
 *       404:
 *         description: Address not found
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id/addresses/:addressId",
  requireCustomerAuth,
  validate(updateAddressSchema),
  updateAddress
);

/**
 * @swagger
 * /api/customers/{id}/addresses/{addressId}:
 *   delete:
 *     summary: Delete customer address
 *     description: Permanently deletes a saved customer address.
 *     tags:
 *       - Customer App
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: confirm
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       401:
 *         description: Unauthorized - customer token required
 *       404:
 *         description: Address not found
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/address/:id",
  requireCustomerAuth,
  validate(addressIdSchema),
  deleteAddress
);

/**
 * @swagger
 * /api/customers/{id}/addresses/{addressId}/default:
 *   patch:
 *     summary: Set default customer address
 *     description: Makes the selected address the customer's default address.
 *     tags:
 *       - Customer App
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: Default address updated successfully
 *       404:
 *         description: Address not found
 */
router.patch(
  "/:id/addresses/:addressId/default",
  validate(addressIdSchema),
  setDefaultAddress
);

export default router;