import { desc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { PERMISSIONS, ROLES } from "@/lib/auth";
import { audit, getClientIp } from "@/lib/system";

/** GET /api/users — قائمة الموظفين (لمدير النظام) */
export async function GET() {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const rows = await db.select({
    id: users.id, username: users.username, fullName: users.fullName,
    role: users.role, permissions: users.permissions, active: users.active,
    createdAt: users.createdAt, lastLoginAt: users.lastLoginAt, theme: users.theme,
  }).from(users).orderBy(desc(users.createdAt));
  return ok({
    users: rows,
    roles: Object.entries(ROLES).map(([k, v]) => ({ key: k, ...v })),
    permissions: PERMISSIONS,
  });
}

/** POST /api/users — إضافة موظف */
export async function POST(req: Request) {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const b = await req.json();
  const username = String(b.username ?? "").trim().toLowerCase();
  if (!username || username.length < 3) return fail("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
  if (!b.fullName?.trim()) return fail("الاسم الكامل مطلوب");
  if (!b.password || String(b.password).length < 4) return fail("كلمة المرور قصيرة جدًا");
  const role = ROLES[b.role] ? b.role : "cashier";
  const perms = Array.isArray(b.permissions) ? b.permissions.filter((p: string) => PERMISSIONS.some((x) => x.key === p)) : ROLES[role].perms;

  try {
    const [row] = await db.insert(users).values({
      username, passwordHash: hashPassword(String(b.password)),
      fullName: b.fullName.trim(), role, permissions: perms, active: true,
    }).returning({ id: users.id });
    await audit({ user: guard.user, action: "employee_create", entity: "user", entityId: row.id, ip: getClientIp(req), meta: { username, role } });
    return ok({ id: row.id }, 201);
  } catch {
    return fail("اسم المستخدم مستخدم مسبقًا", 400);
  }
}
