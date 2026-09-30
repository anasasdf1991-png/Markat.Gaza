import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // ضغط استجابات أفضل للإنتاج (Next يدعمه افتراضيًا)
  compress: true,
  async headers() {
    return [
      {
        // ملفات static مُجزّأة بالهاش — كاش عدواني آمن لسرعة التحميل
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          ...securityHeaders.map((h) => (h.key === "X-XSS-Protection" ? { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'" } : h)),
        ],
      },
      {
        // API وصفحات — لا تخزين للمحتوى المتغير
        source: "/:path*",
        headers: [...securityHeaders, { key: "Cache-Control", value: "private, no-cache, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
