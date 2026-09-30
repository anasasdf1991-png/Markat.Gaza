"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, Megaphone, BadgePercent, CalendarDays, Package, Boxes, Store,
  ToggleLeft, ToggleRight, X, Tag,
} from "lucide-react";
import { fmtMoney, fmtNum, fmtDate, cn, fmtDateTime } from "@/lib/format";
import { promoLabel } from "@/lib/promotions";
import { Btn, Modal, Input, Select, Field, useToast, Spinner, Badge, PageHeader, api, Card, Empty } from "@/components/ui";
import { useUser } from "@/components/shell";

type Promo = {
  id: number; name: string; type: "percent" | "fixed" | "bundle" | "bogo";
  value: string; buyQty: string; scope: "product" | "category" | "all"; targetId: number | null;
  startDate: string | null; endDate: string | null; active: boolean; targetName: string | null; createdAt: string;
};
type ProductLite = { id: number; name: string };
type CatLite = { id: number; name: string };

const TYPE_META: Record<Promo["type"], { label: string; hint: string; tone: string }> = {
  percent: { label: "خصم نسبة %", hint: "مثال: خصم 10% على المشروبات", tone: "bg-emerald-50 text-emerald-600" },
  fixed: { label: "خصم مبلغ ثابت", hint: "خصم X شيكل عن كل وحدة", tone: "bg-sky-50 text-sky-600" },
  bundle: { label: "عرض الحزمة", hint: "مثال: 3 وحدات بـ 10 شيكل", tone: "bg-violet-50 text-violet-600" },
  bogo: { label: "اشترِ واحصل", hint: "مثال: اشترِ 1 واحصل على 1 مجانًا", tone: "bg-amber-50 text-amber-600" },
};

