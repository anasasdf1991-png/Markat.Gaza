import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoices, payments, invoiceItems } from "@/db/schema";
import { ok, fail, requireUser, num, round2 } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

/**
 * PUT /api/debts/edit — تعديل بيانات دين عميل (صلاحية edit_debt)
 *
 * قواعد ثابتة لا يمكن كسرها:
 *   Remaining = Original − Paid
 *   • لا قيم سالبة في أي مبلغ
 *   • المدفوع لا يتجاوز أصل الدين
 *   • لا يُخفَّض إجمالي المدفوعات المسجّلة (استخدم مستندًا عكسيًا)
 *   • تعديل أصل الدين للمديرين فقط، والتخفيض يمسّ الديون اليدوية فقط دون فواتير المبيعات
 *   • الحالة تُشتق تلقائيًا: unpaid | partial | paid | overdue
 */
export async function PUT(req: Request) {
  const guard = await requireUser("edit_debt");
  if ("res" in guard) return guard.res;
  try {
    const b = await req.json().catch(() => ({}));
    const customerId = Number(b.customerId);
    if (!customerId) return fail("العميل غير صالح");

    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) return fail("العميل غير موجود", 404);

    const managerPlus = guard.user.role === "admin" || guard.user.role === "manager";

    // الوضع الحالي (الحقيقة المالية من قاعدة البيانات)
    const invs = await db.select().from(invoices)
      .where(and(eq(invoices.customerId, customerId), eq(invoices.status, "completed")))
      .orderBy(asc(invoices.createdAt));
    const origCur = round2(invs.reduce((s, i) => s + num(i.total), 0));
    const paidCur = round2(invs.reduce((s, i) => s + num(i.paid), 0));

    const hasOrig = b.original !== undefined && b.original !== null && b.original !== "";
    const hasPaid = b.paid !== undefined && b.paid !== null && b.paid !== "";
    const targetOrig = round2(hasOrig ? num(b.original) : origCur);
    const targetPaid = round2(hasPaid ? num(b.paid) : paidCur);

    // ═══ التحققات ═══
    if (!Number.isFinite(targetOrig) || !Number.isFinite(targetPaid)) return fail("قيم غير صالحة");
    if (targetOrig < 0 || targetPaid < 0) return fail("لا تُقبل قيم مالية سالبة");
    if (hasOrig && !managerPlus) return fail("تعديل أصل الدين متاح للمديرين فقط", 403);
    if (targetPaid > targetOrig + 0.004) return fail("لا يمكن أن يتجاوز المبلغ المدفوع أصل الدين — المعادلة: المتبقي = الأصل − المدفوع");
    if (hasPaid && targetPaid < paidCur - 0.004) return fail("لا يمكن خفض إجمالي المدفوعات المسجّلة — سجّل مستندًا عكسيًا بدلًا من ذلك");

    // ═══ 1) بيانات العميل ═══
    if (b.name !== undefined && String(b.name).trim() && String(b.name).trim() !== customer.name) {
      if (!managerPlus && !guard.user.permissions.includes("manage_customers")) {
        return fail("لا تملك صلاحية تعديل اسم العميل", 403);
      }
      await db.update(customers).set({ name: String(b.name).trim() }).where(eq(customers.id, customerId));
    }
    if (b.phone !== undefined) {
      await db.update(customers).set({ phone: String(b.phone ?? "").trim() || null }).where(eq(customers.id, customerId));
    }

    // ═══ 2) تعديل أصل الدين (ΔOriginal) ═══
    const delta = round2(targetOrig - origCur);
    if (Math.abs(delta) > 0.004) {
      if (delta > 0) {
        // زيادة: إنشاء سجل تسوية (دين يدوي مضاف)
        await db.insert(invoices).values({
          customerId, userId: guard.user.id, status: "completed", paymentMethod: "credit",
          subtotal: String(delta), discount: "0", tax: "0", total: String(delta), paid: "0",
          changeAmount: "0",
          notes: String(b.notes ?? "").trim() || "تعديل على أصل الدين (تسوية يدوية)",
          dueDate: b.dueDate || null,
        });
      } else {
        // تخفيض: فقط من فواتير الدين اليدوية (بدون أصناف)، الأحدث أولًا، دون النزول تحت المدفوع
        let need = round2(-delta);
        const itemfulRows = await db.execute(sql`
          SELECT DISTINCT invoice_id FROM invoice_items WHERE invoice_id IN (
            SELECT id FROM invoices WHERE customer_id = ${customerId} AND status = 'completed'
          )`);
        const itemful = new Set(itemfulRows.rows.map((r) => Number((r as { invoice_id: number }).invoice_id)));
        const manualOpen = invs
          .filter((i) => !itemful.has(i.id) && num(i.total) > num(i.paid) + 0.004)
          .reverse();

        for (const inv of manualOpen) {
          if (need <= 0.004) break;
          const floorPaid = num(inv.paid);
          const reducible = round2(num(inv.total) - floorPaid);
          if (reducible <= 0.004) continue;
          const cut = round2(Math.min(reducible, need));
          const newTotal = round2(num(inv.total) - cut);
          if (newTotal <= 0.004 && floorPaid <= 0.004) {
            await db.delete(invoices).where(eq(invoices.id, inv.id));
          } else {
            await db.update(invoices).set({ total: String(Math.max(newTotal, floorPaid)) })
              .where(eq(invoices.id, inv.id));
          }
          need = round2(need - cut);
        }
        if (need > 0.004) {
          return fail("لا يمكن تخفيض أصل الدين لهذا الحد — المدفوعات المسجلة أعلى من التخفيض المتاح دون أن يصبح المتبقي سالبًا");
        }
      }
    }

    // ═══ 3) تعديل المدفوع (ΔPaid — زيادة فقط كدفعة سداد موزَّعة) ═══
    const deltaP = round2(targetPaid - paidCur);
    if (deltaP > 0.004) {
      await db.transaction(async (tx) => {
        await tx.insert(payments).values({
          customerId, amount: String(deltaP), method: ["cash", "card", "bank"].includes(b.method) ? b.method : "cash",
          type: "debt", note: "تعديل مبلغ مدفوع عبر شاشة تعديل الدين", createdBy: guard.user.id,
        });
        const unpaid = await tx.select().from(invoices)
          .where(and(
            eq(invoices.customerId, customerId),
            eq(invoices.status, "completed"),
            sql`cast(total as numeric) > cast(paid as numeric) + 0.001`,
          )).orderBy(asc(invoices.createdAt));
        let pool = deltaP;
        for (const inv of unpaid) {
          if (pool <= 0.004) break;
          const rem = num(inv.total) - num(inv.paid);
          const apply = round2(Math.min(pool, rem));
          pool = round2(pool - apply);
          await tx.update(invoices)
            .set({ paid: sql`cast(${invoices.paid} as numeric) + ${apply}` })
            .where(eq(invoices.id, inv.id));
        }
        if (pool > 0.004) throw new Error("excess-payment");
      });
    }

    // ═══ 4) تاريخ الاستحقاق + الملاحظات ═══
    const openCond = and(
      eq(invoices.customerId, customerId),
      eq(invoices.status, "completed"),
      sql`cast(total as numeric) > cast(paid as numeric) + 0.001`,
    );
    if (typeof b.dueDate === "string" && b.dueDate) {
      await db.update(invoices).set({ dueDate: b.dueDate }).where(openCond);
    }
    if (typeof b.notes === "string" && b.notes.trim()) {
      const [newest] = await db.select({ id: invoices.id }).from(invoices).where(openCond)
        .orderBy(desc(invoices.createdAt)).limit(1);
      if (newest) await db.update(invoices).set({ notes: b.notes.trim() }).where(eq(invoices.id, newest.id));
    }

    // ═══ 5) إعادة الحساب النهائية والحالة المشتقة ═══
    const [after] = await db.select({
      t: sql<string>`coalesce(sum(cast(total as numeric)),0)`,
      p: sql<string>`coalesce(sum(cast(paid as numeric)),0)`,
    }).from(invoices).where(and(eq(invoices.customerId, customerId), eq(invoices.status, "completed")));
    const afterOrig = round2(num(after?.t));
    const afterPaid = round2(num(after?.p));
    const remaining = round2(afterOrig - afterPaid);
    const status = remaining <= 0.004 ? "paid" : afterPaid <= 0.004 ? "unpaid" : "partial";

    // ═══ 6) سجل التدقيق (مستخدم/عميل/معرف/قبل/بعد/وقت) ═══
    await audit({
      user: guard.user,
      action: "debt_edit",
      entity: "customer",
      entityId: customerId,
      ip: getClientIp(req),
      meta: {
        customer: customer.name,
        before: { original: origCur, paid: paidCur, remaining: round2(origCur - paidCur) },
        after: { original: afterOrig, paid: afterPaid, remaining, status },
        changed: {
          name: String(b.name ?? "").trim() && b.name !== customer.name,
          phone: b.phone !== undefined,
          dueDate: b.dueDate || null,
          notes: !!String(b.notes ?? "").trim(),
        },
      },
    });

    return ok({
      ok: true,
      debt: { original: afterOrig, paid: afterPaid, remaining, status },
      message: "تم تحديث بيانات الدين بنجاح",
    });
  } catch (e) {
    console.error("debt_edit error", e);
    if (String(e).includes("excess-payment")) return fail("تجاوز المدفوع أصل الدين — تحقق من القيم");
    return fail("تعذر تحديث الدين، يرجى المحاولة مرة أخرى", 500);
  }
}
