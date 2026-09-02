import { Router } from "express";

import { requireAdminAuth } from "../../middlewares/admin-auth.middleware";

import {
  getDashboardReport,
  getSalesReport,
  getOrderReport,
  getCustomerReport,
  getBranchReport,
  getProductReport,
} from "./report.controller";

const router = Router();

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Get dashboard report
 *     description: Returns overall restaurant dashboard statistics.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         example: T001
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         example: B001
 *     responses:
 *       200:
 *         description: Dashboard report fetched successfully
 */
router.get("/dashboard", requireAdminAuth, getDashboardReport);


/**
 * @swagger
 * /api/reports/sales:
 *   get:
 *     summary: Get sales report
 *     description: Returns sales and order financial summary.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         example: T001
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         example: B001
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-01
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-31
 *     responses:
 *       200:
 *         description: Sales report fetched successfully
 */
router.get("/sales", requireAdminAuth, getSalesReport);


/**
 * @swagger
 * /api/reports/orders:
 *   get:
 *     summary: Get order report
 *     description: Returns order counts grouped by status.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         example: T001
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         example: B001
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-01
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-31
 *     responses:
 *       200:
 *         description: Order report fetched successfully
 */
router.get("/orders", requireAdminAuth, getOrderReport);


/**
 * @swagger
 * /api/reports/customers:
 *   get:
 *     summary: Get customer report
 *     description: Returns customer statistics.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         example: T001
 *     responses:
 *       200:
 *         description: Customer report fetched successfully
 */
router.get("/customers", requireAdminAuth, getCustomerReport);


/**
 * @swagger
 * /api/reports/branches:
 *   get:
 *     summary: Get branch report
 *     description: Returns branch-wise order and sales statistics.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         example: T001
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-01
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-31
 *     responses:
 *       200:
 *         description: Branch report fetched successfully
 */
router.get("/branches", requireAdminAuth, getBranchReport);


/**
 * @swagger
 * /api/reports/products:
 *   get:
 *     summary: Get product report
 *     description: Returns product-wise quantity sold and sales.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         example: T001
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         example: B001
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-01
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-08-31
 *     responses:
 *       200:
 *         description: Product report fetched successfully
 */
router.get("/products", requireAdminAuth, getProductReport);

export default router;