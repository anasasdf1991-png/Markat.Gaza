"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Minus, Trash2, PauseCircle, PlayCircle, XCircle, UserPlus,
  Banknote, CreditCard, Landmark, SplitSquareHorizontal, CalendarClock,
  Printer, CheckCircle2, PackageX, ScanBarcode, Pause, Tag, User, X, Star,
} from "lucide-react";
import { fmtMoney, fmtNum, cn, invoiceNo } from "@/lib/format";
import { Btn, Modal, Input, Select, Field, useToast, Empty, Badge, api } from "@/components/ui";
import { Receipt, PrintArea, type ReceiptData } from "@/components/receipt";
import { bestPromoForLine, promoLabel, type PromotionRule } from "@/lib/promotions";
import { useUser, useOffline } from "@/components/shell";
import {
  cacheProducts, cacheCustomers, getCachedProducts, getCachedCustomers,
  queueSale, newClientRef, decrementCachedStock,
} from "@/lib/offline";

// ── أنواع ──
type Product = {
  id: number; barcode: string; sku: string; name: string; categoryName: string | null;
  categoryId: number | null; salePrice: string; stock: string; unit: string; taxRate: string;
  favorite?: boolean; soldQty?: string | number;
};
type CartItem = { productId: number; name: string; unit: string; price: number; stock: number; qty: number; discPct: number; taxRate: number };
type Customer = { id: number; name: string; phone: string | null; balance: number };
type Category = { id: number; name: string; count: number };
type Suspended = { id: number; label: string | null; total: string; itemsCount: number; createdAt: string; customerName: string | null };
type PayTab = "cash" | "card" | "bank" | "mixed" | "credit";

const catColors = ["from-emerald-500 to-teal-600", "from-sky-500 to-blue-600", "from-amber-500 to-orange-600", "from-violet-500 to-purple-600", "from-rose-500 to-pink-600", "from-cyan-500 to-teal-600"];

