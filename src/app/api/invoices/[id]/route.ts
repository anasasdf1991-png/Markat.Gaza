import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, customers, users, products, stockMovements } from "@/db/schema";
import { ok, fail, requireAny, requireUser } from "@/lib/http";

export async function loadInvoice(id: number) {
  const [inv] = await db.select({
    id: invoices.id, customerId: invoices.customerId, status: invoices.status, paymentMethod: invoices.paymentMethod,
    subtotal: invoices.subtotal, discount: invoices.discount, tax: invoices.tax,
    total: invoices.total, paid: invoices.paid, change: invoices.changeAmount,
    notes: invoices.notes, dueDate: invoices.dueDate, createdAt: invoices.createdAt,
    customerName: customers.name, customerPhone: customers.phone, customerAddress: customers.address,
    cashier: users.fullName, label: invoices.suspendedLabel,
  }).from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(users, eq(invoices.userId, users.id))
    .where(eq(invoices.id, id));
  if (!inv) return null;
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  return { invoice: inv, items };
}

/** GET /api/invoices/:id — تفاصيل فاتورة */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAny(["sell", "view_reports", "collect_debt", "view_profits"]);
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const data = await loadInvoice(Number(id));
  if (!data) return fail("الفاتورة غير موجودة", 404);
  return ok(data);
}

/** DELETE /api/invoices/:id — حذف فاتورة معلقة فقط */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("sell");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const data = await loadInvoice(Number(id));
  if (!data) return fail("الفاتورة غير موجودة", 404);
  if (data.invoice.status !== "suspended") return fail("لا يمكن حذف إلا الفواتير المعلقة");
  await db.transaction(async (tx) => {
    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, data.invoice.id));
    await tx.delete(invoices).where(eq(invoices.id, data.invoice.id));
  });
  return ok({ ok: true });
}
