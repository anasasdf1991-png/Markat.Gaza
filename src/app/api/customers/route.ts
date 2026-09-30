import { and, desc, eq, isNotNull, or, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoices, payments } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";

/** GET /api/customers — قائمة العملاء مع الأرصدة */
export async function GET(req: Request) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const conds = [eq(customers.active, true)];
  if (q) {
    const like = `%${q}%`;
    conds.push(or(ilike(customers.name, like), ilike(customers.phone, like))!);
  }
  const billed = sql<string>`coalesce((select sum(cast(total as numeric)) from ${invoices} i where i.customer_id = ${customers.id} and i.status = 'completed'),0)`;
  const paidSum = sql<string>`coalesce((select sum(cast(amount as numeric)) from ${payments} p where p.customer_id = ${customers.id} and p.method is not null),0) + 0`;
  // دفعات العميل من الفواتير النقدية تسجّل بعميل فارغ؛ احسب من invoices.paid مباشرة
  const paidFromInvoices = sql<string>`coalesce((select sum(cast(paid as numeric)) from ${invoices} i where i.customer_id = ${customers.id} and i.status = 'completed'),0)`;

  const rows = await db.select({
    id: customers.id, name: customers.name, phone: customers.phone, address: customers.address,
    email: customers.email, idNumber: customers.idNumber, createdAt: customers.createdAt,
    totalBilled: billed,
    totalPaid: paidFromInvoices,
    invoicesCount: sql<number>`(select count(*) from ${invoices} i where i.customer_id = ${customers.id} and i.status = 'completed')`,
  }).from(customers).where(and(...conds)).orderBy(desc(customers.createdAt)).limit(300);

  return ok({
    customers: rows.map((r) => ({
      ...r,
      balance: Math.round(Math.max(0, Number(r.totalBilled) - Number(r.totalPaid)) * 100) / 100,
      totalBilled: Number(r.totalBilled),
      totalPaid: Number(r.totalPaid),
    })),
  });
}

/** POST /api/customers — إضافة عميل */
export async function POST(req: Request) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const b = await req.json();
  if (!b.name?.trim()) return fail("اسم العميل مطلوب");
  const [row] = await db.insert(customers).values({
    name: b.name.trim(),
    phone: b.phone?.trim() || null,
    address: b.address?.trim() || null,
    email: b.email?.trim() || null,
    idNumber: b.idNumber?.trim() || null,
    notes: b.notes?.trim() || null,
  }).returning();
  return ok({ customer: row }, 201);
}
