import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const SECRET = process.env.SESSION_SECRET || "sobis-supermarket-secret-2026";

// تحذير أمني صارم في الإنتاج إن بقي السر على قيمته الافتراضية
if (process.env.NODE_ENV === "production" && SECRET === "sobis-supermarket-secret-2026") {
  console.error("[SOBIS SECURITY] ⚠ SESSION_SECRET ما زال بالقيمة الافتراضية — غيّره فورًا في .env!");
}

export const SESSION_COOKIE = "sobis_session";
const TOKEN_TTL = 1000 * 60 * 60 * 12; // 12 ساعة
const TOKEN_TTL_REMEMBER = 1000 * 60 * 60 * 24 * 30; // 30 يوم

// ─────────────────────────────────────────────
// تعريف الصلاحيات
// ─────────────────────────────────────────────
export const PERMISSIONS: { key: string; label: string; group: string }[] = [
  { key: "sell", label: "البيع عبر نقطة البيع", group: "المبيعات" },
  { key: "void_invoice", label: "إلغاء فاتورة", group: "المبيعات" },
  { key: "edit_price", label: "تعديل سعر / خصم في الفاتورة", group: "المبيعات" },
  { key: "add_debt", label: "تسجيل بيع آجل / دين", group: "الديون" },
  { key: "collect_debt", label: "تحصيل الديون", group: "الديون" },
  { key: "edit_debt", label: "تعديل بيانات الديون", group: "الديون" },
  { key: "view_profits", label: "الاطلاع على الأرباح", group: "التقارير" },
  { key: "view_reports", label: "الاطلاع على التقارير والتحليلات", group: "التقارير" },
  { key: "add_product", label: "إضافة / تعديل منتج", group: "المنتجات والمخزون" },
  { key: "delete_product", label: "حذف منتج", group: "المنتجات والمخزون" },
  { key: "manage_inventory", label: "إدارة المخزون", group: "المنتجات والمخزون" },
  { key: "manage_customers", label: "إدارة العملاء", group: "التشغيل" },
  { key: "manage_suppliers", label: "إدارة الموردين والمشتريات", group: "التشغيل" },
  { key: "manage_expenses", label: "إدارة المصروفات", group: "التشغيل" },
  { key: "manage_employees", label: "إدارة الموظفين والإعدادات", group: "الإدارة" },
];

export const PERMISSION_GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];

const ALL_PERMS = PERMISSIONS.map((p) => p.key);

export const ROLES: Record<string, { label: string; perms: string[]; tone: string }> = {
  admin: { label: "مدير النظام", perms: ALL_PERMS, tone: "rose" },
  manager: {
    label: "مدير فرع",
    perms: ALL_PERMS.filter((p) => p !== "manage_employees"),
    tone: "amber",
  },
  cashier: { label: "كاشير", perms: ["sell", "add_debt", "collect_debt"], tone: "emerald" },
  warehouse: { label: "موظف مخزن", perms: ["add_product", "manage_inventory"], tone: "sky" },
  accountant: {
    label: "محاسب",
    perms: ["view_reports", "view_profits", "collect_debt", "manage_expenses", "manage_suppliers"],
    tone: "violet",
  },
};

export type SessionUser = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
  theme: string;
  lastLoginAt: string | null;
  sessionVersion: number;
};

// ─────────────────────────────────────────────
// رموز الجلسة (HMAC-SHA256) مع إصدار الجلسة
// ─────────────────────────────────────────────
function b64url(buf: Buffer | string) {
  return Buffer.from(buf).toString("base64url");
}

function sign(data: string) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createToken(uid: number, sv: number, remember: boolean): string {
  const ttl = remember ? TOKEN_TTL_REMEMBER : TOKEN_TTL;
  const payload = b64url(JSON.stringify({ uid, sv, exp: Date.now() + ttl }));
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): { uid: number; sv: number } | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!obj.uid || Date.now() > obj.exp) return null;
    return { uid: obj.uid, sv: obj.sv ?? 0 };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// المستخدم الحالي
// ─────────────────────────────────────────────
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const rows = await db.select().from(users).where(eq(users.id, payload.uid)).limit(1);
  const u = rows[0];
  if (!u || !u.active) return null;
  if (u.sessionVersion !== payload.sv) return null; // تم إنهاء الجلسات
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    permissions: u.permissions,
    theme: u.theme,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    sessionVersion: u.sessionVersion,
  };
});

export function can(user: SessionUser | null, key: string): boolean {
  return !!user && user.permissions.includes(key);
}

export function canAny(user: SessionUser | null, keys: string[]): boolean {
  return !!user && keys.some((k) => user.permissions.includes(k));
}

export function isAdmin(user: SessionUser | null): boolean {
  return !!user && (user.role === "admin" || user.role === "manager");
}
