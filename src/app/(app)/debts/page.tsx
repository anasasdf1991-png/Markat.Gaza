"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search, HandCoins, AlertTriangle, Users, TrendingUp, FileText,
  Banknote, CreditCard, Landmark, Phone, CheckCircle2, Clock, Pencil, FilePlus2, X,
  Plus, UserPlus, ArrowRight,
} from "lucide-react";
import { fmtMoney, fmtNum, fmtDateTime, cn, customerNo, initials } from "@/lib/format";
import { getCurrencyLabel } from "@/lib/format";
import { Btn, Modal, Input, Select, Field, useToast, Empty, Spinner, Badge, PageHeader, api, Card } from "@/components/ui";
import { useUser } from "@/components/shell";

type Debt = {
  id: number; name: string; phone: string | null; address: string | null;
  totalDebt: number; paidSum: number; remaining: number; lastPayment: string | null;
  invoicesCount: number; overdueCount: number; status: "unpaid" | "partial" | "paid" | "overdue";
};
type Summary = { totalRemaining: number; debtors: number; overdueCount: number; overdueSum: number };

type CustomerOption = { id: number; name: string; phone: string | null; balance: number };

const statusMap: Record<Debt["status"], { label: string; tone: string; icon: React.ElementType }> = {
  unpaid: { label: "غير مدفوع", tone: "rose", icon: Clock },
  partial: { label: "مدفوع جزئيًا", tone: "amber", icon: Clock },
  paid: { label: "مسدد بالكامل", tone: "emerald", icon: CheckCircle2 },
  overdue: { label: "متأخر", tone: "rose", icon: AlertTriangle },
};

