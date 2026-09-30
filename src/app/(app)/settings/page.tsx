"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Store, Mail, Database, ShieldCheck, Palette, ReceiptText, Package, Bell,
  HeartPulse, ScrollText, Save, CheckCircle2, AlertTriangle, Loader2, Download,
  RotateCcw, HardDrive, Send, KeyRound, LogOut, Moon, Sun, MonitorCog, Phone,
  MapPin, FileDigit, CalendarClock, Sparkles, Clock3, UserRound, Eye, EyeOff, RefreshCw,
} from "lucide-react";
import { cn, fmtNum, fmtDateTime } from "@/lib/format";
import { Btn, Input, Select, Field, Modal, useToast, Spinner, Card, PageHeader, api, Badge } from "@/components/ui";
import { useUser } from "@/components/shell";
import { Suspense } from "react";

type S = Record<string, string>;
type BackupRow = { id: number; filename: string; size: string; status: string; note: string | null; createdAt: string };
type AuditRow = { id: number; userName: string; action: string; label: string; entity: string | null; entityId: number | null; ip: string | null; createdAt: string };
type Health = {
  status: string; server: string; database: string; dbLatencyMs: number; uptimeSec: number; version: string;
  lastBackup: { at: string; status: string } | null; time: string;
  monitors?: { failedLogins24h: number; failedBackups: number; respMs: number };
};

const TABS = [
  { key: "store", label: "المتجر", icon: Store },
  { key: "receipt", label: "الفاتورة والإيصال", icon: ReceiptText },
  { key: "inventory", label: "المخزون والديون", icon: Package },
  { key: "email", label: "البريد الإلكتروني", icon: Mail },
  { key: "backup", label: "النسخ الاحتياطي", icon: Database },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "security", label: "الأمان", icon: ShieldCheck },
  { key: "appearance", label: "المظهر", icon: Palette },
  { key: "health", label: "صحة النظام", icon: HeartPulse },
  { key: "audit", label: "سجل التدقيق", icon: ScrollText },
];

