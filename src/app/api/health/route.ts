import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, backups } from "@/db/schema";
import { APP_VERSION, latestBackup, getSettings } from "@/lib/system";
import { ensureScheduledBackup } from "@/lib/backup-runner";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — فحص صحة النظام الكامل (سريع، بلا أسرار):
 * Server • Database & Latency • Uptime • Version • Last Backup • سجل الأخطاء الحديثة
 * + حُارس النسخ المجدول (يُشغّل المجدول عند الاستحقاق).
 */
export async function GET() {
  const started = Date.now();
  let dbOk = false;
  let latency = -1;
  let failedLogins24h = 0;
  let failedBackups = 0;

  try {
    const t0 = performance.now();
    await db.execute(sql`SELECT 1 AS ok`);
    latency = Math.round((performance.now() - t0) * 10) / 10;
    dbOk = true;
  } catch { dbOk = false; }

  let backup: { at: Date; status: string } | null = null;
  let store = "";
  if (dbOk) {
    try {
      const dayAgo = new Date(Date.now() - 24 * 3600_000);
      const [errs, b, s, fb] = await Promise.all([
        db.select({ c: sql<number>`count(*)` }).from(auditLogs)
          .where(and(eq(auditLogs.action, "login_failed"), gte(auditLogs.createdAt, dayAgo))),
        latestBackup().catch(() => null),
        getSettings(),
        db.select({ c: sql<number>`count(*)` }).from(backups).where(eq(backups.status, "failed")),
      ]);
      failedLogins24h = Number(errs[0]?.c ?? 0);
      failedBackups = Number(fb[0]?.c ?? 0);
      backup = b ? { at: b.createdAt, status: b.status } : null;
      store = s.store_name;
    } catch { /* صامت */ }

    // ḥ沙رس النسخ المجدول — غير متزامن حتى لا يبطئ الفحص
    void ensureScheduledBackup().catch(() => {});
  }

  const body = {
    status: dbOk ? "healthy" : "degraded",
    server: "online",
    database: dbOk ? "connected" : "disconnected",
    dbLatencyMs: latency,
    uptimeSec: Math.round(process.uptime()),
    version: APP_VERSION,
    store,
    lastBackup: backup ? { at: backup.at, status: backup.status } : null,
    monitors: {
      failedLogins24h,
      failedBackups,
      respMs: Date.now() - started,
    },
    time: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: dbOk ? 200 : 503 });
}
