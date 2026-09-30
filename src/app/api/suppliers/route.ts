import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { suppliers, purchases, products } from "@/db/schema";
import { ok, fail, requireUser, requireAny } from "@/lib/http";

/** GET /api/suppliers — الموردون مع الديون */
export async function GET(req: Request) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const conds = [eq(suppliers.active, true)];
  if (q) conds.push(ilike(suppliers.name, `%${q}%`));

  const rows = await db.select({
    id: suppliers.id, name: suppliers.name, phone: suppliers.phone, email: suppliers.email,
    address: suppliers.address, company: suppliers.company, createdAt: suppliers.createdAt,
    totalPurchases: sql<string>`coalesce((select sum(cast(amount as numeric)) from ${purchases} p where p.supplier_id = ${suppliers.id}),0)`,
    totalPaid: sql<string>`coalesce((select sum(cast(paid as numeric)) from ${purchases} p where p.supplier_id = ${suppliers.id}),0)`,
    purchasesCount: sql<number>`(select count(*) from ${purchases} p where p.supplier_id = ${suppliers.id})`,
    productsCount: sql<number>`(select count(*) from ${products} pr where pr.supplier_id = ${suppliers.id} and pr.active)`,
  }).from(suppliers).where(and(...conds)).orderBy(desc(suppliers.createdAt));

  return ok({
    suppliers: rows.map((r) => ({
      ...r,
      totalPurchases: Number(r.totalPurchases),
      totalPaid: Number(r.totalPaid),
      debt: Math.round((Number(r.totalPurchases) - Number(r.totalPaid)) * 100) / 100,
    })),
  });
}

/** POST /api/suppliers — إضافة مورد */
export async function POST(req: Request) {
  const guard = await requireAny(["manage_suppliers"]);
  if ("res" in guard) return guard.res;
  const b = await req.json();
  if (!b.name?.trim()) return fail("اسم المورد مطلوب");
  const [row] = await db.insert(suppliers).values({
    name: b.name.trim(), phone: b.phone?.trim() || null, email: b.email?.trim() || null,
    address: b.address?.trim() || null, company: b.company?.trim() || null, notes: b.notes?.trim() || null,
  }).returning();
  return ok({ supplier: row }, 201);
}
