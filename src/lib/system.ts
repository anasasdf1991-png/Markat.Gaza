import { and, desc, eq, sql, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  settings, auditLogs, notifications, products, invoices, users,
  expenses, payments, invoiceItems, backups,
} from "@/db/schema";
import type { SessionUser } from "@/lib/auth";

export const APP_VERSION = "2.1.0";

// ═══════════════════════════════════════════
// 1) نظام الإعدادات المركزي (محفوظ بقاعدة البيانات)
// ═══════════════════════════════════════════
export const DEFAULT_SETTINGS: Record<string, string> = {
  store_name: "سوبر ماركت SOBIS",
  store_brand: "SOBIS",
  store_phone: "01001234567",
  store_whatsapp: "",
  store_email: "",
  store_address: "التجمع الخامس — شارع التسعين الشمالي",
  tax_number: "",
  currency_label: "₪",
  currency_code: "ILS",
  currency_decimals: "2",
  currency_rate_usd: "3.65",
  currency_rate_jod: "5.15",
  currency_rate_eur: "4.00",
  default_tax: "0",
  timezone: "Asia/Jerusalem",
  date_format: "dd/MM/yyyy",
  invoice_prefix: "INV",
  receipt_header: "",
  receipt_footer: "شكرًا لتسوقكم معنا — نتشرف بزيارتكم مجددًا!",
  low_stock_alert: "1",
  expiry_alert_days: "30",
  debt_due_days: "7",
  // البريد
  email_smtp_host: "smtp.gmail.com",
  email_smtp_port: "465",
  email_user: "",
  email_pass: "", // يُفضَّل App Password — لا تُعرض في الواجهة أبدًا
  email_from: "",
  report_email: "",
  email_enabled: "0",
  report_daily: "0",
  report_weekly: "0",
  report_monthly: "0",
  // النسخ الاحتياطي
  backup_auto: "off", // off | daily | weekly | monthly
  backup_email_notify: "0",
  backup_keep: "30",
  // الإشعارات
  notify_low_stock: "1",
  notify_expiry: "1",
  notify_debts: "1",
  notify_security: "1",
};

let cache: { data: Record<string, string>; at: number } | null = null;

export async function getSettings(force = false): Promise<Record<string, string>> {
  if (cache && !force && Date.now() - cache.at < 15_000) return cache.data;
  const rows = await db.select().from(settings);
  const data = { ...DEFAULT_SETTINGS };
  for (const r of rows) data[r.key] = r.value;
  cache = { data, at: Date.now() };
  return data;
}

export function invalidateSettingsCache() { cache = null; }

export async function saveSettings(map: Record<string, string>, userId: number) {
  for (const [key, value] of Object.entries(map)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    await db.insert(settings).values({ key, value: String(value), updatedBy: userId, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(value), updatedAt: new Date(), updatedBy: userId } });
  }
  invalidateSettingsCache();
}

// ═══════════════════════════════════════════
// 2) سجل التدقيق
// ═══════════════════════════════════════════
export const ACTION_LABELS: Record<string, string> = {
  login: "تسجيل دخول", login_failed: "محاولة دخول فاشلة", login_locked: "قفل حساب مؤقتًا", logout: "تسجيل خروج",
  password_change: "تغيير كلمة المرور", logout_all: "إنهاء كل الجلسات",
  sale: "إنشاء فاتورة بيع", sale_cancel: "إلغاء فاتورة", sale_suspend: "تعليق فاتورة",
  product_create: "إضافة منتج", product_edit: "تعديل منتج", product_delete: "حذف منتج",
  price_change: "تغيير سعر", stock_change: "تعديل مخزون",
  debt_payment: "تحصيل دفعة دين", debt_create: "تسجيل دين جديد", debt_edit: "تعديل بيانات الدين", customer_create: "إضافة عميل", supplier_create: "إضافة مورد",
  purchase_create: "فاتورة شراء", expense_create: "تسجيل مصروف",
  employee_create: "إضافة موظف", employee_edit: "تعديل موظف", employee_disable: "تعطيل موظف",
  settings_change: "تغيير إعدادات", theme_change: "تغيير المظهر",
  shift_open: "فتح وردية", shift_close: "إغلاق وردية", day_close: "إغلاق اليومية",
  promo_create: "إنشاء عرض", promo_delete: "حذف عرض", stock_writeoff: "شطب/تلف مخزون",
  backup: "إنشاء نسخة احتياطية", backup_failed: "فشل نسخة احتياطية", restore: "استعادة نسخة احتياطية",
  email_test: "اختبار البريد", email_report: "إرسال تقرير بالبريد",
};

