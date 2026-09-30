"use client";

/**
 * طبقة الأوفلاين لنقطة البيع — SOBIS
 * تخزين محلي آمن بـ IndexedDB:
 *   products  — آخر قائمة منتجات متزامنة (للبيع بدون إنترنت)
 *   customers — آخر قائمة عملاء متزامنة
 *   queue     — طابور الفواتير المعلّقة بانتظار المزامنة (clientRef يمنع التكرار)
 *
 * PostgreSQL يبقى دائمًا المصدر الرسمي — الأوفلاين للاستمرارية فقط.
 * ملاحظة أمان: جهاز الكاشير هو بيئة تشغيل موثوقة فيزيائيًا لدى المتجر.
 */

const DB_NAME = "sobis-offline-v1";
const STORE_PRODUCTS = "products";
const STORE_CUSTOMERS = "customers";
const STORE_QUEUE = "queue";

export type QueueItem = {
  clientRef: string;
  payload: Record<string, unknown>;
  attempts: number;
  lastError?: string;
  createdAt: number;
};

export type SyncState = "online" | "offline" | "syncing" | "failed";

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no idb"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) db.createObjectStore(STORE_PRODUCTS);
      if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) db.createObjectStore(STORE_CUSTOMERS);
      if (!db.objectStoreNames.contains(STORE_QUEUE)) db.createObjectStore(STORE_QUEUE, { keyPath: "clientRef" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const os = t.objectStore(store);
    const req = fn(os);
    t.oncomplete = () => resolve((req && "result" in req ? req.result : undefined) as T);
    t.onerror = () => reject(t.error);
  });
}

export async function cacheProducts<T>(rows: T[]): Promise<void> {
  await tx(STORE_PRODUCTS, "readwrite", (s) => s.put(rows, "all"));
}
export async function cacheCustomers<T>(rows: T[]): Promise<void> {
  await tx(STORE_CUSTOMERS, "readwrite", (s) => s.put(rows, "all"));
}
export async function getCachedProducts<T>(): Promise<T[]> {
  try { return (await tx<T[]>(STORE_PRODUCTS, "readonly", (s) => s.get("all"))) ?? []; } catch { return []; }
}
export async function getCachedCustomers<T>(): Promise<T[]> {
  try { return (await tx<T[]>(STORE_CUSTOMERS, "readonly", (s) => s.get("all"))) ?? []; } catch { return []; }
}

// ── طابور المزامنة ──
export function newClientRef(): string {
  return `OFF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

export async function queueSale(clientRef: string, payload: Record<string, unknown>): Promise<void> {
  await tx(STORE_QUEUE, "readwrite", (s) => s.put({ clientRef, payload, attempts: 0, createdAt: Date.now() }));
}

export async function listQueue(): Promise<QueueItem[]> {
  try {
    const all = (await tx<QueueItem[]>(STORE_QUEUE, "readonly", (s) => s.getAll())) ?? [];
    return all.sort((a, b) => a.createdAt - b.createdAt);
  } catch { return []; }
}

export async function queueCount(): Promise<number> {
  try { return (await tx<number>(STORE_QUEUE, "readonly", (s) => s.count())) ?? 0; } catch { return 0; }
}

export async function removeFromQueue(clientRef: string): Promise<void> {
  await tx(STORE_QUEUE, "readwrite", (s) => s.delete(clientRef));
}

export async function bumpAttempts(clientRef: string, error: string): Promise<void> {
  const item = await tx<QueueItem | undefined>(STORE_QUEUE, "readonly", (s) => s.get(clientRef));
  if (!item) return;
  item.attempts += 1;
  item.lastError = error.slice(0, 200);
  await tx(STORE_QUEUE, "readwrite", (s) => s.put(item));
}

// ── خصم مخزون منتجات (في النسخة المحلية المخزنة فقط — العرض أثناء الأوفلاين) ──
export async function decrementCachedStock(productId: number, qty: number): Promise<void> {
  try {
    const rows = await getCachedProducts<{ id: number; stock: string | number }>();
    const next = rows.map((p) => (p.id === productId ? { ...p, stock: String(Math.max(0, Number(p.stock) - qty)) } : p));
    await cacheProducts(next);
  } catch { /* tolerate */ }
}
