import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { getSettings, saveSettings, DEFAULT_SETTINGS, audit, getClientIp, ACTION_LABELS } from "@/lib/system";
import { ok, fail, requireUser } from "@/lib/http";
import { desc as d2 } from "drizzle-orm";

/** GET /api/settings — كل الإعدادات (بدون أسرار البريد) + سجل التدقيق للمديرين */
export async function GET() {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const s = await getSettings();
  const safe: Record<string, string> = { ...s };
  safe.email_pass = safe.email_pass ? "********" : "";
  return ok({ settings: safe, defaults: Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((k) => [k, DEFAULT_SETTINGS[k]])) });
}

/** PUT /api/settings — حفظ الإعدادات (مدير النظام / مدير فرع) */
export async function PUT(req: Request) {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const body = await req.json().catch(() => ({}));
  const diff: Record<string, string> = {};
  const current = await getSettings();
  for (const [k, v] of Object.entries(body)) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    const val = String(v ?? "");
    if (k === "email_pass" && (val === "********" || val === "")) continue; // لا نكتب فوق كلمة السر بقيمة مخفية
    if (current[k] !== val) diff[k] = val;
  }
  if (!Object.keys(diff).length) return ok({ ok: true, changed: 0 });
  await saveSettings(diff, guard.user.id);
  await audit({ user: guard.user, action: "settings_change", entity: "settings", ip: getClientIp(req), meta: { keys: Object.keys(diff) } });
  return ok({ ok: true, changed: Object.keys(diff).length });
}
