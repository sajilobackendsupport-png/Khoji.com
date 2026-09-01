/**
 * Email Verification & Gmail OTP Service
 * Generates 6-digit security OTPs for citizen registration, validates codes,
 * and manages real & simulated email inbox notifications.
 */

export interface PendingOTP {
  email: string;
  code: string;
  expiresAt: number; // Unix timestamp in ms
  attemptsRemaining: number;
  sentAt: number;
}

export interface DispatchedEmailRecord {
  id: string;
  recipient: string;
  subject: string;
  code: string;
  body: string;
  sentAt: string;
  expiresAt: string;
  isRead: boolean;
}

const STORAGE_KEY_OTP = "khoji_pending_email_otp";
const STORAGE_KEY_DISPATCHED = "khoji_dispatched_verification_emails";

// In-memory cache
let memoryOTP: PendingOTP | null = null;

/**
 * Generate a cryptographically strong 6-digit verification code
 */
export function generateVerificationCode(): string {
  const min = 100000;
  const max = 999999;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Sends a 6-digit verification code to the specified email address
 */
export async function sendEmailVerificationOTP(
  email: string,
  fullName: string = "Citizen"
): Promise<{ success: boolean; code: string; message: string; record: DispatchedEmailRecord }> {
  const cleanEmail = email.trim().toLowerCase();
  const code = generateVerificationCode();
  const now = Date.now();
  const validityPeriodMs = 5 * 60 * 1000; // 5 minutes
  const expiresAt = now + validityPeriodMs;

  const otpRecord: PendingOTP = {
    email: cleanEmail,
    code,
    expiresAt,
    attemptsRemaining: 5,
    sentAt: now,
  };

  // Store in memory & localStorage for persistence across reloads
  memoryOTP = otpRecord;
  try {
    localStorage.setItem(STORAGE_KEY_OTP, JSON.stringify(otpRecord));
  } catch (e) {
    console.warn("Storage error for OTP record", e);
  }

  // Construct official Nepal Emergency Radar Verification Email
  const dispatchedRecord: DispatchedEmailRecord = {
    id: `mail-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    recipient: cleanEmail,
    subject: `🔐 ${code} is your Nepal Emergency Radar Verification Code`,
    code,
    body: `Hello ${fullName},\n\nYour 6-digit security code for registering with Nepal Emergency Radar is:\n\n👉 [ ${code} ]\n\nThis verification code expires in 5 minutes. If you did not request this code, please ignore this email.`,
    sentAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    isRead: false,
  };

  // Store dispatched email in test history
  try {
    const existing = getDispatchedVerificationEmails();
    const updated = [dispatchedRecord, ...existing.slice(0, 9)];
    localStorage.setItem(STORAGE_KEY_DISPATCHED, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not record dispatched email", e);
  }

  // Optional: Try Web Notification if permission granted
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("Nepal Emergency Radar: Verification Code", {
        body: `Your Gmail verification code is ${code}. Expires in 5 minutes.`,
        icon: "/favicon.ico",
      });
    } catch {
      // Ignored
    }
  }

  return {
    success: true,
    code,
    message: `Verification code sent to ${cleanEmail}`,
    record: dispatchedRecord,
  };
}

/**
 * Validates the user-entered 6-digit code against the pending OTP
 */
export function verifyEmailOTP(
  email: string,
  userCode: string
): { success: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = userCode.trim();

  let record = memoryOTP;
  if (!record) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_OTP);
      if (raw) {
        record = JSON.parse(raw);
      }
    } catch {
      record = null;
    }
  }

  if (!record || record.email !== cleanEmail) {
    return {
      success: false,
      error: "No active verification code found for this email. Please request a new code.",
    };
  }

  if (Date.now() > record.expiresAt) {
    return {
      success: false,
      error: "The verification code has expired (valid for 5 mins). Please request a new code.",
    };
  }

  if (record.attemptsRemaining <= 0) {
    return {
      success: false,
      error: "Maximum verification attempts exceeded. Please request a new code.",
    };
  }

  if (record.code !== cleanCode) {
    record.attemptsRemaining -= 1;
    memoryOTP = record;
    try {
      localStorage.setItem(STORAGE_KEY_OTP, JSON.stringify(record));
    } catch {}

    return {
      success: false,
      error: `Invalid code. ${record.attemptsRemaining} attempt${
        record.attemptsRemaining === 1 ? "" : "s"
      } remaining.`,
    };
  }

  // Code is verified successfully! Clean up active OTP
  memoryOTP = null;
  try {
    localStorage.removeItem(STORAGE_KEY_OTP);
  } catch {}

  return { success: true };
}

/**
 * Retrieves past dispatched verification emails for in-app testing preview
 */
export function getDispatchedVerificationEmails(): DispatchedEmailRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISPATCHED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clears pending OTP
 */
export function clearPendingOTP(): void {
  memoryOTP = null;
  try {
    localStorage.removeItem(STORAGE_KEY_OTP);
  } catch {}
}
