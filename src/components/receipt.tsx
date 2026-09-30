"use client";

import { fmtMoney, fmtDateTime, invoiceNo, PAYMENT_METHODS, getStoreInfo } from "@/lib/format";

export type ReceiptData = {
  invoice: {
    id: number;
    status?: string;
    total: string | number;
    subtotal: string | number;
    discount: string | number;
    tax: string | number;
    paid: string | number;
    change: string | number;
    paymentMethod: string;
    createdAt: string | Date;
    customerName?: string | null;
    customerPhone?: string | null;
    cashier?: string | null;
    notes?: string | null;
  };
  items: {
    id: number;
    productName: string;
    qty: string | number;
    price: string | number;
    discountPct?: string | number;
    total: string | number;
  }[];
};

/** إيصال طباعة بعرض 80مم — يقرأ بيانات المتجر من الإعدادات */
export function Receipt({ data }: { data: ReceiptData }) {
  const inv = data.invoice;
  const store = getStoreInfo();
  const remaining = Math.max(0, Number(inv.total) - Number(inv.paid));
  return (
    <div dir="rtl" className="mx-auto bg-white text-slate-900" style={{ width: 300, fontFamily: "var(--font-plex)" }}>
      <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
        <div className="font-black text-2xl font-display tracking-tight">{store.brand}<span className="text-emerald-600">.</span></div>
        <div className="text-[11px] text-slate-500 font-bold mt-0.5">{store.name}</div>
        <div className="text-[11px] text-slate-500 font-bold mt-0.5" dir="ltr">{[store.phone, store.address].filter(Boolean).join(" • ") || "—"}</div>
      </div>

      <div className="py-2.5 border-b border-dashed border-slate-300 text-[12px] space-y-1">
        <div className="flex justify-between"><span className="font-bold text-slate-500">رقم الفاتورة:</span><span className="font-extrabold tnum">{invoiceNo(inv.id)}</span></div>
        <div className="flex justify-between"><span className="font-bold text-slate-500">التاريخ:</span><span className="font-bold text-[11px]">{fmtDateTime(inv.createdAt)}</span></div>
        <div className="flex justify-between"><span className="font-bold text-slate-500">الكاشير:</span><span className="font-bold">{inv.cashier ?? "—"}</span></div>
        <div className="flex justify-between"><span className="font-bold text-slate-500">الزبون:</span><span className="font-bold">{inv.customerName ?? "زبون نقدي"}</span></div>
      </div>

      <table className="w-full text-[11.5px] py-2">
        <thead>
          <tr className="border-b-2 border-slate-800">
            <th className="text-end py-1.5 font-extrabold">الصنف</th>
            <th className="text-center py-1.5 font-extrabold">كمية</th>
            <th className="text-end py-1.5 font-extrabold">سعر</th>
            <th className="text-start py-1.5 font-extrabold">إجمالي</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it) => (
            <tr key={it.id} className="border-b border-dotted border-slate-300">
              <td className="py-1.5 font-bold pe-1 leading-tight">
                {it.productName}
                {Number(it.discountPct) > 0 && <span className="block text-[10px] text-emerald-700 font-extrabold">خصم {it.discountPct}%</span>}
              </td>
              <td className="py-1.5 text-center tnum">{Number(it.qty)}</td>
              <td className="py-1.5 tnum">{Number(it.price)}</td>
              <td className="py-1.5 text-start tnum font-bold">{Number(it.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-2.5 text-[12.5px] space-y-1">
        <div className="flex justify-between"><span className="font-bold text-slate-500">الإجمالي الفرعي</span><span className="tnum font-bold">{Number(inv.subtotal).toFixed(2)}</span></div>
        {Number(inv.discount) > 0 && <div className="flex justify-between text-emerald-700"><span className="font-bold">الخصم</span><span className="tnum font-bold">-{Number(inv.discount).toFixed(2)}</span></div>}
        {Number(inv.tax) > 0 && <div className="flex justify-between"><span className="font-bold text-slate-500">الضريبة</span><span className="tnum font-bold">{Number(inv.tax).toFixed(2)}</span></div>}
        <div className="flex justify-between border-t-2 border-slate-800 pt-1.5 mt-1 text-base">
          <span className="font-black">الإجمالي المستحق</span>
          <span className="font-black tnum">{Number(inv.total).toFixed(2)} شيكل</span>
        </div>
        <div className="flex justify-between"><span className="font-bold text-slate-500">طريقة الدفع</span><span className="font-bold">{PAYMENT_METHODS[inv.paymentMethod] ?? inv.paymentMethod}</span></div>
        <div className="flex justify-between"><span className="font-bold text-slate-500">المدفوع</span><span className="tnum font-bold">{Number(inv.paid).toFixed(2)}</span></div>
        {Number(inv.change) > 0 && <div className="flex justify-between"><span className="font-bold text-slate-500">المتبقي للزبون</span><span className="tnum font-bold">{Number(inv.change).toFixed(2)}</span></div>}
        {remaining > 0.009 && <div className="flex justify-between text-rose-700"><span className="font-black">المتبقي على الزبون (آجل)</span><span className="tnum font-black">{remaining.toFixed(2)}</span></div>}
      </div>

      {inv.notes && <div className="mt-2 pt-2 border-t border-dashed border-slate-300 text-[11px] text-slate-600 font-bold">ملاحظات: {inv.notes}</div>}

      <div className="text-center mt-4 pt-3 border-t-2 border-dashed border-slate-300">
        <div className="font-extrabold text-[13px]">{store.footer}</div>
        <div className="text-[10px] text-slate-400 font-bold mt-1" dir="ltr">{store.brand} v2.1</div>
      </div>
    </div>
  );
}

/** طباعة: تظهر منطقة الطباعة وتستدعي نافذة الطباعة */
export function PrintArea({ children }: { children: React.ReactNode }) {
  return <div id="print-root" className="hidden">{children}</div>;
}
