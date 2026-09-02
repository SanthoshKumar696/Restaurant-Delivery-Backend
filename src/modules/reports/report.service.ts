import { prisma } from "../../database/prisma";
import { ReportDateFilter } from "./report.types";

// =====================================================
// DASHBOARD SUMMARY
// =====================================================

export const getDashboardReport = async (
  filters: ReportDateFilter
) => {
  const orderWhere: any = {};

  if (filters.tenantId) {
    orderWhere.tenantId = filters.tenantId;
  }

  if (filters.branchId) {
    orderWhere.branchId = filters.branchId;
  }

  if (filters.fromDate || filters.toDate) {
    orderWhere.createdAt = {};

    if (filters.fromDate) {
      orderWhere.createdAt.gte = filters.fromDate;
    }

    if (filters.toDate) {
      orderWhere.createdAt.lte = filters.toDate;
    }
  }

  const [
    totalOrders,
    totalCustomers,
    totalBranches,
    orderSales,
  ] = await Promise.all([
    prisma.order.count({
      where: orderWhere,
    }),

    prisma.customer.count({
      where: {
        ...(filters.tenantId
          ? { tenantId: filters.tenantId }
          : {}),
      },
    }),

    prisma.branch.count({
      where: {
        ...(filters.tenantId
          ? { tenantId: filters.tenantId }
          : {}),
      },
    }),

    prisma.order.aggregate({
      where: orderWhere,
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  return {
    totalOrders,
    totalCustomers,
    totalBranches,
    totalSales: orderSales._sum.totalAmount ?? 0,
  };
};


// =====================================================
// SALES REPORT
// =====================================================

export const getSalesReport = async (
  filters: ReportDateFilter
) => {
  const where: any = {};

  if (filters.tenantId) {
    where.tenantId = filters.tenantId;
  }

  if (filters.branchId) {
    where.branchId = filters.branchId;
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};

    if (filters.fromDate) {
      where.createdAt.gte = filters.fromDate;
    }

    if (filters.toDate) {
      where.createdAt.lte = filters.toDate;
    }
  }

  const result = await prisma.order.aggregate({
    where,
    _count: {
      id: true,
    },
    _sum: {
      subtotal: true,
      discountAmount: true,
      packagingCharge: true,
      deliveryCharge: true,
      cgstAmount: true,
      sgstAmount: true,
      igstAmount: true,
      totalAmount: true,
    },
  });

  return {
    totalOrders: result._count.id,
    subtotal: result._sum.subtotal ?? 0,
    discountAmount: result._sum.discountAmount ?? 0,
    packagingCharge: result._sum.packagingCharge ?? 0,
    deliveryCharge: result._sum.deliveryCharge ?? 0,
    cgstAmount: result._sum.cgstAmount ?? 0,
    sgstAmount: result._sum.sgstAmount ?? 0,
    igstAmount: result._sum.igstAmount ?? 0,
    totalSales: result._sum.totalAmount ?? 0,
  };
};


// =====================================================
// ORDER REPORT
// =====================================================

export const getOrderReport = async (
  filters: ReportDateFilter
) => {
  const where: any = {};

  if (filters.tenantId) {
    where.tenantId = filters.tenantId;
  }

  if (filters.branchId) {
    where.branchId = filters.branchId;
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};

    if (filters.fromDate) {
      where.createdAt.gte = filters.fromDate;
    }

    if (filters.toDate) {
      where.createdAt.lte = filters.toDate;
    }
  }

  const orders = await prisma.order.groupBy({
    by: ["status"],
    where,
    _count: {
      id: true,
    },
  });

  return orders.map((item) => ({
    status: item.status,
    count: item._count.id,
  }));
};


// =====================================================
// CUSTOMER REPORT
// =====================================================

export const getCustomerReport = async (
  filters: ReportDateFilter
) => {
  const where: any = {};

  if (filters.tenantId) {
    where.tenantId = filters.tenantId;
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};

    if (filters.fromDate) {
      where.createdAt.gte = filters.fromDate;
    }

    if (filters.toDate) {
      where.createdAt.lte = filters.toDate;
    }
  }

  const [totalCustomers, activeCustomers, newCustomers] =
    await Promise.all([
      prisma.customer.count({
        where,
      }),

      prisma.customer.count({
        where: {
          ...where,
          isActive: true,
        },
      }),

      prisma.customer.count({
        where,
      }),
    ]);

  return {
    totalCustomers,
    activeCustomers,
    newCustomers,
  };
};


// =====================================================
// BRANCH REPORT
// =====================================================

export const getBranchReport = async (
  filters: ReportDateFilter
) => {
  const branchWhere: any = {};

  if (filters.tenantId) {
    branchWhere.tenantId = filters.tenantId;
  }

  const branches = await prisma.branch.findMany({
    where: branchWhere,
    select: {
      id: true,
      tenantId: true,
      name: true,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const reports = await Promise.all(
    branches.map(async (branch) => {
      const orderWhere: any = {
        branchId: branch.id,
      };

      if (filters.fromDate || filters.toDate) {
        orderWhere.createdAt = {};

        if (filters.fromDate) {
          orderWhere.createdAt.gte = filters.fromDate;
        }

        if (filters.toDate) {
          orderWhere.createdAt.lte = filters.toDate;
        }
      }

      const result = await prisma.order.aggregate({
        where: orderWhere,
        _count: {
          id: true,
        },
        _sum: {
          totalAmount: true,
        },
      });

      return {
        branchId: branch.id,
        branchName: branch.name,
        tenantId: branch.tenantId,
        isActive: branch.isActive,
        totalOrders: result._count.id,
        totalSales: result._sum.totalAmount ?? 0,
      };
    })
  );

  return reports;
};


// =====================================================
// PRODUCT REPORT
// =====================================================

export const getProductReport = async (
  filters: ReportDateFilter
) => {
  const orderWhere: any = {};

  if (filters.tenantId) {
    orderWhere.tenantId = filters.tenantId;
  }

  if (filters.branchId) {
    orderWhere.branchId = filters.branchId;
  }

  if (filters.fromDate || filters.toDate) {
    orderWhere.createdAt = {};

    if (filters.fromDate) {
      orderWhere.createdAt.gte = filters.fromDate;
    }

    if (filters.toDate) {
      orderWhere.createdAt.lte = filters.toDate;
    }
  }

  const items = await prisma.orderItem.findMany({
    where: {
      order: orderWhere,
    },
    select: {
      productId: true,
      productNameSnapshot: true,
      quantity: true,
      lineTotal: true,
    },
  });

  const productMap = new Map<
    number,
    {
      productId: number;
      productName: string;
      quantitySold: number;
      totalSales: number;
    }
  >();

  for (const item of items) {
    // productId can be null, so skip those items
    if (item.productId === null) {
      continue;
    }

    const existing = productMap.get(item.productId);

    if (existing) {
      existing.quantitySold += item.quantity;
      existing.totalSales += Number(item.lineTotal);
    } else {
      productMap.set(item.productId, {
        productId: item.productId,
        productName: item.productNameSnapshot,
        quantitySold: item.quantity,
        totalSales: Number(item.lineTotal),
      });
    }
  }

  return Array.from(productMap.values()).sort(
    (a, b) => b.quantitySold - a.quantitySold
  );
};