export default function POSPage() {
  const user = useUser();
  const { push } = useToast();
  const canEditPrice = user.permissions.includes("edit_price");
  const canDebt = user.permissions.includes("add_debt");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<number | 0>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<number | 0>(0);
  const [invoiceDiscount, setInvoiceDiscount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const [payOpen, setPayOpen] = useState(false);
  const [payTab, setPayTab] = useState<PayTab>("cash");
  const [paidInput, setPaidInput] = useState("");
  const [mixedRows, setMixedRows] = useState([{ method: "cash", amount: "" }, { method: "card", amount: "" }]);
  const [creditPaid, setCreditPaid] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [successInv, setSuccessInv] = useState<ReceiptData | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [suspendedOpen, setSuspendedOpen] = useState(false);
  const [suspended, setSuspended] = useState<Suspended[]>([]);
  const [holdLabel, setHoldLabel] = useState("");
  const [holdOpen, setHoldOpen] = useState(false);
  const [custModal, setCustModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", phone: "" });
  const [frequent, setFrequent] = useState<Product[]>([]);
  const [promos, setPromos] = useState<PromotionRule[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);

  // ── تحميل البيانات — مع تخزين محلي للأوفلاين ──
  const load = useCallback(async () => {
    try {
      const [p, c, cu] = await Promise.all([
        api<{ products: Product[] }>("/api/products?limit=600"),
        api<{ categories: Category[] }>("/api/categories"),
        api<{ customers: Customer[] }>("/api/customers"),
      ]);
      setProducts(p.products);
      setCategories(c.categories);
      setCustomers(cu.customers);
      // خزّن محليًا ليعمل البيع حتى بدون إنترنت
      await cacheProducts(p.products);
      await cacheCustomers(cu.customers);
      // العروض النشطة
      const pr = await api<{ promotions: { id: number; name: string; type: never; value: string; buyQty: string; scope: never; targetId: number | null; startDate: string | null; endDate: string | null; active: boolean }[] }>("/api/promotions").catch(() => null);
      if (pr) {
        setPromos(pr.promotions.filter((x) => x.active).map((x) => ({
          id: x.id, name: x.name, type: x.type as PromotionRule["type"], value: Number(x.value),
          buyQty: Number(x.buyQty), scope: x.scope as PromotionRule["scope"], targetId: x.targetId,
          startDate: x.startDate, endDate: x.endDate, active: x.active,
        })));
      }
    } catch {
      // وضع أوفلاين: حمّل آخر نسخة متزامنة محليًا
      const cachedP = await getCachedProducts<Product>();
      const cachedC = await getCachedCustomers<Customer>();
      if (cachedP.length) {
        setProducts(cachedP);
        setCustomers(cachedC);
        const catsMap = new Map<number, Category>();
        for (const p of cachedP) {
          if (p.categoryId && p.categoryName) catsMap.set(p.categoryId, { id: p.categoryId, name: p.categoryName, count: 0 });
        }
        setCategories([...catsMap.values()]);
        push("warn", "وضع غير متصل — البيع يعمل محليًا ويُزامَن لاحقًا");
      } else {
        push("error", "تعذر تحميل بيانات البيع ولا توجد نسخة محلية");
      }
    }
    setLoading(false);
  }, [push]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<{ products: Product[] }>("/api/products?frequent=1").then((d) => {
      setFrequent(d.products.filter((p) => Number(p.soldQty ?? 0) > 0).slice(0, 10) as Product[]);
    }).catch(() => {});
  }, []);

  // اختصارات الكاشير: F2 بحث • F4 الدفع • F6 تعليق
  const hotkeysRef = useRef<{ openPay: () => void; hold: () => void }>({ openPay: () => {}, hold: () => {} });
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "F4" && !inInput) { e.preventDefault(); hotkeysRef.current.openPay(); }
      else if (e.key === "F6" && !inInput) { e.preventDefault(); hotkeysRef.current.hold(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const toggleFavorite = useCallback(async (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !p.favorite;
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, favorite: next } : x)));
    try {
      await api(`/api/products/${p.id}`, { method: "PUT", body: { __favoriteOnly: true, favorite: next } });
      push("success", next ? `أُضيف «${p.name}» للمفضلة` : "أزيل من المفضلة");
    } catch { setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, favorite: !next } : x))); }
  }, [push]);

  // ── تصفية المنتجات ──
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCat && p.categoryId !== activeCat) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term) || p.barcode.includes(term) || p.sku.toLowerCase().includes(term);
    }).slice(0, 60);
  }, [products, q, activeCat]);

  // ── إضافة للسلة ──
  const addToCart = useCallback((p: Product) => {
    const stock = Number(p.stock);
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === p.id);
      if (ex) {
        if (ex.qty + 1 > stock) { push("warn", `المتوفر من «${p.name}» هو ${fmtNum(stock)} ${p.unit} فقط`); return prev; }
        return prev.map((i) => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      if (stock <= 0) { push("warn", `«${p.name}» غير متوفر في المخزون`); return prev; }
      return [...prev, { productId: p.id, name: p.name, unit: p.unit, price: Number(p.salePrice), stock, qty: 1, discPct: 0, taxRate: Number(p.taxRate) }];
    });
  }, [push]);

  /** أفضل عرض نشط لمنتج (للشارة على البطاقة) */
  const promoFor = (p: Product): PromotionRule | null => {
    if (!promos.length) return null;
    let catPromo: PromotionRule | null = null;
    for (const promo of promos) {
      if (promo.scope === "product" && promo.targetId === p.id) return promo;
      if (promo.scope === "category" && promo.targetId === p.categoryId) catPromo = catPromo ?? promo;
      if (promo.scope === "all") catPromo = catPromo ?? promo;
    }
    return catPromo;
  };

  // إدخال الباركود بالمسح الضوئي
  function onSearchKey(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    const term = q.trim();
    if (!term) return;
    const exact = products.find((p) => p.barcode === term || p.sku.toLowerCase() === term.toLowerCase());
    if (exact) { addToCart(exact); setQ(""); }
    else if (filtered.length === 1) { addToCart(filtered[0]); setQ(""); }
  }

  // ── عمليات السلة ──
  const setQty = (pid: number, qty: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.productId === pid);
      if (!item) return prev;
      if (qty <= 0) return prev.filter((i) => i.productId !== pid);
      if (qty > item.stock) { push("warn", `الحد الأقصى المتاح: ${fmtNum(item.stock)} ${item.unit}`); qty = item.stock; }
      return prev.map((i) => i.productId === pid ? { ...i, qty } : i);
    });
  };
  const setField = (pid: number, field: "price" | "discPct", v: number) =>
    setCart((prev) => prev.map((i) => i.productId === pid ? { ...i, [field]: Math.max(0, v) } : i));

  // ── الحسابات (مع العروض كمعاينة — يطبقها الخادم نهائيًا) ──
  const totals = useMemo(() => {
    let subtotal = 0, itemsDisc = 0, tax = 0, promoDisc = 0;
    for (const i of cart) {
      const line = i.price * i.qty;
      const disc = line * i.discPct / 100;
      const net = line - disc;
      subtotal += line; itemsDisc += disc;
      // تقدير خصم العرض على السعر بعد خصم المستخدم
      const hit = bestPromoForLine(promos, {
        productId: i.productId, categoryId: products.find((p) => p.id === i.productId)?.categoryId ?? null,
        qty: i.qty, price: net > 0 ? net / i.qty : i.price,
      });
      promoDisc += hit.discount;
      tax += (net - hit.discount) * i.taxRate / 100;
    }
    promoDisc = Math.round(promoDisc * 100) / 100;
    const disc = itemsDisc + promoDisc;
    const invDisc = Math.min(Number(invoiceDiscount) || 0, Math.max(0, subtotal - disc));
    const discount = disc + invDisc;
    const total = Math.max(0, subtotal - discount + tax);
    return { subtotal, discount, tax, total, promoDisc, count: cart.reduce((s, i) => s + i.qty, 0) };
  }, [cart, invoiceDiscount, promos, products]);

  // ── الفواتير المعلقة ──
  async function loadSuspended() {
    const d = await api<{ invoices: Suspended[] }>("/api/invoices?status=suspended");
    setSuspended(d.invoices);
  }
  async function holdInvoice() {
    if (!cart.length) return;
    try {
      await api("/api/invoices", {
        method: "POST",
        body: {
          status: "suspended", customerId: customerId || null, suspendedLabel: holdLabel.trim() || null,
          items: cart.map((i) => ({ productId: i.productId, qty: i.qty, price: i.price, discountPct: i.discPct })),
          notes: notes || null,
        },
      });
      push("success", "تم تعليق الفاتورة ويمكن استرجاعها لاحقًا");
      setCart([]); setInvoiceDiscount(""); setNotes(""); setHoldOpen(false); setHoldLabel("");
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر تعليق الفاتورة"); }
  }
  async function restoreInvoice(id: number) {
    try {
      const d = await api<{ invoice: { id: number; customerId: number | null; notes: string | null }; items: { productId: number; productName: string; unit: string; qty: string; price: string; discountPct: string; taxRate: string }[] }>(`/api/invoices/${id}`);
      const items: CartItem[] = d.items.map((it) => {
        const p = products.find((x) => x.id === it.productId);
        return {
          productId: it.productId!, name: it.productName, unit: it.unit,
          price: Number(it.price), qty: Number(it.qty), discPct: Number(it.discountPct),
          taxRate: Number(it.taxRate), stock: p ? Number(p.stock) + Number(it.qty) : 999,
        };
      });
      setCart(items);
      setCustomerId(d.invoice.customerId ?? 0);
      setNotes(d.invoice.notes ?? "");
      await api(`/api/invoices/${id}`, { method: "DELETE" });
      setSuspendedOpen(false);
      push("info", "تم استرجاع الفاتورة المعلقة إلى السلة");
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الاسترجاع"); }
  }

  // ── زبون سريع ──
  async function quickAddCustomer() {
    if (!newCust.name.trim()) return;
    try {
      const d = await api<{ customer: Customer }>("/api/customers", { method: "POST", body: { name: newCust.name.trim(), phone: newCust.phone.trim() || null } });
      setCustomers((prev) => [d.customer, ...prev]);
      setCustomerId(d.customer.id);
      setCustModal(false); setNewCust({ name: "", phone: "" });
      push("success", "تمت إضافة الزبون بنجاح");
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الإضافة"); }
  }

  // ── الدفع ──
  function openPay() {
    if (!cart.length) return push("warn", "السلة فارغة — أضف منتجات أولًا");
    setPaidInput(totals.total.toFixed(2));
    setPayTab("cash");
    setCreditPaid("0");
    setDueDate(new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
    setPayOpen(true);
  }
  // ربط الاختصارات بالدوال
  hotkeysRef.current = {
    openPay: () => { if (!payOpen && !successInv) openPay(); },
    hold: () => { if (cart.length) setHoldOpen(true); },
  };

  const mixedSum = mixedRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  let pays: { method: string; amount: number }[] = [];
  let method: string = payTab;

  async function completeSale() {
    setSubmitting(true);
    pays = [];
    method = payTab;
    try {
      if (payTab === "cash") pays = [{ method: "cash", amount: Number(paidInput) || totals.total }];
      else if (payTab === "card" || payTab === "bank") pays = [{ method: payTab, amount: totals.total }];
      else if (payTab === "mixed") {
        pays = mixedRows.filter((r) => Number(r.amount) > 0).map((r) => ({ method: r.method, amount: Number(r.amount) }));
        if (Math.abs(mixedSum - totals.total) > 0.01) throw new Error("مجموع مبالغ الدفع المختلط يجب أن يساوي إجمالي الفاتورة");
        method = "mixed";
      } else {
        const paid = Math.min(Number(creditPaid) || 0, totals.total);
        pays = paid > 0 ? [{ method: "cash", amount: paid }] : [];
        if (!customerId) throw new Error("البيع الآجل يتطلب اختيار زبون مسجل");
      }
      const payload = {
        customerId: customerId || null,
        items: cart.map((i) => ({ productId: i.productId, qty: i.qty, price: canEditPrice ? i.price : undefined, discountPct: canEditPrice ? i.discPct : 0 })),
        invoiceDiscount: canEditPrice ? Number(invoiceDiscount) || 0 : 0,
        notes: notes || null, paymentMethod: method, payments: pays,
        dueDate: payTab === "credit" ? dueDate : null,
      };
      const res = await api<ReceiptData & { invoice: ReceiptData["invoice"] }>("/api/invoices", {
        method: "POST",
        body: payload,
      });
      setSuccessInv(res);
      setReceipt(res);
      setPayOpen(false);
      setCart([]); setInvoiceDiscount(""); setNotes(""); setCustomerId(0);
      load(); // تحديث المخزون
    } catch (e) {
      // ── العمل بدون إنترنت: حفظ محليًا في طابور المزامنة ──
      const isNetworkError = e instanceof TypeError || (e instanceof Error && /fetch|network|Failed/i.test(e.message));
      if (isNetworkError || !navigator.onLine) {
        try {
          const clientRef = newClientRef();
          const payload = {
            customerId: customerId || null,
            items: cart.map((i) => ({ productId: i.productId, qty: i.qty, price: canEditPrice ? i.price : undefined, discountPct: canEditPrice ? i.discPct : 0 })),
            invoiceDiscount: canEditPrice ? Number(invoiceDiscount) || 0 : 0,
            notes: notes || null, paymentMethod: method, payments: pays,
            dueDate: payTab === "credit" ? dueDate : null,
          };
          await queueSale(clientRef, payload);
          for (const i of cart) await decrementCachedStock(i.productId, i.qty);
          // خصم المخزون محليًا للعرض الفوري
          setProducts((prev) => prev.map((p) => {
            const ci = cart.find((x) => x.productId === p.id);
            return ci ? { ...p, stock: String(Math.max(0, Number(p.stock) - ci.qty)) } : p;
          }));
          // إيصال محلي للطباعة
          const localInv: ReceiptData = {
            invoice: {
              id: 0, status: "completed", paymentMethod: method,
              subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax,
              total: totals.total, paid: totals.total, change: change,
              createdAt: new Date().toISOString(),
              customerName: customerId ? customers.find((c) => c.id === customerId)?.name ?? "زبون نقدي" : "زبون نقدي",
              cashier: user.fullName,
              notes: `فاتورة أوفلاين — ستُزامَن عند عودة الاتصال (${clientRef})`,
            },
            items: cart.map((i, idx) => {
              const net = i.price * i.qty * (1 - i.discPct / 100);
              return { id: idx + 1, productName: i.name, qty: i.qty, price: i.price, discountPct: i.discPct, total: Math.round(net * (1 + i.taxRate / 100) * 100) / 100 };
            }),
          };
          setSuccessInv(localInv);
          setReceipt(localInv);
          setPayOpen(false);
          setCart([]); setInvoiceDiscount(""); setNotes(""); setCustomerId(0);
          window.dispatchEvent(new CustomEvent("sobis:queued"));
          push("warn", "حُفظت الفاتورة محليًا — ستُزامَن تلقائيًا عند عودة الإنترنت");
        } catch (qErr) {
          push("error", "تعذر الحفظ المحلي أيضًا");
        }
      } else {
        push("error", e instanceof Error ? e.message : "تعذر إتمام البيع");
      }
    }
    setSubmitting(false);
  }

  function printReceipt() {
    setTimeout(() => window.print(), 120);
  }

  const change = payTab === "cash" ? Math.max(0, (Number(paidInput) || 0) - totals.total) : 0;
  const creditRemaining = payTab === "credit" ? Math.max(0, totals.total - (Number(creditPaid) || 0)) : 0;

  const payTabs: { key: PayTab; label: string; icon: React.ElementType; needPerm?: boolean }[] = [
    { key: "cash", label: "نقدي", icon: Banknote },
    { key: "card", label: "بطاقة", icon: CreditCard },
    { key: "bank", label: "تحويل بنكي", icon: Landmark },
    { key: "mixed", label: "مختلط", icon: SplitSquareHorizontal },
    { key: "credit", label: "آجل / دين", icon: CalendarClock, needPerm: true },
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-4 xl:h-[calc(100vh-128px)]">
      {/* ═══ منطقة المنتجات ═══ */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* شريط البحث */}
        <div className="card p-3 flex flex-wrap gap-2.5 items-center mb-3 shrink-0 anim-fade-up">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" size={18} />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="ابحث بالاسم أو امسح الباركود ثم Enter — (F2)"
              className="input-field ps-11 h-12 text-[15px] font-bold"
            />
            <ScanBarcode className="absolute end-3.5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
          </div>
        </div>

        {/* الأقسام */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 shrink-0 anim-fade-up">
          <button
            onClick={() => setActiveCat(0)}
            className={cn("shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold transition-all border",
              activeCat === 0 ? "bg-[#0a0f1c] text-white border-transparent shadow-lg" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400")}
          >
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={cn("shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold transition-all border",
                activeCat === c.id ? "bg-[#0a0f1c] text-white border-transparent shadow-lg" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400")}
            >
              {c.name} <span className="tnum opacity-60">({fmtNum(c.count)})</span>
            </button>
          ))}
        </div>

        {/* المفضلة والأكثر بيعًا (تظهر عند غياب البحث) */}
        {!q.trim() && !activeCat && (() => {
          const favs = products.filter((p) => p.favorite).slice(0, 6);
          const items = [...favs, ...frequent.filter((f) => !favs.some((x) => x.id === f.id))].slice(0, 8);
          if (!items.length) return null;
          return (
            <div className="mb-3 shrink-0 anim-fade-up">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-gold-500">
                  <Star size={13} className="fill-gold-400 text-gold-400" /> المفضلة والأكثر بيعًا هذا الشهر
                </div>
                <div className="hidden md:flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <kbd className="rounded border border-slate-200 px-1 py-0.5 bg-white">F2</kbd> بحث
                  <kbd className="rounded border border-slate-200 px-1 py-0.5 bg-white">F4</kbd> الدفع
                  <kbd className="rounded border border-slate-200 px-1 py-0.5 bg-white">F6</kbd> تعليق
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {items.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={Number(p.stock) <= 0}
                    className="shrink-0 card !rounded-xl px-3.5 py-2.5 text-start hover:-translate-y-0.5 hover:!border-gold-400/60 transition-all disabled:opacity-50">
                    <div className="text-[12px] font-extrabold text-slate-800 max-w-40 truncate">{p.name}</div>
                    <div className="text-[11px] font-black text-emerald-600 tnum mt-0.5">{fmtNum(p.salePrice)} <span className="text-[9px] text-slate-400">شيكل</span></div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* شبكة المنتجات */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <div key={i} className="card h-36 animate-pulse bg-slate-100" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Empty icon={<PackageX size={28} />} title="لا توجد منتجات مطابقة" hint="جرّب البحث باسم آخر أو امسح الباركود" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 pb-4 stagger">
              {filtered.map((p, i) => {
                const stock = Number(p.stock);
                const inCart = cart.find((c) => c.productId === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={stock <= 0}
                    className={cn(
                      "card p-3 text-start relative overflow-hidden group transition-all duration-200 hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:pointer-events-none",
                    )}
                  >
                    {/* صورة رمزية */}
                    <div className="flex items-start justify-between mb-2">
                      <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-black text-sm shadow-md", catColors[i % catColors.length])}>
                        {p.name.slice(0, 2)}
                      </div>
                      <div className="flex items-center gap-1">
                        {inCart && <Badge tone="emerald" className="tnum">×{fmtNum(inCart.qty)}</Badge>}
                        <span
                          role="button"
                          onClick={(e) => toggleFavorite(p, e)}
                          className={cn("w-6.5 w-[26px] h-[26px] rounded-lg flex items-center justify-center transition-colors",
                            p.favorite ? "text-gold-500 hover:text-slate-300" : "text-slate-300 hover:text-gold-500")}
                          title={p.favorite ? "إزالة من المفضلة" : "تثبيت في المفضلة"}
                        >
                          <Star size={14} className={p.favorite ? "fill-gold-400" : ""} />
                        </span>
                      </div>
                    </div>
                    <div className="font-bold text-[13px] text-slate-800 leading-snug line-clamp-2 min-h-[2.4em] mb-1.5">{p.name}</div>
                    <div className="flex items-end justify-between">
                      <div className="font-black text-emerald-600 tnum text-[15px]">{fmtNum(p.salePrice)} <span className="text-[10px] text-slate-400 font-bold">شيكل</span></div>
                      <div className={cn("text-[10px] font-extrabold rounded-md px-1.5 py-0.5",
                        stock === 0 ? "bg-rose-50 text-rose-600" : stock <= 5 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500")}>
                        {stock === 0 ? "نفذ" : `${fmtNum(stock)} ${p.unit}`}
                      </div>
                    </div>
                    {promoFor(p) && (
                      <div className="mt-1.5 rounded-lg bg-gold-400/10 border border-gold-400/30 px-2 py-1 text-[9.5px] font-extrabold text-gold-600 flex items-center gap-1">
                        <Tag size={10} /> {promoLabel(promoFor(p)!)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ لوحة الفاتورة ═══ */}
      <div className="xl:w-[400px] shrink-0 flex flex-col min-h-0">
        <div className="card flex-1 flex flex-col min-h-0 overflow-hidden anim-fade-up">
          {/* رأس الفاتورة */}
          <div className="px-4 py-3 bg-[#0a0f1c] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-emerald-400" />
              <span className="font-black font-display text-sm">فاتورة بيع جديدة</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { if (!cart.length) return push("warn", "السلة فارغة"); setHoldOpen(true); }} title="تعليق الفاتورة"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-amber-500/30 text-amber-300 flex items-center justify-center transition-colors">
                <Pause size={15} />
              </button>
              <button onClick={() => { loadSuspended(); setSuspendedOpen(true); }} title="استرجاع فاتورة معلقة"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-sky-500/30 text-sky-300 flex items-center justify-center transition-colors">
                <PlayCircle size={15} />
              </button>
              <button onClick={() => { setCart([]); setInvoiceDiscount(""); setNotes(""); }} title="إلغاء الفاتورة"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* الزبون */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 flex gap-2 shrink-0">
            <div className="relative flex-1">
              <User className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <select
                value={customerId}
                onChange={(e) => setCustomerId(Number(e.target.value))}
                className="input-field ps-9 pe-2 py-2 text-xs font-bold cursor-pointer"
              >
                <option value={0}>زبون نقدي (بدون حساب)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</option>
                ))}
              </select>
            </div>
            <Btn size="sm" variant="secondary" onClick={() => setCustModal(true)} className="shrink-0 px-2.5" title="إضافة زبون">
              <UserPlus size={15} />
            </Btn>
          </div>

          {/* الأصناف */}
          <div className="flex-1 overflow-y-auto min-h-[180px]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <ScanBarcode size={40} className="mb-2 opacity-40" />
                <div className="text-xs font-extrabold">امسح باركود أو اختر منتجًا</div>
                <div className="text-[10px] font-bold mt-0.5">لإضافته إلى الفاتورة</div>
              </div>
            ) : (
              <table className="w-full">
                <tbody>
                  {cart.map((i) => {
                    const net = i.price * i.qty * (1 - i.discPct / 100);
                    return (
                      <tr key={i.productId} className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-[12.5px] text-slate-800 leading-tight">{i.name}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {canEditPrice ? (
                              <input type="number" value={i.price || ""} onChange={(e) => setField(i.productId, "price", Number(e.target.value))}
                                className="w-16 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-bold tnum focus:border-emerald-500 outline-none"
                                title="سعر البيع" />
                            ) : (
                              <span className="text-[11px] font-bold text-slate-500 tnum">{fmtNum(i.price)}</span>
                            )}
                            {canEditPrice && (
                              <div className="flex items-center gap-0.5">
                                <input type="number" value={i.discPct || ""} placeholder="0" onChange={(e) => setField(i.productId, "discPct", Math.min(90, Number(e.target.value)))}
                                  className="w-11 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold tnum text-emerald-700 focus:border-emerald-500 outline-none"
                                  title="خصم %" />
                                <span className="text-[10px] text-emerald-600 font-black">%</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 w-28">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setQty(i.productId, i.qty - 1)} className="w-6.5 h-6.5 w-[26px] h-[26px] rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-slate-600 transition-colors">
                              <Minus size={13} />
                            </button>
                            <input type="number" value={i.qty} onChange={(e) => setQty(i.productId, Number(e.target.value))}
                              className="w-11 text-center rounded-lg border border-slate-200 py-1 text-xs font-black tnum outline-none focus:border-emerald-500" />
                            <button onClick={() => setQty(i.productId, i.qty + 1)} className="w-[26px] h-[26px] rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-600 flex items-center justify-center text-slate-600 transition-colors">
                              <Plus size={13} />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-start">
                          <div className="font-black text-[13px] tnum text-slate-900 whitespace-nowrap">{fmtNum(net)}</div>
                          <button onClick={() => setQty(i.productId, 0)} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-0.5 mt-0.5">
                            <X size={10} /> حذف
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* الإجماليات والأزرار */}
          <div className="border-t border-slate-100 p-3.5 space-y-2 shrink-0 bg-slate-50/60">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white border border-slate-100 py-1.5">
                <div className="text-[9.5px] font-bold text-slate-400">الإجمالي الفرعي</div>
                <div className="font-black text-[13px] tnum">{fmtNum(totals.subtotal)}</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 py-1.5 relative">
                <div className="text-[9.5px] font-bold text-slate-400">الخصم</div>
                <div className="font-black text-[13px] tnum text-emerald-600">{fmtNum(totals.discount)}</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 py-1.5">
                <div className="text-[9.5px] font-bold text-slate-400">الضريبة</div>
                <div className="font-black text-[13px] tnum">{fmtNum(totals.tax)}</div>
              </div>
            </div>
            {canEditPrice && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">خصم على الفاتورة (شيكل):</span>
                <input type="number" value={invoiceDiscount} onChange={(e) => setInvoiceDiscount(e.target.value)} placeholder="0"
                  className="input-field py-1.5 text-xs tnum flex-1" />
              </div>
            )}
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات على الفاتورة (اختياري)"
              className="input-field py-1.5 text-xs" />
            {totals.promoDisc > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-gold-400/10 border border-gold-400/30 px-3.5 py-2">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-gold-600">
                  <Tag size={12} /> توفير العروض التلقائية
                </span>
                <span className="font-black tnum text-gold-600">-{fmtNum(totals.promoDisc)}</span>
              </div>
            )}
            <div className="flex items-center justify-between rounded-2xl bg-[#0a0f1c] px-4 py-3">
              <div>
                <div className="text-[10px] font-bold text-slate-400">الإجمالي المستحق</div>
                <div className="text-2xl font-black text-white tnum font-display leading-none mt-1">{fmtNum(totals.total)} <span className="text-xs text-emerald-400">شيكل</span></div>
              </div>
              <Badge tone="dark" className="!bg-white/10 tnum">{fmtNum(totals.count)} صنف</Badge>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Btn variant="secondary" size="sm" onClick={() => { if (!cart.length) return push("warn", "السلة فارغة"); setHoldOpen(true); }} className="!text-amber-600 !border-amber-200 hover:!border-amber-400">
                <PauseCircle size={14} /> تعليق
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => { loadSuspended(); setSuspendedOpen(true); }}>
                <PlayCircle size={14} /> استرجاع
              </Btn>
              <Btn variant="danger" size="sm" onClick={() => { setCart([]); setInvoiceDiscount(""); setNotes(""); }}>
                <XCircle size={14} /> إلغاء
              </Btn>
              <Btn variant="secondary" size="sm" onClick={() => searchRef.current?.focus()}>
                <Search size={14} /> بحث
              </Btn>
            </div>
            <button
              onClick={openPay}
              className="w-full rounded-2xl bg-gradient-to-l from-gold-500 via-gold-400 to-gold-500 text-[#0a0f1c] font-black text-lg py-3.5 shadow-lg shadow-gold-500/30 hover:shadow-xl hover:shadow-gold-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
            >
              <Banknote size={22} />
              إتمام البيع — {fmtNum(totals.total)} شيكل
              <kbd className="rounded-md border border-[#0a0f1c]/25 px-1.5 py-0.5 text-[10px] font-black opacity-70 hidden sm:block">F4</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ نافذة الدفع ═══ */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="إتمام عملية الدفع" wide>
        <div className="rounded-2xl bg-[#0a0f1c] text-white p-5 flex items-center justify-between mb-5">
          <div>
            <div className="text-xs font-bold text-slate-400">إجمالي الفاتورة شامل الضريبة والخصم</div>
            <div className="text-3xl font-black tnum font-display mt-1">{fmtNum(totals.total)} <span className="text-sm text-emerald-400">شيكل</span></div>
          </div>
          <Banknote size={40} className="text-emerald-400/50" />
        </div>

        {/* طرق الدفع */}
        <div className="grid grid-cols-5 gap-2 mb-5">
          {payTabs.map((t) => {
            const disabled = t.needPerm && !canDebt;
            return (
              <button
                key={t.key}
                onClick={() => !disabled && setPayTab(t.key)}
                disabled={disabled}
                title={disabled ? "يتطلب صلاحية تسجيل الديون" : ""}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-[11px] font-extrabold transition-all",
                  payTab === t.key ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md" : "border-slate-200 text-slate-500 hover:border-emerald-300",
                  disabled && "opacity-40 cursor-not-allowed",
                )}
              >
                <t.icon size={19} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* نقدي */}
        {payTab === "cash" && (
          <div className="space-y-3 anim-fade-in">
            <Field label="المبلغ المستلم من الزبون (شيكل)">
              <Input type="number" value={paidInput} onChange={(e) => setPaidInput(e.target.value)} autoFocus className="text-lg font-black tnum" />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              <Btn size="sm" variant="secondary" onClick={() => setPaidInput(totals.total.toFixed(2))}>المبلغ بالضبط</Btn>
              {[50, 100, 200, 500].map((a) => (
                <Btn key={a} size="sm" variant="secondary" onClick={() => setPaidInput(String(a))}>{a}</Btn>
              ))}
            </div>
            <div className={cn("rounded-xl p-4 flex items-center justify-between", change > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200")}>
              <span className="font-extrabold text-sm text-slate-600">الباقي للزبون (Change)</span>
              <span className="font-black text-xl tnum text-emerald-600">{fmtNum(change)} شيكل</span>
            </div>
          </div>
        )}

        {(payTab === "card" || payTab === "bank") && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm font-bold text-slate-600 anim-fade-in">
            سيتم تسجيل المبلغ كاملًا ({fmtMoney(totals.total)}) عبر {payTab === "card" ? "البطاقة البنكية" : "التحويل البنكي"}.
          </div>
        )}

        {/* مختلط */}
        {payTab === "mixed" && (
          <div className="space-y-2.5 anim-fade-in">
            {mixedRows.map((r, idx) => (
              <div key={idx} className="flex gap-2">
                <Select value={r.method} onChange={(e) => setMixedRows((prev) => prev.map((x, i) => i === idx ? { ...x, method: e.target.value } : x))} className="w-40">
                  <option value="cash">نقدي</option><option value="card">بطاقة</option><option value="bank">تحويل بنكي</option>
                </Select>
                <Input type="number" placeholder="المبلغ" value={r.amount} onChange={(e) => setMixedRows((prev) => prev.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x))} className="tnum" />
                <Btn variant="danger" size="sm" onClick={() => setMixedRows((prev) => prev.filter((_, i) => i !== idx))} disabled={mixedRows.length <= 2}><X size={14} /></Btn>
              </div>
            ))}
            <Btn size="sm" variant="secondary" onClick={() => setMixedRows((p) => [...p, { method: "bank", amount: "" }])}><Plus size={14} /> إضافة طريقة</Btn>
            <div className={cn("rounded-xl p-3.5 flex items-center justify-between text-sm font-extrabold", Math.abs(mixedSum - totals.total) < 0.01 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200")}>
              <span>مجموع الدفعات: {fmtNum(mixedSum)} شيكل</span>
              <span>{Math.abs(mixedSum - totals.total) < 0.01 ? "مطابق للإجمالي" : `الفرق: ${fmtNum(Math.abs(totals.total - mixedSum))} شيكل`}</span>
            </div>
          </div>
        )}

        {/* آجل */}
        {payTab === "credit" && (
          <div className="space-y-3 anim-fade-in">
            {!customerId ? (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-sm font-bold text-rose-700">
                البيع الآجل يتطلب اختيار زبون مسجل من قائمة الزبون في أعلى الفاتورة.
              </div>
            ) : (
              <div className="rounded-xl bg-sky-50 border border-sky-200 p-3.5 text-sm font-bold text-sky-700">
                الزبون المحدد: {customers.find((c) => c.id === customerId)?.name}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="دفعة مقدمة (شيكل)">
                <Input type="number" value={creditPaid} onChange={(e) => setCreditPaid(e.target.value)} className="tnum" />
              </Field>
              <Field label="تاريخ استحقاق باقي المبلغ">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
              <span className="font-extrabold text-sm text-amber-700">سيُسجَّل كدين على الزبون</span>
              <span className="font-black text-xl tnum text-amber-600">{fmtNum(creditRemaining)} شيكل</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <Btn variant="secondary" onClick={() => setPayOpen(false)} className="flex-1">تراجع</Btn>
          <Btn variant="primary" size="lg" onClick={completeSale} loading={submitting} className="flex-[2]"
            disabled={payTab === "credit" && (!customerId)}>
            <CheckCircle2 size={19} />
            تأكيد البيع — {fmtNum(totals.total)} شيكل
          </Btn>
        </div>
      </Modal>

      {/* ═══ نجاح العملية ═══ */}
      <Modal open={!!successInv} onClose={() => setSuccessInv(null)} title="">
        {successInv && (
          <div className="text-center -mt-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4 anim-check">
              <CheckCircle2 size={44} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 font-display">تم تسجيل البيع بنجاح</h3>
            <div className="mt-1 text-sm font-bold text-slate-500 tnum">{invoiceNo(successInv.invoice.id)}</div>
            <div className="grid grid-cols-3 gap-2.5 mt-5">
              <div className="rounded-xl bg-slate-50 border border-slate-100 py-3">
                <div className="text-[10px] font-bold text-slate-400">الإجمالي</div>
                <div className="font-black tnum">{fmtNum(successInv.invoice.total)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 py-3">
                <div className="text-[10px] font-bold text-slate-400">المدفوع</div>
                <div className="font-black tnum text-emerald-600">{fmtNum(successInv.invoice.paid)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 py-3">
                <div className="text-[10px] font-bold text-slate-400">{Number(successInv.invoice.change) > 0 ? "الباقي للزبون" : "متبقٍّ عليه"}</div>
                <div className={cn("font-black tnum", Number(successInv.invoice.change) > 0 ? "text-sky-600" : "text-amber-600")}>
                  {Number(successInv.invoice.change) > 0 ? fmtNum(successInv.invoice.change) : fmtNum(Math.max(0, Number(successInv.invoice.total) - Number(successInv.invoice.paid)))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Btn variant="secondary" className="flex-1" onClick={() => { setSuccessInv(null); searchRef.current?.focus(); }}>
                فاتورة جديدة
              </Btn>
              <Btn variant="dark" className="flex-1" onClick={printReceipt}>
                <Printer size={16} /> طباعة الإيصال
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ تعليق فاتورة ═══ */}
      <Modal open={holdOpen} onClose={() => setHoldOpen(false)} title="تعليق الفاتورة الحالية" subtitle="يمكن استرجاعها وإتمام البيع لاحقًا">
        <Field label="اسم / وصف الفاتورة المعلقة (اختياري)">
          <Input value={holdLabel} onChange={(e) => setHoldLabel(e.target.value)} placeholder="مثال: فاتورة السيد أحمد — ينتظر المحفظة" />
        </Field>
        <div className="flex gap-2 mt-5">
          <Btn variant="secondary" className="flex-1" onClick={() => setHoldOpen(false)}>تراجع</Btn>
          <Btn variant="primary" className="flex-1" onClick={holdInvoice}><PauseCircle size={16} /> تأكيد التعليق</Btn>
        </div>
      </Modal>

      {/* ═══ الفواتير المعلقة ═══ */}
      <Modal open={suspendedOpen} onClose={() => setSuspendedOpen(false)} title="الفواتير المعلقة" subtitle="اختر فاتورة لاسترجاعها إلى سلة البيع" wide>
        {suspended.length === 0 ? (
          <Empty icon={<PauseCircle size={26} />} title="لا توجد فواتير معلقة" hint="عند تعليق فاتورة ستظهر هنا لاسترجاعها" />
        ) : (
          <div className="space-y-2">
            {suspended.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3.5 hover:border-emerald-300 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <PauseCircle size={20} />
                </div>
                <div className="flex-1 min-w-32">
                  <div className="font-extrabold text-sm text-slate-800">{s.label || invoiceNo(s.id)}</div>
                  <div className="text-[11px] font-bold text-slate-400">
                    {s.customerName ?? "زبون نقدي"} • {fmtNum(s.itemsCount)} صنف • {fmtMoney(s.total)}
                  </div>
                </div>
                <Btn size="sm" variant="primary" onClick={() => restoreInvoice(s.id)}>
                  <PlayCircle size={14} /> استرجاع
                </Btn>
                <Btn size="sm" variant="danger" onClick={async () => { await api(`/api/invoices/${s.id}`, { method: "DELETE" }); loadSuspended(); push("info", "تم حذف الفاتورة المعلقة"); }}>
                  <Trash2 size={14} />
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ═══ زبون سريع ═══ */}
      <Modal open={custModal} onClose={() => setCustModal(false)} title="إضافة زبون جديد">
        <div className="space-y-3">
          <Field label="اسم الزبون" required>
            <Input value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} placeholder="الاسم الثلاثي للزبون" autoFocus />
          </Field>
          <Field label="رقم الهاتف">
            <Input value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} placeholder="05x xxxx xxx" dir="ltr" />
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <Btn variant="secondary" className="flex-1" onClick={() => setCustModal(false)}>إلغاء</Btn>
          <Btn variant="primary" className="flex-1" onClick={quickAddCustomer}><UserPlus size={16} /> حفظ الزبون</Btn>
        </div>
      </Modal>

      {/* منطقة الطباعة */}
      {receipt && <PrintArea><Receipt data={receipt} /></PrintArea>}
    </div>
  );
}
