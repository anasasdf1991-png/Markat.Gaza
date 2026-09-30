"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search, ReceiptText, Eye, Printer, Ban, CalendarClock, CheckCircle2, XCircle,
} from "lucide-react";
import { fmtMoney, fmtNum, fmtDateTime, cn, invoiceNo, PAYMENT_METHODS } from "@/lib/format";
import { Btn, Modal, useToast, Empty, Spinner, Badge, PageHeader, api, Card } from "@/components/ui";
import { Receipt, PrintArea, type ReceiptData } from "@/components/receipt";
import { useUser } from "@/components/shell";

type Inv = {
  id: number; customerId: number | null; customerName: string | null; cashier: string;
  status: string; paymentMethod: string; total: string; paid: string; subtotal: string;
  discount: string; tax: string; change: string; itemsCount: number; createdAt: string;
  dueDate: string | null; label: string | null;
};

export default function InvoicesPage() {
  const user = useUser();
  const { push } = useToast();
  const canVoid = user.permissions.includes("void_invoice");
  const [rows, setRows] = useState<Inv[]>([]);
  const [q, setQ] = useState("");
  const [range, setRange] = useState("");
  const [status, setStatus] = useState("completed");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ReceiptData | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [voidTarget, setVoidTarget] = useState<Inv | null>(null);
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (range) p.set("range", range);
    p.set("status", status);
    const d = await api<{ invoices: Inv[] }>(`/api/invoices?${p}`);
    setRows(d.invoices);
    setLoading(false);
  }, [q, range, status]);
  useEffect(() => {
    const t = setTimeout(load, q ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function viewDetail(id: number) {
    const d = await api<ReceiptData>(`/api/invoices/${id}`);
    setDetail(d);
  }

  async function voidInvoice() {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      await api(`/api/invoices/${voidTarget.id}/void`, { method: "POST" });
      push("success", `تم إلغاء الفاتورة ${invoiceNo(voidTarget.id)} وإرجاع بضاعتها للمخزون`);
      setVoidTarget(null);
      setDetail(null);
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الإلغاء"); }
    setVoiding(false);
  }

  const ranges = [["", "كل الفترات"], ["today", "اليوم"], ["week", "آخر 7 أيام"], ["month", "آخر 30 يوم"]];
  const statuses: [string, string, React.ElementType][] = [["completed", "مكتملة", CheckCircle2], ["suspended", "معلقة", CalendarClock], ["voided", "ملغاة", XCircle]];
  const rangeTotals = rows.reduce((s, r) => ({ t: s.t + Number(r.total), p: s.p + (status === "completed" ? Number(r.total) - Number(r.paid) : 0) }), { t: 0, p: 0 });

  const invBadge = (i: Inv) => {
    if (i.status === "voided") return <Badge tone="rose">ملغاة</Badge>;
    if (i.status === "suspended") return <Badge tone="amber">معلقة</Badge>;
    const remaining = Number(i.total) - Number(i.paid);
    if (remaining > 0.009) return <Badge tone="amber">آجل — {fmtMoney(remaining)}</Badge>;
    return <Badge tone="emerald">مكتملة</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="الفواتير"
        subtitle={`${fmtNum(rows.length)} فاتورة معروضة • الإجمالي ${fmtMoney(rangeTotals.t)}${rangeTotals.p > 0 ? ` • مستحق آجل ${fmtMoney(rangeTotals.p)}` : ""}`}
      />

      <Card className="p-3.5 mb-4 flex flex-wrap items-center gap-2.5 anim-fade-up">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث برقم الفاتورة أو اسم الزبون..." className="input-field ps-10" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {ranges.map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)}
              className={cn("shrink-0 rounded-lg px-3.5 py-2 text-xs font-extrabold border transition-all",
                range === k ? "bg-[#0a0f1c] text-white border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-emerald-400")}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {statuses.map(([k, l, Icon]) => (
            <button key={k} onClick={() => setStatus(k)}
              className={cn("shrink-0 flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold border transition-all",
                status === k ? "bg-emerald-600 text-white border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-emerald-400")}>
              <Icon size={13} /> {l}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden anim-fade-up">
        {loading ? <Spinner /> : rows.length === 0 ? (
          <Empty icon={<ReceiptText size={28} />} title="لا توجد فواتير مطابقة" hint="جرّب تغيير الفلاتر أو أنشئ مبيعًا جديدًا من نقطة البيع" />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl w-full min-w-[950px]">
              <thead>
                <tr><th>الفاتورة</th><th>التاريخ والوقت</th><th>الزبون</th><th>الكاشير</th><th>الأصناف</th><th>طريقة الدفع</th><th>الإجمالي</th><th>المدفوع</th><th>الحالة</th><th>إجراءات</th></tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} className={cn(i.status === "voided" && "opacity-55")}>
                    <td className="font-extrabold tnum">{i.label || invoiceNo(i.id)}</td>
                    <td className="text-xs font-bold text-slate-500 whitespace-nowrap">{fmtDateTime(i.createdAt)}</td>
                    <td className="font-bold text-slate-700">{i.customerName ?? "زبون نقدي"}</td>
                    <td className="text-slate-500 font-bold">{i.cashier}</td>
                    <td className="tnum font-bold text-slate-500">{fmtNum(i.itemsCount)}</td>
                    <td><Badge tone="sky">{PAYMENT_METHODS[i.paymentMethod] ?? i.paymentMethod}</Badge></td>
                    <td className="tnum font-black">{fmtMoney(i.total)}</td>
                    <td className="tnum font-bold text-emerald-600">{fmtMoney(i.paid)}</td>
                    <td>{invBadge(i)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => viewDetail(i.id)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-colors" title="عرض">
                          <Eye size={15} />
                        </button>
                        {canVoid && i.status === "completed" && (
                          <button onClick={() => setVoidTarget(i)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors" title="إلغاء الفاتورة">
                            <Ban size={15} />
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

      {/* تفاصيل الفاتورة + الطباعة */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `الفاتورة ${invoiceNo(detail.invoice.id)}` : ""} subtitle={detail ? fmtDateTime(detail.invoice.createdAt) : ""}>
        {detail && (
          <div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-2 mb-4">
              <Receipt data={detail} />
            </div>
            <div className="flex gap-2">
              {canVoid && detail.invoice.status !== "voided" && (
                <Btn variant="danger" className="flex-1" onClick={() => setVoidTarget(rows.find((r) => r.id === detail.invoice.id) ?? null)}>
                  <Ban size={15} /> إلغاء الفاتورة
                </Btn>
              )}
              <Btn variant="dark" className="flex-1" onClick={() => { setReceipt(detail); setTimeout(() => window.print(), 120); }}>
                <Printer size={16} /> طباعة / إعادة طباعة
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* تأكيد إلغاء */}
      <Modal open={!!voidTarget} onClose={() => setVoidTarget(null)} title="تأكيد إلغاء الفاتورة">
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 font-bold leading-relaxed">
          إلغاء الفاتورة <span className="font-black tnum">{voidTarget ? invoiceNo(voidTarget.id) : ""}</span> بقيمة <span className="font-black">{fmtMoney(voidTarget?.total ?? 0)}</span> سيؤدي إلى:
          <ul className="list-disc ms-5 mt-2 space-y-1 text-[13px]">
            <li>إرجاع جميع الأصناف إلى المخزون تلقائيًا</li>
            <li>استبعاد الفاتورة من المبيعات والأرباح والديون</li>
            <li>تسجيل العملية في سجل النظام باسمك</li>
          </ul>
        </div>
        <div className="flex gap-2 mt-5">
          <Btn variant="secondary" className="flex-1" onClick={() => setVoidTarget(null)}>تراجع</Btn>
          <Btn variant="danger" className="flex-1" onClick={voidInvoice} loading={voiding}><Ban size={15} /> تأكيد الإلغاء</Btn>
        </div>
      </Modal>

      {receipt && <PrintArea><Receipt data={receipt} /></PrintArea>}
    </div>
  );
}
