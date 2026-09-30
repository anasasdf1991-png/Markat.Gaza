"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Boxes, PackageOpen, Trash2, AlertTriangle, CalendarClock, PackageCheck,
  Search, History, Scale, X, TrendingDown, FileWarning,
} from "lucide-react";
import { fmtMoney, fmtNum, fmtDate, fmtDateTime, cn } from "@/lib/format";
import { Btn, Modal, Input, Select, Field, useToast, Spinner, Badge, PageHeader, api, Card, Empty } from "@/components/ui";
import { useUser } from "@/components/shell";

type InvProduct = {
  id: number; name: string; barcode: string; unit: string; stock: number; minStock: string;
  purchasePrice: string; salePrice: string; categoryName: string | null; expiryDate: string | null;
  value: number; lastSaleAt: string | null; dead: number;
};
type Summary = { totalValue: number; dead30: number; dead60: number; dead90: number; dead180: number; low: number };
type Adjustment = { id: number; productId: number; productName: string; type: string; qty: string; reason: string | null; createdAt: string };

const TYPES: Record<string, string> = {
  damaged: "تالف", expired: "منتهي", lost: "مفقود", broken: "مكسور", personal: "استخدام شخصي", count: "تسوية جرد", adjust: "تعديل",
};

export default function InventoryPage() {
  const user = useUser();
  const { push } = useToast();
  const canAdjust = user.permissions.includes("manage_inventory");
  const [tab, setTab] = useState<"stock" | "writeoffs" | "expiry" | "dead">("stock");
  const [rows, setRows] = useState<InvProduct[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  // نموذج التسوية
  const [target, setTarget] = useState<InvProduct | null>(null);
  const [form, setForm] = useState({ type: "damaged", qty: "", reason: "", direction: "out" });
  const [saving, setSaving] = useState(false);
  const [expiryGroup, setExpiryGroup] = useState<number | null>(null);
  const [deadFilter, setDeadFilter] = useState<30 | 60 | 90 | 180 | 0>(0);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api<{ products: InvProduct[]; summary: Summary }>("/api/inventory");
    setRows(d.products); setSummary(d.summary);
    const adj = await api<{ adjustments: Adjustment[] }>("/api/inventory?adjustments=1");
    setAdjustments(adj.adjustments);
    setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => push("error", "تعذر التحميل")); }, [load, push]);

  async function saveAdjust() {
    if (!target) return;
    const qty = Number(form.qty);
    if (!qty || qty <= 0) return push("error", "أدخل الكمية");
    setSaving(true);
    try {
      const d = await api<{ newStock: number }>("/api/inventory", {
        method: "POST",
        body: { productId: target.id, type: form.type, qty, reason: form.reason, direction: form.direction, allowNegative: true },
      });
      push("success", `تمت التسوية — المخزون الجديد: ${fmtNum(d.newStock)} ${target.unit}`);
      setTarget(null); setForm({ type: "damaged", qty: "", reason: "", direction: "out" });
      load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذرت التسوية"); }
    setSaving(false);
  }

  const visible = rows.filter((r) => !q || r.name.includes(q) || r.barcode.includes(q));

  const expiryGroups = (daysMax: number | null) => {
    const now = new Date(new Date().toDateString());
    return visible.filter((p) => {
      if (!p.expiryDate) return false;
      const exp = new Date(p.expiryDate);
      if (daysMax === 0) return exp < now; // منتهي
      if (daysMax === null) return true;   // صالح الكل
      return exp >= now && exp <= new Date(now.getTime() + daysMax * 864e5);
    });
  };

  const deadRows = deadFilter === 0 ? visible : visible.filter((p) => p.dead === deadFilter);

  const tabs = [
    { key: "stock" as const, label: "المخزون الحالي", icon: Boxes },
    { key: "writeoffs" as const, label: "التسويات والتلف", icon: FileWarning },
    { key: "expiry" as const, label: "مركز الصلاحية", icon: CalendarClock },
    { key: "dead" as const, label: "المخزون الراكد", icon: TrendingDown },
  ];

  return (
    <div>
      <PageHeader title="مركز المخزون" subtitle={summary ? `قيمة المخزون ${fmtMoney(summary.totalValue)} • ${fmtNum(rows.length)} منتج نشط` : undefined} />

      {/* ملخصات */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5 stagger">
        {[
          { icon: Boxes, label: "قيمة المخزون", value: fmtMoney(summary?.totalValue ?? 0), tone: "bg-emerald-50 text-emerald-600", act: () => setTab("stock") },
          { icon: PackageOpen, label: "منخفض المخزون", value: fmtNum(summary?.low ?? 0), tone: "bg-amber-50 text-amber-600", act: () => setTab("stock") },
          { icon: TrendingDown, label: "راكد 30+ يوم", value: fmtNum((summary?.dead30 ?? 0) + (summary?.dead60 ?? 0) + (summary?.dead90 ?? 0) + (summary?.dead180 ?? 0)), tone: "bg-rose-50 text-rose-600", act: () => { setTab("dead"); setDeadFilter(30); } },
          { icon: TrendingDown, label: "راكد 90+ يوم", value: fmtNum(summary?.dead90 ?? 0), tone: "bg-rose-50 text-rose-600", act: () => { setTab("dead"); setDeadFilter(90); } },
          { icon: TrendingDown, label: "راكد 180+ يوم", value: fmtNum(summary?.dead180 ?? 0), tone: "bg-slate-100 text-slate-600", act: () => { setTab("dead"); setDeadFilter(180); } },
        ].map((s, i) => (
          <button key={i} onClick={s.act} className="card p-4 flex items-center gap-3 text-start hover:-translate-y-0.5 transition-all">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", s.tone)}><s.icon size={20} /></div>
            <div><div className="text-[11px] font-bold text-slate-400">{s.label}</div><div className="font-black text-lg tnum">{s.value}</div></div>
          </button>
        ))}
      </div>

      {/* التبويبات */}
      <Card className="p-3 mb-4 flex flex-wrap items-center gap-2 anim-fade-up">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold border transition-all",
              tab === t.key ? "bg-[#0a0f1c] text-gold-300 border-transparent shadow-lg" : "bg-white text-slate-500 border-slate-200 hover:border-gold-400/50")}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
        <div className="ms-auto relative w-60 max-w-full">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم / باركود" className="input-field ps-9 py-2 text-xs" />
        </div>
      </Card>

      {loading ? <Spinner /> : (
        <>
          {/* ═══ المخزون ═══ */}
          {tab === "stock" && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto max-h-[62vh] overflow-y-auto">
                <table className="tbl w-full min-w-[900px]">
                  <thead><tr><th>المنتج</th><th>القسم</th><th>الحالي</th><th>حد الطلب</th><th>تكلفة</th><th>بيع</th><th>قيمة المخزون</th><th>متاح</th>{canAdjust && <th>إجراءات</th>}</tr></thead>
                  <tbody>
                    {visible.map((p) => (
                      <tr key={p.id}>
                        <td><div className="font-bold text-slate-800">{p.name}</div><div className="text-[10px] text-slate-400 tnum" dir="ltr">{p.barcode}</div></td>
                        <td><Badge tone="slate">{p.categoryName ?? "—"}</Badge></td>
                        <td><span className={cn("tnum font-black", p.stock <= Number(p.minStock) ? "text-rose-600" : "text-slate-900")}>{fmtNum(p.stock)} {p.unit}</span></td>
                        <td className="tnum text-slate-500 font-bold">{fmtNum(p.minStock)}</td>
                        <td className="tnum font-bold">{fmtNum(p.purchasePrice)}</td>
                        <td className="tnum font-black text-emerald-600">{fmtNum(p.salePrice)}</td>
                        <td className="tnum font-black">{fmtMoney(p.value)}</td>
                        <td>{p.stock > 0 ? <Badge tone="emerald"><PackageCheck size={11} /> متاح</Badge> : <Badge tone="rose">نافد</Badge>}</td>
                        {canAdjust && (
                          <td>
                            <div className="flex gap-1">
                              <button onClick={() => { setTarget(p); setForm({ type: "damaged", qty: "", reason: "", direction: "out" }); }}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors" title="تسوية/شطب">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ═══ التسويات ═══ */}
          {tab === "writeoffs" && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto max-h-[62vh] overflow-y-auto">
                <table className="tbl w-full min-w-[750px]">
                  <thead><tr><th>التاريخ</th><th>المنتج</th><th>النوع</th><th>الكمية</th><th>السبب</th></tr></thead>
                  <tbody>
                    {adjustments.length === 0 && <tr><td colSpan={5}><Empty icon={<FileWarning size={26} />} title="لا تسويات أو شطبيات مسجلة" hint="استخدم زر الشطب من تبويب المخزون" /></td></tr>}
                    {adjustments.map((a) => (
                      <tr key={a.id}>
                        <td className="text-xs font-bold text-slate-500 whitespace-nowrap">{fmtDateTime(a.createdAt)}</td>
                        <td className="font-bold text-slate-800">{a.productName}</td>
                        <td><Badge tone={a.type === "count" ? "sky" : "rose"}>{TYPES[a.type] ?? a.type}</Badge></td>
                        <td className="tnum font-black text-rose-600">-{fmtNum(a.qty)}</td>
                        <td className="text-xs text-slate-500">{a.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ═══ الصلاحية ═══ */}
          {tab === "expiry" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { key: 0 as number | null, label: "منتهي", icon: AlertTriangle, tone: "bg-rose-50 text-rose-600 border-rose-200" },
                  { key: 7 as number | null, label: "ينتهي خلال 7 أيام", icon: CalendarClock, tone: "bg-rose-50 text-rose-600 border-rose-200" },
                  { key: 30 as number | null, label: "خلال 30 يوم", icon: CalendarClock, tone: "bg-amber-50 text-amber-600 border-amber-200" },
                  { key: 60 as number | null, label: "خلال 60 يوم", icon: CalendarClock, tone: "bg-amber-50 text-amber-600 border-amber-200" },
                  { key: null as number | null, label: "الكل (صالح وما دونه)", icon: PackageCheck, tone: "bg-emerald-50 text-emerald-600 border-emerald-200" },
                ].map((g) => {
                  const count = expiryGroups(g.key).length;
                  return (
                    <button key={String(g.key)} onClick={() => setExpiryGroup(expiryGroup === g.key ? null : g.key)}
                      className={cn("rounded-2xl border p-3.5 text-start transition-all", g.tone, expiryGroup === g.key && "ring-2 ring-offset-1 ring-gold-400")}>
                      <g.icon size={18} className="mb-2" />
                      <div className="text-[11px] font-extrabold">{g.label}</div>
                      <div className="font-black text-xl tnum mt-0.5">{count}</div>
                    </button>
                  );
                })}
              </div>
              {expiryGroup === null ? null : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto max-h-[52vh] overflow-y-auto">
                  <table className="tbl w-full min-w-[700px]">
                    <thead><tr><th>المنتج</th><th>تاريخ الانتهاء</th><th>المخزون</th><th>المتبقي بالأيام</th><th>الحالة</th></tr></thead>
                    <tbody>
                      {expiryGroups(expiryGroup).length === 0 && <tr><td colSpan={5}><div className="text-center py-8 text-xs font-bold text-slate-400">لا منتجات في هذه المجموعة</div></td></tr>}
                      {expiryGroups(expiryGroup).map((p) => {
                        const days = Math.ceil((new Date(p.expiryDate!).getTime() - new Date().getTime()) / 864e5);
                        return (
                          <tr key={p.id}>
                            <td className="font-bold text-slate-800">{p.name}</td>
                            <td className="text-xs font-bold">{fmtDate(p.expiryDate)}</td>
                            <td className="tnum">{fmtNum(p.stock)} {p.unit}</td>
                            <td className="tnum font-black">{days}</td>
                            <td>{days < 0 ? <Badge tone="rose">منتهي — اصرفه أولًا (FEFO)</Badge> : days <= 7 ? <Badge tone="rose">بِع أولًا (FEFO)</Badge> : <Badge tone="amber">قريب</Badge>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
              )}
            </div>
          )}

          {/* ═══ الراكد ═══ */}
          {tab === "dead" && (
            <div className="space-y-4">
              <div className="flex gap-1.5">
                {([[0, "الكل"], [30, "لم يُبع 30+"], [60, "60+"], [90, "90+"], [180, "180+"]] as const).map(([n, l]) => (
                  <button key={n} onClick={() => setDeadFilter(n as 0 | 30 | 60 | 90 | 180)}
                    className={cn("rounded-lg px-3.5 py-2 text-xs font-extrabold border transition-all",
                      deadFilter === n ? "bg-[#0a0f1c] text-gold-300 border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-gold-400/50")}>
                    {l}
                  </button>
                ))}
              </div>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto max-h-[52vh] overflow-y-auto">
                  <table className="tbl w-full min-w-[800px]">
                    <thead><tr><th>المنتج</th><th>المخزون</th><th>قيمة المخزون</th><th>آخر عملية بيع</th><th>المدة</th><th>اقتراح</th></tr></thead>
                    <tbody>
                      {deadRows.length === 0 && <tr><td colSpan={6}><Empty icon={<PackageCheck size={26} />} title="لا مخزون راكد في هذه الفئة" /></td></tr>}
                      {deadRows.map((p) => (
                        <tr key={p.id}>
                          <td className="font-bold text-slate-800">{p.name}</td>
                          <td className="tnum">{fmtNum(p.stock)} {p.unit}</td>
                          <td className="tnum font-black">{fmtMoney(p.value)}</td>
                          <td className="text-xs text-slate-500">{p.lastSaleAt ? fmtDate(p.lastSaleAt) : "لم يُبع أبدًا"}</td>
                          <td>{p.dead > 0 ? <Badge tone={p.dead >= 90 ? "rose" : "amber"}>{p.dead}+ يوم</Badge> : <span className="text-slate-300">—</span>}</td>
                          <td className="text-[11px] font-bold text-slate-500">{p.dead >= 90 ? "عرض تصفية / إرجاع للمورد" : p.dead >= 30 ? "خصم تحفيزي" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* نموذج تسوية مخزون */}
      <Modal open={!!target} onClose={() => setTarget(null)} title={`تسوية مخزون — ${target?.name ?? ""}`} subtitle={target ? `الحالي: ${fmtNum(target.stock)} ${target.unit}` : ""}>
        {target && (
          <div className="space-y-3.5">
            <Field label="نوع العملية">
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(TYPES).map(([k, l]) => (
                  <button key={k} onClick={() => setForm({ ...form, type: k })}
                    className={cn("rounded-lg border-2 py-2 text-[11px] font-extrabold transition-all",
                      form.type === k ? "border-gold-400 bg-gold-400/10 text-gold-600" : "border-slate-200 text-slate-500 hover:border-gold-400/50")}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الاتجاه">
                <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                  <option value="out">خصم من المخزون (−)</option>
                  <option value="in">إرجاع/إضافة (+)</option>
                </Select>
              </Field>
              <Field label="الكمية" required>
                <Input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="tnum" />
              </Field>
            </div>
            <Field label="السبب">
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="مثال: كسر أثناء التخزين" />
            </Field>
            {form.qty && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-600">المخزون بعد التسوية</span>
                <span className="font-black tnum text-lg">{fmtNum(target.stock + (form.direction === "in" ? Number(form.qty) : -Number(form.qty)))} {target.unit}</span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Btn variant="secondary" className="flex-1" onClick={() => setTarget(null)}><X size={15} /> إلغاء</Btn>
              <Btn variant="primary" className="flex-[2]" onClick={saveAdjust} loading={saving}><Scale size={16} /> تنفيذ التسوية</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
