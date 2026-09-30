import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  bigint,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────
// المستخدمون والصلاحيات
// ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 60 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: varchar("role", { length: 30 }).notNull().default("cashier"),
  permissions: jsonb("permissions")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  active: boolean("active").notNull().default(true),
  theme: varchar("theme", { length: 10 }).notNull().default("dark"), // dark | light | auto
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// الأقسام والفئات
// ─────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  sort: integer("sort").notNull().default(0),
});

// ─────────────────────────────────────────────
// الموردون
// ─────────────────────────────────────────────
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 120 }),
  address: text("address"),
  company: text("company"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// المنتجات
// ─────────────────────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  barcode: varchar("barcode", { length: 64 }).notNull().unique(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  categoryId: integer("category_id").references(() => categories.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  purchasePrice: numeric("purchase_price", { precision: 14, scale: 2 }).notNull().default("0"),
  salePrice: numeric("sale_price", { precision: 14, scale: 2 }).notNull().default("0"),
  wholesalePrice: numeric("wholesale_price", { precision: 14, scale: 2 }).notNull().default("0"),
  specialPrice: numeric("special_price", { precision: 14, scale: 2 }),
  stock: numeric("stock", { precision: 14, scale: 3 }).notNull().default("0"),
  minStock: numeric("min_stock", { precision: 14, scale: 3 }).notNull().default("5"),
  unit: varchar("unit", { length: 20 }).notNull().default("قطعة"),
  expiryDate: date("expiry_date"),
  batchCode: varchar("batch_code", { length: 60 }),
  taxRate: numeric("tax_rate", { precision: 6, scale: 2 }).notNull().default("0"),
  imageUrl: text("image_url"),
  description: text("description"),
  favorite: boolean("favorite").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// العملاء
// ─────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 40 }),
  address: text("address"),
  email: varchar("email", { length: 120 }),
  idNumber: varchar("id_number", { length: 40 }),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// الفواتير
// ─────────────────────────────────────────────
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("completed"), // completed | suspended | voided
  paymentMethod: varchar("payment_method", { length: 20 }).notNull().default("cash"), // cash | card | bank | mixed | credit
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 14, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  paid: numeric("paid", { precision: 14, scale: 2 }).notNull().default("0"),
  changeAmount: numeric("change_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  dueDate: date("due_date"),
  suspendedLabel: text("suspended_label"),
  clientRef: varchar("client_ref", { length: 64 }), // مرجع فاتورة الأوفلاين لمنع التكرار
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  unit: varchar("unit", { length: 20 }).notNull().default("قطعة"),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 14, scale: 2 }).notNull().default("0"),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
  discountPct: numeric("discount_pct", { precision: 6, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 6, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
});

// ─────────────────────────────────────────────
// الدفعات (مبيعات + تحصيل ديون)
// ─────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  customerId: integer("customer_id").references(() => customers.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  method: varchar("method", { length: 20 }).notNull().default("cash"), // cash | card | bank
  type: varchar("type", { length: 20 }).notNull().default("sale"), // sale | debt
  note: text("note"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// المصروفات
// ─────────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: varchar("category", { length: 60 }).notNull().default("أخرى"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// المشتريات من الموردين
// ─────────────────────────────────────────────
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paid: numeric("paid", { precision: 14, scale: 2 }).notNull().default("0"),
  note: text("note"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// حركة المخزون
// ─────────────────────────────────────────────
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  change: numeric("change", { precision: 14, scale: 3 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // sale | void | purchase | adjust
  refId: integer("ref_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// الإعدادات المركزية (Key-Value)
// ─────────────────────────────────────────────
export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: integer("updated_by"),
});

// ─────────────────────────────────────────────
// سجل التدقيق (Audit Log)
// ─────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userName: text("user_name").notNull().default("النظام"),
  action: varchar("action", { length: 40 }).notNull(),
  entity: varchar("entity", { length: 60 }),
  entityId: integer("entity_id"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  ip: varchar("ip", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// الإشعارات
// ─────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 30 }).notNull(), // low_stock | expiring | expired | debt_overdue | security | backup | system
  title: text("title").notNull(),
  body: text("body"),
  entity: varchar("entity", { length: 60 }),
  entityId: integer("entity_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// النسخ الاحتياطي
// ─────────────────────────────────────────────
export const backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  size: bigint("size", { mode: "number" }).notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("success"), // success | failed
  note: text("note"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// الورديات (Shift Management)
// ─────────────────────────────────────────────
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  openingCash: numeric("opening_cash", { precision: 14, scale: 2 }).notNull().default("0"),
  cashSales: numeric("cash_sales", { precision: 14, scale: 2 }).notNull().default("0"),
  cardSales: numeric("card_sales", { precision: 14, scale: 2 }).notNull().default("0"),
  creditSales: numeric("credit_sales", { precision: 14, scale: 2 }).notNull().default("0"),
  returnsTotal: numeric("returns_total", { precision: 14, scale: 2 }).notNull().default("0"),
  expensesTotal: numeric("expenses_total", { precision: 14, scale: 2 }).notNull().default("0"),
  expectedCash: numeric("expected_cash", { precision: 14, scale: 2 }).notNull().default("0"),
  actualCash: numeric("actual_cash", { precision: 14, scale: 2 }),
  difference: numeric("difference", { precision: 14, scale: 2 }),
  note: text("note"),
});

// ─────────────────────────────────────────────
// تسويات وتلف المخزون
// ─────────────────────────────────────────────
export const stockAdjustments = pgTable("stock_adjustments", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  qty: numeric("qty", { precision: 14, scale: 3 }).notNull(),
  reason: text("reason"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// نظام العروض (Promotions)
// ─────────────────────────────────────────────
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: varchar("type", { length: 12 }).notNull(), // percent | fixed | bundle | bogo
  value: numeric("value", { precision: 14, scale: 3 }).notNull().default("0"),
  buyQty: numeric("buy_qty", { precision: 14, scale: 3 }).notNull().default("0"),
  scope: varchar("scope", { length: 10 }).notNull().default("product"), // product | category | all
  targetId: integer("target_id"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  active: boolean("active").notNull().default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// مرجع فواتير الأوفلاين لمنع التكرار
// (invoice.clientRef يُضاف للجدول invoices أدناه)

export type User = typeof users.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Backup = typeof backups.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Payment = typeof payments.$inferSelect;
