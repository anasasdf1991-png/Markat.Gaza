import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { promotions, products, categories } from "@/db/schema";
import { ok, fail, requireUser, num } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

/** GET /api/promotions — قائمة العروض (النشطة أولًا) */
export async function GET() {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const rows = await db.select({
    id: promotions.id, name: promotions.name, type: promotions.type,
    value: promotions.value, buyQty: promotions.buyQty, scope: promotions.scope,
    targetId: promotions.targetId, startDate: promotions.startDate, endDate: promotions.endDate,
    active: promotions.active, createdAt: promotions.createdAt,
    targetName: sql<string | null>`
      case ${promotions.scope}
        when 'product' then (select name from ${products} where id = ${promotions.targetId})
        when 'category' then (select name from ${categories} where id = ${promotions.targetId})
        else 'كل المتجر'
      end`,
  }).from(promotions).orderBy(desc(promotions.active), desc(promotions.createdAt)).limit(100);
  return ok({ promotions: rows });
}

/** POST /api/promotions — إنشاء عرض (manage_inventory) */
export async function POST(req: Request) {
  const guard = await requireUser("manage_inventory");
  if ("res" in guard) return guard.res;
  const b = await req.json().catch(() => ({}));
  if (!b.name?.trim()) return fail("اسم العرض مطلوب");
  if (!["percent", "fixed", "bundle", "bogo"].includes(b.type)) return fail("نوع العرض غير صالح");
  if (!["product", "category", "all"].includes(b.scope)) return fail("نطاق العرض غير صالح");
  const value = num(b.value);
  if (b.type === "percent" && (value <= 0 || value > 100)) return fail("النسبة يجب أن تكون بين 0 و 100");
  if (b.type !== "percent" && value <= 0) return fail("أدخل قيمة العرض");
  if (["bundle", "bogo"].includes(b.type) && num(b.buyQty) <= 0) return fail("أدخل الكمية المطلوبة للتفعيل");
  if (b.scope !== "all" && !b.targetId) return fail("حدد المنتج أو القسم المستهدف");

  const [row] = await db.insert(promotions).values({
    name: b.name.trim(), type: b.type, scope: b.scope,
    value: String(value), buyQty: String(num(b.buyQty)),
    targetId: b.targetId ? Number(b.targetId) : null,
    startDate: b.startDate || null, endDate: b.endDate || null,
    active: b.active !== false,
    createdBy: guard.user.id,
  }).returning();
  await audit({ user: guard.user, action: "promo_create", entity: "promotion", entityId: row.id, ip: getClientIp(req), meta: { name: row.name, type: row.type } });
  return ok({ promotion: row }, 201);
}
