import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, stockAdjustments, stockMovements, categories } from "@/db/schema";
import { ok, fail, requireUser, num, round2 } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

const ADJUST_TYPES: Record<string, string> = {
  damaged: "تالف", expired: "منتهي", lost: "مفقود", broken: "مكسور",
  personal: "استخدام شخصي", count: "تسوية جرد", adjust: "تعديل",
};

/**
 * GET  /api/inventory           — المخزون مع آخر بيع وتحليل الراكد (30/60/90/180 يوم)
 * GET  /api/inventory?adjustments=1 — سجل التسويات والتلف
 * POST /api/inventory           — تنفيذ تسوية/شطب (manage_inventory)
 */
export async function GET(req: Request) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { searchParams } = new URL(req.url);

  if (searchParams.get("adjustments") === "1") {
    const rows = await db.select({
      id: stockAdjustments.id, productId: stockAdjustments.productId,
      productName: products.name, type: stockAdjustments.type,
      qty: stockAdjustments.qty, reason: stockAdjustments.reason,
      createdAt: stockAdjustments.createdAt,
    }).from(stockAdjustments)
      .leftJoin(products, eq(stockAdjustments.productId, products.id))
      .orderBy(desc(stockAdjustments.createdAt)).limit(100);
    return ok({ adjustments: rows, types: ADJUST_TYPES });
  }

  const rows = await db.select({
    id: products.id, name: products.name, barcode: products.barcode, unit: products.unit,
    stock: products.stock, minStock: products.minStock,
    purchasePrice: products.purchasePrice, salePrice: products.salePrice,
    categoryName: categories.name, expiryDate: products.expiryDate,
    lastSaleAt: sql<string | null>`(
      select max(iv.created_at) from invoice_items ii
      join invoices iv on ii.invoice_id = iv.id
      where ii.product_id = ${products.id} and iv.status = 'completed'
    )`,
  }).from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.active, true))
    .orderBy(products.name)
    .limit(600);

  const now = Date.now();
  const data = rows.map((r) => {
    const lastSale = r.lastSaleAt ? new Date(r.lastSaleAt) : null;
    const days = lastSale ? Math.floor((now - lastSale.getTime()) / 86400000) : 9999;
    return {
      ...r,
      stock: num(r.stock),
      value: round2(num(r.stock) * num(r.purchasePrice)),
      lastSaleAt: r.lastSaleAt,
      dead: days >= 180 ? 180 : days >= 90 ? 90 : days >= 60 ? 60 : days >= 30 ? 30 : 0,
    };
  });

  return ok({
    products: data,
    summary: {
      totalValue: round2(data.reduce((s: number, p) => s + p.value, 0)),
      dead30: data.filter((p) => p.dead === 30).length,
      dead60: data.filter((p) => p.dead === 60).length,
      dead90: data.filter((p) => p.dead === 90).length,
      dead180: data.filter((p) => p.dead === 180).length,
      low: data.filter((p) => p.stock <= num(p.minStock)).length,
    },
  });
}

export async function POST(req: Request) {
  const guard = await requireUser("manage_inventory");
  if ("res" in guard) return guard.res;
  const b = await req.json().catch(() => ({}));
  const productId = Number(b.productId);
  const qty = Math.abs(num(b.qty));
  const type = String(b.type);
  if (!productId) return fail("اختر المنتج");
  if (!ADJUST_TYPES[type]) return fail("نوع التسوية غير معروف");
  if (qty <= 0) return fail("أدخل الكمية");

  const [p] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!p) return fail("المنتج غير موجود", 404);
  if (!b.allowNegative && num(p.stock) < qty && type !== "count") {
    return fail(`المتوفر (${num(p.stock)} ${p.unit}) أقل من الكمية (${qty})`);
  }

  const sign = type === "count" && b.direction === "in" ? 1 : -1;
  const change = sign * qty;

  await db.transaction(async (tx) => {
    await tx.update(products)
      .set({ stock: sql`cast(${products.stock} as numeric) + ${change}` })
      .where(eq(products.id, productId));
    await tx.insert(stockAdjustments).values({
      productId, type, qty: String(qty),
      reason: String(b.reason ?? "").trim() || null,
      userId: guard.user.id,
    });
    await tx.insert(stockMovements).values({
      productId, change: String(change), type: type === "count" ? "adjust" : type,
      note: `${ADJUST_TYPES[type]}${b.reason ? ` — ${b.reason}` : ""}`,
    });
  });

  const [after] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, productId));
  await audit({
    user: guard.user, action: "stock_change", entity: "product", entityId: productId,
    ip: getClientIp(req),
    meta: { adjustment: ADJUST_TYPES[type], before: num(p.stock), change, after: num(after?.stock ?? p.stock), reason: b.reason ?? null },
  });

  return ok({ ok: true, newStock: num(after?.stock ?? 0) }, 201);
}
