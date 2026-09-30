"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes,
} from "react";
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle, Inbox } from "lucide-react";
import { cn } from "@/lib/format";

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────
type Toast = { id: number; type: "success" | "error" | "info" | "warn"; msg: string };
const ToastCtx = createContext<{ push: (type: Toast["type"], msg: string) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const push = useCallback((type: Toast["type"], msg: string) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    warn: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-sky-500" />,
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-6 start-6 z-[200] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className="anim-pop flex items-center gap-2.5 rounded-xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/10 px-4 py-3 text-sm font-bold text-slate-700">
            {icons[t.type]}
            <span className="leading-snug">{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ─────────────────────────────────────────────
// تلميحات الأزرار
// ─────────────────────────────────────────────
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "dark";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Btn({ variant = "secondary", size = "md", loading, className, children, disabled, ...rest }: BtnProps) {
  const styles: Record<string, string> = {
    primary: "bg-gradient-to-l from-gold-500 via-gold-400 to-gold-500 text-[#0a0f1c] shadow-lg shadow-gold-500/25 hover:shadow-gold-500/45 hover:-translate-y-px",
    secondary: "bg-white border border-slate-200 text-slate-700 hover:border-gold-400 hover:text-gold-600",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100",
    dark: "bg-[#111a2e] text-white hover:bg-[#1c2742]",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-4 py-2.5 text-sm rounded-xl gap-2",
    lg: "px-6 py-3.5 text-base rounded-xl gap-2",
  };
  return (
    <button
      className={cn("inline-flex items-center justify-center font-bold transition-all disabled:opacity-50 disabled:pointer-events-none", styles[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin" />}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
// حقول الإدخال
// ─────────────────────────────────────────────
export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-600 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("input-field", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("input-field cursor-pointer", props.className)} />;
}

// ─────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, wide, xlw }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; wide?: boolean; xlw?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-[#0a0f1c]/55 backdrop-blur-sm anim-fade-in" onClick={onClose} />
      <div className={cn(
        "relative w-full bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl anim-pop flex flex-col max-h-[94vh]",
        xlw ? "max-w-5xl" : wide ? "max-w-3xl" : "max-w-lg",
      )}>
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-900 font-display">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// عناصر صغيرة
// ─────────────────────────────────────────────
const tones: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  gold: "bg-gold-400/10 text-gold-600 border-gold-400/40",
  dark: "bg-[#111a2e] text-white border-transparent",
};

export function Badge({ tone = "slate", children, className }: { tone?: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap", tones[tone] ?? tones.slate, className)}>
      {children}
    </span>
  );
}

export function Empty({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        {icon ?? <Inbox className="w-7 h-7" />}
      </div>
      <div className="font-bold text-slate-600">{title}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <div className="w-9 h-9 border-[3px] border-emerald-500/25 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5 anim-fade-up">
      <div>
        <h1 className="text-2xl font-black text-slate-900 font-display">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

/** نداء API مختصر — مع حماية Timeout حتى لا يعلق أي طلب نهائيًا */
export async function api<T = unknown>(path: string, opts?: { method?: string; body?: unknown; timeoutMs?: number }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 15_000);
  try {
    const res = await fetch(path, {
      method: opts?.method ?? "GET",
      headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "حدث خطأ غير متوقع");
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("تعذر الاتصال بالخادم ضمن المهلة، يرجى المحاولة مرة أخرى");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
