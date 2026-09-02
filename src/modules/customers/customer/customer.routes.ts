import { Router } from "express";

import { requireAdminAuth } from "../../../middlewares/admin-auth.middleware";
import { requireCustomerAuth } from "../../../middlewares/customer-auth.middleware";

import {
  createCustomer,
  getAllCustomers,
  getCustomersByTenant,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerProfile,
  updateCustomerProfile,
} from "./customer.controller";
import { customerIdSchema, updateCustomerProfileSchema } from "./customer.validation";
import { validate } from "../../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     description: Creates a customer under a tenant (Admin CRM operation).
 *     tags:
 *       - Admin CRM
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - phone
 *             properties:
 *               tenantId:
 *                 type: string
 *                 example: T001
 *               fullName:
 *                 type: string
 *                 example: Santhosh Kumar
 *               phone:
 *                 type: string
 *                 example: "919876543210"
 *               email:
 *                 type: string
 *                 example: customer@example.com
 *               referralCode:
 *                 type: string
 *                 example: REF001
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Tenant not found
 */
router.post("/", requireAdminAuth, createCustomer);

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers
 *     description: Returns all customers (Admin CRM operation).
 *     tags:
 *       - Admin CRM
 *     responses:
 *       200:
 *         description: Customers fetched successfully
 */
router.get("/", requireAdminAuth, getAllCustomers);

/**
 * @swagger
 * /api/customers/tenant/{tenantId}:
 *   get:
 *     summary: Get customers by tenant
 *     description: Returns all customers belonging to a specific tenant (Admin CRM operation).
 *     tags:
 *       - Admin CRM
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Tenant customers fetched successfully
 *       404:
 *         description: Tenant not found
 */
router.get(
  "/tenant/:tenantId",
  requireAdminAuth,
  getCustomersByTenant
);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     description: Returns a single customer (Admin CRM operation).
 *     tags:
 *       - Admin CRM
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Customer fetched successfully
 *       404:
 *         description: Customer not found
 */
router.get("/:id", requireAdminAuth, getCustomerById);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update customer
 *     description: Updates customer information (Admin CRM operation).
 *     tags:
 *       - Admin CRM
 *     parameters:
 *       - in: path
 *         name: id
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
 *               fullName:
 *                 type: string
 *                 example: Updated Customer
 *               phone:
 *                 type: string
 *                 example: "919876543210"
 *               email:
 *                 type: string
 *                 example: updated@example.com
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 */
router.put("/:id", requireAdminAuth, updateCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Deactivate customer
 *     description: Soft deletes a customer by setting isActive to false (Admin CRM operation).
 *     tags:
 *       - Admin CRM
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Customer deactivated successfully
 *       404:
 *         description: Customer not found
 */
router.delete("/:id", requireAdminAuth, deleteCustomer);


/**
 * @swagger
 * /api/customers/{id}/profile:
 *   get:
 *     summary: Get customer profile
 *     description: Returns the profile information of a customer (requires customer authentication).
 *     tags:
 *       - Customer App
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Customer ID
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Customer profile fetched successfully
 *       401:
 *         description: Unauthorized - customer token required
 *       404:
 *         description: Customer not found
 */
router.get(
  "/:id/profile",
  requireCustomerAuth,
  validate(customerIdSchema),
  getCustomerProfile
);

/**
 * @swagger
 * /api/customers/{id}/profile:
 *   put:
 *     summary: Update customer profile
 *     description: Updates customer name, email and date of birth.
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
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Santhosh Kumar
 *               email:
 *                 type: string
 *                 format: email
 *                 example: santhosh@example.com
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: 1995-08-15
 *     responses:
 *       200:
 *         description: Customer profile updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized - customer token required
 *       404:
 *         description: Customer not found
 */
router.put(
  "/:id/profile",
  requireCustomerAuth,
  validate(updateCustomerProfileSchema),
  updateCustomerProfile
);

export default router;