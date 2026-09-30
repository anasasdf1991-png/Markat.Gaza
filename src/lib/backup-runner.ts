import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { statSync, mkdirSync } from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { getSettings, pushNotification, audit } from "@/lib/system";

const execFileP = promisify(execFile);
export const BACKUP_DIR = path.join(process.cwd(), "backups");

let running = false;

const INTERVALS: Record<string, number> = {
  daily: 24 * 3600_000,
  weekly: 7 * 24 * 3600_000,
  monthly: 30 * 24 * 3600_000,
};

/**
 * النسخ التلقائي المجدول: يُستدعى من نقاط فحص النظام.
 * لا يعمل إلا إذا كان مسؤول النسخ مفعلًا من الإعدادات، ويحفظ ملفًا فعليًا SQL
 * ويسجل النتيجة ويُنبه عبر الإشعارات والبريد الإلكتروني عند تمكينه.
 */
export async function ensureScheduledBackup(opts: { force?: boolean; userId?: number } = {}): Promise<Record<string, unknown>> {
  if (running) return { skipped: true, reason: "running" };
  const s = await getSettings();
  const interval = INTERVALS[s.backup_auto];
  if (!opts.force) {
    if (!interval) return { skipped: true, reason: "off" };
    const [last] = await db.select().from(backups).orderBy(desc(backups.createdAt)).limit(1);
    if (last && Date.now() - new Date(last.createdAt).getTime() < interval) {
      return { skipped: true, reason: "not-due" };
    }
  }
  if (!process.env.DATABASE_URL) return { ok: false, error: "DATABASE_URL مفقود" };

  running = true;
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const filename = `sobis-backup-${stamp}.sql`;
  mkdirSync(BACKUP_DIR, { recursive: true });
  const filePath = path.join(BACKUP_DIR, filename);
  try {
    await execFileP("pg_dump", ["--no-owner", "--no-privileges", "-f", filePath, process.env.DATABASE_URL], { timeout: 180_000 });
    const size = statSync(filePath).size;
    const [row] = await db.insert(backups).values({
      filename, size, status: "success",
      note: opts.force ? "نسخة يدوية" : `نسخة تلقائية مجدولة (${s.backup_auto})`,
      createdBy: opts.userId ?? null,
    }).returning();
    await audit({ action: "backup", entity: "backup", entityId: row.id, meta: { filename, size, auto: !opts.force } });
    if (s.backup_email_notify === "1") {
      await notifyMail(s, true, `حجم النسخة: ${(size / 1024).toFixed(0)} KB • ${filename}`);
    }
    return { ok: true, backup: row };
  } catch (e) {
    const [row] = await db.insert(backups).values({
      filename, size: 0, status: "failed", note: String(e).slice(0, 200), createdBy: opts.userId ?? null,
    }).returning();
    await pushNotification("backup", "فشل إنشاء نسخة احتياطية", String(e).slice(0, 150), "backup", row.id);
    await audit({ action: "backup_failed", entity: "backup", entityId: row.id, meta: { error: String(e).slice(0, 200) } });
    if (s.backup_email_notify === "1") {
      await notifyMail(s, false, String(e).slice(0, 300));
    }
    return { ok: false, error: String(e) };
  } finally {
    running = false;
  }
}

/** تنبيه بريدي حالة النسخ الاحتياطية (صامت إن لم يكن البريد مهيئًا) */
async function notifyMail(s: Record<string, string>, ok: boolean, details: string): Promise<void> {
  try {
    const user = s.email_user || process.env.EMAIL_USER || "";
    const pass = (s.email_pass && s.email_pass !== "********") ? s.email_pass : (process.env.EMAIL_APP_PASS || "");
    if (!user || !pass) return;
    const port = Number(s.email_smtp_port) || 465;
    const transport = nodemailer.createTransport({
      host: s.email_smtp_host || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transport.sendMail({
      from: s.email_from || user,
      to: s.report_email || user,
      subject: ok ? "SOBIS — نسخة احتياطية ناجحة ✓" : "SOBIS — تنبيه: فشل نسخة احتياطية ⚠",
      html: `<div dir="rtl" style="font-family:Tahoma,Arial">
        <div style="background:${ok ? "#047857" : "#be123c"};color:#fff;padding:14px 18px;border-radius:12px 12px 0 0;font-weight:900">
          SOBIS • نظام النسخ الاحتياطي
        </div>
        <div style="padding:18px;color:#334155;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
          <p>${ok ? "تم إنشاء نسخة احتياطية من PostgreSQL بنجاح." : "فشل إنشاء نسخة احتياطية — راجع سجل النظام."}</p>
          <p style="color:#64748b;font-size:12px">${details}</p>
        </div>
      </div>`,
    });
  } catch (e) {
    console.error("[SOBIS] notify-mail error", e);
  }
}
