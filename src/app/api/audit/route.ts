import { desc, eq, sql, and, ilike } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { ok, requireUser } from "@/lib/http";
import { ACTION_LABELS } from "@/lib/system";

/** GET /api/audit?action=&user=&limit=80 — سجل التدقيق (لمن يملك إدارة الموظفين فقط) */
export async function GET(req: Request) {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit")) || 80, 200);

  const conds = [];
  if (action) conds.push(sql`${auditLogs.action} = ${action}`);
  if (q) conds.push(ilike(auditLogs.userName, `%${q}%`));

  const rows = await db.select().from(auditLogs)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(auditLogs.createdAt)).limit(limit);

  const [stats] = await db.select({ total: sql<number>`count(*)` }).from(auditLogs);
  return ok({
    logs: rows.map((r) => ({ ...r, label: ACTION_LABELS[r.action] ?? r.action })),
    total: Number(stats.total),
    actions: ACTION_LABELS,
  });
}
