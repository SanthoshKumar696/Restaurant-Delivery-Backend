/**
 * SMS Service
 * Handles OTP sending, verification, and rate limiting
 */

import { logger } from "../../common/logger/logger";
import { twoFactorProvider } from "./twofactor.provider";

interface OtpSession {
  tenantId: string;
  phoneNumber: string;
  normalizedPhone: string;
  provider: "2factor" | "local-dev";
  sessionId: string;
  otp?: string;
  status: "pending" | "verified" | "expired";
  createdAt: number;
  expiresAt: number;
  attempts: number;
  resendCount: number;
  verified: boolean;
  lastResendAt?: number;
}

class OtpStorage {
  private sessions = new Map<string, OtpSession>();
  private readonly OTP_EXPIRY_MS = 5 * 60 * 1000;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RESEND_COOLDOWN_MS = 30 * 1000;

  setSession(key: string, session: OtpSession): void {
    this.sessions.set(key, session);
  }

  getSession(key: string): OtpSession | undefined {
    return this.sessions.get(key);
  }

  deleteSession(key: string): void {
    this.sessions.delete(key);
  }

  isExpired(session: OtpSession): boolean {
    return Date.now() > session.expiresAt;
  }

  incrementAttempts(session: OtpSession): void {
    session.attempts += 1;
  }

  maxAttemptsReached(session: OtpSession): boolean {
    return session.attempts >= this.MAX_ATTEMPTS;
  }

  canResend(session: OtpSession): boolean {
    if (!session.lastResendAt) {
      return true;
    }

    return Date.now() - session.lastResendAt >= this.RESEND_COOLDOWN_MS;
  }

  getConstants() {
    return {
      OTP_EXPIRY_MS: this.OTP_EXPIRY_MS,
      MAX_ATTEMPTS: this.MAX_ATTEMPTS,
      RESEND_COOLDOWN_MS: this.RESEND_COOLDOWN_MS,
    };
  }

  cleanupExpired(): void {
    const now = Date.now();

    for (const [key, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(key);
      }
    }
  }
}

class SmsService {
  private storage = new OtpStorage();
  private readonly developmentMode = process.env.NODE_ENV !== "production";

