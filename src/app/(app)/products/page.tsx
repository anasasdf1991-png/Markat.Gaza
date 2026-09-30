"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus, Search, Pencil, Trash2, Package, PackageOpen, CalendarX2, Boxes,
  ChevronRight, ChevronLeft, X,
} from "lucide-react";
import { fmtMoney, fmtNum, fmtDate, cn, UNITS } from "@/lib/format";
import { Btn, Modal, Input, Select, Field, useToast, Empty, Spinner, Badge, PageHeader, api, Card } from "@/components/ui";
import { useUser } from "@/components/shell";

type Product = {
  id: number; barcode: string; sku: string; name: string; shortName: string | null;
  categoryId: number | null; categoryName: string | null; supplierId: number | null; supplierName: string | null;
  purchasePrice: string; salePrice: string; wholesalePrice: string; specialPrice: string | null;
  stock: string; minStock: string; unit: string; expiryDate: string | null; batchCode: string | null;
  taxRate: string; description: string | null;
};
type Category = { id: number; name: string };
type Supplier = { id: number; name: string };

const EMPTY_FORM = {
  barcode: "", sku: "", name: "", shortName: "", categoryId: "", supplierId: "",
  purchasePrice: "", salePrice: "", wholesalePrice: "", specialPrice: "",
  stock: "", minStock: "5", unit: "قطعة", expiryDate: "", batchCode: "", taxRate: "0", description: "",
};

const PER_PAGE = 12;

