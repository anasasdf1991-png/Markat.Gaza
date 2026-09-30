import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, customers, suppliers, invoices } from "@/db/schema";
import { ok, requireUser } from "@/lib/http";

/** GET /api/search?q= — بحث شامل (Ctrl+K) عبر المنتجات والعملاء والموردين والفواتير */
export async function GET(req: Request) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return ok({ products: [], customers: [], suppliers: [], invoices: [] });
  const like = `%${q}%`;

  const [prods, custs, sups] = await Promise.all([
    db.select({ id: products.id, name: products.name, barcode: products.barcode, salePrice: products.salePrice, stock: products.stock })
      .from(products).where(and(eq(products.active, true), or(ilike(products.name, like), ilike(products.barcode, like), ilike(products.sku, like)))).limit(6),
    db.select({ id: customers.id, name: customers.name, phone: customers.phone })
      .from(customers).where(and(eq(customers.active, true), or(ilike(customers.name, like), ilike(customers.phone, like)))).limit(6),
    db.select({ id: suppliers.id, name: suppliers.name, phone: suppliers.phone, company: suppliers.company })
      .from(suppliers).where(and(eq(suppliers.active, true), ilike(suppliers.name, like))).limit(5),
  ]);

  let invs: { id: number; total: string; createdAt: Date; customers: { name?: string | null } | null }[] = [];
  if (/^\d+$/.test(q) || /^0*\d+$/.test(q)) {
    const id = Number(q.replace(/^0+/, "") || "0");
    invs = await db.select({
      id: invoices.id, total: invoices.total, createdAt: invoices.createdAt,
      customers: sql<{ name: string | null } | null>`(select row_to_json(c) from ${customers} c where c.id = ${invoices.customerId})`,
    }).from(invoices).where(eq(invoices.id, id)).orderBy(desc(invoices.createdAt)).limit(5);
  }

  return ok({
    products: prods,
    customers: custs,
    suppliers: sups,
    invoices: invs.map((i) => ({ id: i.id, total: i.total, createdAt: i.createdAt, customer: i.customers?.name ?? "عميل نقدي" })),
  });
}
