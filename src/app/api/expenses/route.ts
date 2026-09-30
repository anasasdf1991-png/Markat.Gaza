import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, users } from "@/db/schema";
import { ok, fail, requireUser, num, round2 } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

/** GET /api/expenses — المصروفات */
export async function GET(req: Request) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { searchParams } = new URL(req.url);
  const conds = [];
  const range = searchParams.get("range");
  if (range === "today") conds.push(sql`${expenses.createdAt} >= date_trunc('day', now())`);
  if (range === "month") conds.push(sql`${expenses.createdAt} >= date_trunc('month', now())`);

  const where = conds.length ? sql`${sql.join(conds, sql` and `)}` : undefined;
  const rows = await db.select({
    id: expenses.id, title: expenses.title, category: expenses.category,
    amount: expenses.amount, note: expenses.note, createdAt: expenses.createdAt,
    by: users.fullName,
  }).from(expenses).leftJoin(users, eq(expenses.createdBy, users.id))
    .where(where)
    .orderBy(desc(expenses.createdAt)).limit(200);

  const [sum] = await db.select({
    today: sql<string>`coalesce(sum(cast(amount as numeric)) filter (where ${expenses.createdAt} >= date_trunc('day', now())),0)`,
    month: sql<string>`coalesce(sum(cast(amount as numeric)) filter (where ${expenses.createdAt} >= date_trunc('month', now())),0)`,
  }).from(expenses);

  return ok({ expenses: rows, summary: { today: num(sum?.today), month: num(sum?.month) } });
}

/** POST /api/expenses — تسجيل مصروف */
export async function POST(req: Request) {
  const guard = await requireUser("manage_expenses");
  if ("res" in guard) return guard.res;
  const b = await req.json();
  const amount = round2(num(b.amount));
  if (!b.title?.trim()) return fail("عنوان المصروف مطلوب");
  if (amount <= 0) return fail("أدخل مبلغًا صحيحًا");
  const [row] = await db.insert(expenses).values({
    title: b.title.trim(), category: b.category || "أخرى",
    amount: String(amount), note: b.note?.trim() || null,
    createdBy: guard.user.id,
  }).returning();
  await audit({ user: guard.user, action: "expense_create", entity: "expense", entityId: row.id, ip: getClientIp(req), meta: { title: row.title, amount: row.amount } });
  return ok({ expense: row }, 201);
}
