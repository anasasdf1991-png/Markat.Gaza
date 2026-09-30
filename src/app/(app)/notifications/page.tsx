"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, PackageOpen, AlertTriangle, CalendarClock, HandCoins, ShieldAlert,
  Database, Info, CheckCheck, Trash2, Filter, CircleCheck,
} from "lucide-react";
import { cn, fmtDateTime } from "@/lib/format";
import { Btn, useToast, Empty, Spinner, Badge, PageHeader, api, Card } from "@/components/ui";

type Notif = { id: number; type: string; title: string; body: string | null; entity: string | null; entityId: number | null; read: boolean; createdAt: string };

const typeMeta: Record<string, { label: string; icon: React.ElementType; tone: string }> = {
  low_stock: { label: "مخزون منخفض", icon: PackageOpen, tone: "bg-amber-50 text-amber-600 border-amber-200" },
  expired: { label: "انتهاء صلاحية", icon: AlertTriangle, tone: "bg-rose-50 text-rose-600 border-rose-200" },
  expiring: { label: "قرب الانتهاء", icon: CalendarClock, tone: "bg-amber-50 text-amber-600 border-amber-200" },
  debt_overdue: { label: "ديون متأخرة", icon: HandCoins, tone: "bg-rose-50 text-rose-600 border-rose-200" },
  security: { label: "أمان", icon: ShieldAlert, tone: "bg-violet-50 text-violet-600 border-violet-200" },
  backup: { label: "نسخ احتياطي", icon: Database, tone: "bg-sky-50 text-sky-600 border-sky-200" },
  system: { label: "نظام", icon: Info, tone: "bg-slate-100 text-slate-600 border-slate-200" },
};

const FILTERS = [["", "الكل"], ["unread", "غير المقروءة"], ["low_stock", "المخزون"], ["expired", "الصلاحية"], ["debt_overdue", "الديون"], ["security", "الأمان"], ["backup", "النسخ"]];

export default function NotificationsPage() {
  const router = useRouter();
  const { push } = useToast();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await api<{ notifications: Notif[]; unread: number }>(`/api/notifications${filter ? `?filter=${filter}` : ""}`);
    setNotifs(d.notifications); setUnread(d.unread);
    setLoading(false);
  }, [filter]);
  useEffect(() => { load().catch(() => push("error", "تعذر تحميل الإشعارات")); }, [load, push]);

  async function act(op: string, id?: number) {
    await api("/api/notifications", { method: "POST", body: { op, id } }).catch(() => push("error", "تعذر"));
    load();
  }

  function open(n: Notif) {
    if (!n.read) act("read", n.id);
    const route = n.entity === "products" ? "/products" : n.entity === "debts" ? "/debts" : n.entity === "backup" ? "/settings?tab=backup" : n.entity === "security" ? "/settings?tab=security" : null;
    if (route) router.push(route);
  }

  return (
    <div>
      <PageHeader
        title="مركز الإشعارات"
        subtitle={`${unread} إشعار غير مقروء من إجمالي ${notifs.length}`}
        actions={
          <>
            {unread > 0 && <Btn variant="secondary" onClick={() => act("readAll")}><CheckCheck size={16} /> قراءة الكل</Btn>}
            <Btn variant="danger" onClick={() => act("clear")}><Trash2 size={15} /> حذف المقروءة</Btn>
          </>
        }
      />

      <Card className="p-3 mb-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar anim-fade-up">
        <Filter size={14} className="text-slate-400 shrink-0" />
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={cn("shrink-0 rounded-lg px-3.5 py-2 text-xs font-extrabold border transition-all",
              filter === k ? "bg-[#0a0f1c] text-gold-300 border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-gold-400/50")}>
            {l}
          </button>
        ))}
      </Card>

      {loading ? <Spinner /> : notifs.length === 0 ? (
        <Card><Empty icon={<Bell size={28} />} title="لا توجد إشعارات" hint="التنبيهات الذكية من المخزون والديون والأمان تظهر هنا" /></Card>
      ) : (
        <div className="space-y-2 stagger">
          {notifs.map((n) => {
            const meta = typeMeta[n.type] ?? typeMeta.system;
            const Icon = meta.icon;
            return (
              <Card key={n.id} className={cn("p-4 flex items-start gap-3.5 transition-all hover:-translate-y-0.5", !n.read && "!border-gold-400/40 bg-gold-400/[0.03]")}>
                <div className={cn("w-11 h-11 rounded-xl border flex items-center justify-center shrink-0", meta.tone)}>
                  <Icon size={19} />
                </div>
                <button onClick={() => open(n)} className="flex-1 min-w-0 text-start">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-extrabold text-sm", !n.read ? "text-slate-900" : "text-slate-600")}>{n.title}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-gold-400 anim-pulse-soft" />}
                  </div>
                  {n.body && <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</div>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge tone="slate">{meta.label}</Badge>
                    <span className="text-[10.5px] font-bold text-slate-400">{fmtDateTime(n.createdAt)}</span>
                  </div>
                </button>
                <div className="flex flex-col gap-1 shrink-0">
                  {!n.read && (
                    <button onClick={() => act("read", n.id)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-colors" title="تعليم كمقروء">
                      <CircleCheck size={16} />
                    </button>
                  )}
                  <button onClick={() => act("delete", n.id)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors" title="حذف">
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
