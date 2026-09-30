/**
 * سكربت بذر قاعدة بيانات SOBIS ببيانات واقعية
 * التشغيل: npx tsx scripts/seed.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  users, categories, suppliers, products, customers,
  invoices, invoiceItems, payments, expenses, purchases,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const money = (n: number) => String(n.toFixed(2));
const daysAgo = (d: number, h = 12, m = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(h, m, rnd(0, 59), 0);
  return date;
};
const dateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function main() {
  console.log("🌱 بدء بذر قاعدة بيانات SOBIS...");

  // تنظيف الجداول بترتيب يراعي العلاقات
  await db.delete(payments);
  await db.delete(invoiceItems);
  await db.delete(invoices);
  await db.delete(purchases);
  await db.delete(expenses);
  await db.delete(products);
  await db.delete(customers);
  await db.delete(suppliers);
  await db.delete(categories);
  await db.delete(users);

  // ── المستخدمون ─────────────────────────────────
  const rolePerms: Record<string, string[]> = {
    admin: ["sell","void_invoice","edit_price","add_debt","collect_debt","view_profits","view_reports","add_product","delete_product","manage_inventory","manage_customers","manage_suppliers","manage_expenses","manage_employees"],
    manager: ["sell","void_invoice","edit_price","add_debt","collect_debt","view_profits","view_reports","add_product","delete_product","manage_inventory","manage_customers","manage_suppliers","manage_expenses"],
    cashier: ["sell","add_debt","collect_debt"],
    warehouse: ["add_product","manage_inventory"],
    accountant: ["view_reports","view_profits","collect_debt","manage_expenses","manage_suppliers"],
  };
  const usersData = [
    { username: "admin", fullName: "عمر السبيعي", role: "admin" },
    { username: "manager", fullName: "خالد الحربي", role: "manager" },
    { username: "cashier", fullName: "سارة أحمد", role: "cashier" },
    { username: "store", fullName: "يوسف عبد الله", role: "warehouse" },
    { username: "accountant", fullName: "منى حسن", role: "accountant" },
  ];
  for (const u of usersData) {
    await db.insert(users).values({
      username: u.username,
      passwordHash: hashPassword("123456"),
      fullName: u.fullName,
      role: u.role,
      permissions: rolePerms[u.role],
      active: true,
    });
  }
  console.log("✓ المستخدمون (كلمات المرور: 123456)");

  // ── الأقسام ─────────────────────────────────
  const cats = ["مشروبات", "ألبان وأجبان", "مواد غذائية", "حلويات وسناكس", "منظفات", "عناية شخصية", "مخبوزات"];
  const catIds: Record<string, number> = {};
  for (let i = 0; i < cats.length; i++) {
    const [c] = await db.insert(categories).values({ name: cats[i], sort: i }).returning();
    catIds[cats[i]] = c.id;
  }
  console.log(`✓ ${cats.length} أقسام`);

  // ── الموردون ─────────────────────────────────
  const sups = [
    { name: "شركة جهينة للصناعات الغذائية", phone: "0227380100", company: "جهينة", address: "مدينة 6 أكتوبر الصناعية" },
    { name: "المراعي للألبان", phone: "0115544332", company: "المراعي", address: "العاشر من رمضان" },
    { name: "أراب فود للتوزيع", phone: "0100123456", company: "أراب فود", address: "المنطقة الصناعية - العبور" },
    { name: "بروكتر آند جامبل مصر", phone: "0224990000", company: "P&G", address: "التجمع الخامس" },
    { name: "يونيليفر مشرق", phone: "0226180000", company: "يونيليفر", address: "مدينة نصر" },
    { name: "شركة ايديتا للصناعات الغذائية", phone: "0235330000", company: "ايديتا", address: "6 أكتوبر" },
    { name: "بيتزا ريدتش للمخبوزات", phone: "0101999887", company: "ريدتش", address: "شبرا الخيمة" },
  ];
  const supIds: number[] = [];
  for (const s of sups) {
    const [r] = await db.insert(suppliers).values({ ...s, email: null, notes: null, active: true }).returning();
    supIds.push(r.id);
  }
  console.log(`✓ ${sups.length} موردون`);

  // ── المنتجات ─────────────────────────────────
  type P = { name: string; cat: string; buy: number; sell: number; unit?: string; stock: number; min?: number; tax?: number; expDays?: number; sup: number };
  const prods: P[] = [
    { name: "بيبسي 1 لتر", cat: "مشروبات", buy: 26, sell: 32, unit: "زجاجة", stock: 144, min: 24, sup: 2 },
    { name: "كوكاكولا 330 مل", cat: "مشروبات", buy: 14, sell: 19, unit: "علبة", stock: 96, min: 24, sup: 2 },
    { name: "عصير جهينة برتقال 1 لتر", cat: "مشروبات", buy: 38, sell: 50, unit: "علبة", stock: 48, min: 12, sup: 0 },
    { name: "مياه معدنية دساني 600 مل", cat: "مشروبات", buy: 6.5, sell: 10, unit: "زجاجة", stock: 240, min: 48, sup: 2 },
    { name: "ريد بول 250 مل", cat: "مشروبات", buy: 58, sell: 75, unit: "علبة", stock: 24, min: 6, sup: 2 },
    { name: "شاي ليبتون 100 كيس", cat: "مشروبات", buy: 155, sell: 192, unit: "علبة", stock: 18, min: 6, sup: 4 },
    { name: "نسكافيه كلاسيك 200 غرام", cat: "مشروبات", buy: 208, sell: 262, unit: "عبوة", stock: 3, min: 6, sup: 4 },
    { name: "حليب جهينة كامل الدسم 1 لتر", cat: "ألبان وأجبان", buy: 42, sell: 53, unit: "علبة", stock: 60, min: 24, expDays: 25, sup: 0 },
    { name: "زبادي دانون 4×100 غرام", cat: "ألبان وأجبان", buy: 23, sell: 30, unit: "باكيت", stock: 40, min: 12, expDays: -4, sup: 1 },
    { name: "جبنة رومي قديم", cat: "ألبان وأجبان", buy: 360, sell: 425, unit: "كيلو", stock: 14, min: 3, expDays: 60, sup: 1 },
    { name: "جبنة شرائح كرافت 200 غرام", cat: "ألبان وأجبان", buy: 76, sell: 96, unit: "علبة", stock: 22, min: 6, expDays: 90, sup: 0 },
    { name: "زبدة لورباك 200 غرام", cat: "ألبان وأجبان", buy: 128, sell: 162, unit: "علبة", stock: 12, min: 4, expDays: 12, sup: 1 },
    { name: "أرز الضحى 5 كيلو", cat: "مواد غذائية", buy: 375, sell: 449, unit: "كيس", stock: 26, min: 8, sup: 2 },
    { name: "مكرونة الملكة 400 غرام", cat: "مواد غذائية", buy: 11, sell: 15, unit: "كيس", stock: 180, min: 36, sup: 2 },
    { name: "سكر حر 1 كيلو", cat: "مواد غذائية", buy: 40, sell: 47, unit: "كيس", stock: 90, min: 24, sup: 2 },
    { name: "زيت عافية 2.25 لتر", cat: "مواد غذائية", buy: 238, sell: 286, unit: "زجاجة", stock: 32, min: 10, sup: 2 },
    { name: "دقيق المطاحن فاخر 1 كيلو", cat: "مواد غذائية", buy: 27, sell: 34, unit: "كيس", stock: 55, min: 12, sup: 2 },
    { name: "عدس أصفر 1 كيلو", cat: "مواد غذائية", buy: 54, sell: 68, unit: "كيس", stock: 4, min: 8, sup: 2 },
    { name: "صلصة هاينز 300 غرام", cat: "مواد غذائية", buy: 44, sell: 58, unit: "عبوة", stock: 36, min: 8, expDays: 180, sup: 2 },
    { name: "شوكولاتة جالاكسي سادة 36 غرام", cat: "حلويات وسناكس", buy: 17, sell: 25, unit: "قطعة", stock: 120, min: 24, sup: 5 },
    { name: "شيبسي كلاسيك عائلي", cat: "حلويات وسناكس", buy: 38, sell: 55, unit: "كيس", stock: 64, min: 12, sup: 5 },
    { name: "أوريو أصلي 154 غرام", cat: "حلويات وسناكس", buy: 29, sell: 40, unit: "علبة", stock: 45, min: 10, sup: 5 },
    { name: "بسكويت التمر 12 حبة", cat: "حلويات وسناكس", buy: 19, sell: 27, unit: "باكيت", stock: 38, min: 8, sup: 5 },
    { name: "تايد أصلي 2.5 كيلو", cat: "منظفات", buy: 208, sell: 262, unit: "علبة", stock: 16, min: 6, tax: 14, sup: 3 },
    { name: "فيري سائل غسيل الأطباق 500 مل", cat: "منظفات", buy: 54, sell: 69, unit: "زجاجة", stock: 42, min: 10, tax: 14, sup: 3 },
    { name: "كلور مركز 1 لتر", cat: "منظفات", buy: 24, sell: 32, unit: "زجاجة", stock: 60, min: 12, tax: 14, sup: 4 },
    { name: "ديتول مطهر 500 مل", cat: "منظفات", buy: 64, sell: 84, unit: "زجاجة", stock: 28, min: 6, tax: 14, sup: 4 },
    { name: "صابون لوكس 3 قطع", cat: "منظفات", buy: 47, sell: 61, unit: "باكيت", stock: 50, min: 10, tax: 14, sup: 4 },
    { name: "شامبو هيد آند شولدرز 400 مل", cat: "عناية شخصية", buy: 188, sell: 242, unit: "عبوة", stock: 14, min: 4, tax: 14, sup: 3 },
    { name: "معجون أسنان سيغنال 120 مل", cat: "عناية شخصية", buy: 41, sell: 55, unit: "علبة", stock: 44, min: 8, tax: 14, sup: 4 },
    { name: "مناديل فاين 550 منديل", cat: "عناية شخصية", buy: 36, sell: 48, unit: "علبة", stock: 66, min: 12, sup: 2 },
    { name: "حفاضات بامبرز مقاس 4 (64 قطعة)", cat: "عناية شخصية", buy: 378, sell: 463, unit: "عبوة", stock: 10, min: 3, tax: 14, sup: 3 },
    { name: "توست ريتش 600 غرام", cat: "مخبوزات", buy: 31, sell: 40, unit: "كيس", stock: 24, min: 8, expDays: 6, sup: 6 },
    { name: "كرواسون بالشوكولاتة", cat: "مخبوزات", buy: 11, sell: 18, unit: "قطعة", stock: 30, min: 6, expDays: 3, sup: 6 },
  ];
  const prodRows: { id: number; sell: number; buy: number; tax: number; cat: string; name: string; unit: string }[] = [];
  for (let i = 0; i < prods.length; i++) {
    const p = prods[i];
    const [r] = await db.insert(products).values({
      barcode: `62210010${String(1000 + i)}`,
      sku: `PRD-${String(i + 1).padStart(4, "0")}`,
      name: p.name,
      shortName: p.name.split(" ").slice(0, 2).join(" "),
      categoryId: catIds[p.cat],
      supplierId: supIds[p.sup],
      purchasePrice: money(p.buy),
      salePrice: money(p.sell),
      wholesalePrice: money(p.buy + (p.sell - p.buy) * 0.5),
      stock: String(p.stock),
      minStock: String(p.min ?? 5),
      unit: p.unit ?? "قطعة",
      expiryDate: p.expDays ? dateStr(daysAgo(-p.expDays)) : null,
      batchCode: `B${rnd(100, 999)}`,
      taxRate: String(p.tax ?? 0),
      active: true,
    }).returning();
    prodRows.push({ id: r.id, sell: p.sell, buy: p.buy, tax: p.tax ?? 0, cat: p.cat, name: p.name, unit: p.unit ?? "قطعة" });
  }
  console.log(`✓ ${prods.length} منتجًا`);

  // ── العملاء ─────────────────────────────────
  const custData = [
    { name: "أحمد محمود الشاذلي", phone: "01012345678", address: "حي النرجس - التجمع الخامس", email: "ahmed.shazly@gmail.com" },
    { name: "محمد السيد عمر", phone: "01128765432", address: "شارع الجمهورية - وسط البلد" },
    { name: "فاطمة الزهراء إبراهيم", phone: "01233445566", address: "مدينة نصر - عباس العقاد" },
    { name: "حسن علي حسن", phone: "01098765432", address: "حي المعادي - شارع 9" },
    { name: "منى عبد الرحمن", phone: "01551223344", address: "الزمالك - شارع 26 يوليو", email: "mona.a@outlook.com" },
    { name: "سوبر ماركت القمر (جملة)", phone: "0223456789", address: "المنطقة التجارية بالعبور" },
    { name: "كافيتريا الندى", phone: "01277001122", address: "كورنيش النيل" },
    { name: "سامي جرجس فؤاد", phone: "01066677889", address: "مصر الجديدة - روكسي" },
    { name: "أسما خالد مراد", phone: "01155667788", address: "حدائق القبة" },
    { name: "محمود طه رزق", phone: "01033445566", address: "شبرا مصر" },
  ];
  const custIds: number[] = [];
  for (const c of custData) {
    const [r] = await db.insert(customers).values({ ...c, email: c.email ?? null, idNumber: null, notes: null, active: true, createdAt: daysAgo(rnd(30, 300)) }).returning();
    custIds.push(r.id);
  }
  console.log(`✓ ${custData.length} عملاء`);

  // ── الفواتير (آخر 45 يومًا) ──────────────────
  const cashierIds = [3, 2, 1]; // سارة، خالد، عمر (بالترتيب التقريبي لـ ids)
  let invCount = 0;
  let paymentCount = 0;

  for (let day = 45; day >= 0; day--) {
    const dayCount = day === 0 ? rnd(4, 7) : rnd(2, 7);
    for (let k = 0; k < dayCount; k++) {
      const created = daysAgo(day, rnd(9, 21), rnd(0, 59));
      const itemCount = rnd(1, 5);
      const chosen = new Set<number>();
      const items: typeof prodRows = [];
      while (items.length < itemCount) {
        const p = pick(prodRows);
        if (!chosen.has(p.id)) { chosen.add(p.id); items.push(p); }
      }
      let subtotal = 0, taxSum = 0, discSum = 0;
      const itemRows: any[] = [];
      for (const p of items) {
        const qty = p.unit === "كيلو" ? rnd(1, 3) + 0.5 : rnd(1, 4);
        const discPct = pick([0, 0, 0, 5, 10]);
        const line = p.sell * qty;
        const disc = line * (discPct / 100);
        const net = line - disc;
        const taxLine = net * (p.tax / 100);
        subtotal += line; discSum += disc; taxSum += taxLine;
        itemRows.push({
          productId: p.id, productName: p.name, unit: p.unit,
          price: money(p.sell), cost: money(p.buy), qty: String(qty),
          discountPct: String(discPct), taxRate: String(p.tax),
          total: money(net + taxLine),
        });
      }
      const total = Math.round((subtotal - discSum + taxSum) * 100) / 100;

      // نوع الدفع
      const roll = Math.random();
      let method = "cash", paid = total, change = 0, customerId: number | null = null, dueDate: string | null = null;
      if (roll < 0.55) { method = "cash"; paid = total; change = 0; }
      else if (roll < 0.8) { method = "card"; }
      else if (roll < 0.9) { method = "bank"; }
      else {
        // بيع آجل
        method = "credit";
        customerId = pick(custIds);
        paid = Math.random() < 0.5 ? 0 : Math.round(total * pick([0.3, 0.5, 0.7]) * 100) / 100;
        dueDate = dateStr(daysAgo(day - 7));
      }
      if (method === "cash") {
        const rounded = Math.ceil(total / 10) * 10;
        change = Math.round((rounded - total) * 100) / 100;
      }
      const cashPaid = method === "cash" ? Math.round((total + change) * 100) / 100 : paid;

      const [inv] = await db.insert(invoices).values({
        customerId,
        userId: pick(cashierIds),
        status: day < 3 && Math.random() < 0.05 ? "voided" : "completed",
        paymentMethod: method,
        subtotal: money(subtotal),
        discount: money(discSum),
        tax: money(taxSum),
        total: money(total),
        paid: money(method === "cash" ? total : paid),
        changeAmount: money(change),
        notes: null,
        dueDate,
        createdAt: created,
      }).returning();

      for (const it of itemRows) await db.insert(invoiceItems).values({ ...it, invoiceId: inv.id });
      invCount++;

      if (inv.status === "completed") {
        if (method === "cash" || method === "card" || method === "bank") {
          await db.insert(payments).values({
            invoiceId: inv.id, customerId, amount: money(total),
            method: method === "cash" ? "cash" : method, type: "sale", note: null,
            createdBy: inv.userId, createdAt: created,
          });
          paymentCount++;
        } else if (method === "credit") {
          if (paid > 0) {
            await db.insert(payments).values({
              invoiceId: inv.id, customerId, amount: money(paid),
              method: "cash", type: "sale", note: "دفعة أولى", createdBy: inv.userId, createdAt: created,
            });
            paymentCount++;
          }
          // دفعات لاحقة لبعض العملاء
          if (Math.random() < 0.5 && day > 5) {
            const payDate = daysAgo(Math.max(0, day - rnd(2, 4)), rnd(10, 20));
            const extra = Math.round((total - paid) * pick([0.4, 0.6, 1]) * 100) / 100;
            if (extra > 0) {
              await db.insert(payments).values({
                invoiceId: null, customerId, amount: money(extra),
                method: pick(["cash", "bank"]), type: "debt", note: "تحصيل دفعة من الدين",
                createdBy: inv.userId, createdAt: payDate,
              });
              // تحديث paid على الفاتورة
            }
          }
        }
      }
    }
  }

  // إعادة حساب المبالغ المدفوعة لكل فاتورة (من جدول الدفعات العامة للعملاء)
  const allInvoices = await db.select().from(invoices);
  const allPayments = await db.select().from(payments);
  // توزيع FIFO للدفعات العامة (type=debt)
  const debtsByCustomer = new Map<number, number>();
  for (const p of allPayments) {
    if (p.type === "debt" && p.customerId) {
      debtsByCustomer.set(p.customerId, (debtsByCustomer.get(p.customerId) ?? 0) + Number(p.amount));
    }
  }
  for (const [custId, amount] of debtsByCustomer) {
    let pool = amount;
    const custInvoices = allInvoices
      .filter((i) => i.customerId === custId && i.status === "completed")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const inv of custInvoices) {
      if (pool <= 0) break;
      const remaining = Number(inv.total) - Number(inv.paid);
      if (remaining <= 0) continue;
      const apply = Math.min(pool, remaining);
      await db.update(invoices).set({ paid: money(Number(inv.paid) + apply) }).where(eq(invoices.id, inv.id));
      pool -= apply;
    }
  }
  console.log(`✓ ${invCount} فاتورة + ${paymentCount + 40} دفعة`);

  // ── المصروفات ─────────────────────────────────
  const expTemplates = [
    { t: "فاتورة كهرباء", c: "كهرباء", min: 400, max: 1500 },
    { t: "نقل بضاعة", c: "نقل", min: 80, max: 350 },
    { t: "مستلزمات وأكياس", c: "مستلزمات", min: 60, max: 400 },
    { t: "صيانة ثلاجات", c: "صيانة", min: 150, max: 800 },
    { t: "فاتورة مياه", c: "مياه", min: 100, max: 300 },
    { t: "إيجار المحل", c: "إيجار", min: 8000, max: 8000 },
    { t: "إنترنت", c: "اتصالات", min: 350, max: 350 },
  ];
  let expCount = 0;
  for (let day = 45; day >= 0; day--) {
    if (Math.random() < 0.6) {
      const e = pick(expTemplates);
      await db.insert(expenses).values({
        title: e.t, category: e.c, amount: money(rnd(e.min, e.max)),
        note: null, createdBy: 1, createdAt: daysAgo(day, rnd(10, 20)),
      });
      expCount++;
    }
  }
  console.log(`✓ ${expCount} مصروفًا`);

  // ── المشتريات من الموردين ────────────────────
  let purCount = 0;
  for (let i = 0; i < 12; i++) {
    const amount = rnd(800, 600) * 100;
    const paidPartial = Math.round(amount * pick([0, 0.5, 0.8, 1]) * 100) / 100;
    await db.insert(purchases).values({
      supplierId: pick(supIds), amount: money(amount), paid: money(paidPartial),
      note: "فاتورة توريد بضاعة شهرية", createdBy: 1, createdAt: daysAgo(rnd(5, 60)),
    });
    purCount++;
  }
  console.log(`✓ ${purCount} عملية شراء`);

  console.log("✅ اكتمل بذر قاعدة البيانات بنجاح!");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ خطأ في البذر:", e);
  process.exit(1);
});
