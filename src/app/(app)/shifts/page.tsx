"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlayCircle, StopCircle, Printer, X, Banknote, CreditCard, Landmark,
  ReceiptText, TrendingUp, TrendingDown, CalendarCheck2, Scale, ClipboardList,
} from "lucide-react";
import { fmtMoney, fmtNum, fmtDateTime, cn } from "@/lib/format";
import { Btn, Modal, Input, Field, useToast, Spinner, Badge, PageHeader, api, Card, Empty } from "@/components/ui";
import { PrintArea } from "@/components/receipt";
import { useUser } from "@/components/shell";

type OpenShift = { id: number; userId: number; openedAt: string; openingCash: string; cashier: string };
type Live = { cashSales: number; cardSales: number; bankSales: number; creditSales: number; invoiceCount: number; returnsTotal: number; debtCollected: number; expensesTotal: number; expectedCash: number };
type HistoryRow = { id: number; openedAt: string; closedAt: string | null; openingCash: string; cashSales: string; cardSales: string; creditSales: string; returnsTotal: string; expensesTotal: string; expectedCash: string; actualCash: string | null; difference: string | null; userId: number };
type DayReport = {
  date: string; total: number; invoicesCount: number; avgInvoice: number;
  byMethod: { cash: number; card: number; bank: number; mixed: number; credit: number };
  returns: { total: number; count: number }; profit: number;
  expenses: { total: number; count: number }; netProfit: number;
  debtCollected: { total: number; count: number }; purchases: { total: number; count: number };
  store: { name: string; phone: string; address: string; currency: string };
};

