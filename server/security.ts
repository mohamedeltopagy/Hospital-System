import crypto from "crypto";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { Request, Response, NextFunction } from "express";

// --- 1. Cryptography: AES-256-GCM for Data at Rest Encryption ---
const ENCRYPTION_KEY = crypto.scryptSync(process.env.SESSION_SECRET || "hospital_enterprise_security_key_2026", "salt", 32);
const ALGORITHM = "aes-256-gcm";

export function encryptMedicalData(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptMedicalData(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) return encryptedText;
  try {
    const [ivHex, authTagHex, encryptedHex] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return encryptedText; // Fallback if plain text
  }
}

// --- 2. Password Cryptography: Scrypt Hashing with Salt ---
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) {
    return password === storedHash; // Graceful compatibility with plain legacy demo passwords
  }
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// --- 3. SIEM / Security Audit Trail Logger ---
export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "PROMPT_INJECTION_BLOCKED" | "BRUTE_FORCE_BLOCKED" | "UNAUTHORIZED_ACCESS";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ip: string;
  details: string;
}

const auditLog: SecurityEvent[] = [];

export function logSecurityEvent(
  eventType: SecurityEvent["eventType"],
  severity: SecurityEvent["severity"],
  ip: string,
  details: string
) {
  const event: SecurityEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    ip: ip || "127.0.0.1",
    details
  };
  auditLog.unshift(event);
  if (auditLog.length > 200) auditLog.pop(); // Keep latest 200 events in memory
  console.log(`[CYBERSECURITY ALERT] [${severity}] ${eventType} from ${ip}: ${details}`);
}

export function getSecurityAuditLogs(): SecurityEvent[] {
  return auditLog;
}

// --- 4. Rate Limiting (Brute-Force & DDoS Defense) ---
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 login attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent("BRUTE_FORCE_BLOCKED", "HIGH", req.ip || "", "Too many login attempts - IP throttled");
    res.status(429).json({
      message: "تم حظر محاولات الدخول مؤقتاً لتجاوز الحد المسموح لدواعي الأمان السيبراني. يرجى المحاولة بعد 15 دقيقة."
    });
  }
});

export const aiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 chat requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "تم تجاوز المعدل المسموح لطلبات المساعد الطبي الذكي. يرجى الانتظار قليلاً." }
});

// --- 5. Helmet Security Middleware Configuration ---
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // disabled for Vite inline dev bundles
  crossOriginEmbedderPolicy: false,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "sameorigin" },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  ieNoOpen: true,
  noSniff: true,
  xssFilter: true
});
