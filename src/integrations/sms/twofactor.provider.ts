/**
 * 2Factor SMS Provider
 * Integration with 2Factor.in SMS/OTP API
 */

import { logger } from "../../common/logger/logger";

interface TwoFactorResponse {
  Status: string;
  Details: string;
}

const apiKey = process.env.TWO_FACTOR_API_KEY;
logger.info(`[2Factor] TWO_FACTOR_API_KEY configured: ${Boolean(apiKey)}`);

export class TwoFactorProvider {
  private apiKey: string;
  private readonly baseUrl = "https://2factor.in/API/V1";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("2Factor API key is required");
    }
    this.apiKey = apiKey;
  }

  private extractSessionId(details: string): string {
    const sessionId = details?.trim();

    if (!sessionId) {
      throw new Error("2Factor session ID missing from provider response");
    }

    if (!/^[A-Za-z0-9-]{8,128}$/.test(sessionId)) {
      throw new Error("2Factor returned an invalid session ID format");
    }

    return sessionId;
  }

  async sendOtp(phoneNumber: string): Promise<{ sessionId: string }> {
    const url = `${this.baseUrl}/${this.apiKey}/SMS/${phoneNumber}/AUTOGEN`;
    const maskedPhone = phoneNumber.length > 4 ? `${phoneNumber.slice(0, 2)}******${phoneNumber.slice(-2)}` : "***";

    logger.info(`[2Factor][SendOTP] OTP request started for phone ${maskedPhone}`);
    logger.info(`[2Factor][SendOTP] Calling 2Factor SMS provider for phone ${maskedPhone}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = (await response.json()) as TwoFactorResponse & { OTP?: string };

    logger.info(`[2Factor][SendOTP] Provider response received: status=${response.status}; detailsPresent=${Boolean(data.Details)}`);
    logger.info(`[2Factor][SendOTP] Provider response details/status: ${data.Status || "unknown"} - ${data.Details || "no details"}`);

    if (!response.ok || data.Status !== "Success") {
      const details = data.Details || "Unknown SMS provider error";
      logger.error(
        {
          status: response.status,
          details,
        },
        `[2Factor][SendOTP] OTP send failure`
      );
      throw new Error(details);
    }

    const sessionId = this.extractSessionId(data.Details || "");
    const maskedSessionId = sessionId.length > 8 ? `${sessionId.slice(0, 4)}...${sessionId.slice(-4)}` : "***";
    logger.info(`[2Factor][SendOTP] Session ID generated/received: ${maskedSessionId}`);
    logger.info(`[2Factor][SendOTP] OTP send success`);

    return { sessionId };
  }

  async verifyOtp(sessionId: string, otp: string, phoneNumber: string): Promise<boolean> {
    const url = `${this.baseUrl}/${this.apiKey}/SMS/VERIFY/${sessionId}/${otp}`;
    const maskedPhone = phoneNumber.length > 4 ? `${phoneNumber.slice(0, 2)}******${phoneNumber.slice(-2)}` : "***";
    const maskedSessionId = sessionId.length > 8 ? `${sessionId.slice(0, 4)}...${sessionId.slice(-4)}` : "***";

    logger.info(`[2Factor][VerifyOTP] OTP verification started for phone ${maskedPhone}`);
    logger.info(`[2Factor][VerifyOTP] Session ID presence: ${sessionId ? "present" : "missing"}`);
    logger.info(`[2Factor][VerifyOTP] Masked session ID: ${maskedSessionId}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = (await response.json()) as TwoFactorResponse;

    logger.info(`[2Factor][VerifyOTP] Provider response received: status=${response.status}; detailsPresent=${Boolean(data.Details)}`);
    logger.info(`[2Factor][VerifyOTP] Provider response details/status: ${data.Status || "unknown"} - ${data.Details || "no details"}`);

    if (!response.ok || data.Status !== "Success") {
      logger.warn(
        {
          status: response.status,
          details: data.Details || "Invalid OTP",
        },
        `[2Factor][VerifyOTP] OTP verification failed for phone ${maskedPhone}`
      );
      return false;
    }

    logger.info(`[2Factor][VerifyOTP] OTP verification result: success`);
    return true;
  }

  async resendOtp(phoneNumber: string): Promise<{ sessionId: string }> {
    const url = `${this.baseUrl}/${this.apiKey}/SMS/${phoneNumber}/AUTOGEN`;
    const maskedPhone = phoneNumber.length > 4 ? `${phoneNumber.slice(0, 2)}******${phoneNumber.slice(-2)}` : "***";

    logger.info(`[2Factor][SendOTP] Resend request started for phone ${maskedPhone}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = (await response.json()) as TwoFactorResponse & { OTP?: string };

    if (!response.ok || data.Status !== "Success") {
      const details = data.Details || "Unknown SMS provider error";
      logger.error(
        {
          status: response.status,
          details,
        },
        `[2Factor][SendOTP] OTP resend failure`
      );
      throw new Error(details);
    }

    const sessionId = this.extractSessionId(data.Details || "");
    logger.info(`[2Factor][SendOTP] Resend success for phone ${maskedPhone}`);

    return { sessionId };
  }
}

if (!apiKey) {
  logger.warn("TWO_FACTOR_API_KEY environment variable not set - local dev OTP fallback enabled");
}

export const twoFactorProvider = apiKey ? new TwoFactorProvider(apiKey) : null;
