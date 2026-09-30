"use client";

import { useEffect, useState } from "react";
import { Database, Server, HeartPulse } from "lucide-react";
import { cn } from "@/lib/format";

type Health = {
  status: string; server: string; database: string; dbLatencyMs: number;
  uptimeSec: number; version: string; lastBackup: { at: string; status: string } | null;
};

function uptime(sec: number): string {
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))} دقيقة`;
  if (sec < 86400) return `${(sec / 3600).toFixed(1)} ساعة`;
  return `${(sec / 86400).toFixed(1)} يوم`;
}

export function HealthWidget() {
  const [h, setH] = useState<Health | null>(null);
  useEffect(() => {
    let on = true;
    const load = () => fetch("/api/health").then((r) => r.json()).then((d) => on && setH(d)).catch(() => {});
    load();
    const t = setInterval(load, 45_000);
    return () => { on = false; clearInterval(t); };
  }, []);

  const ok = h?.database === "connected";
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] font-bold">
      <span className="flex items-center gap-1.5 text-slate-400">
        <HeartPulse size={13} className={cn(ok ? "text-emerald-400" : "text-rose-400")} />
        مركز القيادة
      </span>
      <span className="flex items-center gap-1.5">
        <Server size={12} className="text-slate-400" />
        <span className="text-slate-300">الخادم:</span>
        <span className={ok ? "text-emerald-400" : "text-rose-400"}>{h ? "متصل" : "جارٍ الفحص..."}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Database size={12} className="text-slate-400" />
        <span className="text-slate-300">قاعدة البيانات:</span>
        <span className={ok ? "text-emerald-400" : "text-rose-400"}>
          {h ? (ok ? `متصلة • ${h.dbLatencyMs}ms` : "منقطعة") : "..."}
        </span>
      </span>
      {h && (
        <span className="text-slate-500">
          تشغيل منذ <span className="text-slate-300 tnum">{uptime(h.uptimeSec)}</span> • SOBIS v{h.version}
        </span>
      )}
    </div>
  );
}
