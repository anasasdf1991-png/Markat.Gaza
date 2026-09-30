"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Volume2, VolumeX } from "lucide-react";

const THRESHOLD = 118;

/**
 * LampIntro — شاشة دخول سينمائية بمصباح وحبل قابل للسحب بالفعل.
 * نفس منطق السحب والفيزياء والانتقال — ترقية بصرية فقط:
 * Deep Petrol Blue + Dark Emerald + Champagne Gold
 */
export default function LampIntro({ onDone }: { onDone: () => void }) {
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [lit, setLit] = useState(false);
  const [flicker, setFlicker] = useState(false);
  const [logoIn, setLogoIn] = useState(false);
  const [stage, setStage] = useState<"idle" | "lit" | "exit" | "gone">("idle");
  const [sound, setSound] = useState(true);
  const [reduced, setReduced] = useState<boolean | null>(null);

  const pullRef = useRef(0);
  const startY = useRef(0);
  const startPull = useRef(0);
  const draggingRef = useRef(false);
  const rafRef = useRef(0);
  const timers = useRef<number[]>([]);

  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => { timers.current.forEach(clearTimeout); cancelAnimationFrame(rafRef.current); }, []);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rm) later(500, () => { sessionStorage.setItem("sobis_intro", "1"); setStage("gone"); onDone(); });
    setReduced(rm);
  }, [onDone]);

  const setPullBoth = (v: number) => { pullRef.current = v; setPull(v); };

  const animatePull = useCallback((target: number, ms: number, done?: () => void, back = true) => {
    cancelAnimationFrame(rafRef.current);
    const from = pullRef.current;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      let e: number;
      if (back) {
        const x = p - 1;
        e = 1 + 2.2 * x * x * x + 1.2 * x * x;
      } else {
        e = 1 - Math.pow(1 - p, 2);
      }
      setPullBoth(from + (target - from) * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else { setPullBoth(target); done?.(); }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const playTick = useCallback(() => {
    if (!sound) return;
    try {
      const Ctx = window.AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(1250, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);
      osc.start(); osc.stop(ctx.currentTime + 0.075);
    } catch { /* صامت */ }
  }, [sound]);

  const ignite = useCallback(() => {
    setDragging(false);
    draggingRef.current = false;
    animatePull(THRESHOLD + 22, 150, () => { animatePull(12, 220, undefined, false); }, false);
    playTick();
    later(210, () => setFlicker(true));
    later(330, () => setFlicker(false));
    later(450, () => setFlicker(true));
    later(580, () => {
      setFlicker(false);
      setLit(true);
      setStage("lit");
      sessionStorage.setItem("sobis_intro", "1");
    });
    later(1150, () => setLogoIn(true));
    later(2500, () => { setStage("exit"); onDone(); });
    later(3350, () => setStage("gone"));
  }, [animatePull, playTick, onDone]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (stage !== "idle" || reduced) return;
    cancelAnimationFrame(rafRef.current);
    draggingRef.current = true;
    setDragging(true);
    startY.current = e.clientY;
    startPull.current = pullRef.current;
    (zoneElRef.current ?? (e.target as HTMLElement)).setPointerCapture?.(e.pointerId);
  };
  const zoneElRef = useRef<HTMLDivElement>(null);
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || stage !== "idle") return;
    const dy = e.clientY - startY.current;
    setPullBoth(Math.max(0, Math.min(168, startPull.current + dy)));
  };
  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (pullRef.current >= THRESHOLD) ignite();
    else animatePull(0, 560);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (stage !== "idle" || reduced) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      animatePull(THRESHOLD + 4, 260, ignite, false);
    }
  };

  if (stage === "gone") return null;
  if (reduced) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center transition-opacity duration-500"
        style={{ background: "linear-gradient(135deg,#082F35,#0B3B42 45%,#0E4A46)" }}>
        <span className="text-2xl font-black" style={{ color: "#F7F1E5", fontFamily: "Cairo, system-ui, sans-serif" }}>SOBIS<span style={{ color: "#D6B875" }}>.</span></span>
      </div>
    );
  }

  const bulbOn = lit || flicker;
  const lampTilt = dragging ? pull * 0.05 : 0;
  const handleY = 150 + pull * 0.85;

  return (
    <div
      className={`fixed inset-0 z-[300] overflow-hidden select-none ${stage === "exit" ? "-translate-y-full opacity-0" : ""}`}
      dir="rtl"
      style={{
        background: lit
          ? `radial-gradient(circle at 50% 8%, rgba(20,108,104,0.38), transparent 46%),
             radial-gradient(circle at 50% 4%, rgba(255,230,167,0.14), transparent 30%),
             linear-gradient(135deg, #082F35 0%, #0B3B42 45%, #0E4A46 100%)`
          : `radial-gradient(circle at 50% 10%, rgba(20,108,104,0.28), transparent 42%),
             linear-gradient(135deg, #082F35 0%, #0B3B42 45%, #0E4A46 100%)`,
        transition: "background 1.2s ease, transform .8s cubic-bezier(.7,0,.3,1), opacity .8s ease",
      }}
    >
      {/* أوبرات باهتة: Teal / Emerald / Gold Ambient */}
      <div className="absolute pointer-events-none" style={{ width: 560, height: 560, borderRadius: "50%", top: "-16%", insetInlineStart: "-10%", background: "radial-gradient(circle, rgba(20,108,104,0.55), transparent 65%)", filter: "blur(90px)", opacity: .7 }} />
      <div className="absolute pointer-events-none" style={{ width: 480, height: 480, borderRadius: "50%", bottom: "-18%", insetInlineEnd: "-8%", background: "radial-gradient(circle, rgba(14,74,70,0.65), transparent 65%)", filter: "blur(90px)", opacity: .8 }} />
      <div className="absolute pointer-events-none" style={{ width: 420, height: 420, borderRadius: "50%", top: "30%", insetInlineStart: "56%", background: "radial-gradient(circle, rgba(214,184,117,0.18), transparent 62%)", filter: "blur(80px)" }} />

      {/* نسيج خفيف (Noise) لعمق فاخر */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.05,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* توهج دائري خلف المصباح: 0.20 قبل الإشعال → 0.42 بعده */}
      <div
        className="absolute pointer-events-none left-1/2 top-2"
        style={{
          width: 340, height: 340, transform: "translateX(-50%)",
          borderRadius: "50%",
          background: lit ? "rgba(255,230,167,0.42)" : "rgba(255,230,167,0.20)",
          filter: "blur(70px)",
          transition: "background 1.4s ease, opacity 1.4s ease",
        }}
      />

      {/* مخروط الإضاءة الشامبين — حدود ناعمة تذوب في الخلفية */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 104, left: "50%",
          width: "min(82vw, 660px)", height: "min(82vh, 600px)",
          transform: "translateX(-50%)",
          clipPath: "polygon(44.5% 0, 55.5% 0, 100% 100%, 0% 100%)",
          background: "linear-gradient(to bottom, rgba(255,230,167,.40), rgba(255,230,167,.12) 52%, rgba(255,230,167,0) 92%)",
          filter: "blur(30px)",
          opacity: lit ? 1 : 0,
          transition: "opacity 1.7s ease .1s",
        }}
      />

      {/* تخطي + كتم الصوت */}
      <div className="absolute top-4 start-4 flex items-center gap-2 z-30">
        <button
          onClick={() => { sessionStorage.setItem("sobis_intro", "1"); onDone(); setStage("gone"); }}
          className="rounded-full border border-[#D6B875]/25 bg-[#08707]/[0.1] bg-white/[0.05] backdrop-blur px-4 py-1.5 text-[11.5px] font-extrabold transition-all cursor-pointer"
          style={{ color: "#c9d3d4" }}
        >
          تخطي · Skip
        </button>
        <button
          onClick={() => setSound((s) => !s)}
          aria-label={sound ? "كتم الصوت" : "تشغيل الصوت"}
          className="w-8 h-8 rounded-full border border-[#D6B875]/25 bg-white/[0.05] backdrop-blur flex items-center justify-center transition-all cursor-pointer"
          style={{ color: "#c9d3d4" }}
        >
          {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
      </div>

      {/* منطقة المصباح والحبل */}
      <div
        role="button"
        tabIndex={0}
        aria-label="اسحب الحبل للدخول— أو اضغط Enter"
        onKeyDown={onKeyDown}
        ref={zoneElRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="absolute inset-x-0 top-0 mx-auto w-full max-w-[560px] h-[470px] outline-none z-20"
        style={{ touchAction: "none", cursor: dragging ? "grabbing" : "default" }}
      >
        <div className={stage === "idle" && !dragging ? "lamp-sway" : ""} style={{ transformOrigin: "50% 0%" }}>
          <svg viewBox="0 0 400 470" className="w-full h-[460px]">
            <defs>
              {/* معدن داكن ممصقح */}
              <linearGradient id="shadeMetal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d4653" />
                <stop offset="50%" stopColor="#232a36" />
                <stop offset="100%" stopColor="#161b24" />
              </linearGradient>
              {/* نحاس عتيق خفيف للحواف */}
              <linearGradient id="brassRim" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8f7c4c" />
                <stop offset="50%" stopColor="#D6B875" />
                <stop offset="100%" stopColor="#8f7c4c" />
              </linearGradient>
              {/* لون اللمبة الشامبين الدافئ */}
              <radialGradient id="bulbWarm" cx="50%" cy="42%" r="62%">
                <stop offset="0%" stopColor="#FFF7E0" />
                <stop offset="55%" stopColor="#FFE6A7" />
                <stop offset="100%" stopColor="#E4C98A" />
              </radialGradient>
              {/* هالة الإشعال */}
              <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,230,167,.95)" />
                <stop offset="100%" stopColor="rgba(255,230,167,0)" />
              </radialGradient>
              {/* الحبل — شامبين دافئ ناعم مع ظل خفيف */}
              <linearGradient id="cordGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D8C79E" />
                <stop offset="100%" stopColor="#C7B58B" />
              </linearGradient>
            </defs>

            {/* حامل السقف بلمسة نحاسية خفيفة */}
            <rect x="196" y="4" width="8" height="22" rx="2" fill="#232a36" />
            <path d="M182 40 Q200 26 218 40 L214 52 L186 52 Z" fill="#232a36" />
            <rect x="184" y="49" width="32" height="3" rx="1.5" fill="#D6B875" opacity=".55" />

            {/* قبة المصباح: معدن داكن + حافة نحاسية خفيفة جدًا */}
            <g transform={`rotate(${lampTilt} 200 12)`}>
              <path
                d="M162 96 C162 60 178 44 200 44 C222 44 238 60 238 96 L229 106 C210 114 190 114 171 106 Z"
                fill="url(#shadeMetal)" stroke="#0c1118" strokeWidth="1.5"
              />
              {/* حافة سفلية نحاسية عتيق */}
              <path d="M171 105 C190 113 210 113 229 105 C222 116 178 116 171 105Z" fill="none" stroke="url(#brassRim)" strokeWidth="2" opacity=".9" />
              {/* لمعة معدنية دقيقة */}
              <path d="M181 62 C186 53 193 49 201 49 C188 52 183 60 178 70 Z" fill="rgba(255,255,255,.08)" />
              {/* توهج داخلي */}
              <circle cx="200" cy="98" r="30" fill="url(#glowGrad)" opacity={bulbOn ? .95 : 0} style={{ transition: "opacity .18s ease" }} />
              {/* اللمبة */}
              <circle
                cx="200" cy="98" r="12.5"
                fill={bulbOn ? "url(#bulbWarm)" : "#303845"}
                stroke={bulbOn ? "#FFE6A7" : "#4d5866"} strokeWidth="1.5"
                style={{
                  transition: "fill .18s ease, stroke .18s ease",
                  filter: bulbOn ? "drop-shadow(0 0 14px rgba(255,230,167,.9)) drop-shadow(0 0 48px rgba(228,201,138,.5))" : "none",
                }}
              />
            </g>

            {/* الحبل شامبين بظل خفيف فوق الخلفية */}
            {stage !== "lit" && (
              <g style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.35))" }}>
                <line x1="214" y1="52" x2="214" y2={handleY} stroke="url(#cordGrad)" strokeWidth="3.4" strokeLinecap="round" />
                {/* منطقة لمس سخية */}
                <rect x="180" y={handleY - 26} width="68" height="58" fill="transparent" style={{ cursor: dragging ? "grabbing" : "grab" }} />
                {/* المقبض: معدن داكن بلمسة شامبين */}
                <g style={{ cursor: dragging ? "grabbing" : "grab" }}>
                  <rect x="206" y={handleY - 8} width="16" height="30" rx="7" fill="#20262f" stroke="#3a4453" strokeWidth="1.4" />
                  <rect x="209" y="3" width="10" height="0" opacity="0" />
                  <circle cx="214" cy={handleY - 11} r="6.4" fill="#262e3a" stroke="#D6B875" strokeWidth="1.3" opacity="1" />
                  <circle cx="214" cy={handleY - 11} r="2.2" fill="#D6B875" />
                </g>
              </g>
            )}
          </svg>
        </div>

        {/* تلميح السحب — ivory باهت يضيء مع التفاعل */}
        <div
          className={`absolute inset-x-0 -bottom-1 flex flex-col items-center gap-1.5 transition-all duration-500 ${stage === "idle" ? "opacity-100" : "opacity-0"}`}
          style={{ color: dragging ? "#F7F1E5" : "rgba(230,222,208,0.8)" }}
        >
          <div className="text-sm font-extrabold tracking-wide text-center">
            اسحب الحبل للدخول
            <span className="block text-[11px] font-bold mt-0.5" dir="ltr" style={{ color: "rgba(199,181,139,.75)" }}>Pull the cord to enter</span>
          </div>
          <div className={dragging ? "opacity-0 transition-opacity" : "hint-bob"}>
            <ChevronDown size={22} style={{ color: "#D6B875" }} />
          </div>
        </div>
      </div>

      {/* شعار SOBIS بعد الإشعال — عاجي مع لمسة شامبين */}
      <div
        className="absolute inset-x-0 top-[46%] z-10 flex flex-col items-center text-center px-6"
        style={{
          opacity: logoIn ? 1 : 0,
          transform: logoIn ? "translateY(0)" : "translateY(30px)",
          transition: "opacity .9s ease, transform .9s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <div className="text-6xl sm:text-7xl font-black tracking-tight" style={{ color: "#F7F1E5", fontFamily: "Cairo, system-ui, sans-serif" }}>
          SOBIS<span style={{ color: "#D6B875" }}>.</span>
        </div>
        <div className="text-sm sm:text-base font-bold mt-3 tracking-[0.22em]" style={{ color: "#C7B58B" }}>
          SUPERMARKET MANAGEMENT SYSTEM
        </div>
        <div className="w-16 h-px mt-6" style={{ background: "linear-gradient(to left, transparent, rgba(214,184,117,.65), transparent)" }} />
        <div className="mt-4 flex items-center gap-1.5 text-[11px] font-extrabold" style={{ color: "rgba(214,184,117,.75)" }}>
          <ChevronUp size={13} />
          جارٍ فتح صفحة الدخول...
        </div>
      </div>

      <style jsx>{`
        .lamp-sway { animation: lampSway 3.8s ease-in-out infinite; }
        .hint-bob { animation: hintBob 1.6s ease-in-out infinite; }
        @keyframes lampSway {
          0%, 100% { transform: rotate(1.1deg); }
          50% { transform: rotate(-1.1deg); }
        }
        @keyframes hintBob {
          0%, 100% { transform: translateY(0); opacity: .65; }
          50% { transform: translateY(8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