export async function audit(opts: {
  user?: SessionUser | null;
  action: string;
  entity?: string;
  entityId?: number;
  meta?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: opts.user?.id ?? null,
      userName: opts.user?.fullName ?? "النظام",
      action: opts.action,
      entity: opts.entity ?? null,
      entityId: opts.entityId ?? null,
      meta: opts.meta ?? null,
      ip: opts.ip ?? null,
    });
  } catch (e) {
    console.error("audit error", e);
  }
}

export function getClientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

// ═══════════════════════════════════════════
// 3) توليد الإشعارات من بيانات حقيقية
// ═══════════════════════════════════════════
async function existsToday(type: string): Promise<boolean> {
  const rows = await db.select({ id: notifications.id }).from(notifications)
    .where(and(eq(notifications.type, type), sql`${notifications.createdAt}::date = current_date`)).limit(1);
  return rows.length > 0;
}

export async function generateNotifications(): Promise<void> {
  const s = await getSettings();
  try {
    if (s.notify_low_stock === "1" && !(await existsToday("low_stock"))) {
      const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(products)
        .where(and(eq(products.active, true), sql`cast(${products.stock} as numeric) <= 0`));
      const [{ l }] = await db.select({ l: sql<number>`count(*)` }).from(products)
        .where(and(eq(products.active, true), sql`cast(${products.stock} as numeric) <= cast(${products.minStock} as numeric) and cast(${products.stock} as numeric) > 0`));
      if (Number(c) > 0 || Number(l) > 0) {
        await db.insert(notifications).values({
          type: "low_stock",
          title: Number(c) > 0 ? `${c} منتج نافد من المخزون` : `${l} منتج منخفض المخزون`,
          body: `نواقص: ${c} • منخفضة: ${l} — راجع صفحة المنتجات لتجديد المخزون.`,
          entity: "products",
        });
      }
    }
    if (s.notify_expiry === "1" && !(await existsToday("expired"))) {
      const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(products)
        .where(and(eq(products.active, true), sql`${products.expiryDate} is not null and ${products.expiryDate} < CURRENT_DATE`));
      if (Number(c) > 0) {
        await db.insert(notifications).values({
          type: "expired", title: `${c} منتج منتهي الصلاحية`,
          body: "منتجات تجاوزت تاريخ الانتهاء وموجودة في المخزون — افحصها فورًا.", entity: "products",
        });
      }
    }
    if (s.notify_expiry === "1" && !(await existsToday("expiring"))) {
      const days = Number(s.expiry_alert_days) || 30;
      const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(products)
        .where(and(eq(products.active, true), sql`${products.expiryDate} is not null and ${products.expiryDate} between CURRENT_DATE and CURRENT_DATE + ${days} * interval '1 day'`));
      if (Number(c) > 0) {
        await db.insert(notifications).values({
          type: "expiring", title: `${c} منتج يقترب من انتهاء الصلاحية`,
          body: `ستنتهي صلاحيتها خلال ${days} يومًا.`, entity: "products",
        });
      }
    }
    if (s.notify_debts === "1" && !(await existsToday("debt_overdue"))) {
      const [{ c, t }] = await db.select({ c: sql<number>`count(*)`, t: sql<string>`coalesce(sum(cast(total as numeric)-cast(paid as numeric)),0)` })
        .from(invoices).where(and(eq(invoices.status, "completed"),
          sql`${invoices.dueDate} < CURRENT_DATE and cast(total as numeric) > cast(paid as numeric) + 0.001`));
      if (Number(c) > 0) {
        await db.insert(notifications).values({
          type: "debt_overdue", title: `${c} دين متأخر بقيمة ${Math.round(Number(t))} ${s.currency_label}`,
          body: "فواتير آجلة تجاوزت تاريخ الاستحقاق — تابع التحصيل من صفحة الديون.", entity: "debts",
        });
      }
    }
    if (s.notify_security === "1" && !(await existsToday("security"))) {
      const hourAgo = new Date(Date.now() - 3600_000);
      const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(auditLogs)
        .where(and(eq(auditLogs.action, "login_failed"), gte(auditLogs.createdAt, hourAgo)));
      if (Number(c) >= 3) {
        await db.insert(notifications).values({
          type: "security", title: `${c} محاولات دخول فاشلة خلال ساعة`,
          body: "راجع سجل التدقيق للتأكد من عدم وجود محاولات اختراق.", entity: "security",
        });
      }
    }
  } catch (e) {
    console.error("notify generation error", e);
  }
}

