"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, Truck, Phone, ShoppingBag, X, CreditCard, Package,
} from "lucide-react";
import { fmtMoney, fmtNum, fmtDate, cn, initials } from "@/lib/format";
import { Btn, Modal, Input, Field, useToast, Empty, Spinner, Badge, PageHeader, api, Card } from "@/components/ui";

type Supplier = {
  id: number; name: string; phone: string | null; email: string | null; address: string | null;
  company: string | null; createdAt: string; totalPurchases: number; totalPaid: number;
  debt: number; purchasesCount: number; productsCount: number;
};

const EMPTY = { name: "", phone: "", email: "", address: "", company: "", notes: "" };

export default function SuppliersPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<Supplier | null>(null);
  const [pForm, setPForm] = useState({ amount: "", paid: "", note: "" });

  const load = useCallback(async () => {
    const d = await api<{ suppliers: Supplier[] }>(`/api/suppliers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setRows(d.suppliers);
    setLoading(false);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(load, q ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  function openAdd() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", company: s.company ?? "", notes: "" });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) return push("error", "اسم المورد مطلوب");
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/suppliers/${editing.id}`, { method: "PUT", body: { ...form, phone: form.phone || null, email: form.email || null, address: form.address || null, company: form.company || null } });
        push("success", "تم تعديل بيانات المورد");
      } else {
        await api("/api/suppliers", { method: "POST", body: form });
        push("success", "تمت إضافة المورد");
      }
      setModal(false); load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الحفظ"); }
    setSaving(false);
  }

  async function addPurchase() {
    if (!purchaseTarget) return;
    const amount = Number(pForm.amount);
    if (!amount || amount <= 0) return push("error", "أدخل قيمة فاتورة الشراء");
    setSaving(true);
    try {
      await api("/api/purchases", { method: "POST", body: { supplierId: purchaseTarget.id, amount, paid: Number(pForm.paid) || 0, note: pForm.note } });
      push("success", "تم تسجيل فاتورة الشراء وتحديث رصيد المورد");
      setPurchaseTarget(null); setPForm({ amount: "", paid: "", note: "" });
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر التسجيل"); }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api(`/api/suppliers/${deleteTarget.id}`, { method: "DELETE" });
      push("success", "تمت أرشفة المورد");
      setDeleteTarget(null); load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الحذف"); }
  }

  const totalDebt = rows.reduce((s, r) => s + r.debt, 0);
  const totalPurchases = rows.reduce((s, r) => s + r.totalPurchases, 0);

  return (
    <div>
      <PageHeader
        title="الموردون"
        subtitle={`${rows.length} مورد • مشتريات بإجمالي ${fmtMoney(totalPurchases)} • مستحق لهم ${fmtMoney(totalDebt)}`}
        actions={<Btn variant="primary" onClick={openAdd}><Plus size={17} /> إضافة مورد</Btn>}
      />

      <Card className="p-3.5 mb-4 anim-fade-up">
        <div className="relative max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عن مورد..." className="input-field ps-10" />
        </div>
      </Card>

      {loading ? <Spinner /> : rows.length === 0 ? (
        <Card><Empty icon={<Truck size={28} />} title="لا يوجد موردون" hint="أضف مورديك لتتبع المشتريات والمستحقات" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 stagger">
          {rows.map((s) => (
            <Card key={s.id} className="p-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-3.5 mb-4">
                <div className="w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 text-violet-600 flex items-center justify-center font-black text-base shrink-0">
                  {initials(s.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-slate-900 truncate">{s.name}</h3>
                  {s.company && <Badge tone="violet" className="mt-1">{s.company}</Badge>}
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mt-1.5">
                    <Phone size={11} /> <span dir="ltr">{s.phone ?? "—"}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 flex items-center justify-center transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget(s)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="rounded-xl bg-slate-50 border border-slate-100 py-2.5">
                  <div className="text-[9.5px] font-bold text-slate-400">إجمالي الشراء</div>
                  <div className="font-black text-[13px] tnum">{fmtNum(s.totalPurchases)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 py-2.5">
                  <div className="text-[9.5px] font-bold text-slate-400">المنتجات</div>
                  <div className="font-black text-[13px] tnum">{fmtNum(s.productsCount)}</div>
                </div>
                <div className={cn("rounded-xl border py-2.5", s.debt > 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200")}>
                  <div className="text-[9.5px] font-bold text-slate-400">مستحق له</div>
                  <div className={cn("font-black text-[13px] tnum", s.debt > 0 ? "text-rose-600" : "text-emerald-600")}>{fmtNum(s.debt)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="primary" className="flex-1" onClick={() => { setPurchaseTarget(s); setPForm({ amount: "", paid: "", note: "" }); }}>
                  <ShoppingBag size={14} /> تسجيل شراء
                </Btn>
                <div className="text-[10px] font-bold text-slate-400 self-center whitespace-nowrap">{fmtNum(s.purchasesCount)} فاتورة شراء</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* نموذج مورد */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `تعديل المورد: ${editing.name}` : "إضافة مورد جديد"}>
        <div className="space-y-3.5">
          <Field label="اسم المورد / الشركة" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الهاتف"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></Field>
            <Field label="البريد الإلكتروني"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الشركة (علامة تجارية)"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="مثال: جهينة" /></Field>
            <Field label="العنوان"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          </div>
          {!editing && <Field label="ملاحظات"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>}
        </div>
        <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
          <Btn variant="secondary" className="flex-1" onClick={() => setModal(false)}><X size={15} /> إلغاء</Btn>
          <Btn variant="primary" className="flex-[2]" onClick={save} loading={saving}>{editing ? "حفظ التعديلات" : "حفظ المورد"}</Btn>
        </div>
      </Modal>

      {/* فاتورة شراء */}
      <Modal open={!!purchaseTarget} onClose={() => setPurchaseTarget(null)} title={`تسجيل فاتورة شراء — ${purchaseTarget?.name ?? ""}`} subtitle="الفرق بين القيمة والمدفوع سيُسجَّل كدين مستحق للمورد">
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="قيمة الفاتورة (شيكل)" required><Input type="number" value={pForm.amount} onChange={(e) => setPForm({ ...pForm, amount: e.target.value, paid: pForm.paid || e.target.value })} className="tnum" autoFocus /></Field>
            <Field label="المدفوع الآن (شيكل)"><Input type="number" value={pForm.paid} onChange={(e) => setPForm({ ...pForm, paid: e.target.value })} className="tnum" /></Field>
          </div>
          <Field label="وصف / ملاحظة"><Input value={pForm.note} onChange={(e) => setPForm({ ...pForm, note: e.target.value })} placeholder="مثال: توريد بضاعة شهر يونيو" /></Field>
          {Number(pForm.amount) > Number(pForm.paid || 0) && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-700">سيُسجَّل كمستحق للمورد</span>
              <span className="font-black tnum text-lg text-amber-600">{fmtNum(Number(pForm.amount) - Number(pForm.paid || 0))} شيكل</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
          <Btn variant="secondary" className="flex-1" onClick={() => setPurchaseTarget(null)}>إلغاء</Btn>
          <Btn variant="primary" className="flex-[2]" onClick={addPurchase} loading={saving}><Package size={16} /> حفظ فاتورة الشراء</Btn>
        </div>
      </Modal>

      {/* حذف */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="تأكيد حذف المورد">
        <p className="text-sm text-slate-600">سيتم أرشفة المورد <span className="font-black">«{deleteTarget?.name}»</span> مع بقاء سجلات الشراء محفوظة.</p>
        <div className="flex gap-2 mt-5">
          <Btn variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>تراجع</Btn>
          <Btn variant="danger" className="flex-1" onClick={confirmDelete}><Trash2 size={15} /> نعم، احذف</Btn>
        </div>
      </Modal>
    </div>
  );
}
