import Link from "next/link";
import { Compass, ShoppingBasket } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#05080f] flex items-center justify-center p-6" dir="rtl">
      <div className="text-center anim-pop">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center mb-6">
          <ShoppingBasket size={30} className="text-[#0a0f1c]" />
        </div>
        <div className="text-7xl font-black font-display text-amber-400/90 mb-2">404</div>
        <h1 className="text-xl font-black text-white font-display mb-2">الصفحة غير موجودة</h1>
        <p className="text-sm text-slate-400 mb-7">المسار الذي طلبته خارج خريطة SOBIS</p>
        <Link href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-amber-400 to-amber-500 text-[#0a0f1c] font-extrabold text-sm px-5 py-2.5">
          <Compass size={15} /> العودة للوحة التحكم
        </Link>
      </div>
    </div>
  );
}
