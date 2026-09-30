"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Phone, MapPin, Mail, ReceiptText, HandCoins, Printer, ArrowRight,
  Banknote, CreditCard, Landmark, Wallet, ShoppingBag, FileText, CalendarClock, Plus, X,
} from "lucide-react";
import { fmtMoney, fmtNum, fmtDate, fmtDateTime, cn, invoiceNo, customerNo, initials, PAYMENT_METHODS } from "@/lib/format";
import { Btn, Modal, Input, Select, Field, useToast, Spinner, Badge, PageHeader, api, Card } from "@/components/ui";
import { PrintArea } from "@/components/receipt";
import { useUser } from "@/components/shell";

type Account = {
  customer: { id: number; name: string; phone: string | null; address: string | null; email: string | null; idNumber: string | null; createdAt: string; notes: string | null };
  summary: { totalBilled: number; totalPaid: number; balance: number; invoicesCount: number; paymentsCount: number; lastPayment: string | null };
  invoices: { id: number; status: string; paymentMethod: string; total: string; paid: string; remaining: number; dueDate: string | null; createdAt: string; cashier: string | null }[];
  payments: { id: number; invoiceId: number | null; amount: string; method: string; type: string; note: string | null; createdAt: string; by: string | null }[];
  statement: { date: string; kind: "invoice" | "payment"; debit: number; credit: number; balance: number; ref: string; note: string }[];
};

const methodIcons: Record<string, React.ElementType> = { cash: Banknote, card: CreditCard, bank: Landmark, mixed: Wallet, credit: CalendarClock };

