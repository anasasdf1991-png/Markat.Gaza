import crypto from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * تشفير كلمات المرور — bcrypt كمعيار أساسي.
 * cost 10: توازن قوي بين الأمان وسرعة الدخول (~90ms بدل ~380ms).
 * verifyPassword يدعم الصيغة القديمة (scrypt salt:hash) حتى لا تتعطل الحسابات الحالية،
 * ويُعاد تشفير كلمة المرور بـ bcrypt عند أول دخول ناجح (ترقية شفافة).
 */
const LEGACY = /^[0-9a-f]{32}:[0-9a-f]{64}$/;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, stored: string): boolean {
  if (LEGACY.test(stored)) {
    const [salt, hash] = stored.split(":");
    const candidate = crypto.scryptSync(password, salt, 32);
    const original = Buffer.from(hash, "hex");
    return candidate.length === original.length && crypto.timingSafeEqual(candidate, original);
  }
  try {
    return bcrypt.compareSync(password, stored);
  } catch {
    return false;
  }
}

/** هل التخزين الحالي قديم ويحتاج ترقية؟ */
export function needsRehash(stored: string): boolean {
  return LEGACY.test(stored);
}
