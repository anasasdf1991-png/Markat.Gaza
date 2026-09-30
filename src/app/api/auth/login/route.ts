import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, hashPassword, needsRehash } from "@/lib/password";
import { createToken, SESSION_COOKIE, ROLES } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

// ── تحديد معدل المحاولات (في الذاكرة — لكل IP) ──
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW = 5 * 60_000; // 5 دقائق
const MAX_PER_IP = 20;
const MAX_PER_ACCOUNT = 5;
const LOCK_MINUTES = 10;

function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) { attempts.set(ip, { count: 1, resetAt: now + WINDOW }); return true; }
  rec.count++;
  return rec.count <= MAX_PER_IP;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!ipAllowed(ip)) {
      return fail("محاولات كثيرة جدًا — أعد المحاولة بعد 5 دقائق", 429);
    }
    const body = await req.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const remember = !!body.remember;

    if (!username || !password) return fail("أدخل اسم المستخدم وكلمة المرور");

    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = rows[0];

    // حساب مقفل مؤقتًا
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      await audit({ action: "login_locked", entity: "user", entityId: user.id, ip, meta: { username } });
      return fail(`الحساب مقفل مؤقتًا — أعد المحاولة بعد ${mins} دقيقة`, 423);
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      if (user) {
        const fails = user.failedAttempts + 1;
        const lock = fails >= MAX_PER_ACCOUNT;
        await db.update(users).set({
          failedAttempts: fails,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : user.lockedUntil,
        }).where(eq(users.id, user.id));
        await audit({ action: "login_failed", entity: "user", entityId: user.id, ip, meta: { username, attempt: fails, locked: lock } });
      } else {
        await audit({ action: "login_failed", entity: "user", ip, meta: { username, reason: "user_not_found" } });
      }
      return fail("بيانات الدخول غير صحيحة", 401);
    }

    if (!user.active) return fail("هذا الحساب موقوف — راجع مدير النظام", 403);

    // ترقية شفافة إلى bcrypt + تصفير العدادات
    const updates: Record<string, unknown> = { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() };
    if (needsRehash(user.passwordHash)) updates.passwordHash = hashPassword(password);
    await db.update(users).set(updates).where(eq(users.id, user.id));

    const token = createToken(user.id, user.sessionVersion, remember);
    await audit({ user: { ...user, permissions: user.permissions, theme: user.theme, sessionVersion: user.sessionVersion, lastLoginAt: null }, action: "login", entity: "user", entityId: user.id, ip });

    const res = ok({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        roleLabel: ROLES[user.role]?.label ?? user.role,
        permissions: user.permissions,
        theme: user.theme,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
    });
    return res;
  } catch (e) {
    console.error("login error", e);
    return fail("حدث خطأ في الخادم", 500);
  }
}
