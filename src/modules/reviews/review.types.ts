export type ReviewStatusValue = "PENDING" | "APPROVED" | "REJECTED";

export interface CreateReviewInput {
  orderId: number;
  productId: number;
  rating: number;
  comment?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}

export interface ProductReviewSummaryItem {
  id: number;
  rating: number;
  comment: string | null;
  customer: {
    id: number;
    name: string | null;
  };
  createdAt: Date;
}

export interface ProductReviewSummary {
  productId: number;
  averageRating: number;
  totalReviews: number;
  reviews: ProductReviewSummaryItem[];
}
