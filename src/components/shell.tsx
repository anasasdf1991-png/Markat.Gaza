"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, ReceiptText, Package, Users, HandCoins,
  Truck, Wallet, ShieldCheck, LogOut, ShoppingBasket, Menu, X, Bell, ChevronDown,
  Settings as SettingsIcon, Search, Sun, Moon, MonitorCog, CheckCheck, Trash2,
  AlertTriangle, CalendarClock, PackageOpen, ShieldAlert, Database, Info,
  PackageSearch, UserRound, FileText, Loader2, Clock3, Keyboard,
  ClipboardList, BoxesIcon, Megaphone, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import { cn, fmtDate, fmtDateTime, setCurrencyLabel, setStoreInfo } from "@/lib/format";
import { api } from "@/components/ui";
import { ToastProvider, useToast, Badge } from "@/components/ui";
import { listQueue, removeFromQueue, bumpAttempts, type SyncState } from "@/lib/offline";

export type ShellUser = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleLabel: string;
  permissions: string[];
  theme: string;
  lastLoginAt: string | null;
};

type StoreSettings = { store_name?: string; store_brand?: string; store_phone?: string; store_address?: string; currency_label?: string; receipt_footer?: string };

const UserCtx = createContext<ShellUser>({
  id: 0, username: "", fullName: "", role: "", roleLabel: "", permissions: [], theme: "dark", lastLoginAt: null,
});
const StoreCtx = createContext<StoreSettings>({});
export const useUser = () => useContext(UserCtx);
export const useStore = () => useContext(StoreCtx);
export const useCan = (key: string) => useContext(UserCtx).permissions.includes(key);

// ═══════════════════════════════════════════
// مزامنة أوفلاين — سياق الحالة والطابور
// ═══════════════════════════════════════════
type OfflineCtx = { state: SyncState; pending: number; failed: number; refresh: () => void };
const OfflineSyncCtx = createContext<OfflineCtx>({ state: "online", pending: 0, failed: 0, refresh: () => {} });
export const useOffline = () => useContext(OfflineSyncCtx);

function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyncState>(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online");
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    const q = await listQueue();
    setPending(q.length);
    setFailed(q.filter((i) => i.attempts >= 3).length);
    if (!navigator.onLine) setState("offline");
    else if (q.length > 0) setState(q.some((i) => i.attempts >= 3) ? "failed" : "online");
    else setState("online");
  }, []);

  const trySync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    const q = await listQueue();
    if (!q.length) return;
    syncingRef.current = true;
    setState("syncing");
    let anyFailed = false;
    for (const item of q) {
      try {
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item.payload, clientRef: item.clientRef }),
        });
        if (!res.ok) throw new Error((await res.json())?.error ?? "فشل المزامنة");
        await removeFromQueue(item.clientRef);
      } catch (e) {
        anyFailed = true;
        if (!navigator.onLine) break;
        await bumpAttempts(item.clientRef, e instanceof Error ? e.message : "خطأ");
      }
    }
    syncingRef.current = false;
    await refresh();
    const left = await listQueue();
    if (left.length && anyFailed) setState("failed");
    else if (left.length) setState("online");
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => { setState("syncing"); trySync().then(refresh); };
    const onOffline = () => setState("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    refresh();
    const t = setInterval(() => { if (navigator.onLine) trySync(); }, 30_000);
    const onQueued = () => refresh();
    window.addEventListener("sobis:queued", onQueued);
    window.addEventListener("sobis:synced", onQueued);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("sobis:queued", onQueued);
      window.removeEventListener("sobis:synced", onQueued);
      clearInterval(t);
    };
  }, [refresh, trySync]);

  return (
    <OfflineSyncCtx.Provider value={{ state, pending, failed, refresh }}>
      {children}
    </OfflineSyncCtx.Provider>
  );
}

