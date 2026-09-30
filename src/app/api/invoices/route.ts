import { and, desc, eq, inArray, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, products, customers, users, payments, stockMovements, promotions } from "@/db/schema";
import { ok, fail, requireUser, requireAny, num, round2 } from "@/lib/http";
import { invoiceNo } from "@/lib/format";
import { audit, getClientIp } from "@/lib/system";
import { bestPromoForLine, type PromotionRule } from "@/lib/promotions";

/** GET /api/invoices — قائمة الفواتير مع فلاتر */
export async function GET(req: Request) {
  const guard = await requireAny(["sell", "view_reports", "collect_debt", "view_profits"]);
  if ("res" in guard) return guard.res;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const range = searchParams.get("range"); // today | week | month
  const customerId = searchParams.get("customerId");

  const conds = [];
  if (status === "suspended") conds.push(eq(invoices.status, "suspended"));
  else if (status === "voided") conds.push(eq(invoices.status, "voided"));
  else conds.push(eq(invoices.status, "completed"));
  if (customerId && Number(customerId)) conds.push(eq(invoices.customerId, Number(customerId)));
  if (range === "today") conds.push(sql`${invoices.createdAt} >= date_trunc('day', now())`);
  if (range === "week") conds.push(sql`${invoices.createdAt} >= now() - interval '7 days'`);
  if (range === "month") conds.push(sql`${invoices.createdAt} >= now() - interval '30 days'`);
  if (q) {
    const like = `%${q}%`;
    if (/^\d+$/.test(q)) conds.push(eq(invoices.id, Number(q.replace(/^0+/, "") || "0")));
    else conds.push(sql`lower(${invoices.suspendedLabel}::text) like ${like.toLowerCase()} or exists (select 1 from ${customers} c where c.id = ${invoices.customerId} and c.name ilike ${like})`);
  }

  const rows = await db.select({
    id: invoices.id, customerId: invoices.customerId, customerName: customers.name,
    cashier: users.fullName, status: invoices.status, paymentMethod: invoices.paymentMethod,
    subtotal: invoices.subtotal, discount: invoices.discount, tax: invoices.tax,
    total: invoices.total, paid: invoices.paid, change: invoices.changeAmount,
    notes: invoices.notes, dueDate: invoices.dueDate, label: invoices.suspendedLabel,
    createdAt: invoices.createdAt,
    itemsCount: sql<number>`(select count(*) from ${invoiceItems} ii where ii.invoice_id = ${invoices.id})`,
  })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(users, eq(invoices.userId, users.id))
    .where(and(...conds))
    .orderBy(desc(invoices.createdAt))
    .limit(200);

  return ok({ invoices: rows });
}

type InItem = { productId: number; qty: number; price?: number; discountPct?: number; productName?: string; unit?: string; taxRate?: number; sourcePrice?: boolean };

