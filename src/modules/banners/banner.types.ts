export interface CreateBannerInput {
  tenantId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  offerText?: string;
  couponCode?: string;
  startDate?: Date;
  endDate?: Date;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateBannerInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  offerText?: string;
  couponCode?: string;
  startDate?: Date;
  endDate?: Date;
  displayOrder?: number;
  isActive?: boolean;
}

export interface BannerResponse {
  id: number;
  tenantId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  offerText?: string;
  couponCode?: string;
  startDate?: Date;
  endDate?: Date;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicBannerResponse {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  offerText?: string;
  couponCode?: string;
  displayOrder: number;
}
