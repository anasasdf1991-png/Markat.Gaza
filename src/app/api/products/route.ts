import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, categories, suppliers } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

/** GET /api/products — بحث وتصفية المنتجات */
export async function GET(req: Request) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const filter = searchParams.get("filter");
  const catId = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 400, 800);

  // قائمة «الأكثر بيعًا» — بيانات حقيقية من المبيعات (آخر 30 يوم) لشاشة POS
  if (searchParams.get("frequent") === "1") {
    const freq = await db.execute(sql`
      SELECT p.id, p.barcode, p.sku, p.name, p.category_id AS "categoryId", c.name AS "categoryName",
             p.sale_price AS "salePrice", p.stock, p.unit, p.tax_rate AS "taxRate",
             COALESCE(SUM(item.qty::numeric), 0) AS "soldQty"
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT ii.product_id, ii.qty FROM invoice_items ii
        JOIN invoices iv ON ii.invoice_id = iv.id
        WHERE iv.status = 'completed' AND iv.created_at >= now() - interval '30 days'
      ) item ON item.product_id = p.id
      WHERE p.active = true
      GROUP BY p.id, c.name
      ORDER BY "soldQty" DESC, p.id
      LIMIT 10
    `);
    return ok({ products: freq.rows, stats: null });
  }

  const conds = [eq(products.active, true)];
  if (q) {
    const like = `%${q}%`;
    conds.push(or(ilike(products.name, like), ilike(products.barcode, like), ilike(products.sku, like))!);
  }
  if (catId && Number(catId)) conds.push(eq(products.categoryId, Number(catId)));
  if (filter === "low") conds.push(sql`cast(${products.stock} as numeric) <= cast(${products.minStock} as numeric)`);
  if (filter === "expired") conds.push(sql`${products.expiryDate} is not null and ${products.expiryDate} < CURRENT_DATE`);
  if (filter === "expiring") conds.push(sql`${products.expiryDate} is not null and ${products.expiryDate} between CURRENT_DATE and CURRENT_DATE + interval '30 days'`);

  const [rows, [stats]] = await Promise.all([
    db.select({
      id: products.id, barcode: products.barcode, sku: products.sku, name: products.name,
      shortName: products.shortName, categoryId: products.categoryId, categoryName: categories.name,
      supplierId: products.supplierId, supplierName: suppliers.name,
      purchasePrice: products.purchasePrice, salePrice: products.salePrice,
      wholesalePrice: products.wholesalePrice, specialPrice: products.specialPrice,
      stock: products.stock, minStock: products.minStock, unit: products.unit,
      expiryDate: products.expiryDate, batchCode: products.batchCode, taxRate: products.taxRate,
      description: products.description, favorite: products.favorite, createdAt: products.createdAt,
    })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(and(...conds))
      .orderBy(desc(products.createdAt))
      .limit(limit),
    db.select({
      total: sql<number>`count(*)`,
      low: sql<number>`count(*) filter (where cast(${products.stock} as numeric) <= cast(${products.minStock} as numeric))`,
      expired: sql<number>`count(*) filter (where ${products.expiryDate} is not null and ${products.expiryDate} < CURRENT_DATE)`,
      value: sql<string>`coalesce(sum(cast(${products.stock} as numeric) * cast(${products.purchasePrice} as numeric)),0)`,
    }).from(products).where(eq(products.active, true)),
  ]);

  return ok({ products: rows, stats });
}

/** POST /api/products — إنشاء منتج */
export async function POST(req: Request) {
  const guard = await requireUser("add_product");
  if ("res" in guard) return guard.res;
  try {
    const b = await req.json();
    if (!b.name?.trim()) return fail("اسم المنتج مطلوب");
    if (!Number(b.salePrice) || Number(b.salePrice) <= 0) return fail("سعر البيع يجب أن يكون أكبر من صفر");
    const barcode = (b.barcode ?? "").trim() || `SOB${Date.now()}`;
    const sku = (b.sku ?? "").trim() || `PRD-${Date.now().toString().slice(-6)}`;

    const [row] = await db.insert(products).values({
      barcode, sku,
      name: b.name.trim(),
      shortName: b.shortName?.trim() || null,
      categoryId: b.categoryId ? Number(b.categoryId) : null,
      supplierId: b.supplierId ? Number(b.supplierId) : null,
      purchasePrice: String(Number(b.purchasePrice) || 0),
      salePrice: String(Number(b.salePrice)),
      wholesalePrice: String(Number(b.wholesalePrice) || 0),
      specialPrice: b.specialPrice ? String(Number(b.specialPrice)) : null,
      stock: String(Number(b.stock) || 0),
      minStock: String(Number(b.minStock) || 5),
      unit: b.unit || "قطعة",
      expiryDate: b.expiryDate || null,
      batchCode: b.batchCode || null,
      taxRate: String(Number(b.taxRate) || 0),
      imageUrl: b.imageUrl || null,
      description: b.description || null,
    }).returning();
    await audit({ user: guard.user, action: "product_create", entity: "product", entityId: row.id, ip: getClientIp(req), meta: { name: row.name, salePrice: row.salePrice } });
    return ok({ product: row }, 201);
  } catch (e) {
    if (String(e).includes("unique")) return fail("الباركود أو SKU مستخدم مسبقًا");
    return fail("تعذر إنشاء المنتج", 500);
  }
}