export default function DebtsPage() {
  const user = useUser();
  const { push } = useToast();
  const canCollect = user.permissions.includes("collect_debt");
  const canDebt = user.permissions.includes("add_debt");
  const canEditDebt = user.permissions.includes("edit_debt");
  const canEditName = user.permissions.includes("manage_customers") || user.role === "admin" || user.role === "manager";
  const managerPlus = user.role === "admin" || user.role === "manager";

  const [rows, setRows] = useState<Debt[]>([]);
  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [q, setQ] = useState("");
  const [filterMode, setFilterMode] = useState<"debtors" | "all">("all");
  const [loading, setLoading] = useState(true);

  // 1) مودال تسجيل دين جديد (مع اختيار الزبون)
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [selectedCustForDebt, setSelectedCustForDebt] = useState<number>(0);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDueDate, setDebtDueDate] = useState("");
  const [debtNote, setDebtNote] = useState("");

  // 2) مودال تسجيل دفعة (مع اختيار الزبون)
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedCustForPay, setSelectedCustForPay] = useState<number>(0);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");

  // 3) مودال سداد كامل الدين السريع
  const [settleTarget, setSettleTarget] = useState<Debt | null>(null);
  const [settleMethod, setSettleMethod] = useState("cash");
  const [settleNote, setSettleNote] = useState("");

  // 4) مودال تعديل بيانات الدين الشامل
  const [debtEdit, setDebtEdit] = useState<Debt | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", original: "", paid: "", dueDate: "", notes: "", method: "cash" });

  const [saving, setSaving] = useState(false);

  // تحميل البيانات
  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (filterMode === "all") p.set("all", "1");
    const d = await api<{ debts: Debt[]; summary: Summary }>(`/api/debts?${p}`);
    setRows(d.debts);
    setSummary(d.summary);

    // تحميل قائمة الزبائن للاختيار في القوائم المنسدلة
    const cData = await api<{ customers: CustomerOption[] }>("/api/customers").catch(() => ({ customers: [] }));
    setAllCustomers(cData.customers || []);

    setLoading(false);
  }, [q, filterMode]);

  useEffect(() => {
    const t = setTimeout(load, q ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // ── فتح نافذة تسجيل دين جديد ──
  function openNewDebtModal(cust?: Debt | CustomerOption) {
    if (cust) {
      setSelectedCustForDebt(cust.id);
    } else if (allCustomers.length > 0) {
      setSelectedCustForDebt(allCustomers[0].id);
    }
    setDebtAmount("");
    setDebtDueDate(new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
    setDebtNote("");
    setDebtModalOpen(true);
  }

  // ── تنفيذ تسجيل دين جديد ──
  async function submitNewDebt() {
    const cid = Number(selectedCustForDebt);
    const amount = Number(debtAmount);
    if (!cid) return push("error", "يرجى اختيار الزبون");
    if (!amount || amount <= 0) return push("error", "أدخل مبلغ الدين بشكل صحيح");
    setSaving(true);
    try {
      await api("/api/invoices", {
        method: "POST",
        body: {
          manualDebt: true,
          customerId: cid,
          amount,
          dueDate: debtDueDate || null,
          note: debtNote.trim() || null,
        },
      });
      const custName = allCustomers.find((c) => c.id === cid)?.name || "الزبون";
      push("success", `تم تسجيل دين جديد بقيمة ${fmtMoney(amount)} على ${custName} بنجاح!`);
      setDebtModalOpen(false);
      load();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "تعذر تسجيل الدين");
    }
    setSaving(false);
  }

  // ── فتح نافذة تسجيل دفعة ──
  function openNewPayModal(cust?: Debt | CustomerOption) {
    if (cust) {
      setSelectedCustForPay(cust.id);
      if ("remaining" in cust && cust.remaining > 0) {
        setPayAmount(String(cust.remaining));
      } else if ("balance" in cust && cust.balance > 0) {
        setPayAmount(String(cust.balance));
      } else {
        setPayAmount("");
      }
    } else if (allCustomers.length > 0) {
      setSelectedCustForPay(allCustomers[0].id);
      const matched = allCustomers[0].balance > 0 ? String(allCustomers[0].balance) : "";
      setPayAmount(matched);
    }
    setPayMethod("cash");
    setPayNote("");
    setPayModalOpen(true);
  }

  // ── تنفيذ تسجيل الدفعة ──
  async function submitNewPayment() {
    const cid = Number(selectedCustForPay);
    const amount = Number(payAmount);
    if (!cid) return push("error", "يرجى اختيار الزبون");
    if (!amount || amount <= 0) return push("error", "أدخل مبلغ الدفعة بشكل صحيح");
    setSaving(true);
    try {
      await api("/api/payments", {
        method: "POST",
        body: {
          customerId: cid,
          amount,
          method: payMethod,
          note: payNote.trim() || null,
        },
      });
      const custName = allCustomers.find((c) => c.id === cid)?.name || "الزبون";
      push("success", `تم تسجيل دفعة بقيمة ${fmtMoney(amount)} من ${custName} بنجاح!`);
      setPayModalOpen(false);
      load();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "تعذر تسجيل الدفعة");
    }
    setSaving(false);
  }

  // ── تنفيذ سداد كامل الدين المتبقي ──
  async function submitFullSettlement() {
    if (!settleTarget) return;
    const amount = settleTarget.remaining;
    if (amount <= 0) return push("warn", "هذا الزبون مسدد بالكامل بالفعل");
    setSaving(true);
    try {
      await api("/api/payments", {
        method: "POST",
        body: {
          customerId: settleTarget.id,
          amount,
          method: settleMethod,
          note: settleNote.trim() || "سداد كامل الدين المتبقي",
        },
      });
      push("success", `تم تسديد كامل دين الزبون ${settleTarget.name} بمبلغ ${fmtMoney(amount)} بنجاح!`);
      setSettleTarget(null);
      load();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "تعذر سداد الدين");
    }
    setSaving(false);
  }

  // ── فتح نافذة تعديل بيانات الدين الشامل ──
  function openDebtEdit(d: Debt) {
    setDebtEdit(d);
    setEditForm({
      name: d.name,
      phone: d.phone ?? "",
      original: String(d.totalDebt),
      paid: String(d.paidSum),
      dueDate: "",
      notes: "",
      method: "cash",
    });
  }

  const editNums = {
    original: editForm.original === "" ? (debtEdit?.totalDebt ?? 0) : Number(editForm.original) || 0,
    paid: editForm.paid === "" ? (debtEdit?.paidSum ?? 0) : Number(editForm.paid) || 0,
  };
  const editRemaining = Math.max(0, Math.round((editNums.original - editNums.paid) * 100) / 100);
  const editStatus: Debt["status"] =
    editRemaining <= 0 ? "paid"
      : editNums.paid <= 0 ? "unpaid"
        : editForm.dueDate && new Date(editForm.dueDate) < new Date(new Date().toDateString()) ? "overdue"
          : "partial";

  async function saveDebtEdit() {
    if (!debtEdit) return;
    setSaving(true);
    try {
      await api("/api/debts/edit", {
        method: "PUT",
        body: {
          customerId: debtEdit.id,
          name: editForm.name.trim() || undefined,
          phone: editForm.phone,
          original: editForm.original !== "" ? Number(editForm.original) : undefined,
          paid: editForm.paid !== "" ? Number(editForm.paid) : undefined,
          dueDate: editForm.dueDate || undefined,
          notes: editForm.notes.trim() || undefined,
          method: editForm.method,
        },
      });
      push("success", "تم تحديث بيانات الدين بنجاح");
      setDebtEdit(null);
      load();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "تعذر تحديث الدين، يرجى المحاولة مرة أخرى");
    }
    setSaving(false);
  }

  const activeDebtCust = allCustomers.find((c) => c.id === Number(selectedCustForDebt));
  const activePayCust = allCustomers.find((c) => c.id === Number(selectedCustForPay));

  return (
    <div className="space-y-4">
      {/* رأس الصفحة مع الزرين الذهبي والأخضر الواضحين في الأعلى */}
      <PageHeader
        title="ديون وحسابات الزبائن الآجلة"
        subtitle={summary ? `${summary.debtors} زبون مدين • إجمالي مستحق ${fmtMoney(summary.totalRemaining)}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canDebt && (
              <button
                onClick={() => openNewDebtModal()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-gold-500 via-gold-400 to-gold-500 text-[#0a0f1c] font-black text-sm px-5 py-2.5 shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 hover:-translate-y-0.5 transition-all"
              >
                <Plus size={18} strokeWidth={3} />
                تسجيل دين جديد
              </button>
            )}
            {canCollect && (
              <button
                onClick={() => openNewPayModal()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white font-black text-sm px-5 py-2.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
              >
                <Banknote size={18} />
                تسجيل دفعة / تحصيل
              </button>
            )}
          </div>
        }
      />

      {/* ملخصات الديون */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        {[
          { icon: HandCoins, label: "إجمالي الديون المستحقة", value: fmtMoney(summary?.totalRemaining ?? 0), tone: "bg-rose-50 text-rose-600" },
          { icon: Users, label: "عدد الزبائن المدينين", value: fmtNum(summary?.debtors ?? 0), tone: "bg-amber-50 text-amber-600" },
          { icon: AlertTriangle, label: "ديون متأخرة (عدد)", value: fmtNum(summary?.overdueCount ?? 0), tone: "bg-rose-50 text-rose-600" },
          { icon: TrendingUp, label: "قيمة الديون المتأخرة", value: fmtMoney(summary?.overdueSum ?? 0), tone: "bg-violet-50 text-violet-600" },
        ].map((s, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", s.tone)}><s.icon size={20} /></div>
            <div className="min-w-0"><div className="text-[11px] font-bold text-slate-400">{s.label}</div><div className="font-black text-lg tnum truncate">{s.value}</div></div>
          </Card>
        ))}
      </div>

      {/* شريط البحث وتصفية الزبائن */}
      <Card className="p-3.5 flex flex-wrap items-center justify-between gap-3 anim-fade-up">
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن زبون بالاسم أو رقم الهاتف..." className="input-field ps-10" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">عرض:</span>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setFilterMode("all")}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all", filterMode === "all" ? "bg-[#0a0f1c] text-gold-300 shadow" : "text-slate-600 hover:text-slate-900")}
            >
              جميع الزبائن ({allCustomers.length})
            </button>
            <button
              onClick={() => setFilterMode("debtors")}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all", filterMode === "debtors" ? "bg-[#0a0f1c] text-gold-300 shadow" : "text-slate-600 hover:text-slate-900")}
            >
              المدينون فقط ({summary?.debtors ?? 0})
            </button>
          </div>
        </div>
      </Card>

      {/* جدول الزبائن والديون */}
      <Card className="overflow-hidden anim-fade-up">
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Empty icon={<HandCoins size={36} />} title="لا توجد ديون مسجلة" hint="يمكنك تسجيل أول دين أو دفعة الآن باستخدام الأزرار أدناه" />
            <div className="flex justify-center gap-2 mt-4">
              <Btn variant="primary" onClick={() => openNewDebtModal()}><Plus size={16} /> تسجيل دين جديد</Btn>
              <Btn variant="secondary" onClick={() => openNewPayModal()}><Banknote size={16} /> تسجيل دفعة</Btn>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl w-full min-w-[1000px]">
              <thead>
                <tr>
                  <th>الزبون وإجراءات الدين</th><th>الهاتف</th><th>إجمالي الدين</th><th>المدفوع</th><th>المتبقي</th>
                  <th>آخر دفعة</th><th>الفواتير</th><th>الحالة</th><th>كشف الحساب</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const s = statusMap[d.status];
                  return (
                    <tr key={d.id} className={cn(d.status === "overdue" && "bg-rose-50/40")}>
                      {/* اسم الزبون ومعه الأزرار الأربعة المباشرة */}
                      <td className="py-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500/15 to-amber-500/15 text-gold-600 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                            {initials(d.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link href={`/customers/${d.id}`} className="font-black text-slate-900 hover:text-emerald-600 transition-colors text-sm">
                                {d.name}
                              </Link>
                              <span className="text-[10.5px] text-slate-400 font-bold">({customerNo(d.id)})</span>
                            </div>

                            {/* أزرار الإجراءات الفورية بجانب اسم الزبون */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {/* 1) تعديل على الدين */}
                              {canEditDebt && (
                                <button
                                  onClick={() => openDebtEdit(d)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition-all hover:-translate-y-0.5"
                                  title="تعديل بيانات الدين وأصل الدين والمتبقي"
                                >
                                  <Pencil size={11} /> تعديل على الدين
                                </button>
                              )}

                              {/* 2) تسجيل دفعة */}
                              {canCollect && (
                                <button
                                  onClick={() => openNewPayModal(d)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-sm transition-all hover:-translate-y-0.5"
                                  title="تسجيل دفعة سداد من هذا الزبون"
                                >
                                  <Banknote size={11} /> دفعة
                                </button>
                              )}

                              {/* 3) سداد كامل الدين */}
                              {canCollect && d.remaining > 0 && (
                                <button
                                  onClick={() => { setSettleTarget(d); setSettleMethod("cash"); setSettleNote("سداد كامل الدين"); }}
                                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black text-gold-800 bg-gold-400/20 hover:bg-gold-400/30 border border-gold-400/40 shadow-sm transition-all hover:-translate-y-0.5"
                                  title="سداد كامل المبلغ المتبقي وتصفير الحساب"
                                >
                                  <CheckCircle2 size={11} className="text-gold-700" /> سداد دين
                                </button>
                              )}

                              {/* 4) تسجيل دين جديد */}
                              {canDebt && (
                                <button
                                  onClick={() => openNewDebtModal(d)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 shadow-sm transition-all hover:-translate-y-0.5"
                                  title="تسجيل دين جديد على هذا الزبون"
                                >
                                  <Plus size={11} strokeWidth={3} /> تسجيل دين
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="tnum font-bold text-slate-500" dir="ltr">{d.phone ?? "—"}</td>
                      <td className="tnum font-black">{fmtMoney(d.totalDebt)}</td>
                      <td className="tnum font-bold text-emerald-600">{fmtMoney(d.paidSum)}</td>
                      <td>
                        <span className={cn("tnum font-black text-base", d.remaining > 0 ? "text-rose-600" : "text-emerald-600")}>
                          {fmtMoney(d.remaining)}
                        </span>
                      </td>
                      <td className="text-xs font-bold text-slate-400 whitespace-nowrap">{d.lastPayment ? fmtDateTime(d.lastPayment) : "—"}</td>
                      <td className="tnum font-bold text-slate-500">{fmtNum(d.invoicesCount)}</td>
                      <td>
                        <Badge tone={s.tone}>
                          <s.icon size={11} /> {s.label}
                          {d.status === "overdue" && ` (${d.overdueCount})`}
                        </Badge>
                      </td>
                      <td>
                        <Link href={`/customers/${d.id}`}>
                          <Btn size="sm" variant="secondary" className="gap-1">
                            <FileText size={13} /> دفتر الحساب
                          </Btn>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* 1) نافذة تسجيل دين جديد (مع اختيار الزبون والمبلغ والاستحقاق) */}
      {/* ═════════════════════════════════════════════════════════ */}
      <Modal open={debtModalOpen} onClose={() => setDebtModalOpen(false)} title="تسجيل دين جديد على زبون" subtitle="يتم قيد الدين مباشرة على حساب الزبون ويظهر في دفتر حسابه">
        <div className="space-y-3.5">
          <Field label="اختر الزبون" required>
            <Select
              value={selectedCustForDebt}
              onChange={(e) => setSelectedCustForDebt(Number(e.target.value))}
              className="font-bold"
            >
              {allCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""} {c.balance > 0 ? `— مدين بـ ${fmtNum(c.balance)} ₪` : "— رصيد 0"}
                </option>
              ))}
            </Select>
          </Field>

          {activeDebtCust && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">الرصيد المتبقي الحالي على الزبون:</span>
              <span className={cn("font-black tnum text-sm", activeDebtCust.balance > 0 ? "text-rose-600" : "text-emerald-600")}>
                {fmtMoney(activeDebtCust.balance)}
              </span>
            </div>
          )}

          <Field label="مبلغ الدين الجديد (شيكل)" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={debtAmount}
              onChange={(e) => setDebtAmount(e.target.value)}
              className="text-lg font-black tnum"
              placeholder="0.00"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ الاستحقاق">
              <Input type="date" value={debtDueDate} onChange={(e) => setDebtDueDate(e.target.value)} />
            </Field>
            <Field label="ملاحظة أو سبب الدين">
              <Input value={debtNote} onChange={(e) => setDebtNote(e.target.value)} placeholder="مثال: مشتريات بالهاتف / رصيد سابق" />
            </Field>
          </div>

          {Number(debtAmount) > 0 && activeDebtCust && (
            <div className="rounded-xl bg-gold-400/10 border border-gold-400/30 p-3.5 flex items-center justify-between">
              <span className="text-xs font-extrabold text-gold-700">إجمالي الدين بعد التسجيل:</span>
              <span className="font-black tnum text-lg text-rose-600">{fmtNum(activeDebtCust.balance + Number(debtAmount))} {getCurrencyLabel()}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Btn variant="secondary" className="flex-1" onClick={() => setDebtModalOpen(false)}><X size={15} /> إلغاء</Btn>
            <Btn variant="primary" className="flex-[2]" onClick={submitNewDebt} loading={saving}>
              <Plus size={16} strokeWidth={3} /> تأكيد تسجيل الدين
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* 2) نافذة تسجيل دفعة / تحصيل دين (مع اختيار الزبون) */}
      {/* ═════════════════════════════════════════════════════════ */}
      <Modal open={payModalOpen} onClose={() => setPayModalOpen(false)} title="تسجيل دفعة / تحصيل دين" subtitle="يتم خصم المبلغ وتوزيعه تلقائيًا على ديون وفواتير الزبون الأقدم">
        <div className="space-y-3.5">
          <Field label="اختر الزبون" required>
            <Select
              value={selectedCustForPay}
              onChange={(e) => {
                const cid = Number(e.target.value);
                setSelectedCustForPay(cid);
                const matched = allCustomers.find((c) => c.id === cid);
                if (matched && matched.balance > 0) setPayAmount(String(matched.balance));
              }}
              className="font-bold"
            >
              {allCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""} {c.balance > 0 ? `— مطلوب منه: ${fmtNum(c.balance)} ₪` : "— مسدد بالكامل"}
                </option>
              ))}
            </Select>
          </Field>

          {activePayCust && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">المبلغ المستحق حاليًا على الزبون:</span>
              <span className={cn("font-black tnum text-sm", activePayCust.balance > 0 ? "text-rose-600" : "text-emerald-600")}>
                {fmtMoney(activePayCust.balance)}
              </span>
            </div>
          )}

          <Field label="مبلغ الدفعة المستلمة (شيكل)" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="text-lg font-black tnum"
              placeholder="0.00"
              autoFocus
            />
          </Field>

          <Field label="طريقة التحصيل">
            <div className="grid grid-cols-3 gap-2">
              {([["cash", "نقدي", Banknote], ["card", "بطاقة", CreditCard], ["bank", "تحويل", Landmark]] as const).map(([m, l, Icon]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={cn("flex flex-col items-center gap-1.5 rounded-xl border-2 py-2.5 text-[11px] font-extrabold transition-all",
                    payMethod === m ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:border-emerald-300")}
                >
                  <Icon size={18} /> {l}
                </button>
              ))}
            </div>
          </Field>

          <Field label="ملاحظة الدفعة">
            <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="مثال: دفعة نقدية / سداد جزئي" />
          </Field>

          {Number(payAmount) > 0 && activePayCust && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-700">المتبقي على الزبون بعد الدفعة:</span>
              <span className="font-black tnum text-lg text-emerald-700">
                {fmtNum(Math.max(0, activePayCust.balance - Number(payAmount)))} {getCurrencyLabel()}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Btn variant="secondary" className="flex-1" onClick={() => setPayModalOpen(false)}><X size={15} /> إلغاء</Btn>
            <Btn variant="primary" className="flex-[2]" onClick={submitNewPayment} loading={saving}>
              <Banknote size={16} /> تأكيد تحصيل الدفعة
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* 3) نافذة سداد كامل الدين السريع */}
      {/* ═════════════════════════════════════════════════════════ */}
      <Modal open={!!settleTarget} onClose={() => setSettleTarget(null)} title={`سداد كامل الدين — ${settleTarget?.name ?? ""}`} subtitle={settleTarget ? `المبلغ المطلوب لتصفير الحساب: ${fmtMoney(settleTarget.remaining)}` : ""}>
        {settleTarget && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gold-400/10 border border-gold-400/30 p-4 text-center">
              <div className="text-xs font-bold text-slate-500 mb-1">المبلغ المطلوب تسديده لتصفير حساب الزبون بالكامل:</div>
              <div className="text-3xl font-black text-gold-600 font-display tnum">{fmtMoney(settleTarget.remaining)}</div>
              <div className="text-[11px] font-bold text-emerald-600 mt-1">✓ سيصبح الرصيد المتبقي 0.00 شيكل (مسدد بالكامل)</div>
            </div>

            <Field label="طريقة السداد">
              <div className="grid grid-cols-3 gap-2">
                {([["cash", "نقدي", Banknote], ["card", "بطاقة", CreditCard], ["bank", "تحويل بنكي", Landmark]] as const).map(([m, l, Icon]) => (
                  <button key={m} type="button" onClick={() => setSettleMethod(m)}
                    className={cn("flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-[11px] font-extrabold transition-all",
                      settleMethod === m ? "border-gold-500 bg-gold-400/15 text-gold-700" : "border-slate-200 text-slate-500 hover:border-gold-300")}>
                    <Icon size={18} /> {l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="ملاحظة السداد">
              <Input value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder="سداد كامل الدين" />
            </Field>

            <div className="flex gap-2 pt-2">
              <Btn variant="secondary" className="flex-1" onClick={() => setSettleTarget(null)}>إلغاء</Btn>
              <Btn variant="primary" className="flex-[2]" onClick={submitFullSettlement} loading={saving}>
                <CheckCircle2 size={16} /> تأكيد سداد كامل الدين
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* 4) نافذة تعديل بيانات الدين الشامل (أصل الدين، المدفوع، المتبقي) */}
      {/* ═════════════════════════════════════════════════════════ */}
      <Modal open={!!debtEdit} onClose={() => setDebtEdit(null)} title="تعديل بيانات الدين" wide
        subtitle={debtEdit ? `${debtEdit.name} • (${customerNo(debtEdit.id)})` : ""}>
        {debtEdit && (
          <div className="space-y-4">
            {/* بيانات الزبون */}
            <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
              <div className="text-[11px] font-extrabold text-slate-500 mb-3">بيانات الزبون</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="اسم الزبون" hint={!canEditName ? "تعديل الاسم يتطلب صلاحية إدارة الزبائن" : undefined}>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    disabled={!canEditName}
                  />
                </Field>
                <Field label="رقم الهاتف">
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} dir="ltr" placeholder="05x xxxx xxx" />
                </Field>
              </div>
            </div>

            {/* القيم المالية مع المعادلة الحية */}
            <div className="rounded-2xl border border-gold-400/30 p-4 bg-gold-400/[0.03]">
              <div className="text-[11px] font-extrabold text-gold-600 mb-1">القيم المالية للدين</div>
              <div className="text-[10.5px] font-bold text-slate-400 mb-3">المعادلة ثابتة: المتبقي = أصل الدين − المدفوع</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="أصل الدين (شيكل)" hint={!managerPlus ? "للمديرين فقط" : "القيمة الإجمالية"}>
                  <Input
                    type="number" min="0" step="0.01"
                    value={editForm.original}
                    onChange={(e) => setEditForm({ ...editForm, original: e.target.value })}
                    className="tnum font-black"
                    disabled={!managerPlus}
                  />
                </Field>
                <Field label="المبلغ المدفوع (شيكل)" hint="زيارته تنشئ قيد دفعة موزعة تلقائيًا">
                  <Input
                    type="number" min="0" step="0.01"
                    value={editForm.paid}
                    onChange={(e) => setEditForm({ ...editForm, paid: e.target.value })}
                    className="tnum font-black"
                  />
                </Field>
                <Field label="المتبقي (يُحسب تلقائيًا)">
                  <div className={cn("input-field !font-black tnum flex items-center !cursor-not-allowed", editRemaining > 0 ? "text-rose-600" : "text-emerald-600")}>
                    {fmtNum(editRemaining)} شيكل
                  </div>
                </Field>
              </div>
              {Number(editForm.paid) > editNums.original && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-extrabold text-rose-600">
                  <AlertTriangle size={13} /> المدفوع لا يمكن أن يتجاوز أصل الدين — لن يُحفظ
                </div>
              )}
              {Number(editForm.paid) < debtEdit.paidSum && editForm.paid !== "" && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-extrabold text-amber-600">
                  <AlertTriangle size={13} /> لا يمكن خفض المدفوعات المسجّلة ({fmtNum(debtEdit.paidSum)} شيكل)
                </div>
              )}
            </div>

            {/* الاستحقاق والحالة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="تاريخ استحقاق الدين" hint="يُطبَّق على الديون القائمة">
                <Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} />
              </Field>
              <Field label="طريقة السداد (للزيادة في المدفوع)">
                <Select value={editForm.method} onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}>
                  <option value="cash">نقدي</option>
                  <option value="card">بطاقة</option>
                  <option value="bank">تحويل بنكي</option>
                </Select>
              </Field>
              <Field label="حالة الدين (تلقائية)">
                <div className="pt-2">
                  <Badge tone={statusMap[editStatus].tone}>
                    {(() => { const I = statusMap[editStatus].icon; return <I size={11} />; })()}
                    {statusMap[editStatus].label}
                  </Badge>
                </div>
              </Field>
            </div>

            <Field label="ملاحظات">
              <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="توضيح يُحفظ على الدين القائم" />
            </Field>

            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-[11px] font-bold text-slate-500 leading-relaxed">
              سيُسجَّل هذا التعديل في سجل التدقيق بالقيم قبل وبعد مع اسمك والتاريخ والوقت، وتتحدّث اللوحة الرئيسية وتقارير الديون ودفتر حساب الزبون فورًا.
            </div>

            <div className="flex gap-2 pt-1">
              <Btn variant="secondary" className="flex-1" onClick={() => setDebtEdit(null)}>
                <X size={15} /> إلغاء
              </Btn>
              <Btn
                variant="primary" className="flex-[2]" onClick={saveDebtEdit} loading={saving}
                disabled={Number(editForm.paid) > editNums.original || (editForm.paid !== "" && Number(editForm.paid) < debtEdit.paidSum)}
              >
                <Pencil size={15} /> حفظ التعديلات
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
