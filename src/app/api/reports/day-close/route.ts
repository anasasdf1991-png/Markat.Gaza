import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, payments, expenses, purchases } from "@/db/schema";
import { ok, requireAny, num, round2 } from "@/lib/http";
import { getSettings } from "@/lib/system";

/** GET /api/reports/day-close?date=YYYY-MM-DD — تقرير إغلاق اليومية الكامل */
export async function GET(req: Request) {
  const guard = await requireAny(["sell", "view_reports", "view_profits"]);
  if ("res" in guard) return guard.res;
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const from = new Date(`${dateStr}T00:00:00`);
  const to = new Date(`${dateStr}T00:00:00`);
  to.setDate(to.getDate() + 1);

  const cond = and(eq(invoices.status, "completed"), gte(invoices.createdAt, from), lt(invoices.createdAt, to));
  const [sales] = await db.select({
    total: sql<string>`coalesce(sum(cast(total as numeric)),0)`,
    count: sql<number>`count(*)`,
    cash: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'cash'),0)`,
    card: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'card'),0)`,
    bank: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'bank'),0)`,
    mixed: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'mixed'),0)`,
    credit: sql<string>`coalesce(sum(cast(total as numeric)) filter (where ${invoices.paymentMethod} = 'credit'),0)`,
  }).from(invoices).where(cond);

  const [returns] = await db.select({ t: sql<string>`coalesce(sum(cast(total as numeric)),0)`, c: sql<number>`count(*)` })
    .from(invoices).where(and(eq(invoices.status, "voided"), gte(invoices.createdAt, from), lt(invoices.createdAt, to)));

  const [profit] = await db.select({
    t: sql<string>`coalesce(sum((cast(${invoiceItems.price} as numeric) - cast(${invoiceItems.cost} as numeric)) * cast(${invoiceItems.qty} as numeric) * (1 - cast(${invoiceItems.discountPct} as numeric)/100)),0)`,
  }).from(invoiceItems).innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id)).where(cond);

  const [exp] = await db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric)),0)`, c: sql<number>`count(*)` })
    .from(expenses).where(and(gte(expenses.createdAt, from), lt(expenses.createdAt, to)));

  const [debtCollected] = await db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric)),0)`, c: sql<number>`count(*)` })
    .from(payments).where(and(eq(payments.type, "debt"), gte(payments.createdAt, from), lt(payments.createdAt, to)));

  const [pur] = await db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric)),0)`, c: sql<number>`count(*)` })
    .from(purchases).where(and(gte(purchases.createdAt, from), lt(purchases.createdAt, to)));

  const settings = await getSettings();
  const total = num(sales.total);
  const counts = num(sales.count);

  return ok({
    date: dateStr,
    store: { name: settings.store_name, phone: settings.store_phone, address: settings.store_address, currency: settings.currency_label },
    total: round2(total),
    invoicesCount: counts,
    avgInvoice: counts > 0 ? round2(total / counts) : 0,
    byMethod: {
      cash: num(sales.cash), card: num(sales.card), bank: num(sales.bank),
      mixed: num(sales.mixed), credit: num(sales.credit),
    },
    returns: { total: num(returns.t), count: num(returns.c) },
    profit: round2(num(profit.t)),
    expenses: { total: num(exp.t), count: num(exp.c) },
    netProfit: round2(num(profit.t) - num(exp.t)),
    debtCollected: { total: num(debtCollected.t), count: num(debtCollected.c) },
    purchases: { total: num(pur.t), count: num(pur.c) },
  });
}