/** POST /api/invoices — إنشاء فاتورة بيع أو فاتورة معلقة أو دين يدوي */
export async function POST(req: Request) {
  // ── تسجيل دين افتتاحي (بدون فاتورة بيع) — يتطلب صلاحية الديون فقط ──
  const preview = await req.json().catch(() => ({}));
  if (preview.manualDebt === true) {
    const g = await requireUser("add_debt");
    if ("res" in g) return g.res;
    const customerId = Number(preview.customerId);
    const amount = round2(num(preview.amount));
    if (!customerId) return fail("اختر العميل");
    if (amount <= 0) return fail("أدخل مبلغ الدين");
    const [inv] = await db.insert(invoices).values({
      customerId,
      userId: g.user.id,
      status: "completed",
      paymentMethod: "credit",
      subtotal: String(amount),
      discount: "0",
      tax: "0",
      total: String(amount),
      paid: "0",
      changeAmount: "0",
      notes: preview.note?.trim() || "دين مسجل يدويًا (رصيد افتتاحي)",
      dueDate: preview.dueDate || null,
    }).returning();
    await audit({ user: g.user, action: "debt_create", entity: "customer", entityId: customerId, ip: getClientIp(req), meta: { amount, invoiceId: inv.id } });
    return ok({ invoice: { id: inv.id }, ok: true }, 201);
  }

  const guard = await requireUser("sell");
  if ("res" in guard) return guard.res;
  try {
    const b = preview;
    const items: InItem[] = Array.isArray(b.items) ? b.items : [];

    // ── منع تكرار فواتير الأوفلاين: نفس clientRef = نفس الفاتورة (Idempotent) ──
    const clientRef = typeof b.clientRef === "string" && b.clientRef.length >= 8 ? b.clientRef.slice(0, 64) : null;
    if (clientRef) {
      const existing = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.clientRef, clientRef))
        .limit(1);
      if (existing[0]) {
        const [inv] = await db.select().from(invoices).where(eq(invoices.id, existing[0].id)).limit(1);
        const its = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, existing[0].id));
        return ok({ invoice: inv, items: its, deduped: true }, 200);
      }
    }

    if (!items.length) return fail("لا توجد أصناف في الفاتورة");
    const suspended = b.status === "suspended";
    const customerId = b.customerId ? Number(b.customerId) : null;
    const invoiceDiscount = round2(Math.max(0, num(b.invoiceDiscount)));

    // تحميل المنتجات من قاعدة البيانات
    const ids = items.map((i) => Number(i.productId)).filter(Boolean);
    const dbProducts = await db.select().from(products).where(inArray(products.id, ids));
    const pmap = new Map(dbProducts.map((p) => [p.id, p]));

    const canEditPrice = guard.user.permissions.includes("edit_price");
    // جلب العروض النشطة لتطبيقها تلقائيًا (مصدر الحقيقة الوحيد — الخادم)
    const activePromos = (await db.select().from(promotions).where(eq(promotions.active, true))).map((r) => ({
      id: r.id, name: r.name, type: r.type as PromotionRule["type"], value: num(r.value),
      buyQty: num(r.buyQty), scope: r.scope as PromotionRule["scope"], targetId: r.targetId,
      startDate: r.startDate, endDate: r.endDate, active: r.active,
    }));

    const usedPromoNames = new Set<string>();
    const lineItems: {
      productId: number; name: string; unit: string; price: number; cost: number;
      qty: number; discPct: number; taxRate: number; line: number; disc: number; tax: number; total: number;
    }[] = [];
    let subtotal = 0, itemsDiscount = 0, taxSum = 0;

    for (const it of items) {
      const p = pmap.get(Number(it.productId));
      const qty = num(it.qty);
      if (!p || qty <= 0) return fail("يوجد صنف غير صالح في الفاتورة");
      const price = canEditPrice && it.price !== undefined && num(it.price) > 0 ? num(it.price) : num(p.salePrice);
      // خصم المستخدم + خصم العرض التلقائي
      const manualDisc = canEditPrice ? Math.min(90, Math.max(0, num(it.discountPct))) : 0;
      const line = round2(price * qty);
      let disc = round2(line * manualDisc / 100);
      const promoHit = bestPromoForLine(activePromos, {
        productId: p.id, categoryId: p.categoryId, qty, price: round2((line - disc) / Math.max(qty, 0.001)),
      });
      if (promoHit.discount > 0 && !suspended) {
        disc = round2(Math.min(line, disc + promoHit.discount));
        if (promoHit.promo) usedPromoNames.add(promoHit.promo.name);
      }
      const net = round2(line - disc);
      const tax = round2(net * num(p.taxRate) / 100);
      subtotal = round2(subtotal + line);
      itemsDiscount = round2(itemsDiscount + disc);
      taxSum = round2(taxSum + tax);
      lineItems.push({
        productId: p.id, name: p.name, unit: p.unit, price, cost: num(p.purchasePrice),
        qty, discPct: manualDisc, taxRate: num(p.taxRate), line, disc, tax, total: round2(net + tax),
      });
    }

    const discount = round2(itemsDiscount + Math.min(invoiceDiscount, subtotal - itemsDiscount));
    const total = round2(subtotal - discount + taxSum);

    let paid = 0, change = 0, method: string = b.paymentMethod || "cash";
    const pays: { method: string; amount: number }[] = Array.isArray(b.payments) ? b.payments : [];

    if (!suspended) {
      paid = round2(pays.reduce((s, p) => s + num(p.amount), 0));
      if (pays.length > 1) method = "mixed";
      const remaining = round2(total - paid);
      if (remaining > 0.009) {
        // بيع آجل — يتطلب عميل + صلاحية
        if (!guard.user.permissions.includes("add_debt")) return fail("الدفع الآجل يتطلب صلاحية تسجيل الديون", 403);
        if (!customerId) return fail("الدفع الآجل يتطلب اختيار عميل مسجل", 400);
        method = "credit";
      }
      if (paid > total) {
        change = round2(paid - total);
        paid = total;
      }
    }

    // معاملة واحدة: قفل اتفاقي للكاشير + فحص التكرار + الإدراج تحته (آمن ضد السباق التزامني)
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${guard.user.id + 7331})`);
      if (!suspended && !clientRef) {
        const d = await tx.execute(sql`
          SELECT id FROM invoices
          WHERE user_id = ${guard.user.id}
            AND status = 'completed'
            AND total::numeric = ${total}
            AND created_at > now() - interval '3 seconds'
          LIMIT 1`);
        if (d.rows[0]) {
          return { dupId: Number((d.rows[0] as { id: number }).id), id: 0 };
        }
      }
      const [inv] = await tx.insert(invoices).values({
        customerId,
        userId: guard.user.id,
        status: suspended ? "suspended" : "completed",
        paymentMethod: suspended ? "cash" : method,
        subtotal: String(subtotal),
        discount: String(discount),
        tax: String(taxSum),
        total: String(total),
        paid: String(paid),
        changeAmount: String(change),
        notes: b.notes?.trim() || null,
        dueDate: b.dueDate || null,
        suspendedLabel: b.suspendedLabel?.trim() || null,
        clientRef,
      }).returning();

      for (const li of lineItems) {
        await tx.insert(invoiceItems).values({
          invoiceId: inv.id, productId: li.productId, productName: li.name, unit: li.unit,
          price: String(li.price), cost: String(li.cost), qty: String(li.qty),
          discountPct: String(li.discPct), taxRate: String(li.taxRate), total: String(li.total),
        });
        if (!suspended) {
          await tx.update(products)
            .set({ stock: sql`cast(${products.stock} as numeric) - ${li.qty}` })
            .where(eq(products.id, li.productId));
          await tx.insert(stockMovements).values({
            productId: li.productId, change: String(-li.qty), type: "sale",
            refId: inv.id, note: `فاتورة بيع ${invoiceNo(inv.id)}`,
          });
        }
      }

      if (!suspended && paid > 0) {
        for (const p of pays) {
          if (num(p.amount) > 0) {
            await tx.insert(payments).values({
              invoiceId: inv.id, customerId, amount: String(Math.min(num(p.amount), total)),
              method: p.method || "cash", type: "sale", note: null, createdBy: guard.user.id,
            });
          }
        }
      }
      return { dupId: null, id: inv.id };
    });

    // نتيجة الفحص: فاتورة مكررة موجودة أصلًا — أعِدها بلا أي خصم مخزون مكرر
    if (result.dupId !== null) {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, result.dupId)).limit(1);
      const its2 = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, result.dupId));
      return ok({ invoice: inv, items: its2, deduped: true }, 200);
    }
    const invoiceId = result.id;

    // إرجاع الفاتورة كاملة
    const [inv] = await db.select({
      id: invoices.id, status: invoices.status, paymentMethod: invoices.paymentMethod,
      subtotal: invoices.subtotal, discount: invoices.discount, tax: invoices.tax,
      total: invoices.total, paid: invoices.paid, change: invoices.changeAmount,
      notes: invoices.notes, dueDate: invoices.dueDate, createdAt: invoices.createdAt,
      customerName: customers.name, customerPhone: customers.phone, cashier: users.fullName,
    }).from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(users, eq(invoices.userId, users.id))
      .where(eq(invoices.id, invoiceId));
    const its = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));

    await audit({
      user: guard.user, action: suspended ? "sale_suspend" : "sale",
      entity: "invoice", entityId: invoiceId, ip: getClientIp(req),
      meta: {
        total, paid, method: suspended ? "suspended" : method, items: lineItems.length,
        credit: !suspended && total - paid > 0.009,
        offline: !!clientRef, clientRef,
        promos: [...usedPromoNames],
      },
    });

    return ok({ invoice: inv, items: its }, 201);
  } catch (e) {
    console.error(e);
    return fail("تعذر حفظ الفاتورة", 500);
  }
}
