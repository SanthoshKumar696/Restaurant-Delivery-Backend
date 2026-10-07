declare global {
  namespace Express {
    interface Request {
      admin?: {
        adminId: number;
        username: string;
        tenantId: string;
        role: "ADMIN";
      };
      customer?: {
        customerId: number;
        mobileNumber: string;
        tenantId: string;
        role: "CUSTOMER";
      };
      staff?: {
        staffId: number;
        tenantId: string;
        role: import("@prisma/client").StaffRole;
      };
    }
  }
}

export {};