/** شارة حالة الاتصال — تظهر أعلى النظام دومًا */
function ConnectionBadge() {
  const { state, pending, failed } = useOffline();
  const map: Record<SyncState, { label: string; cls: string; icon: React.ElementType }> = {
    online: { label: pending > 0 ? "متصل — بانتظار المزامنة" : "متصل", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Wifi },
    offline: { label: "وضع غير متصل — البيع يعمل محليًا", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: WifiOff },
    syncing: { label: "جاري المزامنة", cls: "bg-sky-50 text-sky-700 border-sky-200", icon: RefreshCw },
    failed: { label: "فشلت بعض العمليات — أعد المحاولة", cls: "bg-rose-50 text-rose-700 border-rose-200", icon: WifiOff },
  };
  const m = map[state];
  const Icon = m.icon;
  return (
    <div className={cn("hidden sm:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10.5px] font-extrabold transition-colors", m.cls)}>
      <Icon size={12} className={state === "syncing" ? "animate-spin" : ""} />
      {m.label}
      {pending > 0 && <span className="rounded-md bg-[#0a0f1c] text-white px-1.5 tnum">{pending}</span>}
      {failed > 0 && <span className="rounded-md bg-rose-600 text-white px-1.5 tnum">{failed}</span>}
    </div>
  );
}

const NAV = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, perms: [] },
  { href: "/pos", label: "نقطة البيع", icon: ShoppingCart, perms: ["sell"] },
  { href: "/shifts", label: "الورديات والإغلاق", icon: ClipboardList, perms: ["sell"] },
  { href: "/invoices", label: "الفواتير", icon: ReceiptText, perms: ["sell", "view_reports", "collect_debt", "view_profits"] },
  { href: "/products", label: "المنتجات", icon: Package, perms: [] },
  { href: "/inventory", label: "مركز المخزون", icon: BoxesIcon, perms: [] },
  { href: "/promotions", label: "العروض والخصومات", icon: Megaphone, perms: [] },
  { href: "/customers", label: "الزبائن", icon: Users, perms: [] },
  { href: "/debts", label: "الديون والآجلات", icon: HandCoins, perms: ["add_debt", "collect_debt", "view_reports"] },
  { href: "/suppliers", label: "الموردون", icon: Truck, perms: ["manage_suppliers"] },
  { href: "/expenses", label: "المصروفات والمشتريات", icon: Wallet, perms: ["manage_expenses", "manage_suppliers"] },
  { href: "/users", label: "الموظفون والصلاحيات", icon: ShieldCheck, perms: ["manage_employees"] },
  { href: "/settings", label: "مركز الإعدادات", icon: SettingsIcon, perms: ["manage_employees"] },
];

// ═══════════════════════════════════════════
// الثيم
// ═══════════════════════════════════════════
function applyTheme(theme: string) {
  const eff = theme === "auto"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.documentElement.dataset.theme = eff;
}

// ═══════════════════════════════════════════
// البحث الشامل (Ctrl + K)
// ═══════════════════════════════════════════
type SearchResults = {
  products: { id: number; name: string; barcode: string; salePrice: string; stock: string }[];
  customers: { id: number; name: string; phone: string | null }[];
  suppliers: { id: number; name: string; phone: string | null; company: string | null }[];
  invoices: { id: number; total: string; createdAt: string; customer: string }[];
};

