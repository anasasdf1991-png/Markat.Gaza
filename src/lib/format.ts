/** أدوات تنسيق الأرقام والعملات والتواريخ */

/** عملة النظام — تُضبط من إعدادات قاعدة البيانات عند تحميل الواجهة */
let CURRENCY = "شيكل";
let DECIMALS = 2;
let numFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function setCurrencyLabel(label: string, decimals?: number) {
  if (label) CURRENCY = label;
  const d = Number(decimals);
  if (Number.isFinite(d) && d >= 0 && d <= 3) {
    DECIMALS = d;
    numFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: d });
  }
}
export function getCurrencyLabel() { return CURRENCY; }
export function getCurrencyDecimals() { return DECIMALS; }

/** بيانات المتجر للإيصالات (تُضبط من الإعدادات عند التحميل) */
export type StoreInfo = { name: string; brand: string; phone: string; address: string; footer: string };
let STORE: StoreInfo = {
  name: "سوبر ماركت SOBIS", brand: "SOBIS", phone: "01001234567",
  address: "التجمع الخامس", footer: "شكرًا لتسوقكم معنا — نتشرف بزيارتكم مجددًا!",
};
export function setStoreInfo(info: Partial<StoreInfo>) { STORE = { ...STORE, ...info }; }
export function getStoreInfo() { return STORE; }

export const fmtNum = (n: number | string | null | undefined): string =>
  numFmt.format(Number(n ?? 0) || 0);

export const fmtMoney = (n: number | string | null | undefined): string =>
  `${numFmt.format(Number(n ?? 0) || 0)} ${CURRENCY}`;

const monthsAr = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.getDate()} ${monthsAr[date.getMonth()]} ${date.getFullYear()}`;
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  let h = date.getHours();
  const suffix = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${fmtDate(date)} • ${h}:${m} ${suffix}`;
}

export function fmtTime(d: Date | string): string {
  const date = new Date(d);
  let h = date.getHours();
  const suffix = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  return `${h}:${String(date.getMinutes()).padStart(2, "0")} ${suffix}`;
}

export const monthName = (monthIdx: number) => monthsAr[monthIdx];
export const dayName = (dayIdx: number) => daysAr[dayIdx];

export const invoiceNo = (id: number) => `INV-${String(id).padStart(6, "0")}`;
export const customerNo = (id: number) => `CUS-${String(id).padStart(4, "0")}`;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
}

export const PAYMENT_METHODS: Record<string, string> = {
  cash: "نقدي",
  card: "بطاقة",
  bank: "تحويل بنكي",
  mixed: "دفع مختلط",
  credit: "آجل / دين",
};

export const UNITS = [
  "قطعة", "كرتونة", "كيلو", "غرام", "لتر", "مل", "علبة", "صندوق", "باكيت",
];

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
