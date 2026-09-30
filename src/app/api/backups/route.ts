import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { ok, fail, requireUser, num } from "@/lib/http";
import { audit, getClientIp, pushNotification, getSettings } from "@/lib/system";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { statSync, mkdirSync } from "node:fs";
import path from "node:path";

const execFileP = promisify(execFile);
export const BACKUP_DIR = path.join(process.cwd(), "backups");

/** GET /api/backups — سجل النسخ الاحتياطية */
export async function GET() {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const rows = await db.select().from(backups).orderBy(desc(backups.createdAt)).limit(60);
  let dbSize: string | null = null;
  try {
    const r = await db.execute(sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS v`);
    dbSize = (r.rows[0] as { v: string } | undefined)?.v ?? null;
  } catch { dbSize = null; }
  return ok({ backups: rows, dbSize });
}

/** POST /api/backups — إنشاء نسخة احتياطية فعلية عبر pg_dump */
export async function POST(req: Request) {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const url = process.env.DATABASE_URL;
  if (!url) return fail("DATABASE_URL غير مهيأ", 500);

  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const filename = `sobis-backup-${stamp}.sql`;
  mkdirSync(BACKUP_DIR, { recursive: true });
  const filePath = path.join(BACKUP_DIR, filename);

  try {
    await execFileP("pg_dump", ["--no-owner", "--no-privileges", "-f", filePath, url], { timeout: 120_000 });
    const size = num(statSync(filePath).size);
    const [row] = await db.insert(backups).values({
      filename, size, status: "success",
      note: (await req.json().catch(() => ({})))?.note ?? "نسخة يدوية",
      createdBy: guard.user.id,
    }).returning();
    await audit({ user: guard.user, action: "backup", entity: "backup", entityId: row.id, ip: getClientIp(req), meta: { filename, size } });
    // نظّف النسخ القديمة حسب حد الاحتفاظ
    const s = await getSettings();
    const keep = num(s.backup_keep) || 30;
    const all = await db.select().from(backups).orderBy(desc(backups.createdAt));
    if (all.length > keep) {
      const stale = all.slice(keep);
      for (const b of stale) await db.delete(backups).where(eq(backups.id, b.id));
    }
    return ok({ backup: row }, 201);
  } catch (e) {
    const [row] = await db.insert(backups).values({
      filename, size: 0, status: "failed", note: String(e).slice(0, 200), createdBy: guard.user.id,
    }).returning();
    await audit({ user: guard.user, action: "backup_failed", entity: "backup", entityId: row.id, ip: getClientIp(req), meta: { error: String(e).slice(0, 200) } });
    await pushNotification("backup", "فشل إنشاء نسخة احتياطية", String(e).slice(0, 150), "backup", row.id);
    return fail(`فشل إنشاء النسخة الاحتياطية: ${String(e).slice(0, 160)}`, 500);
  }
}