function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { if (open) { setQ(""); setResults(null); setTimeout(() => inputRef.current?.focus(), 60); } }, [open]);
  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { setResults(await api<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`)); }
      catch { setResults(null); }
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const hasResults = results && (results.products.length || results.customers.length || results.suppliers.length || results.invoices.length);

  function go(href: string) { onClose(); router.push(href); }

  if (!open) return null;
  const group = (icon: React.ElementType, label: string, hint?: string) => (
    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5 text-[10.5px] font-extrabold text-slate-400">
      {(() => { const I = icon; return <I size={13} className="text-gold-400" />; })()}
      {label}
    </div>
  );
  return (
    <div className="fixed inset-0 z-[180] flex items-start justify-center pt-[12vh] px-4" dir="rtl">
      <div className="absolute inset-0 bg-[#05080f]/70 backdrop-blur-sm anim-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#0d1526] border border-[#24335c] rounded-2xl shadow-2xl anim-pop overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1d2947]">
          <Search size={17} className="text-gold-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن منتج، زبون، مورد، أو رقم فاتورة..."
            className="flex-1 bg-transparent outline-none text-[15px] font-bold text-slate-100 placeholder:text-slate-500"
          />
          {loading && <Loader2 size={15} className="animate-spin text-slate-400" />}
          <kbd className="hidden sm:block rounded-lg border border-[#24335c] bg-[#101a31] px-2 py-1 text-[10px] font-black text-slate-400">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto pb-3">
          {!hasResults && !loading && q.trim().length >= 2 && (
            <div className="py-10 text-center text-sm font-bold text-slate-500">لا توجد نتائج مطابقة لـ «{q}»</div>
          )}
          {!q.trim() && (
            <div className="py-10 text-center">
              <Keyboard size={30} className="mx-auto text-slate-600 mb-2" />
              <div className="text-sm font-bold text-slate-500">اكتب للبحث الفوري في كل النظام</div>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-bold">
                <kbd className="rounded-md border border-[#24335c] bg-[#101a31] px-1.5 py-0.5">Ctrl</kbd> + <kbd className="rounded-md border border-[#24335c] bg-[#101a31] px-1.5 py-0.5">K</kbd>
                للفتح في أي وقت
              </div>
            </div>
          )}
          {results && results.products.length > 0 && (
            <>
              {group(PackageSearch, "المنتجات")}
              {results.products.map((p) => (
                <button key={p.id} onClick={() => go(`/products?q=${encodeURIComponent(p.name)}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#141d36] text-start transition-colors">
                  <Package size={15} className="text-emerald-400 shrink-0" />
                  <span className="flex-1 text-sm font-bold text-slate-200 truncate">{p.name}</span>
                  <span className="text-[11px] font-bold text-slate-500 tnum" dir="ltr">{p.barcode}</span>
                  <span className="text-xs font-black text-emerald-400 tnum">{p.salePrice}</span>
                </button>
              ))}
            </>
          )}
          {results && results.customers.length > 0 && (
            <>
              {group(UserRound, "الزبائن")}
              {results.customers.map((c) => (
                <button key={c.id} onClick={() => go(`/customers/${c.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#141d36] text-start transition-colors">
                  <UserRound size={15} className="text-sky-400 shrink-0" />
                  <span className="flex-1 text-sm font-bold text-slate-200 truncate">{c.name}</span>
                  <span className="text-[11px] font-bold text-slate-500 tnum" dir="ltr">{c.phone ?? ""}</span>
                </button>
              ))}
            </>
          )}
          {results && results.invoices.length > 0 && (
            <>
              {group(FileText, "الفواتير")}
              {results.invoices.map((i) => (
                <button key={i.id} onClick={() => go(`/invoices?q=${i.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#141d36] text-start transition-colors">
                  <FileText size={15} className="text-gold-400 shrink-0" />
                  <span className="text-sm font-bold text-slate-200 tnum">INV-{String(i.id).padStart(6, "0")}</span>
                  <span className="flex-1 text-xs text-slate-500">{i.customer} • {fmtDateTime(i.createdAt)}</span>
                  <span className="text-xs font-black tnum text-slate-300">{Number(i.total).toLocaleString()}</span>
                </button>
              ))}
            </>
          )}
          {results && results.suppliers.length > 0 && (
            <>
              {group(Truck, "الموردون")}
              {results.suppliers.map((s) => (
                <button key={s.id} onClick={() => go(`/suppliers?q=${encodeURIComponent(s.name)}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#141d36] text-start transition-colors">
                  <Truck size={15} className="text-violet-400 shrink-0" />
                  <span className="flex-1 text-sm font-bold text-slate-200 truncate">{s.name}</span>
                  <span className="text-[11px] font-bold text-slate-500">{s.company ?? ""}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// مركز الإشعارات
// ═══════════════════════════════════════════
type Notif = { id: number; type: string; title: string; body: string | null; entity: string | null; entityId: number | null; read: boolean; createdAt: string };

const notifIcons: Record<string, { icon: React.ElementType; tone: string }> = {
  low_stock: { icon: PackageOpen, tone: "bg-amber-50 text-amber-600" },
  expired: { icon: AlertTriangle, tone: "bg-rose-50 text-rose-600" },
  expiring: { icon: CalendarClock, tone: "bg-amber-50 text-amber-600" },
  debt_overdue: { icon: HandCoins, tone: "bg-rose-50 text-rose-600" },
  security: { icon: ShieldAlert, tone: "bg-violet-50 text-violet-600" },
  backup: { icon: Database, tone: "bg-sky-50 text-sky-600" },
  system: { icon: Info, tone: "bg-slate-100 text-slate-600" },
};

export function useNotifications() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    try {
      const d = await api<{ notifications: Notif[]; unread: number }>("/api/notifications");
      setNotifs(d.notifications); setUnread(d.unread);
    } catch { /* صامت */ }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);
  async function act(op: string, id?: number) {
    await api("/api/notifications", { method: "POST", body: { op, id } }).catch(() => {});
    load();
  }
  return { notifs, unread, act, reload: load };
}

export const adminCanSeeSettings = (user: ShellUser) => user.permissions.includes("manage_employees");

function BellMenu() {
  const [open, setOpen] = useState(false);
  const { notifs, unread, act } = useNotifications();
  const router = useRouter();

  function openNotif(n: Notif) {
    act("read", n.id);
    const route = n.entity === "products" ? "/products" : n.entity === "debts" ? "/debts" : n.entity === "backup" ? "/settings?tab=backup" : n.entity === "security" ? "/settings?tab=security" : null;
    if (route) { setOpen(false); router.push(route); }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors" title="الإشعارات">
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute top-1 end-1 min-w-[17px] h-[17px] rounded-full bg-rose-500 border-2 border-white dark:border-[#080c18] text-white text-[9px] font-black flex items-center justify-center px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-[115%] w-[380px] max-w-[92vw] card !rounded-2xl z-20 anim-pop overflow-hidden no-print">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-gold-500" />
                <span className="font-black text-sm font-display text-slate-800">الإشعارات</span>
                {unread > 0 && <Badge tone="rose">{unread}</Badge>}
              </div>
              {unread > 0 && (
                <button onClick={() => act("readAll")} className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 hover:text-emerald-700">
                  <CheckCheck size={13} /> قراءة الكل
                </button>
              )}
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              {notifs.length === 0 && <div className="py-10 text-center text-xs font-bold text-slate-400">لا إشعارات — كل شيء تحت السيطرة</div>}
              {notifs.slice(0, 12).map((n) => {
                const meta = notifIcons[n.type] ?? notifIcons.system;
                const Icon = meta.icon;
                return (
                  <button key={n.id} onClick={() => openNotif(n)}
                    className={cn("w-full flex items-start gap-3 px-4 py-3 text-start hover:bg-slate-50 transition-colors border-b border-slate-50", !n.read && "bg-gold-400/[0.045]")}>
                    <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", meta.tone)}>
                      <Icon size={16} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={cn("block text-[13px] font-bold truncate", !n.read ? "text-slate-900" : "text-slate-500")}>{n.title}</span>
                      {n.body && <span className="block text-[11px] text-slate-400 truncate">{n.body}</span>}
                      <span className="block text-[10px] text-slate-400 mt-0.5">{fmtDateTime(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0 mt-2" />}
                  </button>
                );
              })}
            </div>
            <Link href="/notifications" onClick={() => setOpen(false)}
              className="block text-center py-2.5 text-[11.5px] font-extrabold text-gold-600 hover:bg-slate-50 transition-colors">
              عرض كل الإشعارات
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// الشريط الجانبي
// ═══════════════════════════════════════════
function Sidebar({ user, mobile, onClose, store }: { user: ShellUser; mobile?: boolean; onClose?: () => void; store: StoreSettings }) {
  const pathname = usePathname();
  const visible = NAV.filter((n) => n.perms.length === 0 || n.perms.some((p) => user.permissions.includes(p)));
  const brand = store.store_brand || "SOBIS";
  return (
    <aside className={cn("w-[262px] h-full bg-[#080c18] flex flex-col shrink-0 relative", mobile ? "shadow-2xl" : "hidden lg:flex")}>
      <div className="absolute inset-y-0 end-0 w-px bg-gradient-to-b from-gold-400/40 via-gold-400/10 to-transparent" />
      <div className="flex items-center gap-2.5 px-5 h-[72px] border-b border-white/[0.06] shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/25">
          <ShoppingBasket className="text-[#0a0f1c]" size={21} strokeWidth={2.3} />
        </div>
        <div>
          <div className="text-xl font-black text-white font-display leading-none">
            {brand}<span className="text-gold-400">.</span>
          </div>
          <div className="text-[9px] text-gold-400/70 font-bold tracking-[0.22em] mt-1">PREMIUM SYSTEM</div>
        </div>
        {mobile && (
          <button onClick={onClose} className="ms-auto text-slate-400 hover:text-white p-1.5"><X size={20} /></button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-extrabold text-gold-400/60 tracking-[0.14em]">القائمة الرئيسية</div>
        {visible.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold transition-all duration-200",
                active
                  ? "bg-gradient-to-l from-gold-500/15 to-transparent text-gold-300"
                  : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]",
              )}>
              {active && <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-gradient-to-b from-gold-300 to-gold-600" />}
              <item.icon size={19} strokeWidth={active ? 2.4 : 1.9} className={cn("shrink-0", active && "text-gold-400")} />
              {item.label}
              {active && <span className="ms-auto w-1.5 h-1.5 rounded-full bg-gold-400 anim-pulse-soft" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/[0.06] shrink-0">
        <div className="rounded-2xl bg-gradient-to-br from-gold-500/[0.08] to-transparent border border-gold-500/20 p-3.5">
          <div className="text-[11px] font-extrabold text-gold-300 mb-1">{store.store_name || "متجر SOBIS"}</div>
          <div className="text-[10px] text-slate-500 font-semibold leading-relaxed">نسخة بريميوم مرخّصة<br />SOBIS Gold v2.1 © 2026</div>
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════
// الشريط العلوي
// ═══════════════════════════════════════════
function Topbar({ user, onMenu, store, onSearch, onTheme }: { user: ShellUser; onMenu: () => void; store: StoreSettings; onSearch: () => void; onTheme: (t: string) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { push } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const current = NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)));

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    push("info", "تم تسجيل الخروج بنجاح");
    router.replace("/login");
    router.refresh();
  }

  const themeIcons = { dark: Moon, light: Sun, auto: MonitorCog } as const;
  const ThemeIcon = themeIcons[(user.theme as keyof typeof themeIcons) ?? "dark"] ?? Moon;

  return (
    <header className="h-[72px] bg-white/85 dark:bg-transparent backdrop-blur-xl border-b border-slate-200/80 flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-40 no-print">
      <button onClick={onMenu} className="lg:hidden w-10 h-10 rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center">
        <Menu size={20} />
      </button>
      <div className="min-w-0">
        <div className="font-black text-slate-900 font-display text-lg leading-tight truncate">
          {current?.label ?? "SOBIS"}
        </div>
        <div className="text-[11px] text-slate-400 font-bold hidden sm:flex items-center gap-1.5">
          <Clock3 size={10} />
          {fmtDate(now)} • <span dir="ltr">{String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}</span>
        </div>
      </div>

      {/* البحث السريع */}
      <button onClick={onSearch}
        className="hidden md:flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 px-3.5 py-2.5 ms-4 hover:border-gold-400/60 hover:text-slate-500 transition-colors min-w-52">
        <Search size={15} />
        <span className="text-xs font-bold flex-1 text-start">بحث سريع في كل النظام...</span>
        <span className="flex items-center gap-0.5 text-[10px] font-black">
          <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5">Ctrl</kbd>
          <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5">K</kbd>
        </span>
      </button>

      <div className="ms-auto flex items-center gap-1.5">
        <ConnectionBadge />
        <button onClick={() => onTheme(user.theme === "dark" ? "light" : "dark")} className="w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors" title="تبديل المظهر">
          <ThemeIcon size={18} />
        </button>
        <BellMenu />
        <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block" />
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2.5 rounded-xl ps-1.5 pe-3 py-1.5 hover:bg-slate-100 transition-colors">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-[#0a0f1c] flex items-center justify-center font-black text-sm shadow-md shadow-gold-500/20">
                {user.fullName.slice(0, 1)}
              </div>
              <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#080c18]" />
            </div>
            <div className="text-start hidden sm:block">
              <div className="text-[13px] font-extrabold text-slate-800 leading-tight">{user.fullName}</div>
              <div className="text-[10.5px] font-bold text-gold-600">{user.roleLabel}</div>
            </div>
            <ChevronDown size={15} className="text-slate-400" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute end-0 top-[110%] w-64 card p-2 z-20 anim-pop">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <div className="font-extrabold text-slate-800 text-sm">{user.fullName}</div>
                  <div className="text-[11px] text-slate-400 font-bold" dir="ltr">@{user.username} • {user.roleLabel}</div>
                  {user.lastLoginAt && <div className="text-[10px] text-slate-400 font-semibold mt-1">آخر دخول: {fmtDateTime(user.lastLoginAt)}</div>}
                </div>
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-[10px] font-extrabold text-slate-400 mb-1.5">المظهر</div>
                  <div className="grid grid-cols-3 gap-1">
                    {([["dark", "داكن", Moon], ["light", "فاتح", Sun], ["auto", "تلقائي", MonitorCog]] as const).map(([t, l, Icon]) => (
                      <button key={t} onClick={() => onTheme(t)}
                        className={cn("flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-extrabold border transition-all",
                          user.theme === t ? "border-gold-400 bg-gold-400/10 text-gold-600" : "border-slate-200 text-slate-500 hover:border-gold-400/50")}>
                        <Icon size={14} /> {l}
                      </button>
                    ))}
                  </div>
                </div>
                {adminCanSeeSettings(user) && (
                  <Link href="/settings" onClick={() => setMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                    <SettingsIcon size={16} /> مركز الإعدادات
                  </Link>
                )}
                <button onClick={logout} className="w-full mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors">
                  <LogOut size={16} /> تسجيل الخروج
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════
// الهيكل الكامل
// ═══════════════════════════════════════════
export default function Shell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [store, setStore] = useState<StoreSettings>({});
  const [theme, setTheme] = useState(user.theme || "dark");
  const router = useRouter();

  // تطبيق الثيم + تحميل إعدادات المتجر
  useEffect(() => {
    applyTheme(theme);
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const h = () => applyTheme("auto");
      mq.addEventListener("change", h);
      return () => mq.removeEventListener("change", h);
    }
  }, [theme]);

  useEffect(() => {
    api<{ settings: Record<string, string> }>("/api/settings").then((d) => {
      const s = d.settings;
      setCurrencyLabel(s.currency_label, Number(s.currency_decimals));
      setStoreInfo({ name: s.store_name, brand: s.store_brand, phone: s.store_phone, address: s.store_address, footer: s.receipt_footer });
      setStore(s);
      document.title = `${s.store_brand || "SOBIS"} | ${s.store_name || "نظام إدارة السوبر ماركت"}`;
    }).catch(() => {});
  }, []);

  async function changeTheme(t: string) {
    setTheme(t);
    await fetch("/api/auth/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "theme", theme: t }) }).catch(() => {});
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const userWithTheme = { ...user, theme };

  return (
    <UserCtx.Provider value={userWithTheme}>
      <StoreCtx.Provider value={store}>
        <ToastProvider>
          <OfflineSyncProvider>
          <div className="h-screen flex overflow-hidden bg-[#f3f5f9] dark:bg-[#070b14]">
            <Sidebar user={userWithTheme} store={store} />
            {drawer && (
              <div className="fixed inset-0 z-[100] lg:hidden">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade-in" onClick={() => setDrawer(false)} />
                <div className="absolute inset-y-0 start-0 anim-fade-in">
                  <Sidebar user={userWithTheme} mobile onClose={() => setDrawer(false)} store={store} />
                </div>
              </div>
            )}
            <div className="flex-1 flex flex-col min-w-0">
              <Topbar user={userWithTheme} store={store} onMenu={() => setDrawer(true)} onSearch={() => setSearchOpen(true)} onTheme={changeTheme} />
              <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
            </div>
            <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
          </div>
          </OfflineSyncProvider>
        </ToastProvider>
      </StoreCtx.Provider>
    </UserCtx.Provider>
  );
}
