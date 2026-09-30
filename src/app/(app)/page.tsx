import { redirect } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Coins, ReceiptText, Package, PackageOpen, CalendarX2, Truck,
  Users, HandCoins, CreditCard, Wallet, PiggyBank, Boxes, ChartColumnBig,
  ArrowUpLeft, AlertTriangle, ShoppingCart, BadgePercent, Store, Zap, UserPlus,
  ShoppingBag, Plus, Activity, Database, Server, Clock3, ShieldCheck, History,
  BarChart3, ArrowLeft,
} from "lucide-react";
import { getSessionUser, can } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { fmtMoney, fmtNum, cn, fmtDate, fmtDateTime, getCurrencyLabel } from "@/lib/format";
import { getSettings } from "@/lib/system";
import { AreaChart, BarChart, DonutChart, HBars } from "@/components/charts";
import { Badge, Card } from "@/components/ui";
import { HealthWidget } from "@/components/health-widget";

function KPI({ icon: Icon, label, value, sub, tone, href, delta }: {
  icon: React.ElementType; label: string; value: string; sub?: string; tone: string; href?: string; delta?: number;
}) {
  const tones: Record<string, string> = {
    gold: "from-gold-400 to-gold-600 shadow-gold-500/25",
    emerald: "from-emerald-400 to-teal-600 shadow-emerald-500/25",
    sky: "from-sky-400 to-blue-600 shadow-sky-500/25",
    violet: "from-violet-400 to-purple-600 shadow-violet-500/25",
    rose: "from-rose-400 to-pink-600 shadow-rose-500/25",
  };
  const darkTones: Record<string, string> = {
    gold: "dark:from-gold-500/20 dark:to-gold-600/5 dark:text-gold-300 dark:shadow-none",
    emerald: "dark:from-emerald-500/20 dark:to-emerald-600/5 dark:text-emerald-300 dark:shadow-none",
    sky: "dark:from-sky-500/20 dark:to-sky-600/5 dark:text-sky-300 dark:shadow-none",
    violet: "dark:from-violet-500/20 dark:to-violet-600/5 dark:text-violet-300 dark:shadow-none",
    rose: "dark:from-rose-500/20 dark:to-rose-600/5 dark:text-rose-300 dark:shadow-none",
  };
  const inner = (
    <div className="card p-5 relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 h-full">
      <div className={cn("absolute -top-8 -end-8 w-28 h-28 rounded-full bg-gradient-to-br opacity-[0.08] group-hover:opacity-[0.18] transition-opacity", tones[tone])} />
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-500">{label}</span>
            {delta !== undefined && delta !== 0 && (
              <span className={cn("flex items-center text-[10px] font-black tnum", delta > 0 ? "text-emerald-500" : "text-rose-500")}>
                {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {delta > 0 ? "+" : ""}{delta}%
              </span>
            )}
          </div>
          <div className="text-[26px] leading-8 font-black text-slate-900 tnum font-display truncate">{value}</div>
          {sub && <div className="text-[11px] font-bold text-slate-400 mt-1.5">{sub}</div>}
        </div>
        <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg shrink-0", tones[tone], darkTones[tone])}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Mini({ icon: Icon, label, value, tone, href }: {
  icon: React.ElementType; label: string; value: string; tone: string; href?: string;
}) {
  const t: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
    indigo: "bg-indigo-50 text-indigo-600",
    slate: "bg-slate-100 text-slate-600",
    teal: "bg-teal-50 text-teal-600",
  };
  const inner = (
    <div className="card p-3.5 flex items-center gap-3 hover:-translate-y-0.5 hover:border-gold-400/40 transition-all duration-200 h-full">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", t[tone])}>
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] font-bold text-slate-400 truncate">{label}</div>
        <div className="font-black text-slate-900 tnum truncate">{value}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function ChartCard({ title, icon: Icon, children, action, gold }: { title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode; gold?: boolean }) {
  return (
    <Card className={cn("overflow-hidden", gold && "!border-gold-500/25")}>
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <Icon size={17} className={gold ? "text-gold-500" : "text-emerald-600"} />
          <h3 className="font-black text-slate-800 text-sm font-display">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-4 pt-2">{children}</div>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getDashboardData();
  const settings = await getSettings();
  const { stats, charts, recent, lowStock, expiring, deltas, activity, command, deadStock } = data;
  const showProfit = can(user, "view_profits");
  const showReports = can(user, "view_reports");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";

  const statusTone: Record<string, string> = { completed: "emerald", suspended: "amber", voided: "rose" };
  const statusLabel: Record<string, string> = { completed: "مكتملة", suspended: "معلقة", voided: "ملغاة" };

  const quickActions = [
    { icon: ShoppingCart, label: "بيع جديد", href: "/pos", perm: "sell", primary: true },
    { icon: Package, label: "إضافة منتج", href: user.permissions.includes("add_product") ? "/products?add=1" : "/products", perm: null },
    { icon: UserPlus, label: "إضافة زبون", href: "/customers", perm: null },
    { icon: HandCoins, label: "تسجيل دفعة دين", href: "/debts", perm: "collect_debt" },
    { icon: ShoppingBag, label: "فاتورة شراء", href: "/expenses", perm: "manage_suppliers" },
    { icon: Wallet, label: "إضافة مصروف", href: "/expenses", perm: "manage_expenses" },
  ].filter((a) => !a.perm || user.permissions.includes(a.perm));

  return (
    <div className="space-y-5">
      {/* ═══ مركز القيادة ═══ */}
      <div className="card overflow-hidden relative anim-fade-up !border-gold-500/20">
        <div className="absolute inset-0 bg-gradient-to-l from-[#05080f] via-[#0b1322] to-[#0f1d33]" />
        <div className="absolute -top-24 -start-24 w-80 h-80 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="absolute -bottom-28 end-10 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-gold-300 to-gold-600 flex items-center justify-center text-[#0a0f1c] shadow-xl shadow-gold-500/25 shrink-0 anim-ring-gold">
              <Store size={25} />
            </div>
            <div className="flex-1 min-w-56">
              <div className="text-gold-300/90 text-[11px] font-extrabold tracking-wider mb-1 flex items-center gap-2">
                {fmtDate(new Date())}
                <span className="h-px w-8 bg-gold-400/40" />
                {settings.store_name}
              </div>
              <h1 className="text-2xl sm:text-[27px] font-black text-white font-display leading-tight">
                {greeting}، {user.fullName}
              </h1>
            </div>
            {can(user, "sell") && (
              <Link href="/pos"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-gold-400 to-gold-600 text-[#0a0f1c] font-black text-sm px-5 py-3 shadow-lg shadow-gold-500/30 hover:shadow-gold-500/50 hover:-translate-y-0.5 transition-all">
                <ShoppingCart size={18} /> فتح نقطة البيع <ArrowUpLeft size={16} />
              </Link>
            )}
          </div>

          {/* شريط حالة النظام */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { icon: TrendingUp, label: "مبيعات اليوم", value: fmtMoney(stats.salesToday), tone: "text-emerald-400" },
              ...(showProfit ? [{ icon: Coins, label: "ربح اليوم", value: fmtMoney(stats.profitToday), tone: "text-gold-300" }] : []),
              { icon: HandCoins, label: "مدفوعات متأخرة", value: `${fmtNum(command.pendingPayments)}`, tone: command.pendingPayments > 0 ? "text-rose-400" : "text-slate-400" },
              { icon: Users, label: "مستخدمون نشطون", value: fmtNum(command.activeUsers), tone: "text-sky-400" },
              { icon: PackageOpen, label: "منخفض المخزون", value: fmtNum(stats.lowStockCount), tone: stats.lowStockCount > 0 ? "text-amber-400" : "text-slate-400" },
              { icon: History, label: "آخر نسخة احتياطية", value: command.lastBackupAt ?? "لا يوجد", tone: "text-slate-300" },
            ].map((c, i) => (
              <div key={i} className="rounded-xl bg-white/[0.04] border border-white/[0.07] px-3.5 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mb-1.5">
                  <c.icon size={12} /> {c.label}
                </div>
                <div className={cn("font-black text-[15px] leading-tight tnum truncate", c.tone)}>{c.value}</div>
              </div>
            ))}
          </div>
          <HealthWidget />
        </div>
      </div>

      {/* ═══ إجراءات سريعة ═══ */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar anim-fade-up">
        <div className="flex items-center gap-1.5 text-gold-500 shrink-0">
          <Zap size={16} />
          <span className="text-xs font-black">إجراءات سريعة</span>
        </div>
        <span className="h-6 w-px bg-slate-200 shrink-0" />
        {quickActions.map((a, i) => (
          <Link key={i} href={a.href}
            className={cn("shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all border",
              a.primary
                ? "bg-[#0a0f1c] text-gold-300 border-transparent shadow-lg"
                : "card !rounded-xl text-slate-600 !py-2.5 hover:!border-gold-400/50")}>
            <a.icon size={15} /> {a.label}
          </Link>
        ))}
      </div>

      {/* مؤشرات رئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <KPI icon={TrendingUp} label="مبيعات اليوم" value={fmtMoney(stats.salesToday)} sub={`${fmtNum(stats.invoicesToday)} فاتورة اليوم`} tone="gold" href="/invoices" delta={deltas.salesTodayVsYesterday} />
        <KPI icon={ChartColumnBig} label="مبيعات الشهر" value={fmtMoney(stats.salesMonth)} sub={`${fmtNum(stats.invoicesMonth)} فاتورة هذا الشهر`} tone="sky" href="/invoices" delta={deltas.salesMonthVsPrevMonth} />
        {showProfit ? (
          <KPI icon={Coins} label="أرباح اليوم" value={fmtMoney(stats.profitToday)} sub={`الشهر: ${fmtMoney(stats.profitMonth)}`} tone="emerald" />
        ) : (
          <KPI icon={ReceiptText} label="إجمالي الفواتير" value={fmtNum(stats.invoicesCount)} sub="منذ بدء التشغيل" tone="emerald" href="/invoices" />
        )}
        {showProfit ? (
          <KPI icon={PiggyBank} label="صافي ربح الشهر" value={fmtMoney(stats.netProfit)} sub="بعد خصم المصروفات" tone="violet" />
        ) : (
          <KPI icon={Boxes} label="قيمة المخزون" value={fmtMoney(stats.stockValue)} sub="بسعر الشراء" tone="violet" href="/products" />
        )}
      </div>

      {/* مؤشرات مصغرة */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 stagger">
        <Mini icon={Package} label="إجمالي المنتجات" value={fmtNum(stats.productsCount)} tone="emerald" href="/products" />
        <Mini icon={PackageOpen} label="منخفض المخزون" value={fmtNum(stats.lowStockCount)} tone={stats.lowStockCount > 0 ? "rose" : "slate"} href="/products?filter=low" />
        <Mini icon={CalendarX2} label="منتجات منتهية" value={fmtNum(stats.expiredCount)} tone={stats.expiredCount > 0 ? "amber" : "slate"} href="/products?filter=expired" />
        <Mini icon={Users} label="الزبائن" value={fmtNum(stats.customersCount)} tone="sky" href="/customers" />
        <Mini icon={Truck} label="الموردون" value={fmtNum(stats.suppliersCount)} tone="violet" href="/suppliers" />
        <Mini icon={HandCoins} label="ديون على الزبائن" value={fmtMoney(stats.customersDebt)} tone="rose" href="/debts" />
        <Mini icon={CreditCard} label="ديون للموردين" value={fmtMoney(stats.suppliersDebt)} tone="indigo" href="/suppliers" />
        <Mini icon={Wallet} label="مصروفات اليوم" value={fmtMoney(stats.expensesToday)} tone="amber" href="/expenses" />
        <Mini icon={BadgePercent} label="مصروفات الشهر" value={fmtMoney(stats.expensesMonth)} tone="slate" href="/expenses" />
        <Mini icon={Boxes} label="قيمة المخزون" value={fmtMoney(stats.stockValue)} tone="teal" href="/products" />
        {showProfit && <Mini icon={Coins} label="أرباح الشهر" value={fmtMoney(stats.profitMonth)} tone="emerald" />}
        <Mini icon={ReceiptText} label="فواتير اليوم" value={fmtNum(stats.invoicesToday)} tone="sky" href="/invoices" />
      </div>

      {/* الرسوم الرئيسية */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <ChartCard title="المبيعات اليومية — آخر 14 يومًا" icon={TrendingUp} gold action={<Badge tone="emerald">{fmtNum(charts.daily.reduce((a, b) => a + b.value, 0))} {getCurrencyLabel()}</Badge>}>
            <AreaChart data={charts.daily} id="daily-sales" color="#d4af37" />
          </ChartCard>
        </div>
        <ChartCard title="المبيعات حسب القسم (30 يوم)" icon={ChartColumnBig}>
          <DonutChart data={charts.byCategory} centerLabel={getCurrencyLabel()} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartCard title="الأكثر مبيعًا (30 يوم)" icon={TrendingUp}>
          <HBars data={charts.top} color="#d4af37" />
        </ChartCard>
        <ChartCard title="طرق الدفع (30 يوم)" icon={CreditCard}>
          <DonutChart data={charts.byMethod} size={150} centerLabel={getCurrencyLabel()} />
        </ChartCard>
        {showReports ? (
          <ChartCard title="المبيعات الشهرية — 12 شهر" icon={ChartColumnBig}>
            <BarChart data={charts.monthly} height={215} colors={["#d4af37", "#8a6d14"]} />
          </ChartCard>
        ) : (
          <ChartCard title="الأقل مبيعًا (30 يوم)" icon={AlertTriangle}>
            <HBars data={charts.least} color="#f59e0b" />
          </ChartCard>
        )}
      </div>

      {showReports && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {showProfit && (
            <ChartCard title="الأرباح اليومية — آخر 14 يومًا" icon={Coins}>
              <AreaChart data={charts.profitDaily} id="daily-profit" color="#10b981" height={200} />
            </ChartCard>
          )}
          <ChartCard title="المصروفات اليومية — آخر 14 يومًا" icon={Wallet}>
            <BarChart data={charts.expensesDaily} height={200} colors={["#f43f5e", "#be123c"]} />
          </ChartCard>
          <ChartCard title="المبيعات الأسبوعية — 8 أسابيع" icon={ChartColumnBig}>
            <BarChart data={charts.weekly} height={200} colors={["#0ea5e9", "#0369a1"]} />
          </ChartCard>
        </div>
      )}

      {/* سجل النشاط + المخزون الذكي */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3.5">
            <Activity size={17} className="text-gold-500" />
            <h3 className="font-black text-slate-800 text-sm font-display">النشاط الأخير</h3>
          </div>
          {activity.length === 0 ? (
            <div className="text-xs text-slate-400 font-bold py-6 text-center">لا نشاطات مسجلة بعد — تظهر العمليات هنا فور حدوثها</div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gold-400/10 text-gold-500 flex items-center justify-center shrink-0">
                    <Activity size={13} />
                  </div>
                  <div className="flex-1 min-w-0 text-[12px]">
                    <span className="font-extrabold text-slate-700">{a.user}</span>{" "}
                    <span className="text-slate-500">{a.label}</span>
                    {a.entityId != null && <span className="text-slate-400 tnum"> #{a.entityId}</span>}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold shrink-0">{a.time}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* منخفض المخزون */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PackageOpen size={17} className="text-rose-500" />
              <h3 className="font-black text-slate-800 text-sm font-display">منخفض المخزون</h3>
            </div>
            {lowStock.length > 0 && <Badge tone="rose">{lowStock.length}</Badge>}
          </div>
          {lowStock.length === 0 ? (
            <div className="text-xs text-slate-400 font-bold py-6 text-center">المخزون بحالة ممتازة</div>
          ) : (
            <div className="space-y-2.5">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 truncate">{p.name}</span>
                  <Badge tone={p.stock === 0 ? "rose" : "amber"}>{fmtNum(p.stock)} {p.unit}</Badge>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-slate-400" />
              <span className="text-[11px] font-extrabold text-slate-500">مخزون راكد (لا مبيعات 30 يوم)</span>
            </div>
            <Badge tone="slate">{deadStock.length}</Badge>
          </div>
          {deadStock.slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 mt-2">
              <span className="text-[11px] font-bold text-slate-500 truncate">{p.name}</span>
              <Badge tone="slate">{fmtNum(p.stock)} {p.unit}</Badge>
            </div>
          ))}
        </Card>

        {/* الصلاحية */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={17} className="text-amber-500" />
              <h3 className="font-black text-slate-800 text-sm font-display">تنبيهات الصلاحية</h3>
            </div>
            {expiring.length > 0 && <Badge tone="amber">{expiring.length}</Badge>}
          </div>
          {expiring.length === 0 ? (
            <div className="text-xs text-slate-400 font-bold py-6 text-center">لا توجد تواريخ صلاحية قريبة</div>
          ) : (
            <div className="space-y-2.5">
              {expiring.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 truncate">{p.name}</span>
                  <Badge tone={p.expired ? "rose" : "amber"}>{p.expired ? "منتهي" : fmtDate(p.expiry)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* أحدث الفواتير */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <ReceiptText size={17} className="text-gold-500" />
            <h3 className="font-black text-slate-800 text-sm font-display">أحدث الفواتير</h3>
          </div>
          <Link href="/invoices" className="flex items-center gap-1 text-xs font-extrabold text-gold-600 hover:text-gold-500">
            عرض الكل <ArrowLeft size={13} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl w-full">
            <thead>
              <tr><th>الفاتورة</th><th>الزبون</th><th>الكاشير</th><th>الدفع</th><th>الإجمالي</th><th>الحالة</th><th>الوقت</th></tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td className="font-extrabold tnum text-slate-800">{r.no}</td>
                  <td className="font-bold text-slate-600">{r.customer}</td>
                  <td className="text-slate-500">{r.cashier}</td>
                  <td><Badge tone="sky">{r.method}</Badge></td>
                  <td className="font-black tnum">{fmtMoney(r.total)}</td>
                  <td><Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge></td>
                  <td className="text-[11px] text-slate-400 font-bold whitespace-nowrap">{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
