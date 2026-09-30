import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoices, payments, users } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";

/** GET /api/customers/:id — حساب العميل الكامل (فواتير + دفعات + كشف حساب) */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const cid = Number(id);
  const [customer] = await db.select().from(customers).where(eq(customers.id, cid)).limit(1);
  if (!customer) return fail("العميل غير موجود", 404);

  const invs = await db.select({
    id: invoices.id, status: invoices.status, paymentMethod: invoices.paymentMethod,
    total: invoices.total, paid: invoices.paid, dueDate: invoices.dueDate,
    createdAt: invoices.createdAt, cashier: users.fullName,
  }).from(invoices).leftJoin(users, eq(invoices.userId, users.id))
    .where(eq(invoices.customerId, cid)).orderBy(desc(invoices.createdAt));

  const pays = await db.select({
    id: payments.id, invoiceId: payments.invoiceId, amount: payments.amount,
    method: payments.method, type: payments.type, note: payments.note,
    createdAt: payments.createdAt, by: users.fullName,
  }).from(payments).leftJoin(users, eq(payments.createdBy, users.id))
    .where(eq(payments.customerId, cid)).orderBy(desc(payments.createdAt));

  const completed = invs.filter((i) => i.status === "completed");
  const totalBilled = completed.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = completed.reduce((s, i) => s + Number(i.paid), 0);
  const balance = Math.round(Math.max(0, totalBilled - totalPaid) * 100) / 100;

  // كشف حساب بالترتيب الزمني (ledger)
  type Entry = { date: string; kind: "invoice" | "payment"; debit: number; credit: number; balance: number; ref: string; note: string };
  const entries: Entry[] = [];
  for (const i of completed) {
    entries.push({
      date: String(i.createdAt), kind: "invoice", debit: Number(i.total), credit: 0, balance: 0,
      ref: `INV-${String(i.id).padStart(6, "0")}`,
      note: i.paymentMethod === "credit" ? "فاتورة بيع آجل" : "فاتورة بيع",
    });
  }
  for (const p of pays) {
    entries.push({
      date: String(p.createdAt), kind: "payment", debit: 0, credit: Number(p.amount),
      balance: 0, ref: p.invoiceId ? `INV-${String(p.invoiceId).padStart(6, "0")}` : `PAY-${p.id}`,
      note: p.type === "debt" ? `دفعة سداد (${p.note || "بدون ملاحظة"})` : "دفعة عند البيع",
    });
  }
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let bal = 0;
  for (const e of entries) { bal = Math.round((bal + e.debit - e.credit) * 100) / 100; e.balance = bal; }

  return ok({
    customer,
    summary: {
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      balance,
      invoicesCount: completed.length,
      paymentsCount: pays.filter((p) => p.type === "debt").length,
      lastPayment: pays[0]?.createdAt ?? null,
    },
    invoices: invs.map((i) => ({ ...i, remaining: Math.round((Number(i.total) - Number(i.paid)) * 100) / 100 })),
    payments: pays,
    statement: entries.reverse(),
  });
}

/** PUT /api/customers/:id — تعديل بيانات عميل */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const b = await req.json();
  const [c] = await db.select().from(customers).where(eq(customers.id, Number(id))).limit(1);
  if (!c) return fail("العميل غير موجود", 404);
  await db.update(customers).set({
    name: b.name ?? c.name,
    phone: b.phone !== undefined ? (b.phone || null) : c.phone,
    address: b.address !== undefined ? (b.address || null) : c.address,
    email: b.email !== undefined ? (b.email || null) : c.email,
    idNumber: b.idNumber !== undefined ? (b.idNumber || null) : c.idNumber,
    notes: b.notes !== undefined ? (b.notes || null) : c.notes,
  }).where(eq(customers.id, Number(id)));
  return ok({ ok: true });
}

/** DELETE /api/customers/:id — أرشفة عميل */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("manage_customers");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  await db.update(customers).set({ active: false }).where(eq(customers.id, Number(id)));
  return ok({ ok: true });
}
