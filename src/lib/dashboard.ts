import { sql, and, eq, gte, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  invoices, invoiceItems, products, customers, suppliers,
  payments, expenses, purchases, categories, users, auditLogs, backups,
} from "@/db/schema";
import { fmtDateTime, invoiceNo } from "@/lib/format";
import { ACTION_LABELS } from "@/lib/system";

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const startOfMonth = () => { const x = new Date(); x.setDate(1); x.setHours(0, 0, 0, 0); return x; };
const daysBack = (n: number) => { const x = startOfDay(); x.setDate(x.getDate() - n); return x; };
const N = (v: unknown) => Number(v ?? 0) || 0;

import { unstable_cache } from "next/cache";

const completed = eq(invoices.status, "completed");

/** بيانات لوحة القيادة — مُجمّعة باستعلامات خفيفة + كاش 5 ثوانٍ للمتجر الواحد */
async function computeDashboardData() {
  const today = startOfDay();
  const month = startOfMonth();
  const d13 = daysBack(13);
  const d29 = daysBack(29);

  const yesterday = daysBack(1);
  const dayBeforeYesterday = daysBack(2);
  const prevMonth = new Date(month); prevMonth.setMonth(prevMonth.getMonth() - 1);

  const [
    [salesToday], [salesMonth], invoicesCountRow, [profitToday], [profitMonth],
    [productsCount], [lowStock], [expiredCount], [suppliersCount], [customersCount],
    [custDebt], [supDebt], [expToday], [expMonth], [stockVal],
    dailyRaw, monthlyRaw, weeklyRaw, profitRaw, catRaw, payRaw, topRaw, leastRaw,
    recentRows, lowRows, expiringRows,
    [salesYesterday], [salesPrevMonth],
    expensesDailyRaw, activityRows, lastBackupRow, [activeUsersRow], [pendingPaymentsRow], deadStockRows,
  ] = await Promise.all([
    db.select({ t: sql<string>`coalesce(sum(cast(total as numeric)),0)`, c: sql<number>`count(*)` })
      .from(invoices).where(and(completed, gte(invoices.createdAt, today))),
    db.select({ t: sql<string>`coalesce(sum(cast(total as numeric)),0)`, c: sql<number>`count(*)` })
      .from(invoices).where(and(completed, gte(invoices.createdAt, month))),
    db.select({ c: sql<number>`count(*)` }).from(invoices).where(completed),
    db.select({ t: sql<string>`coalesce(sum((cast(${invoiceItems.price} as numeric) - cast(${invoiceItems.cost} as numeric)) * cast(${invoiceItems.qty} as numeric) * (1 - cast(${invoiceItems.discountPct} as numeric)/100)),0)` })
      .from(invoiceItems).innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(completed, gte(invoices.createdAt, today))),
    db.select({ t: sql<string>`coalesce(sum((cast(${invoiceItems.price} as numeric) - cast(${invoiceItems.cost} as numeric)) * cast(${invoiceItems.qty} as numeric) * (1 - cast(${invoiceItems.discountPct} as numeric)/100)),0)` })
      .from(invoiceItems).innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(completed, gte(invoices.createdAt, month))),
    db.select({ c: sql<number>`count(*)` }).from(products).where(eq(products.active, true)),
    db.select({ c: sql<number>`count(*)` }).from(products)
      .where(and(eq(products.active, true), sql`cast(${products.stock} as numeric) <= cast(${products.minStock} as numeric)`)),
    db.select({ c: sql<number>`count(*)` }).from(products)
      .where(and(eq(products.active, true), sql`${products.expiryDate} is not null and ${products.expiryDate} < CURRENT_DATE`)),
    db.select({ c: sql<number>`count(*)` }).from(suppliers).where(eq(suppliers.active, true)),
    db.select({ c: sql<number>`count(*)` }).from(customers).where(eq(customers.active, true)),
    db.select({ t: sql<string>`coalesce(sum(cast(total as numeric) - cast(paid as numeric)),0)` })
      .from(invoices).where(and(completed, sql`${invoices.customerId} is not null`, sql`cast(total as numeric) > cast(paid as numeric)`)),
    db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric) - cast(paid as numeric)),0)` }).from(purchases),
    db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric)),0)` }).from(expenses).where(gte(expenses.createdAt, today)),
    db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric)),0)` }).from(expenses).where(gte(expenses.createdAt, month)),
    db.select({ t: sql<string>`coalesce(sum(cast(${products.stock} as numeric) * cast(${products.purchasePrice} as numeric)),0)` })
      .from(products).where(eq(products.active, true)),
    // يومي آخر 14 يوم
    db.select({ d: sql<string>`to_char(date_trunc('day', created_at),'YYYY-MM-DD')`, t: sql<string>`sum(cast(total as numeric))` })
      .from(invoices).where(and(completed, gte(invoices.createdAt, d13)))
      .groupBy(sql`1`).orderBy(sql`1`),
    // شهري آخر 12 شهر
    db.select({ d: sql<string>`to_char(date_trunc('month', created_at),'YYYY-MM')`, t: sql<string>`sum(cast(total as numeric))` })
      .from(invoices).where(completed).groupBy(sql`1`).orderBy(sql`1`),
    // أسبوعي آخر 8 أسابيع
    db.select({ d: sql<string>`to_char(date_trunc('week', created_at),'YYYY-MM-DD')`, t: sql<string>`sum(cast(total as numeric))` })
      .from(invoices).where(and(completed, gte(invoices.createdAt, daysBack(56))))
      .groupBy(sql`1`).orderBy(sql`1`),
    // أرباح يومية آخر 14 يوم
    db.select({ d: sql<string>`to_char(date_trunc('day', created_at),'YYYY-MM-DD')`, t: sql<string>`sum((cast(${invoiceItems.price} as numeric) - cast(${invoiceItems.cost} as numeric)) * cast(${invoiceItems.qty} as numeric) * (1 - cast(${invoiceItems.discountPct} as numeric)/100))` })
      .from(invoiceItems).innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(completed, gte(invoices.createdAt, d13)))
      .groupBy(sql`1`).orderBy(sql`1`),
    // المبيعات حسب القسم
    db.select({ name: sql<string>`coalesce(${categories.name}, 'أخرى')`, t: sql<string>`sum(cast(${invoiceItems.total} as numeric))` })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .leftJoin(products, eq(invoiceItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(completed, gte(invoices.createdAt, d29)))
      .groupBy(categories.name).orderBy(sql`2 desc`).limit(7),
    // طرق الدفع
    db.select({ m: invoices.paymentMethod, t: sql<string>`sum(cast(total as numeric))` })
      .from(invoices).where(and(completed, gte(invoices.createdAt, d29)))
      .groupBy(invoices.paymentMethod),
    // الأكثر مبيعًا
    db.select({ name: invoiceItems.productName, q: sql<string>`sum(cast(${invoiceItems.qty} as numeric))` })
      .from(invoiceItems).innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(completed, gte(invoices.createdAt, d29)))
      .groupBy(invoiceItems.productName).orderBy(sql`2 desc`).limit(6),
    // الأقل مبيعًا
    db.select({ name: invoiceItems.productName, q: sql<string>`sum(cast(${invoiceItems.qty} as numeric))` })
      .from(invoiceItems).innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(completed, gte(invoices.createdAt, d29)))
      .groupBy(invoiceItems.productName).orderBy(sql`2 asc`).limit(6),
    // أحدث الفواتير
    db.select({
      id: invoices.id, total: invoices.total, status: invoices.status, method: invoices.paymentMethod,
      createdAt: invoices.createdAt, customer: customers.name, cashier: users.fullName,
    }).from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(users, eq(invoices.userId, users.id))
      .orderBy(sql`${invoices.createdAt} desc`).limit(8),
    // منخفض المخزون
    db.select({ id: products.id, name: products.name, stock: products.stock, minStock: products.minStock, unit: products.unit })
      .from(products).where(and(eq(products.active, true), sql`cast(${products.stock} as numeric) <= cast(${products.minStock} as numeric)`))
      .orderBy(sql`cast(${products.stock} as numeric) asc`).limit(7),
    // قارب على الانتهاء (30 يوم)
    db.select({ id: products.id, name: products.name, expiryDate: products.expiryDate, stock: products.stock, unit: products.unit })
      .from(products).where(and(eq(products.active, true), sql`${products.expiryDate} is not null and ${products.expiryDate} <= CURRENT_DATE + interval '30 days'`))
      .orderBy(products.expiryDate).limit(7),
    // مبيعات الأمس (للمقارنة)
    db.select({ t: sql<string>`coalesce(sum(cast(total as numeric)),0)` })
      .from(invoices).where(and(completed, gte(invoices.createdAt, yesterday), sql`${invoices.createdAt} < ${today}`)),
    // مبيعات الشهر الماضي (للمقارنة)
    db.select({ t: sql<string>`coalesce(sum(cast(total as numeric)),0)` })
      .from(invoices).where(and(completed, gte(invoices.createdAt, prevMonth), sql`${invoices.createdAt} < ${month}`)),
    // مصروفات يومية آخر 14 يوم
    db.select({ d: sql<string>`to_char(date_trunc('day', created_at),'YYYY-MM-DD')`, t: sql<string>`sum(cast(amount as numeric))` })
      .from(expenses).where(gte(expenses.createdAt, d13)).groupBy(sql`1`).orderBy(sql`1`),
    // سجل النشاط (آخر 12 عملية)
    db.select({ id: auditLogs.id, userName: auditLogs.userName, action: auditLogs.action, entity: auditLogs.entity, entityId: auditLogs.entityId, createdAt: auditLogs.createdAt })
      .from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(12),
    // آخر نسخة احتياطية
    db.select({ at: backups.createdAt, status: backups.status }).from(backups).orderBy(desc(backups.createdAt)).limit(1),
    // المستخدمون النشطون
    db.select({ c: sql<number>`count(*)` }).from(users).where(eq(users.active, true)),
    // المدفوعات المعلقة (فواتير متأخرة السداد)
    db.select({ c: sql<number>`count(*)` }).from(invoices)
      .where(and(completed, sql`${invoices.dueDate} < CURRENT_DATE and cast(total as numeric) > cast(paid as numeric) + 0.001`)),
    // مخزون راكد: منتجات بدون أي مبيعة خلال 30 يوم وموجود في المخزون
    db.select({ id: products.id, name: products.name, stock: products.stock, unit: products.unit })
      .from(products)
      .where(and(eq(products.active, true), sql`cast(${products.stock} as numeric) > 0`,
        sql`not exists (select 1 from ${invoiceItems} ii join ${invoices} iv on ii.invoice_id = iv.id where ii.product_id = ${products.id} and iv.status = 'completed' and iv.created_at >= now() - interval '30 days')`))
      .limit(6),
  ]);

  // بناء سلاسل زمنية مكتملة
  const dailyMap = new Map(dailyRaw.map((r) => [r.d, N(r.t)]));
  const profitMap = new Map(profitRaw.map((r) => [r.d, N(r.t)]));
  const daily: { label: string; value: number }[] = [];
  const profitDaily: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = daysBack(i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    daily.push({ label, value: Math.round(dailyMap.get(key) ?? 0) });
    profitDaily.push({ label, value: Math.round(profitMap.get(key) ?? 0) });
  }

  const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const monthlyMap = new Map(monthlyRaw.map((r) => [r.d, N(r.t)]));
  const monthly: { label: string; value: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.push({ label: monthNames[d.getMonth()], value: Math.round(monthlyMap.get(key) ?? 0) });
  }

  const weeklyMap = new Map(weeklyRaw.map((r) => [r.d, N(r.t)]));
  const weekly: { label: string; value: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = daysBack(i * 7);
    // احسب بداية الأسبوع الاثنين
    const monday = new Date(d);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    weekly.push({ label: i === 0 ? "هذا الأسبوع" : `${monday.getDate()}/${monday.getMonth() + 1}`, value: Math.round(weeklyMap.get(key) ?? 0) });
  }

  const methodLabels: Record<string, string> = { cash: "نقدي", card: "بطاقة", bank: "تحويل بنكي", mixed: "مختلط", credit: "آجل" };

  // سلسلة مصروفات يومية
  const expDailyMap = new Map(expensesDailyRaw.map((r) => [r.d, N(r.t)]));
  const expensesDaily: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = daysBack(i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expensesDaily.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: Math.round(expDailyMap.get(key) ?? 0) });
  }

  // مؤشرات المقارنة (دلتا) بالنسبة المئوية
  const pct = (curr: number, prev: number) => (prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0);
  const deltas = {
    salesTodayVsYesterday: pct(N(salesToday.t), N(salesYesterday.t)),
    salesMonthVsPrevMonth: pct(N(salesMonth.t), N(salesPrevMonth.t)),
  };

  const activity = activityRows.map((a) => ({
    id: a.id,
    user: a.userName,
    label: ACTION_LABELS[a.action] ?? a.action,
    entity: a.entity, entityId: a.entityId,
    time: fmtDateTime(a.createdAt),
  }));

  return {
    command: {
      activeUsers: N(activeUsersRow?.c),
      pendingPayments: N(pendingPaymentsRow?.c),
      lastBackupAt: lastBackupRow[0] ? fmtDateTime(lastBackupRow[0].at) : null,
      lastBackupOk: lastBackupRow[0] ? lastBackupRow[0].status === "success" : null,
    },
    deltas,
    activity,
    deadStock: deadStockRows.map((r) => ({ id: r.id, name: r.name, stock: N(r.stock), unit: r.unit })),
    stats: {
      salesToday: N(salesToday.t),
      salesMonth: N(salesMonth.t),
      profitToday: Math.round(N(profitToday.t) * 100) / 100,
      profitMonth: Math.round(N(profitMonth.t) * 100) / 100,
      invoicesToday: N(salesToday.c),
      invoicesMonth: N(salesMonth.c),
      invoicesCount: N(invoicesCountRow?.[0]?.c),
      productsCount: N(productsCount.c),
      lowStockCount: N(lowStock.c),
      expiredCount: N(expiredCount.c),
      suppliersCount: N(suppliersCount.c),
      customersCount: N(customersCount.c),
      customersDebt: Math.round(N(custDebt.t) * 100) / 100,
      suppliersDebt: Math.round(N(supDebt.t) * 100) / 100,
      expensesToday: N(expToday.t),
      expensesMonth: N(expMonth.t),
      netProfit: Math.round((N(profitMonth.t) - N(expMonth.t)) * 100) / 100,
      stockValue: Math.round(N(stockVal.t)),
    },
    charts: {
      daily, monthly, weekly, profitDaily, expensesDaily,
      byCategory: catRaw.map((r) => ({ label: r.name, value: Math.round(N(r.t)) })),
      byMethod: payRaw.map((r) => ({ label: methodLabels[r.m ?? "cash"] ?? r.m ?? "نقدي", value: Math.round(N(r.t)) })),
      top: topRaw.map((r) => ({ label: r.name, value: Math.round(N(r.q)) })),
      least: leastRaw.map((r) => ({ label: r.name, value: Math.round(N(r.q)) })),
    },
    recent: recentRows.map((r) => ({
      id: r.id,
      no: invoiceNo(r.id),
      total: N(r.total),
      status: r.status,
      method: methodLabels[r.method ?? "cash"] ?? "نقدي",
      time: fmtDateTime(r.createdAt),
      customer: r.customer ?? "عميل نقدي",
      cashier: r.cashier ?? "—",
    })),
    lowStock: lowRows.map((r) => ({ id: r.id, name: r.name, stock: N(r.stock), min: N(r.minStock), unit: r.unit })),
    expiring: expiringRows.map((r) => ({
      id: r.id, name: r.name, expiry: r.expiryDate ?? "", stock: N(r.stock), unit: r.unit,
      expired: r.expiryDate ? new Date(r.expiryDate) < startOfDay() : false,
    })),
  };
}

export const getDashboardData = unstable_cache(
  () => computeDashboardData(),
  ["sobis-dashboard-v1"],
  { revalidate: 5, tags: ["dashboard"] },
);

export type DashboardData = Awaited<ReturnType<typeof computeDashboardData>>;
