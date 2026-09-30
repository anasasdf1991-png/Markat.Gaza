"use client";

import { useEffect, useState } from "react";
import { fmtNum } from "@/lib/format";

type Point = { label: string; value: number };

// ─────────────────────────────────────────────
// مخطط مساحي (Area) مع تدرج وحركة رسم
// ─────────────────────────────────────────────
export function AreaChart({ data, height = 240, color = "#10b981", id }: {
  data: Point[]; height?: number; color?: string; id: string;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, []);

  const W = 720, H = 260, padX = 10, padTop = 18, padBottom = 34;
  const max = Math.max(...data.map((d) => d.value), 1);
  const cw = (W - padX * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => ({
    x: padX + i * cw,
    y: padTop + (1 - d.value / max) * (H - padTop - padBottom),
    ...d,
  }));
  // منحنى سلس
  let path = `M ${pts[0]?.x ?? 0},${pts[0]?.y ?? 0}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cx = (p0.x + p1.x) / 2;
    path += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
  }
  const area = `${path} L ${pts[pts.length - 1]?.x ?? 0},${H - padBottom} L ${pts[0]?.x ?? 0},${H - padBottom} Z`;

  return (
    <div dir="ltr" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padX} x2={W - padX} y1={padTop + (1 - f) * (H - padTop - padBottom)} y2={padTop + (1 - f) * (H - padTop - padBottom)}
            stroke="#eef2f7" strokeWidth="1" strokeDasharray="4 5" />
        ))}
        <path d={area} fill={`url(#${id}-fill)`} opacity={on ? 1 : 0} style={{ transition: "opacity .9s ease .4s" }} />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray="1000" strokeDashoffset={on ? 0 : 1000}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)" }} />
        <g style={{ opacity: on ? 1 : 0, transition: "opacity .5s ease 1s" }}>
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="10" fill="transparent">
                <title>{`${p.label}: ${fmtNum(p.value)}`}</title>
              </circle>
              {(i === 0 || i === pts.length - 1 || p.value === max) && (
                <g>
                  <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={color} strokeWidth="3" />
                </g>
              )}
            </g>
          ))}
        </g>
        <g style={{ opacity: on ? 1 : 0, transition: "opacity .5s ease .8s" }}>
          {pts.map((p, i) => (
            (i % Math.ceil(pts.length / 7) === 0 || i === pts.length - 1) && (
              <text key={i} x={p.x} y={H - 12} textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="700">
                {p.label}
              </text>
            )
          ))}
        </g>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// مخطط أعمدة
// ─────────────────────────────────────────────
export function BarChart({ data, height = 240, colors = ["#10b981", "#0d9488"] }: {
  data: Point[]; height?: number; colors?: [string, string];
}) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 80); return () => clearTimeout(t); }, []);
  const W = 720, H = 260, padX = 8, padTop = 14, padBottom = 34;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = (W - padX * 2) / data.length;
  const bw = Math.min(slot * 0.52, 44);

  return (
    <div dir="ltr" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={padX} x2={W - padX} y1={padTop + (1 - f) * (H - padTop - padBottom)} y2={padTop + (1 - f) * (H - padTop - padBottom)}
            stroke="#eef2f7" strokeWidth="1" strokeDasharray="4 5" />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - padTop - padBottom);
          const x = padX + i * slot + (slot - bw) / 2;
          const y = padTop + (H - padTop - padBottom) - h;
          return (
            <g key={i} style={{ transformOrigin: `${x + bw / 2}px ${H - padBottom}px`, transform: on ? "scaleY(1)" : "scaleY(0)", transition: `transform .7s cubic-bezier(.34,1.4,.64,1) ${i * 60}ms` }}>
              <rect x={x} y={y} width={bw} height={Math.max(h, 3)} rx="7" fill="url(#bar-grad)">
                <title>{`${d.label}: ${fmtNum(d.value)}`}</title>
              </rect>
              {d.value === max && (
                <text x={x + bw / 2} y={y - 7} textAnchor="middle" fontSize="11" fontWeight="800" fill={colors[1]}>
                  {fmtNum(d.value)}
                </text>
              )}
            </g>
          );
        })}
        {data.map((d, i) => (
          (i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) && (
            <text key={i} x={padX + i * slot + slot / 2} y={H - 12} textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="700">
              {d.label}
            </text>
          )
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// مخطط دائري (Donut)
// ─────────────────────────────────────────────
export const DONUT_COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#f43f5e", "#14b8a6", "#64748b", "#fb923c"];

export function DonutChart({ data, size = 200, centerLabel }: {
  data: { label: string; value: number }[]; size?: number; centerLabel?: string;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, []);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 42, C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div style={{ width: size, height: size }} className="relative shrink-0 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = `${frac * C} ${C - frac * C}`;
            const offset = C * (1 - acc);
            acc += frac;
            return (
              <circle key={i} cx="50" cy="50" r={R} fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="12"
                strokeDasharray={dash} strokeDashoffset={offset}
                strokeLinecap="butt"
                style={{ opacity: on ? 1 : 0, transition: `opacity .6s ease ${i * 0.15}s` }}
              >
                <title>{`${d.label}: ${fmtNum(d.value)}`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" dir="rtl">
          <div className="text-xl font-black text-slate-900 tnum">{fmtNum(total)}</div>
          {centerLabel && <div className="text-[11px] font-bold text-slate-400">{centerLabel}</div>}
        </div>
      </div>
      <div className="flex-1 min-w-[140px] space-y-2" dir="rtl">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="font-bold text-slate-600 flex-1 truncate">{d.label}</span>
            <span className="tnum font-extrabold text-slate-800">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// أشرطة أفقية (للأكثر مبيعًا)
// ─────────────────────────────────────────────
export function HBars({ data, color = "#10b981" }: { data: Point[]; color?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 80); return () => clearTimeout(t); }, []);
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3.5">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-slate-700 truncate max-w-[65%]">{d.label}</span>
            <span className="tnum font-extrabold text-slate-900">{fmtNum(d.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: on ? `${(d.value / max) * 100}%` : "0%",
                background: `linear-gradient(to left, ${color}, ${color}cc)`,
                transition: `width .9s cubic-bezier(.4,0,.2,1) ${i * 90}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
