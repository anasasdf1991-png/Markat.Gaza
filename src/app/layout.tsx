import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOBIS | نظام إدارة السوبر ماركت",
  description: "نظام احترافي متكامل لإدارة السوبر ماركت: نقطة بيع، مخزون، فواتير، ديون، تقارير وتحليلات.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
