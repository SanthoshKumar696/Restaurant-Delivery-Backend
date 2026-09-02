import { Request, Response } from "express";

import { logger } from "../../../common/logger/logger";
import { resendOtp, sendOtp, verifyOtp } from "./customer.service";
import { ResendOtpInput, SendOtpInput, VerifyOtpInput } from "./customer.types";
import { successResponse, errorResponse } from "../../../utils/response";

const maskPhoneNumber = (phone?: string): string => {
  if (!phone) {
    return "***";
  }

  const normalized = phone.replace(/\D/g, "");

  if (normalized.length < 4) {
    return "***";
  }

  return `${normalized.slice(0, 2)}******${normalized.slice(-2)}`;
};

export const sendOtpController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data: SendOtpInput = req.body;
    const tenantId = data.tenantId || "T001";
    const maskedPhone = maskPhoneNumber(data.phone || data.mobileNumber);

    logger.info(`[CustomerAuth][SendOTP] Request received for tenant ${tenantId} and phone ${maskedPhone}`);

    const result = await sendOtp(data);

    successResponse(res, "OTP sent successfully", result, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error(
      {
        message,
        stack,
      },
      `[CustomerAuth][SendOTP] OTP send failed`
    );

    if (message === "Tenant not found") {
      errorResponse(res, "Tenant not found", 404, "TENANT_NOT_FOUND");
      return;
    }

    if (message === "Invalid phone number format") {
      errorResponse(res, message, 400, "INVALID_PHONE_NUMBER");
      return;
    }

    errorResponse(res, message, 500, "SEND_OTP_FAILED");
  }
};

export const verifyOtpController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data: VerifyOtpInput = req.body;
    const tenantId = data.tenantId || "T001";
    const maskedPhone = maskPhoneNumber(data.phone || data.mobileNumber);

    logger.info(`[CustomerAuth][VerifyOTP] Request received for tenant ${tenantId} and phone ${maskedPhone}`);

    const result = await verifyOtp(data);

    successResponse(res, "OTP verified successfully", result, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to verify OTP";
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error(
      {
        message,
        stack,
      },
      `[CustomerAuth][VerifyOTP] OTP verification failed`
    );

    if (message === "Tenant not found") {
      errorResponse(res, "Tenant not found", 404, "TENANT_NOT_FOUND");
      return;
    }

    if (message === "Invalid OTP" || message === "Invalid OTP format") {
      errorResponse(res, message, 400, "INVALID_OTP_FORMAT");
      return;
    }

    if (message === "Customer account is inactive") {
      errorResponse(res, message, 403, "CUSTOMER_INACTIVE");
      return;
    }

    errorResponse(res, "OTP verification failed", 401, "OTP_VERIFICATION_FAILED");
  }
};

export const resendOtpController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data: ResendOtpInput = req.body;

    const result = await resendOtp(data);

    successResponse(res, "OTP resent successfully", result, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resend OTP";

    if (message === "Tenant not found") {
      errorResponse(res, "Tenant not found", 404, "TENANT_NOT_FOUND");
      return;
    }

    if (message === "Invalid phone number format") {
      errorResponse(res, message, 400, "INVALID_PHONE_NUMBER");
      return;
    }

    errorResponse(res, message, 500, "RESEND_OTP_FAILED");
  }
};
