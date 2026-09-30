import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ok, requireUser, num } from "@/lib/http";

type DebtRow = {
  id: number; name: string; phone: string | null; address: string | null;
  totalDebt: number; paidSum: number; remaining: number;
  lastPayment: string | null; invoicesCount: number; overdueCount: number;
  status: "unpaid" | "partial" | "paid" | "overdue";
};

/**
 * GET /api/debts — الديون والآجلات مع الحالات
 * تجميع مباشر بـ SQL — لا تحميل لصفوف الفواتير، مهما كبرت البيانات.
 */
export async function GET(req: Request) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const showAll = searchParams.get("all") === "1";

  const likeQ = q ? `%${q}%` : null;

  const result = await db.execute(sql`
    SELECT
      c.id, c.name, c.phone, c.address,
      COALESCE(SUM(i.total::numeric), 0) AS total_debt,
      COALESCE(SUM(i.paid::numeric), 0) AS paid_sum,
      COUNT(i.id) AS invoices_count,
      COUNT(*) FILTER (WHERE i.due_date < CURRENT_DATE AND i.total::numeric > i.paid::numeric + 0.001) AS overdue_count,
      (SELECT MAX(p.created_at) FROM payments p WHERE p.customer_id = c.id AND p.type = 'debt') AS last_pay
    FROM customers c
    LEFT JOIN invoices i ON i.customer_id = c.id AND i.status = 'completed'
    WHERE c.active = true
      ${likeQ ? sql`AND (c.name ILIKE ${likeQ} OR c.phone ILIKE ${likeQ})` : sql``}
    GROUP BY c.id
    ORDER BY COALESCE(SUM(i.total::numeric) - SUM(i.paid::numeric), 0) DESC NULLS LAST, c.name
  `);

  const rows: DebtRow[] = result.rows.map((r) => {
    const typed = r as Record<string, unknown>;
    const totalDebt = Math.round(num(typed.total_debt) * 100) / 100;
    const paidSum = Math.round(num(typed.paid_sum) * 100) / 100;
    const remaining = Math.round(Math.max(0, totalDebt - paidSum) * 100) / 100;
    const overdueCount = num(typed.overdue_count);
    let status: DebtRow["status"] = "paid";
    if (remaining <= 0) status = "paid";
    else if (overdueCount > 0) status = "overdue";
    else if (paidSum > 0) status = "partial";
    else status = "unpaid";
    return {
      id: num(typed.id),
      name: String(typed.name ?? ""),
      phone: (typed.phone as string | null) ?? null,
      address: (typed.address as string | null) ?? null,
      totalDebt,
      paidSum,
      remaining,
      lastPayment: typed.last_pay ? String(typed.last_pay) : null,
      invoicesCount: num(typed.invoices_count),
      overdueCount,
      status,
    };
  });

  // عند عدم وجود ديون: اعرض جميع الزبائن برصيد 0 لتمكين تسجيل الديون والدفعات فوراً
  let filtered = rows;
  const debtorsCount = rows.filter((r) => r.remaining > 0).length;
  if (!showAll) {
    filtered = rows.filter((r) => r.remaining > 0);
    if (filtered.length === 0) filtered = rows; // عرض الجميع برصيد صفر عند خلو الديون
  }

  const totalRemaining = Math.round(rows.reduce((s, r) => s + r.remaining, 0) * 100) / 100;
  const overdueSum = Math.round(rows.filter((r) => r.status === "overdue").reduce((s, r) => s + r.remaining, 0) * 100) / 100;

  return ok({
    debts: filtered,
    summary: {
      totalRemaining,
      debtors: debtorsCount,
      overdueCount: rows.filter((r) => r.status === "overdue").length,
      overdueSum,
    },
  });
}
