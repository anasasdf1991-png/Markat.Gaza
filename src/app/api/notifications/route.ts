import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";
import { generateNotifications } from "@/lib/system";

const SECURE_NOTIFICATION_ROLES = ["admin", "manager"];

/** GET /api/notifications — قائمة الإشعارات + عدد غير المقروء */
export async function GET(req: Request) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { user } = guard;
  await generateNotifications();

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter"); // unread | type
  const canSeeSecurity = SECURE_NOTIFICATION_ROLES.includes(user.role);

  const conds = [];
  if (!canSeeSecurity) conds.push(ne(notifications.type, "security"));
  if (filter === "unread") conds.push(eq(notifications.read, false));
  else if (filter) conds.push(eq(notifications.type, filter));

  const [rows, [unread]] = await Promise.all([
    db.select().from(notifications).where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(notifications.createdAt)).limit(80),
    db.select({ c: sql<number>`count(*)` }).from(notifications)
      .where(canSeeSecurity ? eq(notifications.read, false) : and(eq(notifications.read, false), ne(notifications.type, "security"))),
  ]);

  return ok({ notifications: rows, unread: Number(unread.c) });
}

/** POST /api/notifications — { op: 'read' | 'readAll' | 'delete', id? } */
export async function POST(req: Request) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const body = await req.json().catch(() => ({}));
  const op = body.op;
  if (op === "read" && body.id) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, Number(body.id)));
  } else if (op === "readAll") {
    await db.update(notifications).set({ read: true });
  } else if (op === "delete" && body.id) {
    await db.delete(notifications).where(eq(notifications.id, Number(body.id)));
  } else if (op === "clear") {
    await db.delete(notifications).where(eq(notifications.read, true));
  } else {
    return fail("عملية غير معروفة");
  }
  return ok({ ok: true });
}
