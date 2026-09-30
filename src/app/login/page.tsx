"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBasket, User, Lock, Eye, EyeOff, Info, ShieldCheck,
  TrendingUp, ReceiptText, Package, AlertCircle, Sparkles, Database, Server,
} from "lucide-react";
import LampIntro from "@/components/lamp-intro";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);

  // شاشة المصباح — تُعرض مرة واحدة لكل جلسة متصفح فقط (لا علاقة لها بالمصادقة)
  const [introDone, setIntroDone] = useState<boolean | null>(null);
  useEffect(() => {
    setIntroDone(sessionStorage.getItem("sobis_intro") === "1");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // منع Double Click
    setError("");
    setLoading(true);
    // مهلة حماية حتى لا يبقى الزر في حالة تعليق دائم
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, remember }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "بيانات الدخول غير صحيحة");
      router.replace("/");
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى");
      } else {
        setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
      }
      setLoading(false);
    } finally {
      clearTimeout(timer);
    }
  }

  if (introDone === null) {
    return <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#082F35,#0B3B42 45%,#0E4A46)" }} />;
  }

  return (
    <>
      {!introDone && (
        <LampIntro onDone={() => setIntroDone(true)} />
      )}
      <div
        className="min-h-screen flex overflow-hidden relative"
        dir="rtl"
        style={{
          opacity: introDone ? 1 : 0,
          transform: introDone ? "translateY(0) scale(1)" : "translateY(26px) scale(.985)",
          transition: "opacity .75s ease .1s, transform .75s cubic-bezier(.22,1,.36,1) .1s",
          background: `radial-gradient(circle at 50% 8%, rgba(20,108,104,0.30), transparent 44%),
             linear-gradient(135deg, #082F35 0%, #0B3B42 45%, #0E4A46 100%)`,
        }}
      >
        {/* طبقات عميقة ناعمة */}
        <div className="absolute pointer-events-none" style={{ width: 620, height: 620, borderRadius: "50%", top: "-18%", insetInlineStart: "-12%", background: "radial-gradient(circle, rgba(20,108,104,0.5), transparent 66%)", filter: "blur(90px)" }} />
        <div className="absolute pointer-events-none" style={{ width: 540, height: 540, borderRadius: "50%", bottom: "-20%", insetInlineEnd: "-10%", background: "radial-gradient(circle, rgba(14,74,70,0.62), transparent 66%)", filter: "blur(95px)" }} />
        <div className="absolute pointer-events-none" style={{ width: 460, height: 460, borderRadius: "50%", top: "28%", insetInlineStart: "52%", background: "radial-gradient(circle, rgba(214,184,117,0.16), transparent 62%)", filter: "blur(85px)" }} />
        {/* نسيج خفيف */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.045,
            mixBlendMode: "overlay",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* اللوحة البصرية */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative z-10">
          <div className="max-w-xl anim-fade-up">
            <div className="flex items-center gap-3.5 mb-10">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{
                    background: "linear-gradient(135deg,#E4C98A,#D6B875 60%,#A8873F)",
                    boxShadow: "0 18px 45px -10px rgba(214,184,117,.45)",
                  }}>
                  <ShoppingBasket className="w-9 h-9 text-[#08323a]" strokeWidth={2.3} />
                </div>
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full border-2 border-[#082F35]" style={{ background: "#2BB39D" }} />
              </div>
              <div>
                <div className="text-4xl font-black tracking-tight" style={{ color: "#F7F1E5", fontFamily: "Cairo, system-ui, sans-serif" }}>
                  SOBIS<span style={{ color: "#D6B875" }}>.</span>
                </div>
                <div className="text-[10px] font-extrabold tracking-[0.3em] mt-1" style={{ color: "rgba(214,184,117,.75)" }}>
                  PREMIUM SUPERMARKET SYSTEM
                </div>
              </div>
            </div>

            <h1 className="text-4xl xl:text-[52px] font-black leading-[1.22] mb-6" style={{ color: "#F7F1E5", fontFamily: "Cairo, system-ui, sans-serif" }}>
              إدارة سوبر ماركت
              <br />
              <span style={{ background: "linear-gradient(90deg,#E4C98A,#D6B875)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>بمستوى فاخر</span>
              {" "}
              <span style={{ color: "#bfd2d2" }}>وذكاء حقيقي</span>
            </h1>
            <p className="text-lg leading-relaxed mb-4 max-w-md" style={{ color: "rgba(191,210,210,.85)" }}>
              نقطة بيع صاروخية، مخزون يفكّر معك، ديون منضبطة، وتقارير تصل بريدك — في نظام واحد أنيق.
            </p>
            <div className="flex flex-wrap gap-2 mb-10">
              {[
                [ShieldCheck, "أمان متقدم"],
                [Database, "نسخ احتياطي"],
                [Sparkles, "تنبيهات ذكية"],
              ].map(([Icon, label]) => {
                const I = Icon as React.ElementType;
                return (
                  <span key={label as string} className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold"
                    style={{ border: "1px solid rgba(214,184,117,.3)", background: "rgba(214,184,117,.07)", color: "#E4C98A" }}>
                    <I size={13} /> {label as string}
                  </span>
                );
              })}
            </div>

            {/* بطاقات عائلة */}
            <div className="relative h-40">
              <div className="absolute start-0 top-0 anim-float">
                <div className="flex items-center gap-3 rounded-2xl backdrop-blur-md px-5 py-3.5" style={{ background: "rgba(9,48,53,.55)", border: "1px solid rgba(214,184,117,.22)", boxShadow: "0 24px 60px -18px rgba(0,0,0,.5)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(214,184,117,.18)" }}>
                    <TrendingUp className="w-5 h-5" style={{ color: "#E4C98A" }} />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold" style={{ color: "rgba(191,210,210,.8)" }}>مبيعات اليوم</div>
                    <div className="font-extrabold text-lg tnum" style={{ color: "#F7F1E5" }}>8,540 شيكل</div>
                  </div>
                </div>
              </div>
              <div className="absolute start-60 top-14 anim-float [animation-delay:1.2s]">
                <div className="flex items-center gap-3 rounded-2xl backdrop-blur-md px-5 py-3.5" style={{ background: "rgba(9,48,53,.5)", border: "1px solid rgba(43,179,157,.25)", boxShadow: "0 24px 60px -18px rgba(0,0,0,.5)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(43,179,157,.18)" }}>
                    <ReceiptText className="w-5 h-5" style={{ color: "#5fd6c0" }} />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold" style={{ color: "rgba(191,210,210,.8)" }}>فاتورة جديدة</div>
                    <div className="font-extrabold text-sm tnum" style={{ color: "#F7F1E5" }}>INV-000218</div>
                  </div>
                </div>
              </div>
              <div className="absolute start-4 top-24 anim-float [animation-delay:2.1s]">
                <div className="flex items-center gap-3 rounded-2xl backdrop-blur-md px-5 py-3.5" style={{ background: "rgba(9,48,53,.5)", border: "1px solid rgba(214,184,117,.2)", boxShadow: "0 24px 60px -18px rgba(0,0,0,.5)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(228,201,138,.16)" }}>
                    <Server className="w-5 h-5" style={{ color: "#E4C98A" }} />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold" style={{ color: "rgba(191,210,210,.8)" }}>حالة النظام</div>
                    <div className="font-bold text-sm" style={{ color: "#5fd6c0" }}>سليم — قاعدة البيانات متصلة</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* بطاقة الدخول الزجاجية */}
        <div className="w-full lg:w-[560px] flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-md anim-pop">
            <div
              className="rounded-3xl p-8 sm:p-10"
              style={{
                background: "rgba(9,48,53,0.74)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: "1px solid rgba(214,184,117,0.18)",
                boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
              }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#E4C98A,#D6B875 60%,#A8873F)", boxShadow: "0 10px 28px -8px rgba(214,184,117,.5)" }}>
                  <ShoppingBasket className="w-6.5 h-6.5 w-[26px] h-[26px] text-[#08323a]" strokeWidth={2.3} />
                </div>
                <div>
                  <div className="text-2xl font-black" style={{ color: "#F7F1E5", fontFamily: "Cairo, system-ui, sans-serif" }}>
                    SOBIS<span style={{ color: "#D6B875" }}>.</span>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-black" style={{ color: "#F7F1E5", fontFamily: "Cairo, system-ui, sans-serif" }}>تسجيل الدخول</h2>
              <p className="text-sm mb-8" style={{ color: "rgba(191,210,210,.85)" }}>أدخل بياناتك للوصول إلى مركز القيادة</p>

              {error && (
                <div className="mb-5 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold anim-fade-in"
                  style={{ background: "rgba(225,29,72,.13)", border: "1px solid rgba(225,29,72,.35)", color: "#fda4af" }}>
                  <AlertCircle className="w-5 h-5 shrink-0" size={18} />
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(191,210,210,.9)" }}>اسم المستخدم</label>
                  <div className="relative">
                    <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(191,210,210,.5)" }} />
                    <input
                      className="lam-input w-full rounded-xl px-4 ps-10 py-3 text-sm outline-none transition-all"
                      placeholder="مثال: admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                      autoComplete="username"
                      dir="ltr"
                      style={{ textAlign: username ? "left" : "right" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "rgba(191,210,210,.9)" }}>كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(191,210,210,.5)" }} />
                    <input
                      className="lam-input w-full rounded-xl px-4 ps-10 pe-11 py-3 text-sm outline-none transition-all"
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      dir="ltr"
                      style={{ textAlign: "left" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute end-3.5 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "rgba(191,210,210,.55)" }}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#D6B875]"
                    />
                    <span className="text-sm font-semibold" style={{ color: "rgba(191,210,210,.9)" }}>تذكرني</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgot(!forgot)}
                    className="text-sm font-bold transition-colors"
                    style={{ color: "#E4C98A" }}
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                {forgot && (
                  <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs leading-relaxed anim-fade-in"
                    style={{ background: "rgba(43,179,157,.1)", border: "1px solid rgba(43,179,157,.28)", color: "#7ee8d7" }}>
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    تواصل مع مدير النظام لإعادة تعيين كلمة المرور من صفحة الموظفين، أو اطلب رابط استعادة عبر البريد بعد تفعيل تكامل البريد.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="lam-submit w-full mt-2 rounded-xl flex items-center justify-center gap-2 text-white font-black text-[15px] py-3.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg,#146C68,#0E4A46)",
                    boxShadow: "0 14px 34px -10px rgba(20,108,104,.55), 0 0 0 1px rgba(255,255,255,.06) inset",
                  }}
                >
                  {loading ? (
                    <>
                      <span className="block w-5 h-5 border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      دخول آمن إلى النظام
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 rounded-2xl p-4" style={{ background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}>
                <div className="text-[11px] font-extrabold mb-2.5" style={{ color: "rgba(191,210,210,.75)" }}>
                  حسابات تجريبية — كلمة المرور للجميع: <span className="tnum" style={{ color: "#E4C98A" }}>123456</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ["admin", "مدير النظام"],
                    ["manager", "مدير فرع"],
                    ["cashier", "كاشير"],
                    ["accountant", "محاسب"],
                  ].map(([u, l]) => (
                    <button
                      key={u}
                      onClick={() => { setUsername(u); setPassword("123456"); }}
                      className="text-[11px] font-bold rounded-lg px-2.5 py-1.5 transition-all"
                      style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", color: "rgba(191,210,210,.85)" }}
                    >
                      {l} <span className="tnum opacity-60" dir="ltr">{u}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-center text-xs mt-6 font-semibold" style={{ color: "rgba(191,210,210,.45)" }}>
              SOBIS Gold v2.1 © 2026 — محمي بالتشفير الكامل وقفل محاولات الاختراق
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .lam-input {
          background: rgba(255, 255, 255, .06);
          border: 1.5px solid rgba(255, 255, 255, .12);
          color: #f1f7f6;
          caret-color: #d6b875;
        }
        .lam-input::placeholder { color: rgba(191, 210, 210, .45); }
        .lam-input:focus {
          border-color: #d6b875;
          background: rgba(255, 255, 255, .075);
          box-shadow: 0 0 0 4px rgba(214, 184, 117, .14);
        }
        .lam-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px -12px rgba(20, 108, 104, .7),
                      0 0 24px -4px rgba(214, 184, 117, .35);
        }
        .lam-submit:active:not(:disabled) { transform: translateY(0); }
      `}</style>
    </>
  );
}
