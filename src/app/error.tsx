"use client";

import { AlertOctagon, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6" dir="rtl">
      <div className="text-center max-w-md anim-pop">
        <div className="w-18 h-18 w-[72px] h-[72px] mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-5">
          <AlertOctagon size={34} />
        </div>
        <h1 className="text-2xl font-black font-display text-slate-900 mb-2">حدث خلل غير متوقع</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          واجه القسم الحالي مشكلة، لكن باقي النظام يعمل. جرّب إعادة التحميل أو العودة للرئيسية.
          سُجّل الخلل في سجل النظام تلقائيًا.
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={reset}
            className="flex items-center gap-2 rounded-xl bg-[#0a0f1c] text-white px-5 py-2.5 text-sm font-extrabold hover:bg-[#16203a] transition-colors">
            <RefreshCw size={15} /> إعادة المحاولة
          </button>
          <Link href="/"
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-extrabold text-slate-600 hover:border-emerald-400 transition-colors">
            <Home size={15} /> الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
