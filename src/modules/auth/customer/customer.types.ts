export interface SendOtpInput {
  phone?: string;
  mobileNumber?: string;
  tenantId?: string;
}

export interface VerifyOtpInput {
  phone?: string;
  mobileNumber?: string;
  otp: string;
  tenantId?: string;
}

export interface ResendOtpInput {
  phone?: string;
  mobileNumber?: string;
  tenantId?: string;
}

export interface CustomerAuthTokenPayload {
  customerId: number;
  mobileNumber: string;
  tenantId: string;
  role: "CUSTOMER";
}

export interface CustomerSafeOutput {
  id: number;
  mobileNumber: string;
  fullName: string | null;
  email: string | null;
  tenantId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
