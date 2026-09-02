import jwt, { type SignOptions } from "jsonwebtoken";

import { logger } from "../../../common/logger/logger";
import { prisma } from "../../../database/prisma";
import { smsService } from "../../../integrations/sms";
import {
  CustomerAuthTokenPayload,
  CustomerSafeOutput,
  ResendOtpInput,
  SendOtpInput,
  VerifyOtpInput,
} from "./customer.types";

const DEFAULT_TENANT_ID = "T001";

const normalizePhone = (value?: string): string => {
  const raw = value || "";
  const sanitized = raw.replace(/[\s()-]/g, "");
  const compact = sanitized.startsWith("+") ? sanitized.slice(1) : sanitized;

  if (compact.startsWith("91") && compact.length === 12) {
    return compact.slice(2);
  }

  if (compact.startsWith("0") && compact.length === 11) {
    return compact.slice(1);
  }

  return compact;
};

const normalizeSmsPhone = (value?: string): string => {
  const raw = normalizePhone(value);
  return raw.length === 10 ? `91${raw}` : `91${raw.replace(/^91/, "")}`;
};

const maskPhoneNumber = (phone?: string): string => {
  if (!phone) {
    return "***";
  }

  const normalized = normalizePhone(phone);

  if (normalized.length < 4) {
    return "***";
  }

  return `${normalized.slice(0, 2)}******${normalized.slice(-2)}`;
};

const resolveTenantId = (tenantId?: string) => tenantId || DEFAULT_TENANT_ID;

