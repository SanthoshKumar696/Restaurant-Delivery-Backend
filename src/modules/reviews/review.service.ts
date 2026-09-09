import { prisma } from "../../database/prisma";
import { logger } from "../../common/logger/logger";

import { CreateReviewInput, ProductReviewSummary, UpdateReviewInput } from "./review.types";

const REVIEW_COMMENT_MAX_LENGTH = 1000;

const normalizeComment = (comment?: string | null) => {
  if (comment === undefined || comment === null) {
    return null;
  }

  const trimmed = comment.trim();

  if (!trimmed) {
    throw new Error("INVALID_REVIEW_COMMENT");
  }

  if (trimmed.length > REVIEW_COMMENT_MAX_LENGTH) {
    throw new Error("INVALID_REVIEW_COMMENT");
  }

  return trimmed;
};

const normalizeRating = (rating: number) => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("INVALID_RATING");
  }

  return rating;
};

export const createReview = async (customerId: number, tenantId: string, input: CreateReviewInput) => {
  const rating = normalizeRating(input.rating);
  const comment = normalizeComment(input.comment);

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { orderItems: true },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.tenantId !== tenantId) {
    throw new Error("TENANT_ACCESS_DENIED");
  }

  if (order.customerId !== customerId) {
    throw new Error("CUSTOMER_NOT_ORDER_OWNER");
  }

  if (order.status !== "COMPLETED") {
    throw new Error("ORDER_NOT_COMPLETED");
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  if (product.tenantId !== tenantId) {
    throw new Error("TENANT_ACCESS_DENIED");
  }

  const productInOrder = order.orderItems.some((item) => item.productId === input.productId);
  if (!productInOrder) {
    throw new Error("PRODUCT_NOT_IN_ORDER");
  }

  const existingReview = await prisma.review.findFirst({
    where: {
      tenantId,
      customerId,
      orderId: input.orderId,
      productId: input.productId,
    },
  });

  if (existingReview) {
    throw new Error("REVIEW_ALREADY_EXISTS");
  }

  const review = await prisma.review.create({
    data: {
      tenantId,
      customerId,
      orderId: input.orderId,
      productId: input.productId,
      branchId: order.branchId,
      rating,
      comment,
      status: "APPROVED",
    },
    include: {
      product: {
        select: { id: true, name: true },
      },
      order: {
        select: { id: true, orderNumber: true },
      },
    },
  });

  logger.info(`[Reviews] Review created for customer ${customerId}, order ${input.orderId}, product ${input.productId}`);

  return review;
};

export const getProductReviewsPublic = async (tenantId: string, productId: number, page = 1, limit = 10): Promise<ProductReviewSummary> => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const [stats, reviews] = await Promise.all([
    prisma.review.aggregate({
      where: {
        tenantId,
        productId,
        status: "APPROVED",
      },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.review.findMany({
      where: {
        tenantId,
        productId,
        status: "APPROVED",
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    }),
  ]);

  return {
    productId,
    averageRating: stats._avg.rating === null ? 0 : Number(Number(stats._avg.rating).toFixed(2)),
    totalReviews: stats._count.id,
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      customer: {
        id: review.customer.id,
        name: review.customer.fullName,
      },
      createdAt: review.createdAt,
    })),
  };
};

export const getCustomerReviews = async (customerId: number, tenantId: string) => {
  const reviews = await prisma.review.findMany({
    where: {
      tenantId,
      customerId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: { id: true, name: true },
      },
      order: {
        select: { id: true, orderNumber: true },
      },
    },
  });

  return reviews;
};

export const getReviewByIdForCustomer = async (customerId: number, tenantId: string, reviewId: number) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      product: { select: { id: true, name: true } },
      order: { select: { id: true, orderNumber: true } },
      customer: { select: { id: true, fullName: true } },
    },
  });

  if (!review) {
    throw new Error("REVIEW_NOT_FOUND");
  }

  if (review.tenantId !== tenantId || review.customerId !== customerId) {
    throw new Error("REVIEW_NOT_ALLOWED");
  }

  return review;
};

export const updateReview = async (customerId: number, tenantId: string, reviewId: number, input: UpdateReviewInput) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("REVIEW_NOT_FOUND");
  }

  if (review.tenantId !== tenantId || review.customerId !== customerId) {
    throw new Error("REVIEW_NOT_ALLOWED");
  }

  const nextRating = input.rating !== undefined ? normalizeRating(input.rating) : review.rating;
  const nextComment = input.comment !== undefined ? normalizeComment(input.comment) : review.comment;

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      rating: nextRating,
      comment: nextComment,
      status: "APPROVED",
    },
  });

  logger.info(`[Reviews] Review ${reviewId} updated by customer ${customerId}`);

  return updatedReview;
};

export const deleteReview = async (customerId: number, tenantId: string, reviewId: number) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("REVIEW_NOT_FOUND");
  }

  if (review.tenantId !== tenantId || review.customerId !== customerId) {
    throw new Error("REVIEW_NOT_ALLOWED");
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: "REJECTED",
    },
  });

  logger.info(`[Reviews] Review ${reviewId} hidden by customer ${customerId}`);

  return updatedReview;
};

export const getAdminReviews = async (tenantId: string, filters: {
  productId?: number;
  customerId?: number;
  rating?: number;
  status?: string;
  orderId?: number;
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    tenantId,
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.rating !== undefined ? { rating: filters.rating } : {}),
    ...(filters.status ? { status: filters.status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
    ...(filters.orderId ? { orderId: filters.orderId } : {}),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, fullName: true } },
        product: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    page,
    limit,
    total,
    reviews,
  };
};

export const getAdminReviewById = async (tenantId: string, reviewId: number) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      customer: { select: { id: true, fullName: true } },
      product: { select: { id: true, name: true } },
      order: { select: { id: true, orderNumber: true } },
    },
  });

  if (!review) {
    throw new Error("REVIEW_NOT_FOUND");
  }

  if (review.tenantId !== tenantId) {
    throw new Error("TENANT_ACCESS_DENIED");
  }

  return review;
};

export const updateAdminReviewStatus = async (tenantId: string, reviewId: number, status: "PENDING" | "APPROVED" | "REJECTED") => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("REVIEW_NOT_FOUND");
  }

  if (review.tenantId !== tenantId) {
    throw new Error("TENANT_ACCESS_DENIED");
  }

  if (!(["PENDING", "APPROVED", "REJECTED"] as const).includes(status)) {
    throw new Error("INVALID_REVIEW_STATUS");
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: { status },
  });

  logger.info(`[Reviews] Review ${reviewId} moderation status changed to ${status} by admin in tenant ${tenantId}`);

  return updatedReview;
};

export const deleteAdminReview = async (tenantId: string, reviewId: number) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new Error("REVIEW_NOT_FOUND");
  }

  if (review.tenantId !== tenantId) {
    throw new Error("TENANT_ACCESS_DENIED");
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: { status: "REJECTED" },
  });

  logger.info(`[Reviews] Review ${reviewId} deleted/rejected by admin for tenant ${tenantId}`);

  return updatedReview;
};
