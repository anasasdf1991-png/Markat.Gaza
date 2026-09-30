import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { shifts, invoices, payments, expenses, users } from "@/db/schema";
import { ok, fail, requireUser, num, round2 } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

/** GET /api/shifts — الوردية المفتوحة للمستخدم + سجل الورديات */
export async function GET() {
  const guard = await requireUser("sell");
  if ("res" in guard) return guard.res;
  const managerPlus = guard.user.role === "admin" || guard.user.role === "manager";

  const openConds = [sql`${shifts.closedAt} is null`];
  if (!managerPlus) openConds.push(eq(shifts.userId, guard.user.id));

  const [openShift] = await db.select({
    id: shifts.id, userId: shifts.userId, openedAt: shifts.openedAt,
    openingCash: shifts.openingCash, cashier: users.fullName,
  }).from(shifts).leftJoin(users, eq(shifts.userId, users.id))
    .where(and(...openConds)).orderBy(desc(shifts.openedAt)).limit(1);

  const history = await db.select()
    .from(shifts).orderBy(desc(shifts.openedAt)).limit(20);

  // ملخص حي للوردية المفتوحة
  let live: Record<string, number> | null = null;
  if (openShift) {
    const since = openShift.openedAt;
    const [sums] = await db.select({
      cashSales: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'cash'),0)`,
      cardSales: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'card'),0)`,
      bankSales: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'bank'),0)`,
      creditSales: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'credit'),0)`,
      mixedSales: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'mixed'),0)`,
      invoiceCount: sql<number>`count(*) filter (where ${invoices.status} = 'completed')`,
      returnsTotal: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.status} = 'voided'),0)`,
    }).from(invoices).where(and(eq(invoices.userId, openShift.userId), gte(invoices.createdAt, since)));

    const [debtCollected] = await db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric)) filter (where ${payments.method} = 'cash'),0)` })
      .from(payments).where(and(eq(payments.type, "debt"), gte(payments.createdAt, since)));
    const [expSum] = await db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric)),0)` })
      .from(expenses).where(gte(expenses.createdAt, since));

    const cashSales = num(sums.cashSales) + num(sums.mixedSales) * 0.5;
    const expectedCash = round2(num(openShift.openingCash) + cashSales + num(debtCollected.t) - num(expSum.t));
    live = {
      cashSales: round2(cashSales), cardSales: num(sums.cardSales), bankSales: num(sums.bankSales),
      creditSales: num(sums.creditSales), invoiceCount: num(sums.invoiceCount),
      returnsTotal: num(sums.returnsTotal), debtCollected: num(debtCollected.t),
      expensesTotal: num(expSum.t), expectedCash,
    };
  }

  return ok({ openShift, live, history });
}

/** POST /api/shifts — { action: 'open' } | { action: 'close', actualCash, note } */
export async function POST(req: Request) {
  const guard = await requireUser("sell");
  if ("res" in guard) return guard.res;
  const b = await req.json().catch(() => ({}));

  if (b.action === "open") {
    const [existing] = await db.select().from(shifts)
      .where(and(eq(shifts.userId, guard.user.id), sql`${shifts.closedAt} is null`)).limit(1);
    if (existing) return fail("لديك وردية مفتوحة بالفعل — أغلقها أولًا");
    const [row] = await db.insert(shifts).values({
      userId: guard.user.id, openingCash: String(Math.max(0, num(b.openingCash))),
    }).returning();
    await audit({ user: guard.user, action: "shift_open", entity: "shift", entityId: row.id, ip: getClientIp(req), meta: { openingCash: num(b.openingCash) } });
    return ok({ shift: row }, 201);
  }

  if (b.action === "close") {
    const [open] = await db.select().from(shifts)
      .where(and(eq(shifts.userId, guard.user.id), sql`${shifts.closedAt} is null`)).limit(1);
    if (!open) return fail("لا توجد وردية مفتوحة للإغلاق");
    const since = open.openedAt;
    const [sums] = await db.select({
      cashSales: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'cash'),0)`,
      cardSales: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'card'),0)`,
      creditSales: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'credit'),0)`,
      returnsTotal: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.status} = 'voided'),0)`,
    }).from(invoices).where(and(eq(invoices.userId, guard.user.id), gte(invoices.createdAt, since)));
    const [debtCollected] = await db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric)) filter (where ${payments.method} = 'cash'),0)` })
      .from(payments).where(and(eq(payments.type, "debt"), gte(payments.createdAt, since)));
    const [expSum] = await db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric)),0)` })
      .from(expenses).where(gte(expenses.createdAt, since));

    const expected = round2(num(open.openingCash) + num(sums.cashSales) + num(debtCollected.t) - num(expSum.t));
    const actual = round2(Math.max(0, num(b.actualCash)));
    const difference = round2(actual - expected);

    const [closed] = await db.update(shifts).set({
      closedAt: new Date(),
      cashSales: String(round2(num(sums.cashSales))),
      cardSales: String(round2(num(sums.cardSales) + num(debtCollected.t))),
      creditSales: String(num(sums.creditSales)),
      returnsTotal: String(num(sums.returnsTotal)),
      expensesTotal: String(num(expSum.t)),
      expectedCash: String(expected),
      actualCash: String(actual),
      difference: String(difference),
      note: b.note?.trim() || null,
    }).where(eq(shifts.id, open.id)).returning();

    await audit({ user: guard.user, action: "shift_close", entity: "shift", entityId: open.id, ip: getClientIp(req), meta: { expected, actual, difference } });
    return ok({ shift: closed });
  }

  return fail("إجراء غير معروف");
}