function ProductsPageInner() {
  const user = useUser();
  const { push } = useToast();
  const searchParams = useSearchParams();
  const canAdd = user.permissions.includes("add_product");
  const canDelete = user.permissions.includes("delete_product");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [filter, setFilter] = useState(searchParams.get("filter") ?? "");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [newCat, setNewCat] = useState("");
  const [catTotals, setCatTotals] = useState({ total: 0, low: 0, expired: 0, value: 0 });

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (filter) p.set("filter", filter);
    if (catFilter) p.set("category", catFilter);
    const d = await api<{ products: Product[]; stats: { total: number; low: number; expired: number; value: string } }>(`/api/products?${p}`);
    setProducts(d.products);
    setCatTotals({ total: Number(d.stats.total), low: Number(d.stats.low), expired: Number(d.stats.expired), value: Number(d.stats.value) });
    setLoading(false);
  }, [q, filter, catFilter]);

  useEffect(() => {
    const t = setTimeout(load, q ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  useEffect(() => {
    api<{ categories: Category[] }>("/api/categories").then((d) => setCategories(d.categories));
    api<{ suppliers: Supplier[] }>("/api/suppliers").then((d) => setSuppliers(d.suppliers)).catch(() => {});
  }, []);

  const pages = Math.max(1, Math.ceil(products.length / PER_PAGE));
  const view = products.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => setPage(1), [q, filter, catFilter]);

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setModal(true); }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      barcode: p.barcode, sku: p.sku, name: p.name, shortName: p.shortName ?? "",
      categoryId: p.categoryId ? String(p.categoryId) : "", supplierId: p.supplierId ? String(p.supplierId) : "",
      purchasePrice: String(Number(p.purchasePrice)), salePrice: String(Number(p.salePrice)),
      wholesalePrice: String(Number(p.wholesalePrice)), specialPrice: p.specialPrice ? String(Number(p.specialPrice)) : "",
      stock: String(Number(p.stock)), minStock: String(Number(p.minStock)), unit: p.unit,
      expiryDate: p.expiryDate ?? "", batchCode: p.batchCode ?? "", taxRate: String(Number(p.taxRate)),
      description: p.description ?? "",
    });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) return push("error", "اسم المنتج مطلوب");
    setSaving(true);
    try {
      const payload = { ...form, categoryId: form.categoryId || null, supplierId: form.supplierId || null };
      if (editing) {
        await api(`/api/products/${editing.id}`, { method: "PUT", body: payload });
        push("success", "تم تعديل المنتج بنجاح");
      } else {
        await api("/api/products", { method: "POST", body: payload });
        push("success", "تمت إضافة المنتج بنجاح");
      }
      setModal(false);
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الحفظ"); }
    setSaving(false);
  }

  async function addCategory() {
    if (!newCat.trim()) return;
    try {
      const d = await api<{ category: Category }>("/api/categories", { method: "POST", body: { name: newCat.trim() } });
      setCategories((prev) => [...prev, d.category]);
      setForm((f) => ({ ...f, categoryId: String(d.category.id) }));
      setNewCat("");
      push("success", "تمت إضافة القسم");
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر"); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
      push("success", `تم حذف «${deleteTarget.name}»`);
      setDeleteTarget(null);
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الحذف"); }
  }

  const chips = [
    { key: "", label: "كل المنتجات", icon: Package, count: catTotals.total },
    { key: "low", label: "منخفض المخزون", icon: PackageOpen, count: catTotals.low },
    { key: "expired", label: "منتهي الصلاحية", icon: CalendarX2, count: catTotals.expired },
    { key: "expiring", label: "قارب على الانتهاء", icon: CalendarX2, count: null },
  ];

  const stockBadge = (p: Product) => {
    const s = Number(p.stock);
    if (s <= Number(p.minStock)) return <Badge tone={s === 0 ? "rose" : "amber"}>{fmtNum(s)} {p.unit}</Badge>;
    return <Badge tone="emerald">{fmtNum(s)} {p.unit}</Badge>;
  };
  const expiryBadge = (p: Product) => {
    if (!p.expiryDate) return <span className="text-slate-300">—</span>;
    const expired = new Date(p.expiryDate) < new Date(new Date().toDateString());
    const soon = !expired && new Date(p.expiryDate) < new Date(Date.now() + 30 * 864e5);
    return <Badge tone={expired ? "rose" : soon ? "amber" : "slate"}>{fmtDate(p.expiryDate)}</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="المنتجات والمخزون"
        subtitle={`${fmtNum(catTotals.total)} منتج • قيمة المخزون ${fmtMoney(catTotals.value)}`}
        actions={
          canAdd && <Btn variant="primary" onClick={openAdd}><Plus size={17} /> إضافة منتج</Btn>
        }
      />

      {/* إحصائيات مصغرة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 stagger">
        {[
          { icon: Package, label: "إجمالي المنتجات", value: fmtNum(catTotals.total), tone: "bg-emerald-50 text-emerald-600" },
          { icon: PackageOpen, label: "منخفض المخزون", value: fmtNum(catTotals.low), tone: "bg-amber-50 text-amber-600" },
          { icon: CalendarX2, label: "منتهي الصلاحية", value: fmtNum(catTotals.expired), tone: "bg-rose-50 text-rose-600" },
          { icon: Boxes, label: "قيمة المخزون", value: fmtMoney(catTotals.value), tone: "bg-sky-50 text-sky-600" },
        ].map((s, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", s.tone)}><s.icon size={20} /></div>
            <div><div className="text-[11px] font-bold text-slate-400">{s.label}</div><div className="font-black text-lg tnum">{s.value}</div></div>
          </Card>
        ))}
      </div>

      {/* أدوات التصفية */}
      <Card className="p-3.5 mb-4 flex flex-wrap items-center gap-2.5 anim-fade-up">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم / الباركود / SKU..." className="input-field ps-10" />
        </div>
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-44">
          <option value="">كل الأقسام</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {chips.map((c) => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className={cn("shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-extrabold border transition-all",
                filter === c.key ? "bg-[#0a0f1c] text-white border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-emerald-400")}>
              <c.icon size={13} /> {c.label}
              {c.count !== null && <span className="tnum opacity-70">({fmtNum(c.count)})</span>}
            </button>
          ))}
        </div>
      </Card>

      {/* الجدول */}
      <Card className="overflow-hidden anim-fade-up">
        {loading ? <Spinner /> : view.length === 0 ? (
          <Empty icon={<Package size={28} />} title="لا توجد منتجات" hint={canAdd ? "ابدأ بإضافة أول منتج إلى متجرك" : undefined} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tbl w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th>#</th><th>الباركود</th><th>المنتج</th><th>القسم</th>
                    <th>سعر الشراء</th><th>سعر البيع</th><th>المخزون</th><th>الصلاحية</th><th>الحالة</th>
                    {(canAdd || canDelete) && <th>إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {view.map((p, i) => (
                    <tr key={p.id}>
                      <td className="tnum text-slate-400 font-bold">{((page - 1) * PER_PAGE + i + 1)}</td>
                      <td className="tnum text-slate-500 font-bold" dir="ltr">{p.barcode}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15 text-emerald-700 flex items-center justify-center font-black text-[11px] shrink-0">
                            {p.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 leading-tight">{p.name}</div>
                            <div className="text-[10.5px] text-slate-400 font-bold">{p.sku}{p.supplierName ? ` • ${p.supplierName}` : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td><Badge tone="slate">{p.categoryName ?? "بدون قسم"}</Badge></td>
                      <td className="tnum font-bold text-slate-500">{fmtNum(p.purchasePrice)}</td>
                      <td className="tnum font-black text-emerald-600">{fmtNum(p.salePrice)}</td>
                      <td>{stockBadge(p)}</td>
                      <td>{expiryBadge(p)}</td>
                      <td>
                        {Number(p.stock) <= Number(p.minStock) ? (
                          <Badge tone="rose">منخفض</Badge>
                        ) : <Badge tone="emerald">متوفر</Badge>}
                      </td>
                      {(canAdd || canDelete) && (
                        <td>
                          <div className="flex gap-1">
                            {canAdd && (
                              <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 flex items-center justify-center transition-colors" title="تعديل">
                                <Pencil size={15} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => setDeleteTarget(p)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors" title="حذف">
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* ترقيم الصفحات */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
                <Btn size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronRight size={15} />
                </Btn>
                {Array.from({ length: pages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={cn("w-9 h-9 rounded-lg text-sm font-black tnum transition-colors", page === i + 1 ? "bg-[#0a0f1c] text-white" : "text-slate-500 hover:bg-slate-100")}>
                    {i + 1}
                  </button>
                ))}
                <Btn size="sm" variant="secondary" disabled={page === pages} onClick={() => setPage(page + 1)}>
                  <ChevronLeft size={15} />
                </Btn>
              </div>
            )}
          </>
        )}
      </Card>

      {/* نموذج إضافة/تعديل */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `تعديل المنتج: ${editing.name}` : "إضافة منتج جديد"} subtitle="جميع الحقول بتاريخ الصلاحية والباركود والضريبة مدعومة" wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <Field label="اسم المنتج" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: حليب جهينة 1 لتر" /></Field>
          <Field label="الاسم المختصر"><Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} /></Field>
          <Field label="القسم / الفئة">
            <div className="flex gap-1.5">
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="flex-1">
                <option value="">بدون قسم</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </Field>
          <Field label="قسم جديد سريع" hint="يُضاف فورًا ويُختار للمنتج">
            <div className="flex gap-1.5">
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="اسم القسم" className="flex-1" />
              <Btn size="sm" variant="secondary" onClick={addCategory} className="shrink-0"><Plus size={14} /></Btn>
            </div>
          </Field>
          <Field label="المورد">
            <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">بدون مورد</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="الباركود" hint="يُولَّد تلقائيًا إذا تُرك فارغًا"><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} dir="ltr" /></Field>
          <Field label="SKU / الكود الداخلي"><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} dir="ltr" /></Field>
          <Field label="سعر الشراء (شيكل)" required><Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="tnum" /></Field>
          <Field label="سعر البيع (شيكل)" required><Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="tnum" /></Field>
          <Field label="سعر الجملة (شيكل)"><Input type="number" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })} className="tnum" /></Field>
          <Field label="سعر خاص / عرض (شيكل)"><Input type="number" value={form.specialPrice} onChange={(e) => setForm({ ...form, specialPrice: e.target.value })} className="tnum" /></Field>
          <Field label="كمية المخزون"><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="tnum" /></Field>
          <Field label="حد الطلب الأدنى"><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="tnum" /></Field>
          <Field label="الوحدة">
            <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </Field>
          <Field label="تاريخ انتهاء الصلاحية"><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
          <Field label="رقم الدفعة (Batch)"><Input value={form.batchCode} onChange={(e) => setForm({ ...form, batchCode: e.target.value })} dir="ltr" /></Field>
          <Field label="نسبة الضريبة (%)"><Input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="tnum" /></Field>
          <Field label="وصف المنتج"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="اختياري" /></Field>
        </div>
        <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
          <Btn variant="secondary" onClick={() => setModal(false)} className="flex-1"><X size={16} /> إلغاء</Btn>
          <Btn variant="primary" onClick={save} loading={saving} className="flex-[2]">{editing ? "حفظ التعديلات" : "حفظ المنتج"}</Btn>
        </div>
      </Modal>

      {/* تأكيد الحذف */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="تأكيد حذف المنتج">
        <p className="text-sm text-slate-600 leading-relaxed">
          هل أنت متأكد من حذف المنتج <span className="font-black text-slate-900">«{deleteTarget?.name}»</span>؟
          سيتم إخفاؤه من المبيعات والقوائم مع الاحتفاظ بسجله في الفواتير السابقة.
        </p>
        <div className="flex gap-2 mt-5">
          <Btn variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>تراجع</Btn>
          <Btn variant="danger" className="flex-1" onClick={confirmDelete}><Trash2 size={15} /> نعم، احذف المنتج</Btn>
        </div>
      </Modal>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProductsPageInner />
    </Suspense>
  );
}
