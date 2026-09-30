import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, invoices } from "@/db/schema";
import { ok, fail, requireUser, num, round2 } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

/**
 * POST /api/payments — تسجيل دفعة / تحصيل دين لزبون
 * يتم تسجيل الدفعة وتوزيعها تلقائيًا على فواتير وديون الزبون الآجلة (الأقدم أولًا)
 */
export async function POST(req: Request) {
  const guard = await requireUser("collect_debt");
  if ("res" in guard) return guard.res;
  try {
    const b = await req.json();
    const customerId = Number(b.customerId);
    const amount = round2(num(b.amount));
    if (!customerId) return fail("يرجى اختيار الزبون");
    if (amount <= 0) return fail("أدخل مبلغ الدفعة بشكل صحيح");

    // حماية من الضغط المزدوج: نفس الزبون+المبلغ خلال 5 ثوانٍ = الدفعة نفسها (Idempotent)
    const dup = await db.execute(sql`
      SELECT id FROM payments
      WHERE customer_id = ${customerId}
        AND amount::numeric = ${amount}
        AND type = 'debt'
        AND created_at > now() - interval '5 seconds'
      LIMIT 1
    `);
    if (dup.rows.length > 0) {
      return ok({ ok: true, allocated: amount, deduped: true, message: "هذه الدفعة مسجلة مسبقًا" }, 200);
    }

    // جلب فواتير الديون غير المسددة للزبون
    const unpaid = await db.select()
      .from(invoices)
      .where(and(
        eq(invoices.customerId, customerId),
        eq(invoices.status, "completed"),
        sql`cast(total as numeric) > cast(paid as numeric) + 0.001`,
      ))
      .orderBy(asc(invoices.createdAt));

    await db.transaction(async (tx) => {
      await tx.insert(payments).values({
        customerId,
        amount: String(amount),
        method: b.method || "cash",
        type: "debt",
        note: b.note?.trim() || "دفعة سداد دين",
        createdBy: guard.user.id,
      });

      // توزيع FIFO على فواتير الديون المفتوحة
      let pool = amount;
      for (const inv of unpaid) {
        if (pool <= 0.009) break;
        const remaining = Number(inv.total) - Number(inv.paid);
        const apply = Math.min(pool, remaining);
        await tx.update(invoices)
          .set({ paid: sql`cast(${invoices.paid} as numeric) + ${round2(apply)}` })
          .where(eq(invoices.id, inv.id));
        pool = round2(pool - apply);
      }
    });

    await audit({
      user: guard.user,
      action: "debt_payment",
      entity: "customer",
      entityId: customerId,
      ip: getClientIp(req),
      meta: { amount, method: b.method || "cash", note: b.note || null },
    });

    return ok({ ok: true, allocated: amount, message: "تم تسجيل الدفعة بنجاح" }, 201);
  } catch (e) {
    console.error("Payment error:", e);
    return fail("تعذر تسجيل الدفعة، يرجى المحاولة مرة أخرى", 500);
  }
}
