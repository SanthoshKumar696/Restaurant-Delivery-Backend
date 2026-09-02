import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  getDashboardReport as getDashboardReportService,
  getSalesReport as getSalesReportService,
  getOrderReport as getOrderReportService,
  getCustomerReport as getCustomerReportService,
  getBranchReport as getBranchReportService,
  getProductReport as getProductReportService,
} from "./report.service";

const getFilters = (req: Request) => {
  const { tenantId, branchId, fromDate, toDate } =
    req.query;

  return {
    tenantId: tenantId
      ? String(tenantId)
      : undefined,

    branchId: branchId
      ? String(branchId)
      : undefined,

    fromDate: fromDate
      ? new Date(String(fromDate))
      : undefined,

    toDate: toDate
      ? new Date(String(toDate))
      : undefined,
  };
};


// =====================================================
// DASHBOARD
// =====================================================

export const getDashboardReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const report =
      await getDashboardReportService(
        getFilters(req)
      );

    return res.status(200).json({
      success: true,
      message: "Dashboard report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};


// =====================================================
// SALES
// =====================================================

export const getSalesReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const report =
      await getSalesReportService(
        getFilters(req)
      );

    return res.status(200).json({
      success: true,
      message: "Sales report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};


// =====================================================
// ORDERS
// =====================================================

export const getOrderReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const report =
      await getOrderReportService(
        getFilters(req)
      );

    return res.status(200).json({
      success: true,
      message: "Order report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};


// =====================================================
// CUSTOMERS
// =====================================================

export const getCustomerReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const report =
      await getCustomerReportService(
        getFilters(req)
      );

    return res.status(200).json({
      success: true,
      message: "Customer report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};


// =====================================================
// BRANCHES
// =====================================================

export const getBranchReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const report =
      await getBranchReportService(
        getFilters(req)
      );

    return res.status(200).json({
      success: true,
      message: "Branch report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};


// =====================================================
// PRODUCTS
// =====================================================

export const getProductReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const report =
      await getProductReportService(
        getFilters(req)
      );

    return res.status(200).json({
      success: true,
      message: "Product report fetched successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};