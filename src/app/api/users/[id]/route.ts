import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { PERMISSIONS, ROLES } from "@/lib/auth";
import { audit, getClientIp } from "@/lib/system";

/** PUT /api/users/:id — تعديل موظف (بيانات + صلاحيات + كلمة مرور) */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const uid = Number(id);
  const b = await req.json();
  const [u] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!u) return fail("الموظف غير موجود", 404);

  const role = b.role && ROLES[b.role] ? b.role : u.role;
  const perms = Array.isArray(b.permissions)
    ? b.permissions.filter((p: string) => PERMISSIONS.some((x) => x.key === p))
    : u.permissions;

  await db.update(users).set({
    fullName: b.fullName?.trim() || u.fullName,
    role,
    permissions: perms,
    active: b.active !== undefined ? !!b.active : u.active,
  }).where(eq(users.id, uid));

  if (b.password && String(b.password).length >= 4) {
    await db.update(users).set({ passwordHash: hashPassword(String(b.password)), sessionVersion: (u.sessionVersion ?? 0) + 1 }).where(eq(users.id, uid));
  }
  await audit({ user: guard.user, action: "employee_edit", entity: "user", entityId: uid, ip: getClientIp(req), meta: { username: u.username, passwordReset: !!b.password } });
  return ok({ ok: true });
}

/** DELETE /api/users/:id — تعطيل موظف */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const uid = Number(id);
  if (uid === guard.user.id) return fail("لا يمكنك تعطيل حسابك الحالي");
  await db.update(users).set({ active: false, sessionVersion: 0 }).where(eq(users.id, uid));
  await audit({ user: guard.user, action: "employee_disable", entity: "user", entityId: uid, ip: getClientIp(_req) });
  return ok({ ok: true });
}