export default function ShiftsPage() {
  const user = useUser();
  const { push } = useToast();
  const canViewReports = user.permissions.includes("view_reports") || user.role === "admin" || user.role === "manager";
  const [openShift, setOpenShift] = useState<OpenShift | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState({ openingCash: "" });
  const [closeForm, setCloseForm] = useState({ actualCash: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<DayReport | null>(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportPrint, setReportPrint] = useState<DayReport | null>(null);

  const load = useCallback(async () => {
    const d = await api<{ openShift: OpenShift | null; live: Live | null; history: HistoryRow[] }>("/api/shifts");
    setOpenShift(d.openShift); setLive(d.live); setHistory(d.history);
    setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => push("error", "تعذر تحميل الورديات")); }, [load, push]);

  async function openShiftNow() {
    setSaving(true);
    try {
      await api("/api/shifts", { method: "POST", body: { action: "open", openingCash: Number(openForm.openingCash) || 0 } });
      push("success", "تم فتح الوردية — دوام موفق");
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الفتح"); }
    setSaving(false);
  }

  async function closeShiftNow() {
    if (closeForm.actualCash === "") return push("error", "عدّ النقد الفعلي في الصندوق أولًا");
    setSaving(true);
    try {
      const d = await api<{ shift: HistoryRow }>("/api/shifts", { method: "POST", body: { action: "close", actualCash: Number(closeForm.actualCash), note: closeForm.note } });
      const diff = Number(d.shift.difference ?? 0);
      push(diff >= 0 ? "success" : "warn", `أُغلقت الوردية — الفرق ${diff >= 0 ? "+" : ""}${fmtNum(diff)} شيكل`);
      setCloseForm({ actualCash: "", note: "" });
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الإغلاق"); }
    setSaving(false);
  }

  async function loadReport() {
    try {
      const d = await api<DayReport>(`/api/reports/day-close?date=${reportDate}`);
      setReport(d);
    } catch { push("error", "تعذر تحميل التقرير"); }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="الورديات وإغلاق اليومية" subtitle="فتح وإغلاق وردية الصندوق مع مطابقة النقد الفعلي بالمتوقع"
        actions={canViewReports && (
          <Btn variant="primary" onClick={loadReport}><CalendarCheck2 size={17} /> تقرير إغلاق اليومية</Btn>
        )}
      />

      {/* الوردية الحالية */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        {!openShift ? (
          <Card className="p-5 relative overflow-hidden xl:col-span-2">
            <div className="absolute inset-0 bg-gradient-to-l from-[#0a0f1c]/[0.04] to-transparent" />
            <div className="relative flex flex-wrap items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-[#0a0f1c] shadow-lg shadow-gold-500/25">
                <PlayCircle size={26} />
              </div>
              <div className="flex-1 min-w-48">
                <h3 className="font-black text-lg text-slate-900 font-display">لا توجد وردية مفتوحة</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">افتح الوردية عند بدء دوامك وحدد نقد الافتتاح في الصندوق</p>
              </div>
              <div className="flex items-end gap-2">
                <Field label="نقد الافتتاح (شيكل)">
                  <Input type="number" value={openForm.openingCash} onChange={(e) => setOpenForm({ openingCash: e.target.value })} className="w-36 tnum" placeholder="0" />
                </Field>
                <Btn variant="primary" onClick={openShiftNow} loading={saving} className="mb-0.5">
                  <PlayCircle size={17} /> فتح الوردية
                </Btn>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <Card className="p-5 xl:col-span-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-l from-[#05080f] to-[#0d1a14] rounded-[inherit]" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 anim-pulse-soft" />
                  <span className="text-emerald-300 font-extrabold text-sm">الوردية مفتوحة — {openShift.cashier}</span>
                  <span className="text-slate-400 text-[11px] font-bold">بدأت {fmtDateTime(openShift.openedAt)} • افتتاح {fmtNum(openShift.openingCash)} شيكل</span>
                </div>
                {live && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      ["نقدي", live.cashSales, "text-emerald-400", Banknote],
                      ["بطاقات + ديون محصّلة", live.cardSales, "text-sky-400", CreditCard],
                      ["مبيعات آجلة", live.creditSales, "text-amber-400", Landmark],
                      ["مرتجعات", live.returnsTotal, "text-rose-400", TrendingDown],
                      ["تحصيل ديون (كاش)", live.debtCollected, "text-emerald-400", Banknote],
                      ["مصروفات", live.expensesTotal, "text-rose-400", TrendingDown],
                      ["عدد الفواتير", live.invoiceCount, "text-slate-200", ReceiptText],
                      ["النقد المتوقع بالصندوق", live.expectedCash, "text-gold-300", Scale],
                    ].map(([label, v, tone, Icon]) => {
                      const I = Icon as React.ElementType;
                      return (
                        <div key={label as string} className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-3 py-2.5">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-1"><I size={11} /> {label as string}</div>
                          <div className={cn("font-black tnum text-[15px]", tone as string)}>{fmtNum(v as number)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
            {/* إغلاق الوردية */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3.5">
                <StopCircle size={17} className="text-rose-500" />
                <h3 className="font-black text-slate-900 font-display text-sm">إغلاق الوردية</h3>
              </div>
              <Field label="النقد الفعلي بعد العدّ (شيكل)" required>
                <Input type="number" value={closeForm.actualCash} onChange={(e) => setCloseForm({ ...closeForm, actualCash: e.target.value })} className="tnum text-lg font-black" />
              </Field>
              {closeForm.actualCash !== "" && live && (
                <div className={cn("mt-2 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-extrabold border",
                  Number(closeForm.actualCash) - live.expectedCash >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
                  <span>{Number(closeForm.actualCash) - live.expectedCash >= 0 ? "زيادة (Over)" : "نقص (Short)"}</span>
                  <span className="tnum">{Number(closeForm.actualCash) - live.expectedCash >= 0 ? "+" : ""}{fmtNum(Number(closeForm.actualCash) - live.expectedCash)} شيكل</span>
                </div>
              )}
              <Field label="ملاحظة">
                <Input value={closeForm.note} onChange={(e) => setCloseForm({ ...closeForm, note: e.target.value })} placeholder="اختياري" />
              </Field>
              <Btn variant="danger" className="w-full mt-3" onClick={closeShiftNow} loading={saving}>
                <StopCircle size={16} /> إغلاق الوردية مع التسوية
              </Btn>
            </Card>
          </>
        )}
      </div>

      {/* سجل الورديات */}
      <Card className="overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center gap-2">
          <ClipboardList size={17} className="text-gold-500" />
          <h3 className="font-black text-slate-800 text-sm font-display">سجل الورديات السابقة</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl w-full min-w-[950px]">
            <thead><tr>
              <th>الفتح</th><th>الإغلاق</th><th>افتتاح</th><th>نقدي</th><th>بطاقات</th><th>آجل</th><th>مرتجعات</th><th>مصروفات</th><th>متوقع</th><th>فعلي</th><th>الفرق</th>
            </tr></thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={11}><Empty icon={<ClipboardList size={26} />} title="لا ورديات سابقة بعد" /></td></tr>}
              {history.map((s) => (
                <tr key={s.id}>
                  <td className="text-xs font-bold text-slate-500 whitespace-nowrap">{fmtDateTime(s.openedAt)}</td>
                  <td className="text-xs font-bold text-slate-500 whitespace-nowrap">{s.closedAt ? fmtDateTime(s.closedAt) : "—"}</td>
                  <td className="tnum font-bold">{fmtNum(s.openingCash)}</td>
                  <td className="tnum font-bold text-emerald-600">{fmtNum(s.cashSales)}</td>
                  <td className="tnum font-bold text-sky-600">{fmtNum(s.cardSales)}</td>
                  <td className="tnum font-bold text-amber-600">{fmtNum(s.creditSales)}</td>
                  <td className="tnum font-bold text-rose-500">{fmtNum(s.returnsTotal)}</td>
                  <td className="tnum font-bold">{fmtNum(s.expensesTotal)}</td>
                  <td className="tnum font-black">{fmtNum(s.expectedCash)}</td>
                  <td className="tnum font-bold">{s.actualCash != null ? fmtNum(s.actualCash) : "—"}</td>
                  <td>
                    {s.difference != null ? (
                      <Badge tone={Number(s.difference) >= 0 ? "emerald" : "rose"}>
                        <span className="tnum">{Number(s.difference) >= 0 ? "+" : ""}{fmtNum(s.difference)}</span>
                      </Badge>
                    ) : <Badge tone="amber">مفتوحة</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* تقرير إغلاق اليومية */}
      <Modal open={!!report} onClose={() => setReport(null)} title="تقرير إغلاق اليومية" wide
        subtitle={report ? `${report.store.name} • ${report.date}` : ""}>
        {report && (
          <div>
            <div className="flex items-center gap-2 mb-4 no-print">
              <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="!w-44" />
              <Btn variant="secondary" size="sm" onClick={loadReport}>عرض اليوم</Btn>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              {[
                ["إجمالي المبيعات", fmtMoney(report.total), "text-slate-900"],
                ["عدد الفواتير", fmtNum(report.invoicesCount), "text-slate-900"],
                ["متوسط الفاتورة", fmtMoney(report.avgInvoice), "text-slate-900"],
                ["الربح الإجمالي", fmtMoney(report.profit), "text-emerald-600"],
                ["نقدي", fmtMoney(report.byMethod.cash), "text-emerald-600"],
                ["بطاقات", fmtMoney(report.byMethod.card + report.byMethod.mixed), "text-sky-600"],
                ["آجل", fmtMoney(report.byMethod.credit), "text-amber-600"],
                ["مرتجعات", `${fmtMoney(report.returns.total)} (${report.returns.count})`, "text-rose-600"],
                ["المصروفات", `${fmtMoney(report.expenses.total)} (${report.expenses.count})`, "text-rose-600"],
                ["صافي الربح", fmtMoney(report.netProfit), "text-gold-600"],
                ["الديون المحصلة", `${fmtMoney(report.debtCollected.total)} (${report.debtCollected.count})`, "text-emerald-600"],
                ["المشتريات", `${fmtMoney(report.purchases.total)} (${report.purchases.count})`, "text-sky-600"],
              ].map(([label, value, tone]) => (
                <div key={label as string} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[10px] font-bold text-slate-400">{label as string}</div>
                  <div className={cn("font-black tnum text-[15px] mt-1", tone as string)}>{value as string}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Btn variant="secondary" className="flex-1" onClick={() => setReport(null)}><X size={15} /> إغلاق</Btn>
              <Btn variant="dark" className="flex-1" onClick={() => { setReportPrint(report); setTimeout(() => window.print(), 120); }}>
                <Printer size={16} /> طباعة التقرير
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* منطقة طباعة التقرير */}
      {reportPrint && (
        <PrintArea>
          <div dir="rtl" className="mx-auto max-w-2xl p-6" style={{ fontFamily: "var(--font-plex)" }}>
            <div className="text-center border-b-2 border-slate-900 pb-3 mb-5">
              <div className="font-black text-2xl font-display">{reportPrint.store.name}</div>
              <div className="text-xs font-bold text-slate-500">تقرير إغلاق اليومية — {reportPrint.date}</div>
              <div className="text-[11px] font-bold text-slate-400">{reportPrint.store.phone} • {reportPrint.store.address}</div>
            </div>
            <table className="w-full text-[12.5px]">
              <tbody>
                {[
                  ["إجمالي المبيعات", fmtMoney(reportPrint.total)],
                  ["عدد الفواتير", `${reportPrint.invoicesCount}`],
                  ["متوسط الفاتورة", fmtMoney(reportPrint.avgInvoice)],
                  ["المبيعات النقدية", fmtMoney(reportPrint.byMethod.cash)],
                  ["مبيعات البطاقات", fmtMoney(reportPrint.byMethod.card + reportPrint.byMethod.mixed)],
                  ["المبيعات الآجلة", fmtMoney(reportPrint.byMethod.credit)],
                  [`المرتجعات (${reportPrint.returns.count})`, fmtMoney(reportPrint.returns.total)],
                  ["الربح الإجمالي", fmtMoney(reportPrint.profit)],
                  [`المصروفات (${reportPrint.expenses.count})`, fmtMoney(reportPrint.expenses.total)],
                  ["صافي الربح", fmtMoney(reportPrint.netProfit)],
                  [`تحصيل الديون (${reportPrint.debtCollected.count})`, fmtMoney(reportPrint.debtCollected.total)],
                  [`المشتريات (${reportPrint.purchases.count})`, fmtMoney(reportPrint.purchases.total)],
                ].map(([label, value], i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="py-2 font-bold text-slate-500">{label}</td>
                    <td className="py-2 font-black tnum text-start">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-8 flex justify-between text-xs font-bold text-slate-500">
              <div>توقيع الكاشير: ............................</div>
              <div>توقيع المدير: ............................</div>
            </div>
          </div>
        </PrintArea>
      )}
    </div>
  );
}
