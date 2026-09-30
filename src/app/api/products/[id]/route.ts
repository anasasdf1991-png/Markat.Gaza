import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, stockMovements } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

/** PUT /api/products/:id — تعديل منتج (أو تبديل مفضلة بدون صلاحية التعديل) */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const pid = Number(id);
  try {
    const b = await req.json();

    // مفضلة سريعة (متاحة لأي مستخدم مثل الكاشير في POS)
    if (b.__favoriteOnly === true) {
      await db.update(products).set({ favorite: !!b.favorite }).where(eq(products.id, pid));
      return ok({ ok: true, favorite: !!b.favorite });
    }

    if (!guard.user.permissions.includes("add_product")) return fail("لا تملك صلاحية تعديل المنتجات", 403);

    const [existing] = await db.select().from(products).where(eq(products.id, pid)).limit(1);
    if (!existing) return fail("المنتج غير موجود", 404);

    await db.transaction(async (tx) => {
      const newStock = b.stock !== undefined ? Number(b.stock) : Number(existing.stock);
      if (newStock !== Number(existing.stock) && guard.user.permissions.includes("manage_inventory")) {
        const diff = newStock - Number(existing.stock);
        await tx.insert(stockMovements).values({
          productId: pid, change: String(diff), type: "adjust", note: "تعديل يدوي للمخزون",
        });
      }
      await tx.update(products).set({
        barcode: b.barcode ?? existing.barcode,
        sku: b.sku ?? existing.sku,
        name: b.name ?? existing.name,
        shortName: b.shortName !== undefined ? b.shortName : existing.shortName,
        categoryId: b.categoryId !== undefined ? (b.categoryId ? Number(b.categoryId) : null) : existing.categoryId,
        supplierId: b.supplierId !== undefined ? (b.supplierId ? Number(b.supplierId) : null) : existing.supplierId,
        purchasePrice: b.purchasePrice !== undefined ? String(Number(b.purchasePrice)) : existing.purchasePrice,
        salePrice: b.salePrice !== undefined ? String(Number(b.salePrice)) : existing.salePrice,
        wholesalePrice: b.wholesalePrice !== undefined ? String(Number(b.wholesalePrice)) : existing.wholesalePrice,
        specialPrice: b.specialPrice !== undefined ? (b.specialPrice ? String(Number(b.specialPrice)) : null) : existing.specialPrice,
        stock: b.stock !== undefined ? String(Number(b.stock)) : existing.stock,
        minStock: b.minStock !== undefined ? String(Number(b.minStock)) : existing.minStock,
        unit: b.unit ?? existing.unit,
        expiryDate: b.expiryDate !== undefined ? (b.expiryDate || null) : existing.expiryDate,
        batchCode: b.batchCode !== undefined ? (b.batchCode || null) : existing.batchCode,
        taxRate: b.taxRate !== undefined ? String(Number(b.taxRate)) : existing.taxRate,
        description: b.description !== undefined ? (b.description || null) : existing.description,
        favorite: b.favorite !== undefined ? !!b.favorite : existing.favorite,
      }).where(eq(products.id, pid));
    });
    // تدقيق التغييرات (قبل / بعد)
    const meta: Record<string, unknown> = { name: existing.name };
    let action = "product_edit";
    if (b.salePrice !== undefined && Number(b.salePrice) !== Number(existing.salePrice)) {
      action = "price_change";
      meta.before = Number(existing.salePrice); meta.after = Number(b.salePrice);
    } else if (b.stock !== undefined && Number(b.stock) !== Number(existing.stock)) {
      action = "stock_change";
      meta.before = Number(existing.stock); meta.after = Number(b.stock);
    }
    await audit({ user: guard.user, action, entity: "product", entityId: pid, ip: getClientIp(req), meta });
    return ok({ ok: true });
  } catch (e) {
    if (String(e).includes("unique")) return fail("الباركود أو SKU مستخدم مسبقًا");
    return fail("تعذر تعديل المنتج", 500);
  }
}

/** DELETE /api/products/:id — حذف (أرشفة) منتج */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("delete_product");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const [p] = await db.select().from(products).where(eq(products.id, Number(id))).limit(1);
  if (!p) return fail("المنتج غير موجود", 404);
  await db.update(products).set({ active: false }).where(eq(products.id, Number(id)));
  await audit({ user: guard.user, action: "product_delete", entity: "product", entityId: Number(id), ip: getClientIp(_req), meta: { name: p.name } });
  return ok({ ok: true });
}
