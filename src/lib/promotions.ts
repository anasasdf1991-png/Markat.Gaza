/**
 * محرك العروض — منطق مشترك بين الواجهة (معاينة POS) والخادم (تطبيق الفاتورة النهائي)
 * حتى لا تنشأ أي فروقات حسابية بين ما يراه الكاشير وما يُحفظ فعليًا.
 */

export type PromotionRule = {
  id: number;
  name: string;
  type: "percent" | "fixed" | "bundle" | "bogo";
  value: number;      // percent: نسبة % | fixed: مبلغ للوحدة | bundle: سعر المجموعة | bogo: عدد الوحدات المجانية
  buyQty: number;     // bundle/bogo: الكمية المطلوبة للتفعيل
  scope: "product" | "category" | "all";
  targetId: number | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
};

export type PromoLine = {
  productId: number;
  categoryId: number | null;
  qty: number;
  price: number; // سعر الوحدة قبل العرض
};

export function isPromoActiveNow(p: PromotionRule, now = new Date()): boolean {
  if (!p.active) return false;
  const today = new Date(now.toDateString());
  if (p.startDate && new Date(p.startDate) > today) return false;
  if (p.endDate && new Date(p.endDate) < today) return false;
  return true;
}

function matches(rule: PromotionRule, line: PromoLine): boolean {
  if (rule.scope === "all") return true;
  if (rule.scope === "product") return rule.targetId === line.productId;
  if (rule.scope === "category") return line.categoryId !== null && rule.targetId === line.categoryId;
  return false;
}

/** يعيد مبلغ الخصم بالإجمال لهذا السطر بسبب العرض */
export function promoDiscount(rule: PromotionRule, line: PromoLine): number {
  if (!matches(rule, line) || !isPromoActiveNow(rule)) return 0;
  const lineTotal = line.price * line.qty;
  switch (rule.type) {
    case "percent":
      return (lineTotal * rule.value) / 100;
    case "fixed":
      return Math.min(lineTotal, rule.value * line.qty);
    case "bundle": {
      // X وحدات بسعر Y (مثل: 3 بـ 10 شيكل)
      if (rule.buyQty <= 0) return 0;
      const sets = Math.floor(line.qty / rule.buyQty);
      if (sets <= 0) return 0;
      return Math.max(0, sets * rule.buyQty * line.price - sets * rule.value);
    }
    case "bogo": {
      // اشتري N واحصل على M مجانًا (نفس المنتج)
      const trigger = rule.buyQty + (rule.value || 1);
      if (rule.buyQty <= 0) return 0;
      const freeUnits = Math.floor(line.qty / trigger) * (rule.value || 1);
      return freeUnits * line.price;
    }
    default:
      return 0;
  }
}

/** أفضل خصم عرض واحد لهذا السطر */
export function bestPromoForLine(promos: PromotionRule[], line: PromoLine): { discount: number; promo: PromotionRule | null } {
  let best = 0;
  let winner: PromotionRule | null = null;
  for (const p of promos) {
    const d = promoDiscount(p, line);
    if (d > best) { best = d; winner = p; }
  }
  return { discount: Math.round(best * 100) / 100, promo: winner };
}

/** عرض نصي مختصر للعرض على بطاقة المنتج */
export function promoLabel(p: PromotionRule): string {
  switch (p.type) {
    case "percent": return `خصم ${p.value}%`;
    case "fixed": return `خصم ${p.value}`;
    case "bundle": return `${p.buyQty} بـ ${p.value}`;
    case "bogo": return `اشترِ ${p.buyQty} واحصل على ${p.value || 1} مجانًا`;
    default: return p.name;
  }
}