function Section({ title, sub, icon: Icon, children, onSave, saving }: {
  title: string; sub?: string; icon: React.ElementType; children: React.ReactNode; onSave?: () => void; saving?: boolean;
}) {
  return (
    <Card className="p-5 anim-fade-up">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold-400/10 text-gold-500 flex items-center justify-center shrink-0">
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 font-display text-base">{title}</h3>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
          </div>
        </div>
        {onSave && (
          <Btn variant="primary" size="sm" onClick={onSave} loading={saving}>
            <Save size={14} /> حفظ
          </Btn>
        )}
      </div>
      {children}
    </Card>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 hover:border-gold-400/40 transition-colors text-start">
      <span>
        <span className="block text-[13px] font-extrabold text-slate-800">{label}</span>
        {hint && <span className="block text-[11px] text-slate-400 mt-0.5">{hint}</span>}
      </span>
      <span className={cn("w-11 h-6 rounded-full relative transition-colors shrink-0", checked ? "bg-gold-400" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", checked ? "start-0.5" : "start-[22px]")} />
      </span>
    </button>
  );
}

function SettingsInner() {
  const user = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const [tab, setTab] = useState(searchParams.get("tab") ?? "store");
  const [s, setS] = useState<S>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  // الأمان
  const [pw, setPw] = useState({ current: "", next: "" });
  const [logins, setLogins] = useState<{ id: number; label: string; ip: string | null; createdAt: string }[]>([]);
  // البريد
  const [emailTest, setEmailTest] = useState("");
  const [emailBusy, setEmailBusy] = useState("");
  // النسخ
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [dbSize, setDbSize] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupRow | null>(null);
  const [restoreWord, setRestoreWord] = useState("");
  // صحة
  const [health, setHealth] = useState<Health | null>(null);
  // تدقيق
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditAction, setAuditAction] = useState("");

  const load = useCallback(async () => {
    const d = await api<{ settings: S }>("/api/settings");
    setS(d.settings); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === "backup") api<{ backups: BackupRow[]; dbSize: string | null }>("/api/backups").then((d) => { setBackups(d.backups); setDbSize(d.dbSize ?? null); }).catch(() => {});
    if (tab === "security") api<{ logins: { id: number; label: string; ip: string | null; createdAt: string }[] }>("/api/auth/me").then((d) => setLogins(d.logins)).catch(() => {});
    if (tab === "health") fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
    if (tab === "audit") api<{ logs: AuditRow[]; total: number }>(`/api/audit${auditAction ? `?action=${auditAction}` : ""}`).then((d) => { setAuditRows(d.logs); setAuditTotal(d.total); }).catch(() => {});
  }, [tab, auditAction]);

  const set = (k: string, v: string) => setS((prev) => ({ ...prev, [k]: v }));

  async function save(keys: string[]) {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const k of keys) payload[k] = s[k] ?? "";
      const d = await api<{ changed: number }>("/api/settings", { method: "PUT", body: payload });
      push("success", d.changed > 0 ? `تم حفظ ${d.changed} إعدادًا بنجاح` : "لا تغييرات للحفظ");
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الحفظ"); }
    setSaving(false);
  }

  async function changePassword() {
    if (pw.next.length < 6) return push("error", "كلمة المرور الجديدة 6 أحرف على الأقل");
    try {
      await api("/api/auth/me", { method: "PUT", body: { action: "password", current: pw.current, next: pw.next } });
      push("success", "تم تغيير كلمة المرور — سجّل الدخول مجددًا");
      setTimeout(() => router.push("/login"), 1200);
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر التغيير"); }
  }

  async function logoutAll() {
    try {
      await api("/api/auth/me", { method: "PUT", body: { action: "logout_all" } });
      push("info", "تم إنهاء جميع الجلسات");
      setTimeout(() => router.push("/login"), 1000);
    } catch (e) { push("error", "تعذر"); }
  }

  async function emailAction(action: string, kind?: string) {
    setEmailBusy(action + (kind ?? ""));
    try {
      const d = await api<{ message: string }>("/api/email", { method: "POST", body: { action, kind, to: emailTest || undefined } });
      push("success", d.message);
    } catch (e) { push("error", e instanceof Error ? e.message : "فشل"); }
    setEmailBusy("");
  }

  async function createBackup() {
    setBackupBusy(true);
    try {
      await api("/api/backups", { method: "POST", body: {} });
      push("success", "تم إنشاء النسخة الاحتياطية بنجاح");
      const d = await api<{ backups: BackupRow[] }>("/api/backups");
      setBackups(d.backups);
    } catch (e) { push("error", e instanceof Error ? e.message : "فشل النسخ"); }
    setBackupBusy(false);
  }

  async function doRestore() {
    if (!restoreTarget) return;
    try {
      await api(`/api/backups/${restoreTarget.id}`, { method: "POST", body: { confirm: "استعادة" } });
      push("success", "تمت الاستعادة بنجاح — أعد تشغيل النظام");
      setRestoreTarget(null);
    } catch (e) { push("error", e instanceof Error ? e.message : "فشلت الاستعادة"); }
  }

  async function changeTheme(t: string) {
    await fetch("/api/auth/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "theme", theme: t }) }).catch(() => {});
    const eff = t === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
    document.documentElement.dataset.theme = eff;
    push("success", "تم تطبيق المظهر");
    router.refresh();
  }

  const fsize = (n: string) => {
    const b = Number(n);
    if (b > 1048576) return `${(b / 1048576).toFixed(1)} MB`;
    if (b > 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${b} B`;
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="مركز الإعدادات" subtitle="إدارة النظام، المتجر، البريد، النسخ الاحتياطي، الأمان، والمظهر — كل التغييرات تُحفظ في قاعدة البيانات" />

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* التبويبات */}
        <div className="w-full lg:w-60 shrink-0 flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar lg:sticky lg:top-24 pb-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("shrink-0 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-extrabold transition-all border",
                tab === t.key
                  ? "bg-[#0a0f1c] text-gold-300 border-transparent shadow-lg"
                  : "bg-white text-slate-500 border-slate-100 hover:border-gold-400/50 card !rounded-xl !py-2.5")}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* ═══ المتجر ═══ */}
          {tab === "store" && (
            <Section title="إعدادات المتجر" sub="اسم المتجر وبيانات الاتصال تظهر في الإيصال والتقارير" icon={Store} saving={saving}
              onSave={() => save(["store_name", "store_brand", "store_phone", "store_whatsapp", "store_email", "store_address", "tax_number", "currency_label", "currency_code", "currency_decimals", "currency_rate_usd", "currency_rate_jod", "currency_rate_eur", "default_tax", "timezone", "date_format"])}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <Field label="اسم المتجر" required><Input value={s.store_name ?? ""} onChange={(e) => set("store_name", e.target.value)} /></Field>
                <Field label="اسم العلامة (Logo)" hint="يظهر في الشريط الجانبي"><Input value={s.store_brand ?? ""} onChange={(e) => set("store_brand", e.target.value)} /></Field>
                <Field label="العملة الافتراضية">
                  <Select value={s.currency_code ?? "ILS"} onChange={(e) => {
                    const presets: Record<string, [string, string]> = { ILS: ["₪", "ILS — شيكل إسرائيلي جديد"], USD: ["$", "USD — دولار أمريكي"], JOD: ["د.أ", "JOD — دينار أردني"], EUR: ["€", "EUR — يورو"] };
                    const p = presets[e.target.value] ?? presets.ILS;
                    set("currency_code", e.target.value);
                    set("currency_label", p[0]);
                  }}>
                    <option value="ILS">ILS — شيكل ₪</option>
                    <option value="USD">USD — دولار $</option>
                    <option value="JOD">JOD — دينار د.أ</option>
                    <option value="EUR">EUR — يورو €</option>
                  </Select>
                </Field>
                <Field label="رمز العملة"><Input value={s.currency_label ?? ""} onChange={(e) => set("currency_label", e.target.value)} placeholder="₪" /></Field>
                <Field label="الفواصل العشرية">
                  <Select value={s.currency_decimals ?? "2"} onChange={(e) => set("currency_decimals", e.target.value)}>
                    <option value="0">بدون كسور</option>
                    <option value="1">رقم واحد (0.0)</option>
                    <option value="2">رقمان (0.00)</option>
                    <option value="3">ثلاثة أرقام (0.000)</option>
                  </Select>
                </Field>
                <Field label="سعر الدولار (USD)"><Input type="number" step="0.001" value={s.currency_rate_usd ?? ""} onChange={(e) => set("currency_rate_usd", e.target.value)} className="tnum" /></Field>
                <Field label="سعر الدينار (JOD)"><Input type="number" step="0.001" value={s.currency_rate_jod ?? ""} onChange={(e) => set("currency_rate_jod", e.target.value)} className="tnum" /></Field>
                <Field label="سعر اليورو (EUR)"><Input type="number" step="0.001" value={s.currency_rate_eur ?? ""} onChange={(e) => set("currency_rate_eur", e.target.value)} className="tnum" /></Field>
                <Field label="الهاتف" ><Input value={s.store_phone ?? ""} onChange={(e) => set("store_phone", e.target.value)} dir="ltr" /></Field>
                <Field label="واتساب"><Input value={s.store_whatsapp ?? ""} onChange={(e) => set("store_whatsapp", e.target.value)} dir="ltr" /></Field>
                <Field label="البريد التجاري"><Input value={s.store_email ?? ""} onChange={(e) => set("store_email", e.target.value)} dir="ltr" /></Field>
                <Field label="الرقم الضريبي"><Input value={s.tax_number ?? ""} onChange={(e) => set("tax_number", e.target.value)} dir="ltr" /></Field>
                <Field label="نسبة الضريبة الافتراضية (%)"><Input type="number" value={s.default_tax ?? ""} onChange={(e) => set("default_tax", e.target.value)} className="tnum" /></Field>
                <Field label="المنطقة الزمنية">
                  <Select value={s.timezone ?? "Asia/Jerusalem"} onChange={(e) => set("timezone", e.target.value)}>
                    {["Asia/Jerusalem", "Asia/Hebron", "Asia/Riyadh", "Africa/Cairo", "Asia/Amman", "Asia/Dubai"].map((z) => <option key={z} value={z}>{z}</option>)}
                  </Select>
                </Field>
                <Field label="العنوان" hint="يظهر في الإيصال"><Input value={s.store_address ?? ""} onChange={(e) => set("store_address", e.target.value)} /></Field>
              </div>
            </Section>
          )}

          {/* ═══ الفاتورة والإيصال ═══ */}
          {tab === "receipt" && (
            <Section title="إعدادات الفاتورة والإيصال" sub="تخصيص ما يظهر في إيصال الطباعة" icon={ReceiptText} saving={saving}
              onSave={() => save(["invoice_prefix", "receipt_header", "receipt_footer"])}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Field label="بادئة رقم الفاتورة"><Input value={s.invoice_prefix ?? ""} onChange={(e) => set("invoice_prefix", e.target.value)} dir="ltr" /></Field>
                <Field label="نص إضافي أعلى الإيصال"><Input value={s.receipt_header ?? ""} onChange={(e) => set("receipt_header", e.target.value)} /></Field>
                <Field label="نص الختام أسفل الإيصال"><Input value={s.receipt_footer ?? ""} onChange={(e) => set("receipt_footer", e.target.value)} /></Field>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs font-bold text-slate-500 leading-relaxed">
                تُطبق التغييرات على الإيصالات الجديدة عند الطباعة من نقطة البيع وصفحة الفواتير.
              </div>
            </Section>
          )}

          {/* ═══ المخزون والديون ═══ */}
          {tab === "inventory" && (
            <Section title="إعدادات المخزون والديون" sub="حدود التنبيهات التلقائية" icon={Package} saving={saving}
              onSave={() => save(["low_stock_alert", "expiry_alert_days", "debt_due_days"])}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3">
                <Field label="تنبيه الصلاحية قبل (أيام)"><Input type="number" value={s.expiry_alert_days ?? ""} onChange={(e) => set("expiry_alert_days", e.target.value)} className="tnum" /></Field>
                <Field label="الاستحقاق الافتراضي للديون (أيام)"><Input type="number" value={s.debt_due_days ?? ""} onChange={(e) => set("debt_due_days", e.target.value)} className="tnum" /></Field>
              </div>
              <Toggle label="تنبيه انخفاض المخزون" hint="توليد تنبيه يومي عند نزول منتجات عن حد الطلب" checked={s.low_stock_alert === "1"} onChange={(v) => set("low_stock_alert", v ? "1" : "0")} />
            </Section>
          )}

          {/* ═══ البريد ═══ */}
          {tab === "email" && (
            <>
              <Section title="تكامل البريد الإلكتروني (Gmail)" sub="استخدم Gmail تأغر App Password — غير كلمة المرور العادية. يُخزَّن بأمان في قاعدة البيانات فقط" icon={Mail} saving={saving}
                onSave={() => save(["email_smtp_host", "email_smtp_port", "email_user", "email_pass", "email_from", "report_email", "email_enabled"])}>
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-[12px] font-bold text-sky-700 leading-relaxed">
                  <Sparkles size={16} className="shrink-0" />
                  <span>للحصول على <b>App Password</b>: حساب Google → الأمان → التحقق بخطوتين → كلمات مرور التطبيقات → أنشئ كلمة مرور وتسمعاُ.</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-3.5">
                  <Field label="خادم SMTP"><Input value={s.email_smtp_host ?? ""} onChange={(e) => set("email_smtp_host", e.target.value)} dir="ltr" placeholder="smtp.gmail.com" /></Field>
                  <Field label="المنفذ"><Input type="number" value={s.email_smtp_port ?? ""} onChange={(e) => set("email_smtp_port", e.target.value)} dir="ltr" /></Field>
                  <Field label="البريد المرسل (From)"><Input value={s.email_from ?? ""} onChange={(e) => set("email_from", e.target.value)} dir="ltr" placeholder="sobris@>" /></Field>
                  <Field label="إيميل النظام (Gmail)"><Input value={s.email_user ?? ""} onChange={(e) => set("email_user", e.target.value)} dir="ltr" /></Field>
                  <Field label="كلمة مرور التطبيقات" hint="تُخفى بعد الحفظ">
                    <div className="relative">
                      <Input type={showPass ? "text" : "password"} value={s.email_pass ?? ""} onChange={(e) => set("email_pass", e.target.value)} dir="ltr" placeholder="xxxx xxxx xxxx xxxx" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"><Eye size={15} /></button>
                    </div>
                  </Field>
                  <Field label="بريد استقبال التقارير"><Input value={s.report_email ?? ""} onChange={(e) => set("report_email", e.target.value)} dir="ltr" /></Field>
                </div>
                <Toggle label="تفعيل البريد" hint="تنشيط الإرسال الفعلي للتقارير والتنبيهات" checked={s.email_enabled === "1"} onChange={(v) => set("email_enabled", v ? "1" : "0")} />
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Input value={emailTest ?? ""} onChange={(e) => setEmailTest(e.target.value)} dir="ltr" placeholder="بريد للاختبار" className="!w-56" />
                  <Btn variant="secondary" onClick={() => emailAction("test")} loading={emailBusy === "test"}>
                    <Send size={15} /> بريد تجريبي
                  </Btn>
                  {(["daily", "weekly", "monthly"] as const).map((k) => (
                    <Btn key={k} variant="secondary" onClick={() => emailAction("report", k)} loading={emailBusy === `report${k}`}>
                      <Mail size={14} /> {k === "daily" ? "تقرير يومي الآن" : k === "weekly" ? "أسبوعي الآن" : "شهري الآن"}
                    </Btn>
                  ))}
                </div>
              </Section>

              <Section title="التقارير الدورية التلقائية" sub="تفعيل إرسال التقارير بشكل تلقائي للبريد المحدد" icon={CalendarClock} saving={saving}
                onSave={() => save(["report_daily", "report_weekly", "report_monthly"])}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Toggle label="تقرير يومي" hint="مبيعات وربح ومصروفات اليوم" checked={s.report_daily === "1"} onChange={(v) => set("report_daily", v ? "1" : "0")} />
                  <Toggle label="تقرير أسبوعي" hint="ملخص آخر 7 أيام" checked={s.report_weekly === "1"} onChange={(v) => set("report_weekly", v ? "1" : "0")} />
                  <Toggle label="تقرير شهري" hint="ملخص آخر 30 يومًا" checked={s.report_monthly === "1"} onChange={(v) => set("report_monthly", v ? "1" : "0")} />
                </div>
              </Section>
            </>
          )}

          {/* ═══ النسخ الاحتياطي ═══ */}
          {tab === "backup" && (
            <>
              <Section title="النسخ الاحتياطي والاستعادة" sub={dbSize ? `حجم قاعدة البيانات: ${dbSize}` : "نسخة كاملة بصيغة SQL قابلة للتنزيل والاستعادة"} icon={Database}>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Btn variant="primary" onClick={createBackup} loading={backupBusy}><HardDrive size={16} /> إنشاء نسخة احتياطية الآن</Btn>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <Field label="جدولة تلقائية">
                    <Select value={s.backup_auto ?? "off"} onChange={(e) => set("backup_auto", e.target.value)}>
                      <option value="off">إيقاف</option><option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly">شهري</option>
                    </Select>
                  </Field>
                  <Field label="عدد النسخ المحفوظة"><Input type="number" value={s.backup_keep ?? ""} onChange={(e) => set("backup_keep", e.target.value)} className="tnum" /></Field>
                  <div className="flex items-end pb-1">
                    <Toggle label="تنبيه بريدي عند النسخ" checked={s.backup_email_notify === "1"} onChange={(v) => set("backup_email_notify", v ? "1" : "0")} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Btn variant="secondary" size="sm" onClick={() => save(["backup_auto", "backup_keep", "backup_email_notify"])} loading={saving}><Save size={14} /> حفظ إعدادات النسخ</Btn>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="text-xs font-extrabold text-slate-500 mb-3">سجل النسخ ({backups.length})</div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {backups.length === 0 && <div className="text-center py-8 text-xs font-bold text-slate-400">لا نسخ احتياطية بعد — أنشئ أول نسخة الآن</div>}
                    {backups.map((b) => (
                      <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", b.status === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                          <Database size={16} />
                        </div>
                        <div className="flex-1 min-w-40">
                          <div className="text-[12.5px] font-extrabold text-slate-800 truncate tnum" dir="ltr">{b.filename}</div>
                          <div className="text-[10.5px] font-bold text-slate-400">{fmtDateTime(b.createdAt)} • {fsize(b.size)}{b.note ? ` • ${b.note}` : ""}</div>
                        </div>
                        <Badge tone={b.status === "success" ? "emerald" : "rose"}>{b.status === "success" ? "ناجحة" : "فاشلة"}</Badge>
                        {b.status === "success" && (
                          <div className="flex gap-1">
                            <a href={`/api/backups/${b.id}`} download className="w-8 h-8 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-sky-600 flex items-center justify-center transition-colors" title="تنزيل">
                              <Download size={15} />
                            </a>
                            <button onClick={() => { setRestoreTarget(b); setRestoreWord(""); }} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 flex items-center justify-center transition-colors" title="استعادة">
                              <RotateCcw size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-[12px] font-bold text-rose-700 leading-relaxed">
                <AlertTriangle size={15} className="inline-block ms-1 -mt-0.5" />
                استعادة نسخة تستبدل البيانات الحالية تمامًا — أنشئ نسخة حديثة أولًا. القاعدة الأساسية تبقى PostgreSQL؛ البريد يُستخدم للتنبيهات فقط.
              </div>
            </>
          )}

          {/* ═══ الإشعارات ═══ */}
          {tab === "notifications" && (
            <Section title="إعدادات مركز الإشعارات" sub="تحكم في أنواع التنبيهات المولّدة تلقائيًا" icon={Bell} saving={saving}
              onSave={() => save(["notify_low_stock", "notify_expiry", "notify_debts", "notify_security"])}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Toggle label="انخفاض / نفاد المخزون" hint="تنبيه يومي" checked={s.notify_low_stock === "1"} onChange={(v) => set("notify_low_stock", v ? "1" : "0")} />
                <Toggle label="قرب انتهاء الصلاحية" hint="حسب عدد أيام التنبيه" checked={s.notify_expiry === "1"} onChange={(v) => set("notify_expiry", v ? "1" : "0")} />
                <Toggle label="الديون المتأخرة" hint="فواتير تجاوزت الاستحقاق" checked={s.notify_debts === "1"} onChange={(v) => set("notify_debts", v ? "1" : "0")} />
                <Toggle label="تنبيهات الأمان" hint="محاولات دخول فاشلة متكررة (للمديرين فقط)" checked={s.notify_security === "1"} onChange={(v) => set("notify_security", v ? "1" : "0")} />
              </div>
            </Section>
          )}

          {/* ═══ الأمان ═══ */}
          {tab === "security" && (
            <>
              <Section title="تغيير كلمة المرور" sub="تغيير كلمة المرور ينهي جميع الجلسات الأخرى فورًا" icon={KeyRound}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                  <Field label="كلمة المرور الحالية" required><Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} dir="ltr" /></Field>
                  <Field label="الجديدة (6+ أحرف)" required><Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} dir="ltr" /></Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn variant="primary" onClick={changePassword}><KeyRound size={15} /> حفظ كلمة المرور</Btn>
                  <Btn variant="danger" onClick={logoutAll}><LogOut size={15} /> إنهاء كل الجلسات</Btn>
                </div>
              </Section>
              <Section title="سجل الدخول الحسّاب" sub="آخر العمليات الأمنية على حسابك" icon={ShieldCheck}>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {logins.length === 0 && <div className="text-xs text-slate-400 font-bold py-6 text-center">لا سجلات بعد</div>}
                  {logins.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5">
                      <ShieldCheck size={14} className="text-gold-500 shrink-0" />
                      <span className="text-xs font-extrabold text-slate-700 flex-1">{l.label}</span>
                      <span className="text-[10px] font-bold text-slate-400" dir="ltr">{l.ip ?? "local"}</span>
                      <span className="text-[10px] font-bold text-slate-400">{fmtDateTime(l.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* ═══ المظهر ═══ */}
          {tab === "appearance" && (
            <Section title="مظهر النظام" sub="تُحفظ لكل مستخدم في حسابه وتُطبَّق فورًا" icon={Palette}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  ["dark", "Premium Dark", "ليلي فاخر — Midnight Navy & Gold", Moon, "from-[#0a0f1c] to-[#16203a]"],
                  ["light", "Light", "فاتح نظيف وواضح", Sun, "from-white to-slate-100"],
                  ["auto", "Auto", "يتبع مظهر جهازك", MonitorCog, "from-slate-500 to-slate-700"],
                ] as const).map(([t, label, hint, Icon, grad]) => (
                  <button key={t} onClick={() => changeTheme(t)}
                    className={cn("rounded-2xl border-2 p-4 text-start transition-all hover:-translate-y-0.5",
                      user.theme === t ? "border-gold-400 shadow-xl shadow-gold-500/10" : "border-slate-200 hover:border-gold-400/50")}>
                    <div className={cn("h-20 rounded-xl bg-gradient-to-br mb-3 relative overflow-hidden", grad)}>
                      <div className="absolute inset-x-3 top-3 h-2 rounded-full bg-white/20" />
                      <div className="absolute start-3 bottom-3 w-10 h-2 rounded-full bg-gold-400/60" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-gold-500" />
                      <span className="font-black text-sm text-slate-800">{label}</span>
                      {user.theme === t && <CheckCircle2 size={15} className="text-gold-500 ms-auto" />}
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold mt-1">{hint}</div>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* ═══ صحة النظام ═══ */}
          {tab === "health" && (
            <Section title="صحة النظام" sub="بيانات مراقبة حية من الخادم وقاعدة البيانات — تشمل معدل أخطاء الدخول والنسخ" icon={HeartPulse}>
              {!health ? <Spinner /> : (
                <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "حالة الخادم", value: health.server === "online" ? "متصل" : "متوقف", ok: health.server === "online" },
                    { label: "قاعدة البيانات", value: health.database === "connected" ? "متصلة" : "منقطعة", ok: health.database === "connected" },
                    { label: "استجابة القاعدة", value: `${health.dbLatencyMs}ms`, ok: health.dbLatencyMs < 80 },
                    { label: "مدة التشغيل", value: health.uptimeSec < 3600 ? `${Math.round(health.uptimeSec / 60)} دقيقة` : health.uptimeSec < 86400 ? `${(health.uptimeSec / 3600).toFixed(1)} ساعة` : `${(health.uptimeSec / 86400).toFixed(1)} يوم`, ok: true },
                    { label: "الإصدار", value: `SOBIS v${health.version}`, ok: true },
                    { label: "آخر نسخة احتياطية", value: health.lastBackup ? fmtDateTime(health.lastBackup.at) : "لا يوجد", ok: !!health.lastBackup },
                    { label: "زمن استجابة فحص API", value: `${health.monitors?.respMs ?? 0}ms`, ok: (health.monitors?.respMs ?? 0) < 400 },
                    { label: "الحالة العامة", value: health.status === "healthy" ? "سليم 100%" : "متدهور", ok: health.status === "healthy" },
                    { label: "دخول فاشل (24 ساعة)", value: `${health.monitors?.failedLogins24h ?? 0}`, ok: (health.monitors?.failedLogins24h ?? 0) < 5 },
                    { label: "نسخ احتياطية فاشلة", value: `${health.monitors?.failedBackups ?? 0}`, ok: (health.monitors?.failedBackups ?? 0) === 0 },
                  ].map((c, i) => (
                    <div key={i} className={cn("rounded-2xl border p-4", c.ok ? "border-emerald-200/60 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50")}>
                      <div className="text-[10.5px] font-bold text-slate-400 mb-1">{c.label}</div>
                      <div className={cn("font-black text-sm", c.ok ? "text-emerald-700" : "text-rose-700")}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-[12px] font-bold text-emerald-800 leading-relaxed">
                  ✓ إذا كان إعداد النسخ التلقائي (يومي/أسبوعي/شهري) مفعّلًا، سيُنفَّذ تلقائيًا عند استحقاقه أثناء مراقبة الصحة، وتصلك رسالة بريد عند تعطيل خيار "تنبيه بريدي عند النسخ".
                </div>
                </>
              )}
              <div className="mt-4">
                <Btn variant="secondary" size="sm" onClick={() => { setHealth(null); fetch("/api/health").then((r) => r.json()).then(setHealth); }}>
                  <RefreshCw size={14} /> تحديث الفحص
                </Btn>
              </div>
            </Section>
          )}

          {/* ═══ سجل التدقيق ═══ */}
          {tab === "audit" && (
            <Section title={`سجل التدقيق الشامل — ${fmtNum(auditTotal)} عملية`} sub="كل العمليات الحساسة مسجلة بالمستخدم والوقت وقبل/بعد" icon={ScrollText}>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4">
                {["", "login", "login_failed", "sale", "sale_cancel", "price_change", "stock_change", "debt_payment", "employee_edit", "settings_change", "backup", "restore"].map((a) => (
                  <button key={a} onClick={() => setAuditAction(a)}
                    className={cn("shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-extrabold border transition-all",
                      auditAction === a ? "bg-[#0a0f1c] text-gold-300 border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-gold-400/50")}>
                    {a === "" ? "الكل" : {
                      login: "دخول", login_failed: "دخول فاشل", sale: "بيع", sale_cancel: "إلغاء", price_change: "سعر", stock_change: "مخزون",
                      debt_payment: "دفعة دين", employee_edit: "موظف", settings_change: "إعدادات", backup: "نسخ", restore: "استعادة",
                    }[a]}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
                {auditRows.length === 0 && <div className="text-center py-10 text-xs font-bold text-slate-400">لا سجلات مطابقة</div>}
                {auditRows.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-100 px-3.5 py-2.5">
                    <UserRound size={13} className="text-gold-500 shrink-0" />
                    <span className="text-xs font-extrabold text-slate-800">{r.userName}</span>
                    <span className="text-xs text-slate-500">{r.label}</span>
                    {r.entityId != null && <span className="text-[10px] font-bold text-slate-400 tnum">{r.entity} #{r.entityId}</span>}
                    <span className="ms-auto text-[10px] font-bold text-slate-400" dir="ltr">{r.ip ?? ""}</span>
                    <span className="text-[10px] font-bold text-slate-400">{fmtDateTime(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* تأكيد الاستعادة */}
      <Modal open={!!restoreTarget} onClose={() => setRestoreTarget(null)} title="تأكيد استعادة نسخة احتياطية">
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm font-bold text-rose-700 leading-relaxed mb-4">
          <AlertTriangle size={16} className="inline-block ms-1 -mt-0.5" />
          ستستبدل قاعدة البيانات الحالية بمحتوى النسخة <span className="tnum" dir="ltr">{restoreTarget?.filename}</span>.
          للتأكيد اكتب كلمة <b>استعادة</b>:
        </div>
        <Input value={restoreWord} onChange={(e) => setRestoreWord(e.target.value)} placeholder="استعادة" />
        <div className="flex gap-2 mt-5">
          <Btn variant="secondary" className="flex-1" onClick={() => setRestoreTarget(null)}>تراجع</Btn>
          <Btn variant="danger" className="flex-1" onClick={doRestore} disabled={restoreWord !== "استعادة"}>
            <RotateCcw size={15} /> تنفيذ الاستعادة
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsInner />
    </Suspense>
  );
}
