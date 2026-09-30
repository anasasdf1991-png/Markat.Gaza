import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { purchases, suppliers, users } from "@/db/schema";
import { ok, fail, requireUser, num, round2 } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

/** GET /api/purchases — فواتير الشراء من الموردين */
export async function GET() {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const rows = await db.select({
    id: purchases.id, supplierId: purchases.supplierId, supplierName: suppliers.name,
    amount: purchases.amount, paid: purchases.paid, note: purchases.note,
    createdAt: purchases.createdAt, by: users.fullName,
  }).from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .leftJoin(users, eq(purchases.createdBy, users.id))
    .orderBy(desc(purchases.createdAt)).limit(150);

  const summary = rows.reduce(
    (s, r) => ({
      total: s.total + Number(r.amount),
      paid: s.paid + Number(r.paid),
    }),
    { total: 0, paid: 0 },
  );
  return ok({ purchases: rows, summary: { ...summary, debt: round2(summary.total - summary.paid) } });
}

/** POST /api/purchases — تسجيل فاتورة شراء */
export async function POST(req: Request) {
  const guard = await requireUser("manage_suppliers");
  if ("res" in guard) return guard.res;
  const b = await req.json();
  const supplierId = Number(b.supplierId);
  const amount = round2(num(b.amount));
  const paid = round2(Math.min(num(b.paid), amount));
  if (!supplierId) return fail("اختر المورد");
  if (amount <= 0) return fail("أدخل قيمة فاتورة الشراء");
  const [row] = await db.insert(purchases).values({
    supplierId, amount: String(amount), paid: String(paid),
    note: b.note?.trim() || null, createdBy: guard.user.id,
  }).returning();
  await audit({ user: guard.user, action: "purchase_create", entity: "purchase", entityId: row.id, ip: getClientIp(req), meta: { supplierId, amount, paid } });
  return ok({ purchase: row }, 201);
}
