import { eq } from "drizzle-orm";
import { db } from "@/db";
import { promotions } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";
import { audit, getClientIp } from "@/lib/system";

/** PUT /api/promotions/:id — تفعيل/إيقاف عرض */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("manage_inventory");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  await db.update(promotions).set({ active: !!b.active }).where(eq(promotions.id, Number(id)));
  return ok({ ok: true });
}

/** DELETE /api/promotions/:id — حذف عرض */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("manage_inventory");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const [p] = await db.select().from(promotions).where(eq(promotions.id, Number(id))).limit(1);
  if (!p) return fail("العرض غير موجود", 404);
  await db.delete(promotions).where(eq(promotions.id, Number(id)));
  await audit({ user: guard.user, action: "promo_delete", entity: "promotion", entityId: Number(id), ip: getClientIp(_req), meta: { name: p.name } });
  return ok({ ok: true });
}
