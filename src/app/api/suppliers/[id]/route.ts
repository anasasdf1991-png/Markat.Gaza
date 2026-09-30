import { eq } from "drizzle-orm";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("manage_suppliers");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  const b = await req.json();
  const [s] = await db.select().from(suppliers).where(eq(suppliers.id, Number(id))).limit(1);
  if (!s) return fail("المورد غير موجود", 404);
  await db.update(suppliers).set({
    name: b.name ?? s.name,
    phone: b.phone !== undefined ? (b.phone || null) : s.phone,
    email: b.email !== undefined ? (b.email || null) : s.email,
    address: b.address !== undefined ? (b.address || null) : s.address,
    company: b.company !== undefined ? (b.company || null) : s.company,
    notes: b.notes !== undefined ? (b.notes || null) : s.notes,
  }).where(eq(suppliers.id, Number(id)));
  return ok({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("manage_suppliers");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  await db.update(suppliers).set({ active: false }).where(eq(suppliers.id, Number(id)));
  return ok({ ok: true });
}
