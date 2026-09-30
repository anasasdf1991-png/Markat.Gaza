"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, Users, FileText, Phone, X, Banknote, HandCoins, FilePlus2, CheckCircle2 } from "lucide-react";
import { fmtMoney, fmtNum, fmtDate, cn, customerNo, initials } from "@/lib/format";
import { Btn, Modal, Input, Select, Field, useToast, Empty, Spinner, Badge, PageHeader, api, Card } from "@/components/ui";
import { useUser } from "@/components/shell";

type Customer = {
  id: number; name: string; phone: string | null; address: string | null;
  createdAt: string; balance: number; totalBilled: number;
  totalPaid: number; invoicesCount: number;
};

const EMPTY = { name: "", phone: "", address: "", notes: "" };

export default function CustomersPage() {
  const user = useUser();
  const { push } = useToast();
  const canManage = user.permissions.includes("manage_customers") || user.permissions.includes("sell");
  const canDebt = user.permissions.includes("add_debt");
  const canCollect = user.permissions.includes("collect_debt");

  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // مودال زبون
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // مودال دين سريع
  const [debtCust, setDebtCust] = useState<Customer | null>(null);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDueDate, setDebtDueDate] = useState("");
  const [debtNote, setDebtNote] = useState("");

  // مودال دفعة سريعة
  const [payCust, setPayCust] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");

  const load = useCallback(async () => {
    const d = await api<{ customers: Customer[] }>(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    setRows(d.customers);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  function openAdd() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", address: c.address ?? "", notes: "" });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) return push("error", "اسم الزبون مطلوب");
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/customers/${editing.id}`, { method: "PUT", body: { name: form.name.trim(), phone: form.phone || null, address: form.address || null } });
        push("success", "تم تعديل بيانات الزبون بنجاح");
      } else {
        await api("/api/customers", { method: "POST", body: { name: form.name.trim(), phone: form.phone || null, address: form.address || null, notes: form.notes || null } });
        push("success", "تمت إضافة الزبون بنجاح");
      }
      setModal(false); load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الحفظ"); }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api(`/api/customers/${deleteTarget.id}`, { method: "DELETE" });
      push("success", "تمت أرشفة الزبون");
      setDeleteTarget(null); load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الحذف"); }
  }

  // تسجيل دين
  async function submitDebt() {
    if (!debtCust) return;
    const amount = Number(debtAmount);
    if (!amount || amount <= 0) return push("error", "أدخل مبلغ الدين بشكل صحيح");
    setSaving(true);
    try {
      await api("/api/invoices", {
        method: "POST",
        body: {
          manualDebt: true,
          customerId: debtCust.id,
          amount,
          dueDate: debtDueDate || null,
          note: debtNote.trim() || null,
        },
      });
      push("success", `تم تسجيل دين بقيمة ${fmtMoney(amount)} على الزبون ${debtCust.name}`);
      setDebtCust(null);
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر تسجيل الدين"); }
    setSaving(false);
  }

  // تسجيل دفعة
  async function submitPayment() {
    if (!payCust) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return push("error", "أدخل مبلغ الدفعة بشكل صحيح");
    setSaving(true);
    try {
      await api("/api/payments", {
        method: "POST",
        body: {
          customerId: payCust.id,
          amount,
          method: payMethod,
          note: payNote.trim() || null,
        },
      });
      push("success", `تم تسجيل دفعة بقيمة ${fmtMoney(amount)} من الزبون ${payCust.name}`);
      setPayCust(null);
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر تسجيل الدفعة"); }
    setSaving(false);
  }

  const totals = rows.reduce((s, r) => ({ billed: s.billed + r.totalBilled, debt: s.debt + r.balance }), { billed: 0, debt: 0 });

  return (
    <div>
      <PageHeader
        title="الزبائن"
        subtitle={`${rows.length} زبون • إجمالي مشتريات ${fmtMoney(totals.billed)} • أرصدة ديون ${fmtMoney(totals.debt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canDebt && (
              <Link href="/debts">
                <Btn variant="secondary" className="gap-1.5"><Plus size={16} /> تسجيل دين جديد</Btn>
              </Link>
            )}
            <Btn variant="primary" onClick={openAdd}><Plus size={17} /> إضافة زبون</Btn>
          </div>
        }
      />

      <Card className="p-3.5 mb-4 flex items-center gap-2.5 anim-fade-up">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عن زبون بالاسم أو الهاتف..." className="input-field ps-10" />
        </div>
      </Card>

      <Card className="overflow-hidden anim-fade-up">
        {loading ? <Spinner /> : rows.length === 0 ? (
          <Empty icon={<Users size={28} />} title="لا يوجد زبائن مسجلون" hint="أضف زبائنك لإدارة ديونهم ومشترياتهم" />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl w-full min-w-[950px]">
              <thead>
                <tr>
                  <th>رقم الزبون</th><th>اسم الزبون والإجراءات</th><th>الهاتف</th><th>العنوان</th>
                  <th>إجمالي المشتريات</th><th>المدفوع</th><th>الرصيد (مدين)</th><th>تاريخ التسجيل</th><th>دفتر الحساب</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="tnum font-bold text-slate-400">{customerNo(c.id)}</td>
                    <td>
                      <div className="flex items-start gap-2.5 py-1">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/15 to-blue-500/15 text-sky-700 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                          {initials(c.name)}
                        </div>
                        <div>
                          <Link href={`/customers/${c.id}`} className="font-extrabold text-slate-900 hover:text-emerald-600 transition-colors text-sm">
                            {c.name}
                          </Link>

                          {/* أزرار سريعة ومباشرة بجانب اسم الزبون */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {canDebt && (
                              <button
                                onClick={() => {
                                  setDebtCust(c);
                                  setDebtAmount("");
                                  setDebtDueDate(new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
                                  setDebtNote("");
                                }}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10.5px] font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all hover:-translate-y-0.5"
                                title="تسجيل دين جديد على هذا الزبون"
                              >
                                <Plus size={11} strokeWidth={3} /> تسجيل دين
                              </button>
                            )}

                            {canCollect && (
                              <button
                                onClick={() => {
                                  setPayCust(c);
                                  setPayAmount(c.balance > 0 ? String(c.balance) : "");
                                  setPayMethod("cash");
                                  setPayNote("");
                                }}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10.5px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all hover:-translate-y-0.5"
                                title="تسجيل دفعة من هذا الزبون"
                              >
                                <Banknote size={11} /> دفعة
                              </button>
                            )}

                            {canManage && (
                              <button onClick={() => openEdit(c)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors" title="تعديل البيانات">
                                <Pencil size={10} /> تعديل
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="tnum font-bold text-slate-500" dir="ltr">{c.phone ?? "—"}</td>
                    <td className="text-slate-500 max-w-44 truncate">{c.address ?? "—"}</td>
                    <td className="tnum font-black">{fmtMoney(c.totalBilled)}</td>
                    <td className="tnum font-bold text-emerald-600">{fmtMoney(c.totalPaid)}</td>
                    <td>{c.balance > 0 ? <Badge tone="rose">{fmtMoney(c.balance)}</Badge> : <Badge tone="emerald">لا يوجد دين</Badge>}</td>
                    <td className="text-slate-400 text-xs font-bold">{fmtDate(c.createdAt)}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link href={`/customers/${c.id}`} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-colors" title="دفتر حساب الزبون">
                          <FileText size={15} />
                        </Link>
                        {user.permissions.includes("manage_customers") && (
                          <button onClick={() => setDeleteTarget(c)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors" title="حذف الزبون">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* نموذج زبون */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `تعديل بيانات الزبون: ${editing.name}` : "إضافة زبون جديد"}>
        <div className="space-y-3.5">
          <Field label="اسم الزبون" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="الاسم الثلاثي للزبون" /></Field>
          <Field label="رقم الهاتف"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" placeholder="05x xxxx xxx" /></Field>
          <Field label="العنوان"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="المنطقة / الحي / الشارع" /></Field>
          {!editing && <Field label="ملاحظات"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="اختياري" /></Field>}
        </div>
        <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
          <Btn variant="secondary" className="flex-1" onClick={() => setModal(false)}><X size={15} /> إلغاء</Btn>
          <Btn variant="primary" className="flex-[2]" onClick={save} loading={saving}>{editing ? "حفظ التعديلات" : "حفظ الزبون"}</Btn>
        </div>
      </Modal>

      {/* تسجيل دين سريع */}
      <Modal open={!!debtCust} onClose={() => setDebtCust(null)} title={`تسجيل دين جديد — ${debtCust?.name ?? ""}`} subtitle={debtCust ? `الرصيد الحالي: ${fmtMoney(debtCust.balance)}` : ""}>
        {debtCust && (
          <div className="space-y-3.5">
            <Field label="مبلغ الدين الجديد (شيكل)" required>
              <Input type="number" min="0" step="0.01" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} className="text-lg font-black tnum" autoFocus placeholder="0.00" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="تاريخ الاستحقاق">
                <Input type="date" value={debtDueDate} onChange={(e) => setDebtDueDate(e.target.value)} />
              </Field>
              <Field label="ملاحظة">
                <Input value={debtNote} onChange={(e) => setDebtNote(e.target.value)} placeholder="مثال: رصيد سابق / مشتريات" />
              </Field>
            </div>
            {Number(debtAmount) > 0 && (
              <div className="rounded-xl bg-gold-400/10 border border-gold-400/30 p-3.5 flex items-center justify-between">
                <span className="text-xs font-extrabold text-gold-700">إجمالي الدين بعد التسجيل:</span>
                <span className="font-black tnum text-lg text-rose-600">{fmtNum(debtCust.balance + Number(debtAmount))} ₪</span>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Btn variant="secondary" className="flex-1" onClick={() => setDebtCust(null)}>إلغاء</Btn>
              <Btn variant="primary" className="flex-[2]" onClick={submitDebt} loading={saving}>
                <Plus size={16} strokeWidth={3} /> تأكيد تسجيل الدين
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* تسجيل دفعة سريعة */}
      <Modal open={!!payCust} onClose={() => setPayCust(null)} title={`تسجيل دفعة سداد — ${payCust?.name ?? ""}`} subtitle={payCust ? `المبلغ المستحق: ${fmtMoney(payCust.balance)}` : ""}>
        {payCust && (
          <div className="space-y-3.5">
            <Field label="مبلغ الدفعة (شيكل)" required>
              <Input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="text-lg font-black tnum" autoFocus placeholder="0.00" />
            </Field>
            <Field label="طريقة الدفع">
              <div className="grid grid-cols-3 gap-2">
                {([["cash", "نقدي", Banknote], ["card", "بطاقة", Banknote], ["bank", "تحويل", Banknote]] as const).map(([m, l]) => (
                  <button key={m} type="button" onClick={() => setPayMethod(m)}
                    className={cn("rounded-xl border-2 py-2 text-xs font-extrabold transition-all",
                      payMethod === m ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:border-emerald-300")}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="ملاحظة">
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="اختياري" />
            </Field>
            <div className="flex gap-2 pt-2">
              <Btn variant="secondary" className="flex-1" onClick={() => setPayCust(null)}>إلغاء</Btn>
              <Btn variant="primary" className="flex-[2]" onClick={submitPayment} loading={saving}>
                <Banknote size={16} /> تأكيد تحصيل الدفعة
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* حذف */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="تأكيد حذف الزبون">
        <p className="text-sm text-slate-600 leading-relaxed">
          سيتم أرشفة الزبون <span className="font-black">«{deleteTarget?.name}»</span> وإخفاؤه من القوائم.
          سجلاته المالية والفواتير تبقى محفوظة.
        </p>
        <div className="flex gap-2 mt-5">
          <Btn variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>تراجع</Btn>
          <Btn variant="danger" className="flex-1" onClick={confirmDelete}><Trash2 size={15} /> نعم، احذف</Btn>
        </div>
      </Modal>
    </div>
  );
}
