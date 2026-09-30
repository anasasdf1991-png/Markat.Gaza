import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, products, stockMovements } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

/** POST /api/invoices/:id/void — إلغاء فاتورة (مع إرجاع المخزون) */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("void_invoice");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const invId = Number(id);

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invId)).limit(1);
  if (!inv) return fail("الفاتورة غير موجودة", 404);
  if (inv.status !== "completed") return fail("لا يمكن إلغاء هذه الفاتورة");

  await db.transaction(async (tx) => {
    await tx.update(invoices).set({ status: "voided" }).where(eq(invoices.id, invId));
    const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invId));
    for (const it of items) {
      if (it.productId) {
        await tx.update(products)
          .set({ stock: sql`cast(${products.stock} as numeric) + ${Number(it.qty)}` })
          .where(eq(products.id, it.productId));
        await tx.insert(stockMovements).values({
          productId: it.productId, change: String(Number(it.qty)), type: "void",
          refId: invId, note: `إرجاع بضاعة من فاتورة ملغاة INV-${invId}`,
        });
      }
    }
  });
  await audit({ user: guard.user, action: "sale_cancel", entity: "invoice", entityId: invId, ip: getClientIp(_req), meta: { total: Number(inv.total), before: "completed", after: "voided" } });
  return ok({ ok: true });
}
