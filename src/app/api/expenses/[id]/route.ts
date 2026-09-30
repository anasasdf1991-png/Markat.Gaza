import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { ok, requireUser } from "@/lib/http";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUser("manage_expenses");
  if ("res" in guard) return guard.res;
  const { id } = await ctx.params;
  await db.delete(expenses).where(eq(expenses.id, Number(id)));
  return ok({ ok: true });
}
