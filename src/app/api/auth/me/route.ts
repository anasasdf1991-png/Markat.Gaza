import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ok, fail } from "@/lib/http";
import { audit, getClientIp, ACTION_LABELS } from "@/lib/system";
import { desc } from "drizzle-orm";

/**
 * GET  /api/auth/me — بيانات الحساب + آخر عمليات الدخول
 * PUT  /api/auth/me — { action: 'password' | 'theme' | 'logout_all' }
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("غير مصرح", 401);
  const logins = await db.select({
    id: auditLogs.id, action: auditLogs.action, ip: auditLogs.ip, createdAt: auditLogs.createdAt,
  }).from(auditLogs)
    .where(eq(auditLogs.userId, user.id))
    .orderBy(desc(auditLogs.createdAt)).limit(12);
  return ok({ user, logins: logins.map((l) => ({ ...l, label: ACTION_LABELS[l.action] ?? l.action })) });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("غير مصرح", 401);
  const body = await req.json().catch(() => ({}));
  const ip = getClientIp(req);

  if (body.action === "password") {
    const current = String(body.current ?? "");
    const next = String(body.next ?? "");
    if (next.length < 6) return fail("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
    const [u] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!u || !verifyPassword(current, u.passwordHash)) return fail("كلمة المرور الحالية غير صحيحة", 400);
    // تغيير كلمة المرور ينهي كل الجلسات (force re-login)
    await db.update(users).set({ passwordHash: hashPassword(next), sessionVersion: user.sessionVersion + 1 })
      .where(eq(users.id, user.id));
    await audit({ user, action: "password_change", entity: "user", entityId: user.id, ip });
    const res = ok({ ok: true, reauth: true });
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  if (body.action === "theme") {
    const theme = ["dark", "light", "auto"].includes(body.theme) ? body.theme : "auto";
    await db.update(users).set({ theme }).where(eq(users.id, user.id));
    await audit({ user, action: "theme_change", entity: "user", entityId: user.id, ip, meta: { theme } });
    return ok({ ok: true, theme });
  }

  if (body.action === "logout_all") {
    await db.update(users).set({ sessionVersion: user.sessionVersion + 1 }).where(eq(users.id, user.id));
    await audit({ user, action: "logout_all", entity: "user", entityId: user.id, ip });
    const res = ok({ ok: true, reauth: true });
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  return fail("إجراء غير معروف");
}
