export interface AdminSignupInput {
  username: string;
  password: string;
  name: string;
  tenantId: string;
}

export interface AdminLoginInput {
  username: string;
  password: string;
}

export interface AdminSafeOutput {
  id: number;
  username: string;
  name: string;
  tenantId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAuthTokenPayload {
  adminId: number;
  username: string;
  tenantId: string;
  role: "ADMIN";
}
