import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { ok, fail, requireUser } from "@/lib/http";

export async function GET() {
  const guard = await requireUser();
  if ("res" in guard) return guard.res;
  const rows = await db.select({
    id: categories.id, name: categories.name,
    count: sql<number>`(select count(*) from ${products} where ${products.categoryId} = ${categories.id} and ${products.active})`,
  }).from(categories).orderBy(asc(categories.sort));
  return ok({ categories: rows });
}

export async function POST(req: Request) {
  const guard = await requireUser("add_product");
  if ("res" in guard) return guard.res;
  const b = await req.json();
  if (!b.name?.trim()) return fail("اسم القسم مطلوب");
  try {
    const [row] = await db.insert(categories).values({ name: b.name.trim() }).returning();
    return ok({ category: row }, 201);
  } catch {
    return fail("القسم موجود مسبقًا", 400);
  }
}