const sanitizeCustomer = (customer: {
  id: number;
  mobileNumber: string;
  fullName: string | null;
  email: string | null;
  tenantId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CustomerSafeOutput => ({
  id: customer.id,
  mobileNumber: customer.mobileNumber,
  fullName: customer.fullName,
  email: customer.email,
  tenantId: customer.tenantId,
  isActive: customer.isActive,
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
});

const getCustomerPhone = (data: { phone?: string; mobileNumber?: string }) => {
  return normalizePhone(data.phone || data.mobileNumber);
};

export const sendOtp = async (data: SendOtpInput): Promise<{ message: string }> => {
  const tenantId = resolveTenantId(data.tenantId);
  const phone = getCustomerPhone(data);
  const normalizedSmsPhone = normalizeSmsPhone(phone);
  const maskedPhone = maskPhoneNumber(phone);

  logger.info(`[Customer OTP] Send OTP requested for tenant ${tenantId}`);
  logger.info(`[Customer OTP] tenantId received: ${tenantId}`);
  logger.info(`[Customer OTP] Phone number received: ${maskedPhone}`);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    logger.error(`[Customer OTP] Tenant not found for tenantId ${tenantId}`);
    throw new Error("Tenant not found");
  }

  if (!/^\d{10}$/.test(phone) || !/^[6-9]/.test(phone)) {
    logger.warn(`[Customer OTP] Invalid phone number format for tenant ${tenantId}: ${maskedPhone}`);
    throw new Error("Invalid phone number format");
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: {
      phone,
      tenantId,
    },
  });

  if (existingCustomer) {
    logger.info(`[Customer OTP] Customer lookup result: existing customer found for tenant ${tenantId} and phone ${maskedPhone}`);
  } else {
    logger.info(`[Customer OTP] Customer lookup result: no existing customer found; new customer will be created during verification`);
  }

  logger.info(`[2Factor][SendOTP] OTP request started for tenant ${tenantId} and phone ${maskedPhone}`);

  try {
    const result = await smsService.sendOtp(normalizedSmsPhone, tenantId);

    if (!result.success) {
      logger.error(
        {
          message: result.message,
        },
        `[Customer OTP] OTP send failure for tenant ${tenantId} and phone ${maskedPhone}`
      );
      throw new Error(result.message);
    }

    logger.info(`[Customer OTP] OTP send successful for tenant ${tenantId} and phone ${maskedPhone}`);
    return {
      message: "OTP sent successfully",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error(
      {
        tenantId,
        phone: maskedPhone,
        message,
        stack,
      },
      `[Customer OTP] Error details and stack trace`
    );

    throw error;
  }
};

export const verifyOtp = async (data: VerifyOtpInput) => {
  const tenantId = resolveTenantId(data.tenantId);
  const phone = getCustomerPhone(data);
  const maskedPhone = maskPhoneNumber(phone);

  logger.info(`[Customer OTP] Verify OTP requested for tenant ${tenantId}`);
  logger.info(`[Customer OTP] tenantId: ${tenantId}`);
  logger.info(`[Customer OTP] Masked phone number: ${maskedPhone}`);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    logger.error(`[Customer OTP] Tenant not found for tenantId ${tenantId}`);
    throw new Error("Tenant not found");
  }

  if (!/^\d{10}$/.test(phone) || !/^[6-9]/.test(phone)) {
    logger.warn(`[Customer OTP] Invalid phone number for tenant ${tenantId}: ${maskedPhone}`);
    throw new Error("Invalid phone number");
  }

  const trimmedOtp = data.otp.trim();

  if (!/^[0-9]{4,6}$/.test(trimmedOtp)) {
    logger.warn(`[Customer OTP] Invalid OTP format for tenant ${tenantId} and phone ${maskedPhone}`);
    throw new Error("Invalid OTP");
  }

  const hasActiveSession = smsService.hasActiveSession(phone, tenantId);
  logger.info(`[Customer OTP] OTP verification started`);
  logger.info(`[Customer OTP] Session ID presence: ${hasActiveSession ? "present" : "missing"}`);

  try {
    const verificationResult = await smsService.verifyOtp(phone, trimmedOtp, tenantId);

    if (!verificationResult.success) {
      logger.warn(
        {
          message: verificationResult.message,
        },
        `[Customer OTP] OTP verification failed for tenant ${tenantId} and phone ${maskedPhone}`
      );
      throw new Error(verificationResult.message);
    }

    logger.info(`[Customer OTP] OTP verification successful for tenant ${tenantId} and phone ${maskedPhone}`);

    let customer = await prisma.customer.findFirst({
      where: {
        phone,
        tenantId,
      },
    });

    if (customer) {
      logger.info(`[Customer OTP] Customer lookup result: existing customer found for tenant ${tenantId} and phone ${maskedPhone}`);
    } else {
      logger.info(`[Customer OTP] Customer lookup result: customer not found; new customer will be created for tenant ${tenantId}`);
      customer = await prisma.customer.create({
        data: {
          phone,
          tenantId,
          fullName: null,
          email: null,
          isActive: true,
        },
      });
    }

    if (!customer.isActive) {
      logger.warn(`[Customer OTP] Customer account is inactive for tenant ${tenantId} and phone ${maskedPhone}`);
      throw new Error("Customer account is inactive");
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error(`[Customer OTP] JWT secret missing while creating token for tenant ${tenantId}`);
      throw new Error("JWT secret is not configured");
    }

    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const payload: CustomerAuthTokenPayload = {
      customerId: customer.id,
      mobileNumber: customer.phone,
      tenantId: customer.tenantId,
      role: "CUSTOMER",
    };

    const signOptions: SignOptions = {
      expiresIn: jwtExpiresIn as SignOptions["expiresIn"],
    };

    const token = jwt.sign(payload, jwtSecret, signOptions);
    logger.info(`[Customer OTP] JWT generated successfully for customerId ${customer.id}`);

    smsService.clearSession(phone, tenantId);
    logger.info(`[Customer OTP] Final authentication success for customerId ${customer.id}`);

    return {
      token,
      customer: sanitizeCustomer({
        id: customer.id,
        mobileNumber: customer.phone,
        fullName: customer.fullName,
        email: customer.email,
        tenantId: customer.tenantId,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      }),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to verify OTP";
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error(
      {
        tenantId,
        phone: maskedPhone,
        message,
        stack,
      },
      `[CustomerAuth][VerifyOTP] Error details and stack trace`
    );

    throw error;
  }
};

export const resendOtp = async (data: ResendOtpInput): Promise<{ message: string }> => {
  const tenantId = resolveTenantId(data.tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const phone = getCustomerPhone(data);

  if (!/^\d{10}$/.test(phone) || !/^[6-9]/.test(phone)) {
    throw new Error("Invalid phone number format");
  }

  const result = await smsService.resendOtp(phone);

  if (!result.success) {
    throw new Error(result.message);
  }

  return {
    message: "OTP resent successfully",
  };
};