  constructor() {
    setInterval(() => {
      this.storage.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  normalizePhoneNumber(phone: string): string {
    const trimmed = phone.trim();
    const compact = trimmed.replace(/[\s()-]/g, "");
    const stripped = compact.startsWith("+") ? compact.slice(1) : compact;

    if (stripped.startsWith("91") && stripped.length === 12) {
      return stripped;
    }

    if (stripped.length === 10) {
      return `91${stripped}`;
    }

    if (stripped.startsWith("0") && stripped.length === 11) {
      return `91${stripped.slice(1)}`;
    }

    return stripped;
  }

  normalizePhoneForLookup(phone: string): string {
    const normalized = this.normalizePhoneNumber(phone);
    return normalized.startsWith("91") ? normalized.slice(2) : normalized;
  }

  validatePhoneNumber(phone: string): boolean {
    const normalized = this.normalizePhoneNumber(phone);
    return /^91[6-9]\d{9}$/.test(normalized) || /^[6-9]\d{9}$/.test(normalized);
  }

  private getSessionKey(tenantId: string, phoneNumber: string): string {
    return `otp_${tenantId}_${this.normalizePhoneNumber(phoneNumber)}`;
  }

  async sendOtp(phoneNumber: string, tenantId = "T001"): Promise<{ success: boolean; message: string; code?: string }> {
    if (!this.validatePhoneNumber(phoneNumber)) {
      return {
        success: false,
        message: "Invalid phone number format",
        code: "INVALID_PHONE_NUMBER",
      };
    }

    const normalized = this.normalizePhoneNumber(phoneNumber);
    const sessionKey = this.getSessionKey(tenantId, normalized);
    const existingSession = this.storage.getSession(sessionKey);

    if (existingSession && !this.storage.isExpired(existingSession)) {
      return {
        success: false,
        message: "OTP already sent. Please wait before requesting a new one.",
        code: "OTP_ALREADY_SENT",
      };
    }

    if (!twoFactorProvider) {
      if (!this.developmentMode) {
        return {
          success: false,
          message: "SMS service is not configured",
          code: "OTP_PROVIDER_ERROR",
        };
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const session: OtpSession = {
        tenantId,
        phoneNumber: this.normalizePhoneForLookup(phoneNumber),
        normalizedPhone: normalized,
        provider: "local-dev",
        sessionId: `dev_${Date.now()}`,
        otp,
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + this.storage.getConstants().OTP_EXPIRY_MS,
        attempts: 0,
        resendCount: 0,
        verified: false,
        lastResendAt: Date.now(),
      };

      this.storage.setSession(sessionKey, session);

      if (process.env.LOG_OTP_DEV === "true") {
        logger.info(`[DEV] OTP generation succeeded for phone ${this.normalizePhoneForLookup(phoneNumber).slice(0, 2)}******${this.normalizePhoneForLookup(phoneNumber).slice(-2)}`);
      }

      return {
        success: true,
        message: "OTP sent successfully",
      };
    }

    try {
      const result = await twoFactorProvider.sendOtp(normalized);
      const session: OtpSession = {
        tenantId,
        phoneNumber: this.normalizePhoneForLookup(phoneNumber),
        normalizedPhone: normalized,
        provider: "2factor",
        sessionId: result.sessionId,
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + this.storage.getConstants().OTP_EXPIRY_MS,
        attempts: 0,
        resendCount: 0,
        verified: false,
        lastResendAt: Date.now(),
      };

      this.storage.setSession(sessionKey, session);

      if (this.developmentMode && process.env.LOG_OTP_DEV === "true") {
        logger.info(`[DEV] 2Factor send request accepted for phone ${this.normalizePhoneForLookup(phoneNumber).slice(0, 2)}******${this.normalizePhoneForLookup(phoneNumber).slice(-2)}`);
      }

      return {
        success: true,
        message: "OTP sent successfully",
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send OTP";
      logger.error(`[SMS] Error sending OTP: ${message}`);
      return {
        success: false,
        message: "Failed to send OTP. Please try again.",
        code: "OTP_SEND_FAILED",
      };
    }
  }

  async verifyOtp(phoneNumber: string, otp: string, tenantId = "T001"): Promise<{ success: boolean; message: string; code?: string }> {
    if (!this.validatePhoneNumber(phoneNumber)) {
      return {
        success: false,
        message: "Invalid phone number",
        code: "INVALID_PHONE_NUMBER",
      };
    }

    const normalized = this.normalizePhoneNumber(phoneNumber);
    const sessionKey = this.getSessionKey(tenantId, normalized);
    const session = this.storage.getSession(sessionKey);

    if (!session) {
      return {
        success: false,
        message: "No OTP found. Please request a new OTP.",
        code: "OTP_SESSION_NOT_FOUND",
      };
    }

    if (this.storage.isExpired(session)) {
      this.storage.deleteSession(sessionKey);
      return {
        success: false,
        message: "OTP expired",
        code: "OTP_SESSION_EXPIRED",
      };
    }

    if (this.storage.maxAttemptsReached(session)) {
      this.storage.deleteSession(sessionKey);
      return {
        success: false,
        message: "Maximum OTP attempts exceeded. Please request a new OTP.",
        code: "INVALID_OTP",
      };
    }

    this.storage.incrementAttempts(session);

    if (!twoFactorProvider) {
      if (this.developmentMode && session.otp === otp.trim()) {
        session.verified = true;
        session.status = "verified";
        return {
          success: true,
          message: "OTP verified successfully",
        };
      }

      return {
        success: false,
        message: "Invalid OTP",
        code: "INVALID_OTP",
      };
    }

    const isValid = await twoFactorProvider.verifyOtp(session.sessionId, otp.trim(), normalized);

    if (!isValid) {
      return {
        success: false,
        message: "Invalid OTP",
        code: "INVALID_OTP",
      };
    }

    session.verified = true;
    session.status = "verified";

    return {
      success: true,
      message: "OTP verified successfully",
    };
  }

  async resendOtp(phoneNumber: string, tenantId = "T001"): Promise<{ success: boolean; message: string; code?: string }> {
    if (!this.validatePhoneNumber(phoneNumber)) {
      return {
        success: false,
        message: "Invalid phone number format",
        code: "INVALID_PHONE_NUMBER",
      };
    }

    const normalized = this.normalizePhoneNumber(phoneNumber);
    const sessionKey = this.getSessionKey(tenantId, normalized);
    const session = this.storage.getSession(sessionKey);

    if (!session) {
      return {
        success: false,
        message: "No active OTP session. Please request OTP first.",
        code: "OTP_SESSION_NOT_FOUND",
      };
    }

    if (!this.storage.canResend(session)) {
      const cooldownMs = this.storage.getConstants().RESEND_COOLDOWN_MS;
      const elapsedMs = Date.now() - (session.lastResendAt || Date.now());
      const remainingSeconds = Math.max(0, Math.ceil((cooldownMs - elapsedMs) / 1000));

      return {
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting another OTP`,
        code: "OTP_RESEND_COOLDOWN",
      };
    }

    if (!twoFactorProvider) {
      if (this.developmentMode) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        session.otp = otp;
        session.attempts = 0;
        session.resendCount += 1;
        session.lastResendAt = Date.now();
        session.expiresAt = Date.now() + this.storage.getConstants().OTP_EXPIRY_MS;
        session.status = "pending";
        this.storage.setSession(sessionKey, session);

        if (process.env.LOG_OTP_DEV === "true") {
          logger.info(`[DEV] Resend OTP succeeded for phone ${this.normalizePhoneForLookup(phoneNumber).slice(0, 2)}******${this.normalizePhoneForLookup(phoneNumber).slice(-2)}`);
        }

        return {
          success: true,
          message: "OTP resent successfully",
        };
      }
    }

    try {
      const result = await twoFactorProvider!.resendOtp(normalized);
      session.sessionId = result.sessionId;
      session.attempts = 0;
      session.resendCount += 1;
      session.lastResendAt = Date.now();
      session.expiresAt = Date.now() + this.storage.getConstants().OTP_EXPIRY_MS;
      session.status = "pending";
      this.storage.setSession(sessionKey, session);

      return {
        success: true,
        message: "OTP resent successfully",
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to resend OTP";
      logger.error(`[SMS] Error resending OTP: ${message}`);
      return {
        success: false,
        message: "Failed to resend OTP",
        code: "OTP_SEND_FAILED",
      };
    }
  }

  hasActiveSession(phoneNumber: string, tenantId = "T001"): boolean {
    if (!this.validatePhoneNumber(phoneNumber)) {
      return false;
    }

    const normalized = this.normalizePhoneNumber(phoneNumber);
    const sessionKey = this.getSessionKey(tenantId, normalized);
    const session = this.storage.getSession(sessionKey);

    return Boolean(session && !this.storage.isExpired(session));
  }

  getVerifiedSession(phoneNumber: string, tenantId = "T001"): OtpSession | null {
    if (!this.validatePhoneNumber(phoneNumber)) {
      return null;
    }

    const normalized = this.normalizePhoneNumber(phoneNumber);
    const sessionKey = this.getSessionKey(tenantId, normalized);
    const session = this.storage.getSession(sessionKey);

    if (!session || session.verified === false || this.storage.isExpired(session)) {
      return null;
    }

    return session;
  }

  clearSession(phoneNumber: string, tenantId = "T001"): void {
    if (!this.validatePhoneNumber(phoneNumber)) {
      return;
    }

    const normalized = this.normalizePhoneNumber(phoneNumber);
    const sessionKey = this.getSessionKey(tenantId, normalized);
    this.storage.deleteSession(sessionKey);
  }
}

export const smsService = new SmsService();
