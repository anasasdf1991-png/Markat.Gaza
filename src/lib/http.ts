import { NextResponse } from "next/server";
import { can, canAny, getSessionUser, type SessionUser } from "@/lib/auth";

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

type GuardResult = { user: SessionUser } | { res: NextResponse };

/** حارس الصلاحيات للـ API — يعيد المستخدم أو استجابة خطأ */
export async function requireUser(perm?: string): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { res: fail("غير مصرح: الرجاء تسجيل الدخول", 401) };
  if (perm && !can(user, perm)) return { res: fail("لا تملك صلاحية تنفيذ هذا الإجراء", 403) };
  return { user };
}

export async function requireAny(perms: string[]): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { res: fail("غير مصرح: الرجاء تسجيل الدخول", 401) };
  if (perms.length && !canAny(user, perms)) return { res: fail("لا تملك صلاحية تنفيذ هذا الإجراء", 403) };
  return { user };
}

export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n: number) => Math.round(n * 100) / 100;