export async function pushNotification(type: string, title: string, body?: string, entity?: string, entityId?: number) {
  try {
    await db.insert(notifications).values({ type, title, body: body ?? null, entity: entity ?? null, entityId: entityId ?? null });
  } catch (e) { console.error(e); }
}

// ═══════════════════════════════════════════
// 4) بيانات التقرير الدوري (يومي/أسبوعي/شهري)
// ═══════════════════════════════════════════
export async function buildReport(kind: "daily" | "weekly" | "monthly") {
  const s = await getSettings();
  const interval = kind === "daily" ? sql`now() - interval '1 day'` : kind === "weekly" ? sql`now() - interval '7 days'` : sql`now() - interval '30 days'`;
  const label = kind === "daily" ? "تقرير اليوم" : kind === "weekly" ? "التقرير الأسبوعي" : "التقرير الشهري";
  const [sales] = await db.select({ t: sql<string>`coalesce(sum(cast(total as numeric)),0)`, c: sql<number>`count(*)` })
    .from(invoices).where(and(eq(invoices.status, "completed"), sql`${invoices.createdAt} >= ${interval}`));
  const [profit] = await db.select({ t: sql<string>`coalesce(sum((cast(${invoiceItems.price} as numeric)-cast(${invoiceItems.cost} as numeric))*cast(${invoiceItems.qty} as numeric)*(1-cast(${invoiceItems.discountPct} as numeric)/100)),0)` })
    .from(invoiceItems).innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .where(and(eq(invoices.status, "completed"), sql`${invoices.createdAt} >= ${interval}`));
  const [exp] = await db.select({ t: sql<string>`coalesce(sum(cast(amount as numeric)),0)` })
    .from(expenses).where(sql`${expenses.createdAt} >= ${interval}`);
  const [debt] = await db.select({ t: sql<string>`coalesce(sum(cast(total as numeric)-cast(paid as numeric)),0)` })
    .from(invoices).where(and(eq(invoices.status, "completed"), sql`${invoices.customerId} is not null and cast(total as numeric) > cast(paid as numeric)`));
  const [low] = await db.select({ c: sql<number>`count(*)` }).from(products)
    .where(and(eq(products.active, true), sql`cast(${products.stock} as numeric) <= cast(${products.minStock} as numeric)`));
  return {
    label,
    sales: Math.round(Number(sales.t)),
    invoicesCount: Number(sales.c),
    profit: Math.round(Number(profit.t)),
    expenses: Math.round(Number(exp.t)),
    net: Math.round(Number(profit.t) - Number(exp.t)),
    debt: Math.round(Number(debt.t)),
    lowStock: Number(low.c),
    currency: s.currency_label,
    store: s.store_name,
  };
}

export async function latestBackup() {
  const rows = await db.select().from(backups).orderBy(desc(backups.createdAt)).limit(1);
  return rows[0] ?? null;
}
