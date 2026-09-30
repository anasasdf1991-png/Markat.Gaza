import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    // استقرار الإنتاج: إعادة اتصال تلقائية وتنظيف الخامل ومهلة آمنة
    max: 20,
    min: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });

// لا نريد أن يسقط التطبيق بسبب خطأ في اتصال خامل — سجّل فقط
pool.on("error", (err) => {
  console.error("[DB Pool] خطأ في اتصال خامل (سيُعاد الاتصال تلقائيًا):", err.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);

/** إغلاق لطيف عند إيقاف الخادم */
const shutdown = async () => {
  try { await pool.end(); } catch { /* silent */ }
  process.exit(0);
};
if (typeof process !== "undefined") {
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