export default function PromotionsPage() {
  const user = useUser();
  const { push } = useToast();
  const canManage = user.permissions.includes("manage_inventory");
  const [rows, setRows] = useState<Promo[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [cats, setCats] = useState<CatLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Promo | null>(null);
  const [form, setForm] = useState({ name: "", type: "percent", value: "", buyQty: "", scope: "product", targetId: "", startDate: "", endDate: "" });

  const load = useCallback(async () => {
    const d = await api<{ promotions: Promo[] }>("/api/promotions");
    setRows(d.promotions);
    setLoading(false);
  }, []);
  useEffect(() => {
    load().catch(() => push("error", "تعذر التحميل"));
    api<{ products: ProductLite[] }>("/api/products?limit=600").then((d) => setProducts(d.products));
    api<{ categories: CatLite[] }>("/api/categories").then((d) => setCats(d.categories.map((c) => ({ id: c.id, name: c.name }))));
  }, [load, push]);

  async function save() {
    if (!form.name.trim()) return push("error", "اسم العرض مطلوب");
    if (!Number(form.value)) return push("error", "أدخل قيمة العرض");
    if (form.scope !== "all" && !form.targetId) return push("error", "حدد المنتج أو القسم");
    setSaving(true);
    try {
      await api("/api/promotions", {
        method: "POST",
        body: { ...form, value: Number(form.value), buyQty: Number(form.buyQty) || 0, targetId: form.targetId ? Number(form.targetId) : null },
      });
      push("success", "تم إنشاء العرض ويُطبق تلقائيًا في نقطة البيع");
      setModal(false);
      setForm({ name: "", type: "percent", value: "", buyQty: "", scope: "product", targetId: "", startDate: "", endDate: "" });
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الإنشاء"); }
    setSaving(false);
  }

  async function toggle(p: Promo) {
    await api(`/api/promotions/${p.id}`, { method: "PUT", body: { active: !p.active } }).catch(() => push("error", "تعذر"));
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api(`/api/promotions/${deleteTarget.id}`, { method: "DELETE" });
      push("success", "تم حذف العرض");
      setDeleteTarget(null); load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الحذف"); }
  }

  return (
    <div>
      <PageHeader title="العروض والخصومات" subtitle="عروض تُطبق تلقائيًا في نقطة البيع (نسب، مبالغ، حزم، اشترِ واحصل)"
        actions={canManage && <Btn variant="primary" onClick={() => setModal(true)}><Plus size={17} /> إنشاء عرض</Btn>}
      />

      {loading ? <Spinner /> : rows.length === 0 ? (
        <Card>
          <Empty icon={<Megaphone size={28} />} title="لا توجد عروض بعد" hint={canManage ? "أنشئ أول عرض وسيتم تطبيقه مباشرة في نقطة البيع" : "اطلب من المدير إنشاء عروض"} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 stagger">
          {rows.map((p) => {
            const meta = TYPE_META[p.type];
            return (
              <Card key={p.id} className={cn("p-5 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl", !p.active && "opacity-60")}>
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", meta.tone)}>
                    <BadgePercent size={20} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge tone={p.active ? "emerald" : "slate"}>{p.active ? "نشط" : "موقوف"}</Badge>
                    {canManage && (
                      <>
                        <button onClick={() => toggle(p)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-colors" title={p.active ? "إيقاف" : "تفعيل"}>
                          {p.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors" title="حذف">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <h3 className="font-black text-slate-900 text-555 mb-1.5">{p.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <Badge tone="gold">{promoLabel({ ...p, value: Number(p.value), buyQty: Number(p.buyQty) })}</Badge>
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    {p.scope === "product" ? <Package size={11} /> : p.scope === "category" ? <Boxes size={11} /> : <Store size={11} />}
                    {p.targetName ?? "كل المتجر"}
                  </span>
                </div>
                <div className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1.5">
                  <CalendarDays size={11} />
                  {p.startDate ? fmtDate(p.startDate) : "دائم"} — {p.endDate ? fmtDate(p.endDate) : "بدون نهاية"}
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[9.5px] font-bold text-slate-400">أُنشئ {fmtDateTime(p.createdAt)}</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* نموذج إنشاء عرض */}
      <Modal open={modal} onClose={() => setModal(false)} title="إنشاء عرض جديد" subtitle="يتم تطبيق العرض تلقائيًا بالخادم — لن يحتاج الكاشير لإدخال خصم يدوي">
        <div className="space-y-3.5">
          <Field label="اسم العرض" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: عرض قسم المشروبات" />
          </Field>
          <Field label="نوع العرض" required>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(TYPE_META) as Promo["type"][]).map((t) => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className={cn("rounded-xl border-2 px-3 py-2.5 text-start transition-all",
                    form.type === t ? "border-gold-400 bg-gold-400/10" : "border-slate-200 hover:border-gold-400/50")}>
                  <div className="text-[12px] font-extrabold text-slate-800">{TYPE_META[t].label}</div>
                  <div className="text-[10px] font-bold text-slate-400">{TYPE_META[t].hint}</div>
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={form.type === "percent" ? "النسبة %" : form.type === "fixed" ? "خصم لكل وحدة (شيكل)" : form.type === "bundle" ? "سعر الحزمة (شيكل)" : "عدد الوحدات المجانية"} required>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="tnum" placeholder={form.type === "percent" ? "10" : ""} />
            </Field>
            {["bundle", "bogo"].includes(form.type) ? (
              <Field label="الكمية المطلوبة" required>
                <Input type="number" value={form.buyQty} onChange={(e) => setForm({ ...form, buyQty: e.target.value })} className="tnum" placeholder="3" />
              </Field>
            ) : (
              <Field label="النطاق">
                <Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as Promo["scope"], targetId: "" })}>
                  <option value="product">منتج محدد</option>
                  <option value="category">قسم كامل</option>
                  <option value="all">كل المتجر</option>
                </Select>
              </Field>
            )}
          </div>
          {["bundle", "bogo"].includes(form.type) && (
            <Field label="النطاق">
              <Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as Promo["scope"], targetId: "" })}>
                <option value="product">منتج محدد</option>
                <option value="category">قسم كامل</option>
                <option value="all">كل المتجر</option>
              </Select>
            </Field>
          )}
          {form.scope === "product" && (
            <Field label="المنتج" required>
              <Select value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })}>
                <option value="">اختر المنتج...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          )}
          {form.scope === "category" && (
            <Field label="القسم" required>
              <Select value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })}>
                <option value="">اختر القسم...</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ البدء"><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="تاريخ الانتهاء"><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          </div>
          <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-[11.5px] font-bold text-sky-700 leading-relaxed">
            <Tag size={13} className="inline-block ms-1 -mt-0.5" />
            سيظهر شارة العرض على بطاقة المنتج في نقطة البيع، ويُحسب الخصم نهائيًا في الخادم عند حفظ الفاتورة.
          </div>
          <div className="flex gap-2 pt-1">
            <Btn variant="secondary" className="flex-1" onClick={() => setModal(false)}><X size={15} /> إلغاء</Btn>
            <Btn variant="primary" className="flex-[2]" onClick={save} loading={saving}><BadgePercent size={16} /> إنشاء العرض</Btn>
          </div>
        </div>
      </Modal>

      {/* تأكيد الحذف */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="تأكيد حذف العرض">
        <p className="text-sm text-slate-600">حذف العرض <span className="font-black">«{deleteTarget?.name}»</span>؟ الفواتير السابقة التي استفادت منه لن تتأثر.</p>
        <div className="flex gap-2 mt-5">
          <Btn variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>تراجع</Btn>
          <Btn variant="danger" className="flex-1" onClick={confirmDelete}><Trash2 size={15} /> نعم، احذف</Btn>
        </div>
      </Modal>
    </div>
  );
}