export default function CustomerAccountPage() {
  const params = useParams();
  const router = useRouter();
  const user = useUser();
  const { push } = useToast();
  const id = Number(params.id);
  const [data, setData] = useState<Account | null>(null);
  const [tab, setTab] = useState<"invoices" | "payments" | "statement">("invoices");
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", method: "cash", note: "" });
  // مودال دين جديد
  const [debtOpen, setDebtOpen] = useState(false);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDueDate, setDebtDueDate] = useState("");
  const [debtNote, setDebtNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [paidSettled, setPaidSettled] = useState(false);

  const load = useCallback(async () => {
    const d = await api<Account>(`/api/customers/${id}`);
    setData(d);
  }, [id]);
  useEffect(() => { load().catch(() => push("error", "تعذر تحميل دفتر حساب الزبون")); }, [load, push]);

  async function recordPayment() {
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) return push("error", "أدخل مبلغ الدفعة");
    setSaving(true);
    try {
      await api("/api/payments", { method: "POST", body: { customerId: id, amount, method: payForm.method, note: payForm.note } });
      push("success", `تم تسجيل دفعة بقيمة ${fmtMoney(amount)} وتحديث الرصيد`);
      setPayOpen(false); setPayForm({ amount: "", method: "cash", note: "" });
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر تسجيل الدفعة"); }
    setSaving(false);
  }

  async function recordDebt() {
    const amount = Number(debtAmount);
    if (!amount || amount <= 0) return push("error", "أدخل مبلغ الدين بشكل صحيح");
    setSaving(true);
    try {
      await api("/api/invoices", {
        method: "POST",
        body: {
          manualDebt: true,
          customerId: id,
          amount,
          dueDate: debtDueDate || null,
          note: debtNote.trim() || null,
        },
      });
      push("success", `تم قيد دين جديد بقيمة ${fmtMoney(amount)} على الزبون`);
      setDebtOpen(false); setDebtAmount(""); setDebtNote("");
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر تسجيل الدين"); }
    setSaving(false);
  }

  if (!data) return <Spinner />;
  const { customer, summary, invoices, payments, statement } = data;
  const canCollect = user.permissions.includes("collect_debt");
  const canDebt = user.permissions.includes("add_debt");

  const invStatus = (i: Account["invoices"][0]) => {
    if (i.status === "voided") return { tone: "rose", label: "ملغاة" };
    if (i.remaining <= 0) return { tone: "emerald", label: "مسددة" };
    if (i.dueDate && new Date(i.dueDate) < new Date()) return { tone: "rose", label: "متأخرة" };
    return { tone: "amber", label: "آجلة — غير مسددة" };
  };

  return (
    <div>
      <PageHeader
        title="دفتر حساب الزبون"
        subtitle={`${customerNo(customer.id)} — زبون منذ ${fmtDate(customer.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="secondary" onClick={() => router.back()}><ArrowRight size={16} /> رجوع</Btn>
            <Btn variant="secondary" onClick={() => window.print()}><Printer size={16} /> طباعة كشف الحساب</Btn>
            {canDebt && (
              <button
                onClick={() => {
                  setDebtAmount("");
                  setDebtDueDate(new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
                  setDebtNote("");
                  setDebtOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-gold-500 via-gold-400 to-gold-500 text-[#0a0f1c] font-black text-xs sm:text-sm px-4 py-2.5 shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 hover:-translate-y-0.5 transition-all"
              >
                <Plus size={16} strokeWidth={3} /> تسجيل دين جديد
              </button>
            )}
            {canCollect && (
              <button
                onClick={() => { setPayForm({ amount: summary.balance > 0 ? String(summary.balance) : "", method: "cash", note: "" }); setPayOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white font-black text-xs sm:text-sm px-4 py-2.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
              >
                <Banknote size={16} /> تسجيل دفعة
              </button>
            )}
          </div>
        }
      />

      {/* بطاقة الزبون */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <Card className="p-5 relative overflow-hidden">
          <div className="absolute -top-10 -end-10 w-36 h-36 rounded-full bg-gradient-to-br from-sky-500/10 to-blue-500/10" />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-sky-500/25 shrink-0">
              {initials(customer.name)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-900 font-display truncate">{customer.name}</h2>
              <div className="space-y-1 mt-2">
                {customer.phone && <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><Phone size={12} /> <span dir="ltr">{customer.phone}</span></div>}
                {customer.address && <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><MapPin size={12} /> {customer.address}</div>}
              </div>
            </div>
          </div>
          {customer.notes && <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs font-bold text-slate-500">{customer.notes}</div>}
        </Card>

        <Card className="xl:col-span-2 p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
            {[
              { icon: ShoppingBag, label: "إجمالي المشتريات", value: fmtMoney(summary.totalBilled), tone: "bg-sky-50 text-sky-600" },
              { icon: Banknote, label: "إجمالي المدفوع", value: fmtMoney(summary.totalPaid), tone: "bg-emerald-50 text-emerald-600" },
              { icon: HandCoins, label: "الرصيد المتبقي (مدين)", value: fmtMoney(summary.balance), tone: summary.balance > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600" },
              { icon: ReceiptText, label: "عدد الفواتير", value: fmtNum(summary.invoicesCount), tone: "bg-violet-50 text-violet-600" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2.5", s.tone)}><s.icon size={17} /></div>
                <div className="text-[10.5px] font-bold text-slate-400">{s.label}</div>
                <div className="font-black text-lg tnum mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>
          {summary.lastPayment && (
            <div className="mt-3 text-[11px] font-bold text-slate-400">آخر دفعة: {fmtDateTime(summary.lastPayment)}</div>
          )}
        </Card>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 mb-4 anim-fade-up">
        {([
          ["invoices", "الفواتير والمشتريات", ReceiptText],
          ["payments", "الدفعات والتحصيلات", Banknote],
          ["statement", "كشف الحساب", FileText],
        ] as const).map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold border transition-all",
              tab === k ? "bg-[#0a0f1c] text-white border-transparent shadow-lg" : "bg-white text-slate-500 border-slate-200 hover:border-emerald-400")}>
            <Icon size={15} /> {l}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden anim-fade-up">
        {tab === "invoices" && (
          <div className="overflow-x-auto">
            <table className="tbl w-full min-w-[800px]">
              <thead><tr><th>الفاتورة</th><th>التاريخ</th><th>الدفع</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الاستحقاق</th><th>الحالة</th></tr></thead>
              <tbody>
                {invoices.length === 0 && <tr><td colSpan={8}><div className="text-center py-10 text-sm font-bold text-slate-400">لا توجد فواتير مسجلة لهذا الزبون</div></td></tr>}
                {invoices.map((i) => {
                  const s = invStatus(i);
                  return (
                    <tr key={i.id}>
                      <td className="font-extrabold tnum">{invoiceNo(i.id)}</td>
                      <td className="text-xs font-bold text-slate-500 whitespace-nowrap">{fmtDateTime(i.createdAt)}</td>
                      <td><Badge tone="sky">{PAYMENT_METHODS[i.paymentMethod] ?? i.paymentMethod}</Badge></td>
                      <td className="tnum font-black">{fmtMoney(i.total)}</td>
                      <td className="tnum font-bold text-emerald-600">{fmtMoney(i.paid)}</td>
                      <td>{i.remaining > 0 && i.status === "completed" ? <span className="tnum font-black text-rose-600">{fmtMoney(i.remaining)}</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="text-xs font-bold text-slate-400">{i.dueDate ? fmtDate(i.dueDate) : "—"}</td>
                      <td><Badge tone={s.tone}>{s.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "payments" && (
          <div className="overflow-x-auto">
            <table className="tbl w-full min-w-[700px]">
              <thead><tr><th>التاريخ</th><th>النوع</th><th>الطريقة</th><th>المرجع</th><th>المبلغ</th><th>ملاحظة</th><th>بواسطة</th></tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={7}><div className="text-center py-10 text-sm font-bold text-slate-400">لا توجد دفعات مسجلة</div></td></tr>}
                {payments.map((p) => {
                  const Icon = methodIcons[p.method] ?? Wallet;
                  return (
                    <tr key={p.id}>
                      <td className="text-xs font-bold text-slate-500 whitespace-nowrap">{fmtDateTime(p.createdAt)}</td>
                      <td><Badge tone={p.type === "debt" ? "amber" : "emerald"}>{p.type === "debt" ? "تحصيل دين" : "عند البيع"}</Badge></td>
                      <td><span className="flex items-center gap-1.5 font-bold text-slate-600"><Icon size={13} /> {PAYMENT_METHODS[p.method] ?? p.method}</span></td>
                      <td className="tnum font-bold text-slate-500">{p.invoiceId ? invoiceNo(p.invoiceId) : "—"}</td>
                      <td className="tnum font-black text-emerald-600">{fmtMoney(p.amount)}</td>
                      <td className="text-xs text-slate-500">{p.note ?? "—"}</td>
                      <td className="text-xs font-bold text-slate-400">{p.by ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "statement" && (
          <div className="overflow-x-auto">
            <table className="tbl w-full min-w-[700px]">
              <thead><tr><th>التاريخ</th><th>البيان</th><th>المرجع</th><th>مدين (+)</th><th>دائن (−)</th><th>الرصيد</th></tr></thead>
              <tbody>
                {statement.length === 0 && <tr><td colSpan={6}><div className="text-center py-10 text-sm font-bold text-slate-400">لا توجد حركات في الحساب</div></td></tr>}
                {statement.map((e, idx) => (
                  <tr key={idx}>
                    <td className="text-xs font-bold text-slate-500 whitespace-nowrap">{fmtDateTime(e.date)}</td>
                    <td className="font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        {e.kind === "invoice" ? <ReceiptText size={13} className="text-sky-500" /> : <Banknote size={13} className="text-emerald-500" />}
                        {e.note}
                      </span>
                    </td>
                    <td className="tnum font-bold text-slate-400">{e.ref}</td>
                    <td className="tnum font-bold text-rose-600">{e.debit ? fmtMoney(e.debit) : "—"}</td>
                    <td className="tnum font-bold text-emerald-600">{e.credit ? fmtMoney(e.credit) : "—"}</td>
                    <td className="tnum font-black">{fmtMoney(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* نافذة تسجيل دفعة */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`تسجيل دفعة — ${customer.name}`} subtitle={`الرصيد المتبقي: ${fmtMoney(summary.balance)}`}>
        <div className="space-y-3.5">
          <Field label="المبلغ (شيكل)" required>
            <Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="text-lg font-black tnum" autoFocus />
          </Field>
          <Field label="طريقة الدفع">
            <div className="grid grid-cols-3 gap-2">
              {(["cash", "card", "bank"] as const).map((m) => {
                const Icon = methodIcons[m];
                return (
                  <button key={m} onClick={() => setPayForm({ ...payForm, method: m })}
                    className={cn("flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-[11px] font-extrabold transition-all",
                      payForm.method === m ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:border-emerald-300")}>
                    <Icon size={18} /> {PAYMENT_METHODS[m]}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="ملاحظة">
            <Input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} placeholder="مثال: سداد جزئي من دين يونيو" />
          </Field>
          {Number(payForm.amount) > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-700">الرصيد بعد الدفعة</span>
              <span className="font-black tnum text-lg text-emerald-600">{fmtNum(Math.max(0, summary.balance - Number(payForm.amount)))} شيكل</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
          <Btn variant="secondary" className="flex-1" onClick={() => setPayOpen(false)}>إلغاء</Btn>
          <Btn variant="primary" className="flex-[2]" onClick={recordPayment} loading={saving}>
            <HandCoins size={17} /> تأكيد الدفعة
          </Btn>
        </div>
      </Modal>

      {/* مودال تسجيل دين جديد على الزبون */}
      <Modal open={debtOpen} onClose={() => setDebtOpen(false)} title={`تسجيل دين جديد — ${customer.name}`} subtitle={`الرصيد الحالي: ${fmtMoney(summary.balance)}`}>
        <div className="space-y-3.5">
          <Field label="مبلغ الدين الجديد (شيكل)" required>
            <Input type="number" min="0" step="0.01" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} className="text-lg font-black tnum" autoFocus placeholder="0.00" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ الاستحقاق">
              <Input type="date" value={debtDueDate} onChange={(e) => setDebtDueDate(e.target.value)} />
            </Field>
            <Field label="ملاحظة أو سبب الدين">
              <Input value={debtNote} onChange={(e) => setDebtNote(e.target.value)} placeholder="مثال: رصيد سابق / مشتريات" />
            </Field>
          </div>
          {Number(debtAmount) > 0 && (
            <div className="rounded-xl bg-gold-400/10 border border-gold-400/30 p-3.5 flex items-center justify-between">
              <span className="text-xs font-extrabold text-gold-700">الرصيد بعد تسجيل الدين:</span>
              <span className="font-black tnum text-lg text-rose-600">{fmtNum(summary.balance + Number(debtAmount))} ₪</span>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Btn variant="secondary" className="flex-1" onClick={() => setDebtOpen(false)}><X size={15} /> إلغاء</Btn>
            <Btn variant="primary" className="flex-[2]" onClick={recordDebt} loading={saving}>
              <Plus size={16} strokeWidth={3} /> تأكيد تسجيل الدين
            </Btn>
          </div>
        </div>
      </Modal>

      {/* كشف حساب للطباعة */}
      <PrintArea>
        <div dir="rtl" className="mx-auto max-w-3xl p-6" style={{ fontFamily: "var(--font-plex)" }}>
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-5">
            <div>
              <div className="font-black text-2xl font-display">SOBIS<span className="text-emerald-600">.</span></div>
              <div className="text-xs font-bold text-slate-500 mt-1">سوبر ماركات غزة — دفتر كشف حساب زبون</div>
            </div>
            <div className="text-start text-xs font-bold text-slate-500">
              <div>تاريخ الطباعة: {fmtDateTime(new Date())}</div>
              <div className="mt-1">رقم الزبون: {customerNo(customer.id)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
            <div className="rounded-xl border border-slate-300 p-3.5 space-y-1">
              <div className="font-black text-base">{customer.name}</div>
              {customer.phone && <div className="text-xs font-bold text-slate-500" dir="ltr">هاتف: {customer.phone}</div>}
              {customer.address && <div className="text-xs font-bold text-slate-500">{customer.address}</div>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-300 p-2.5"><div className="text-[10px] font-bold text-slate-400">المشتريات</div><div className="font-black tnum">{fmtNum(summary.totalBilled)}</div></div>
              <div className="rounded-xl border border-slate-300 p-2.5"><div className="text-[10px] font-bold text-slate-400">المدفوع</div><div className="font-black tnum text-emerald-700">{fmtNum(summary.totalPaid)}</div></div>
              <div className="rounded-xl border-2 border-slate-900 p-2.5"><div className="text-[10px] font-bold text-slate-400">المتبقي</div><div className="font-black tnum">{fmtNum(summary.balance)}</div></div>
            </div>
          </div>
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-y-2 border-slate-900">
                <th className="py-2 text-end font-extrabold">التاريخ</th>
                <th className="py-2 text-end font-extrabold">البيان</th>
                <th className="py-2 text-end font-extrabold">المرجع</th>
                <th className="py-2 text-end font-extrabold">مدين</th>
                <th className="py-2 text-end font-extrabold">دائن</th>
                <th className="py-2 text-start font-extrabold">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {[...statement].reverse().map((e, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-1.5 tnum">{fmtDate(e.date)}</td>
                  <td className="py-1.5 font-bold">{e.note}</td>
                  <td className="py-1.5 tnum text-slate-500">{e.ref}</td>
                  <td className="py-1.5 tnum">{e.debit ? fmtNum(e.debit) : "—"}</td>
                  <td className="py-1.5 tnum">{e.credit ? fmtNum(e.credit) : "—"}</td>
                  <td className="py-1.5 tnum font-black text-start">{fmtNum(e.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-start">
            <div className="rounded-xl border-2 border-slate-900 px-5 py-3 text-center">
              <div className="text-[10px] font-bold text-slate-400">إجمالي الرصيد المستحق</div>
              <div className="font-black text-xl tnum">{fmtMoney(summary.balance)}</div>
            </div>
          </div>
          <div className="mt-8 flex justify-between text-xs font-bold text-slate-500">
            <div>توقيع المحاسب: ............................</div>
            <div>توقيع الزبون بالاستلام: ............................</div>
          </div>
        </div>
      </PrintArea>
    </div>
  );
}
