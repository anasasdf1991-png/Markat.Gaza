import { eq } from "drizzle-orm";
import { db } from "@/db";
import { backups } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";
import { audit, getClientIp, pushNotification } from "@/lib/system";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { NextResponse } from "next/server";

const execFileP = promisify(execFile);
const BACKUP_DIR = path.join(process.cwd(), "backups");

/** GET /api/backups/:id — تنزيل ملف النسخة */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const [b] = await db.select().from(backups).where(eq(backups.id, Number(id))).limit(1);
  if (!b) return fail("النسخة غير موجودة", 404);
  const filePath = path.join(BACKUP_DIR, path.basename(b.filename));
  if (!existsSync(filePath)) return fail("ملف النسخة غير موجود على الخادم", 404);
  const webStream = Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream;
  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/sql",
      "Content-Disposition": `attachment; filename="${b.filename}"`,
      "Content-Length": String(b.size || 0),
    },
  });
}

/** POST /api/backups/:id — استعادة النسخة (يتطلب تأكيدًا) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "استعادة") return fail("اكتب كلمة (استعادة) للتأكيد — العملية تستبدل البيانات الحالية", 400);
  const [b] = await db.select().from(backups).where(eq(backups.id, Number(id))).limit(1);
  if (!b) return fail("النسخة غير موجودة", 404);
  const filePath = path.join(BACKUP_DIR, path.basename(b.filename));
  if (!existsSync(filePath)) return fail("ملف النسخة غير موجود على الخادم", 404);
  const url = process.env.DATABASE_URL;
  if (!url) return fail("DATABASE_URL غير مهيأ", 500);

  try {
    await execFileP("psql", [url, "-f", filePath], { timeout: 300_000 });
    await audit({ user: guard.user, action: "restore", entity: "backup", entityId: b.id, ip: getClientIp(req), meta: { filename: b.filename } });
    await pushNotification("system", "تمت استعادة نسخة احتياطية", `استعاد ${guard.user.fullName} النسخة ${b.filename}`, "backup", b.id);
    return ok({ ok: true });
  } catch (e) {
    return fail(`فشلت الاستعادة: ${String(e).slice(0, 200)}`, 500);
  }
}
