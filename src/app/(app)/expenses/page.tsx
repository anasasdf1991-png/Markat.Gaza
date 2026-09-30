"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Search, Trash2, Wallet, ShoppingBag, CalendarDays, X, Zap, Truck as TruckIcon,
} from "lucide-react";
import { fmtMoney, fmtNum, fmtDate, cn, fmtDateTime } from "@/lib/format";
import { Btn, Modal, Input, Select, Field, useToast, Empty, Spinner, Badge, PageHeader, api, Card } from "@/components/ui";
import { useUser } from "@/components/shell";

type Expense = { id: number; title: string; category: string; amount: string; note: string | null; createdAt: string; by: string | null };
type Purchase = { id: number; supplierName: string | null; amount: string; paid: string; note: string | null; createdAt: string; by: string | null };

const CATS = ["كهرباء", "مياه", "إيجار", "مرتبات", "نقل", "صيانة", "مستلزمات", "اتصالات", "أخرى"];
const EMPTY = { title: "", category: "أخرى", amount: "", note: "" };

export default function ExpensesPage() {
  const user = useUser();
  const { push } = useToast();
  const canManage = user.permissions.includes("manage_expenses");
  const canSuppliers = user.permissions.includes("manage_suppliers");
  const canDelete = user.permissions.includes("manage_expenses");
  const [tab, setTab] = useState<"expenses" | "purchases">("expenses");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState({ today: 0, month: 0 });
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("");
  const [modal, setModal] = useState(false);
  const [pModal, setPModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [pForm, setPForm] = useState({ supplierId: "", amount: "", paid: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = range ? `?range=${range}` : "";
    const [e, pu, s] = await Promise.all([
      api<{ expenses: Expense[]; summary: { today: number; month: number } }>(`/api/expenses${p}`),
      api<{ purchases: Purchase[] }>("/api/purchases"),
      api<{ suppliers: { id: number; name: string }[] }>("/api/suppliers"),
    ]);
    setExpenses(e.expenses); setSummary(e.summary);
    setPurchases(pu.purchases); setSuppliers(s.suppliers);
    setLoading(false);
  }, [range]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.title.trim()) return push("error", "عنوان المصروف مطلوب");
    if (!Number(form.amount)) return push("error", "أدخل المبلغ");
    setSaving(true);
    try {
      await api("/api/expenses", { method: "POST", body: { ...form, amount: Number(form.amount) } });
      push("success", "تم تسجيل المصروف");
      setModal(false); setForm(EMPTY); load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر"); }
    setSaving(false);
  }

  async function savePurchase() {
    if (!pForm.supplierId) return push("error", "اختر المورد");
    if (!Number(pForm.amount)) return push("error", "أدخل قيمة الشراء");
    setSaving(true);
    try {
      await api("/api/purchases", { method: "POST", body: { supplierId: Number(pForm.supplierId), amount: Number(pForm.amount), paid: Number(pForm.paid) || 0, note: pForm.note } });
      push("success", "تم تسجيل فاتورة الشراء");
      setPModal(false); setPForm({ supplierId: "", amount: "", paid: "", note: "" }); load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر"); }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api(`/api/expenses/${deleteTarget.id}`, { method: "DELETE" });
      push("success", "تم حذف المصروف");
      setDeleteTarget(null); load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الحذف"); }
  }

  const expShown = range ? expenses.length : expenses.length;

  return (
    <div>
      <PageHeader
        title="المصروفات والمشتريات"
        subtitle={`مصروفات اليوم ${fmtMoney(summary.today)} • الشهر ${fmtMoney(summary.month)}`}
        actions={
          <>
            {canSuppliers && <Btn variant="secondary" onClick={() => setPModal(true)}><ShoppingBag size={16} /> فاتورة شراء</Btn>}
            {canManage && <Btn variant="primary" onClick={() => { setForm(EMPTY); setModal(true); }}><Plus size={17} /> تسجيل مصروف</Btn>}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 stagger">
        {[
          { icon: Zap, label: "مصروفات اليوم", value: fmtMoney(summary.today), tone: "bg-amber-50 text-amber-600" },
          { icon: Wallet, label: "مصروفات الشهر", value: fmtMoney(summary.month), tone: "bg-rose-50 text-rose-600" },
          { icon: ShoppingBag, label: "فواتير شراء", value: fmtNum(purchases.length), tone: "bg-sky-50 text-sky-600" },
          { icon: CalendarDays, label: "عمليات مسجلة", value: fmtNum(expShown), tone: "bg-violet-50 text-violet-600" },
        ].map((s, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", s.tone)}><s.icon size={20} /></div>
            <div className="min-w-0"><div className="text-[11px] font-bold text-slate-400">{s.label}</div><div className="font-black text-lg tnum truncate">{s.value}</div></div>
          </Card>
        ))}
      </div>

      <Card className="p-3.5 mb-4 flex flex-wrap items-center gap-2.5 anim-fade-up">
        <div className="flex gap-1.5">
          {([["expenses", "المصروفات"], ["purchases", "المشتريات"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn("rounded-lg px-4 py-2.5 text-xs font-extrabold border transition-all",
                tab === k ? "bg-[#0a0f1c] text-white border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-emerald-400")}>
              {l}
            </button>
          ))}
        </div>
        {tab === "expenses" && (
          <div className="flex gap-1.5">
            {[["", "الكل"], ["today", "اليوم"], ["month", "هذا الشهر"]].map(([k, l]) => (
              <button key={k} onClick={() => setRange(k)}
                className={cn("rounded-lg px-3.5 py-2.5 text-xs font-extrabold border transition-all",
                  range === k ? "bg-emerald-600 text-white border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-emerald-400")}>
                {l}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden anim-fade-up">
        {loading ? <Spinner /> : tab === "expenses" ? (
          expenses.length === 0 ? <Empty icon={<Wallet size={28} />} title="لا توجد مصروفات" hint="سجّل مصروفات المتجر لحساب صافي الربح بدقة" /> : (
            <div className="overflow-x-auto">
              <table className="tbl w-full min-w-[750px]">
                <thead><tr><th>التاريخ</th><th>البيان</th><th>التصنيف</th><th>المبلغ</th><th>ملاحظة</th><th>بواسطة</th>{canDelete && <th></th>}</tr></thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="text-xs font-bold text-slate-500 whitespace-nowrap">{fmtDateTime(e.createdAt)}</td>
                      <td className="font-extrabold text-slate-800">{e.title}</td>
                      <td><Badge tone="amber">{e.category}</Badge></td>
                      <td className="tnum font-black text-rose-600">{fmtMoney(e.amount)}</td>
                      <td className="text-xs text-slate-500">{e.note ?? "—"}</td>
                      <td className="text-xs font-bold text-slate-400">{e.by ?? "—"}</td>
                      {canDelete && (
                        <td>
                          <button onClick={() => setDeleteTarget(e)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          purchases.length === 0 ? <Empty icon={<ShoppingBag size={28} />} title="لا توجد فواتير شراء" /> : (
            <div className="overflow-x-auto">
              <table className="tbl w-full min-w-[800px]">
                <thead><tr><th>التاريخ</th><th>المورد</th><th>القيمة</th><th>المدفوع</th><th>المتبقي (دين)</th><th>ملاحظة</th><th>بواسطة</th></tr></thead>
                <tbody>
                  {purchases.map((p) => {
                    const remaining = Number(p.amount) - Number(p.paid);
                    return (
                      <tr key={p.id}>
                        <td className="text-xs font-bold text-slate-500 whitespace-nowrap">{fmtDateTime(p.createdAt)}</td>
                        <td className="font-extrabold text-slate-800">{p.supplierName ?? "—"}</td>
                        <td className="tnum font-black">{fmtMoney(p.amount)}</td>
                        <td className="tnum font-bold text-emerald-600">{fmtMoney(p.paid)}</td>
                        <td>{remaining > 0 ? <Badge tone="rose">{fmtMoney(remaining)}</Badge> : <Badge tone="emerald">مسددة</Badge>}</td>
                        <td className="text-xs text-slate-500">{p.note ?? "—"}</td>
                        <td className="text-xs font-bold text-slate-400">{p.by ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      {/* مصروف */}
      <Modal open={modal} onClose={() => setModal(false)} title="تسجيل مصروف جديد">
        <div className="space-y-3.5">
          <Field label="بيان المصروف" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: فاتورة كهرباء شهر يونيو" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="التصنيف">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="المبلغ (شيكل)" required><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="tnum" /></Field>
          </div>
          <Field label="ملاحظة"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="اختياري" /></Field>
        </div>
        <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
          <Btn variant="secondary" className="flex-1" onClick={() => setModal(false)}><X size={15} /> إلغاء</Btn>
          <Btn variant="primary" className="flex-[2]" onClick={save} loading={saving}>حفظ المصروف</Btn>
        </div>
      </Modal>

      {/* شراء */}
      <Modal open={pModal} onClose={() => setPModal(false)} title="تسجيل فاتورة شراء من مورد">
        <div className="space-y-3.5">
          <Field label="المورد" required>
            <Select value={pForm.supplierId} onChange={(e) => setPForm({ ...pForm, supplierId: e.target.value })}>
              <option value="">اختر المورد...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="قيمة الفاتورة (شيكل)" required><Input type="number" value={pForm.amount} onChange={(e) => setPForm({ ...pForm, amount: e.target.value, paid: pForm.paid || e.target.value })} className="tnum" /></Field>
            <Field label="المدفوع الآن (شيكل)"><Input type="number" value={pForm.paid} onChange={(e) => setPForm({ ...pForm, paid: e.target.value })} className="tnum" /></Field>
          </div>
          <Field label="ملاحظة"><Input value={pForm.note} onChange={(e) => setPForm({ ...pForm, note: e.target.value })} /></Field>
        </div>
        <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
          <Btn variant="secondary" className="flex-1" onClick={() => setPModal(false)}>إلغاء</Btn>
          <Btn variant="primary" className="flex-[2]" onClick={savePurchase} loading={saving}>حفظ الشراء</Btn>
        </div>
      </Modal>

      {/* حذف */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="تأكيد حذف المصروف">
        <p className="text-sm text-slate-600">حذف مصروف <span className="font-black">«{deleteTarget?.title}»</span> بقيمة <span className="font-black">{fmtMoney(deleteTarget?.amount ?? 0)}</span>؟</p>
        <div className="flex gap-2 mt-5">
          <Btn variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>تراجع</Btn>
          <Btn variant="danger" className="flex-1" onClick={confirmDelete}><Trash2 size={15} /> نعم، احذف</Btn>
        </div>
      </Modal>
    </div>
  );
}
