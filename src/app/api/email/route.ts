import nodemailer from "nodemailer";
import { getSettings, audit, getClientIp, buildReport } from "@/lib/system";
import { ok, fail, requireUser } from "@/lib/http";

/**
 * POST /api/email — { action: 'test', to? } | { action: 'report', kind: 'daily'|'weekly'|'monthly' }
 * تكامل Gmail آمن: SMTP عبر App Password (يُستحسن) أو متغيرات البيئة.
 */
async function makeTransporter() {
  const s = await getSettings();
  const user = s.email_user || process.env.EMAIL_USER || "";
  const pass = s.email_pass && s.email_pass !== "********" ? s.email_pass : process.env.EMAIL_APP_PASS || "";
  if (!user || !pass) return null;
  const port = Number(s.email_smtp_port) || 465;
  return nodemailer.createTransport({
    host: s.email_smtp_host || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function reportHtml(r: Awaited<ReturnType<typeof buildReport>>): string {
  const row = (l: string, v: string, c = "#0f172a") =>
    `<tr><td style="padding:10px 14px;color:#64748b;font-weight:700;border-bottom:1px solid #f1f5f9">${l}</td><td style="padding:10px 14px;text-align:left;font-weight:900;color:${c};border-bottom:1px solid #f1f5f9">${v}</td></tr>`;
  return `
  <div dir="rtl" style="font-family:Tahoma,Arial;background:#0a0f1c;padding:24px;border-radius:18px">
    <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#0a0f1c,#123524);padding:22px;text-align:center">
        <div style="font-size:26px;font-weight:900;color:#fff">SOBIS<span style="color:#d4af37">.</span></div>
        <div style="color:#94a3b8;font-size:13px;margin-top:4px">${r.label} — ${r.store}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row("إجمالي المبيعات", `${r.sales.toLocaleString()} ${r.currency}`)}
        ${row("صافي الربح", `${r.net.toLocaleString()} ${r.currency}`, "#059669")}
        ${row("المصروفات", `${r.expenses.toLocaleString()} ${r.currency}`, "#e11d48")}
        ${row("عدد الفواتير", `${r.invoicesCount}`)}
        ${row("الديون القائمة", `${r.debt.toLocaleString()} ${r.currency}`, "#d97706")}
        ${row("منتجات منخفضة المخزون", `${r.lowStock}`)}
      </table>
      <div style="padding:14px;text-align:center;color:#94a3b8;font-size:11px">أُرسل تلقائيًا من نظام SOBIS لإدارة السوبر ماركت</div>
    </div>
  </div>`;
}

export async function POST(req: Request) {
  const guard = await requireUser("manage_employees");
  if ("res" in guard) return guard.res;
  const body = await req.json().catch(() => ({}));
  const transport = await makeTransporter();
  if (!transport) return fail("البريد غير مُهيأ — أدخل الإيميل وكلمة مرور التطبيقات (App Password) في الإعدادات", 400);
  const s = await getSettings();
  const from = s.email_from || s.email_user || process.env.EMAIL_USER || "";

  try {
    if (body.action === "test") {
      const to = String(body.to || s.email_user || "");
      if (!to) return fail("حدد بريد المستلم");
      await transport.sendMail({
        from, to,
        subject: "SOBIS — اختبار تكامل البريد ✓",
        html: `<div dir="rtl" style="font-family:Tahoma"><h2>تكامل البريد يعمل بنجاح!</h2><p>تم تهيئة بريد النظام بنجاح. ستصلك التقارير والتنبيهات هنا.</p><p style="color:#64748b;font-size:12px">SOBIS v2.1</p></div>`,
      });
      await audit({ user: guard.user, action: "email_test", entity: "settings", ip: getClientIp(req), meta: { to } });
      return ok({ ok: true, message: `تم إرسال بريد تجريبي إلى ${to}` });
    }

    if (body.action === "report") {
      const kind: "daily" | "weekly" | "monthly" = ["daily", "weekly", "monthly"].includes(body.kind) ? body.kind : "daily";
      const to = String(body.to || s.report_email || s.email_user || "");
      if (!to) return fail("حدد بريد التقارير في الإعدادات");
      const report = await buildReport(kind);
      await transport.sendMail({
        from, to,
        subject: `SOBIS • ${report.label} — ${report.store}`,
        html: reportHtml(report),
      });
      await audit({ user: guard.user, action: "email_report", entity: "settings", ip: getClientIp(req), meta: { kind, to } });
      return ok({ ok: true, message: `أُرسل ${report.label} إلى ${to}`, report });
    }

    return fail("إجراء غير معروف");
  } catch (e) {
    const msg = String(e);
    if (msg.includes("535") || msg.includes("BadCredentials")) {
      return fail("فشل التحقق — تأكد من استخدام كلمة مرور التطبيقات (App Password) وليس كلمة مرور Gmail العادية، وأن التحقق بخطوتين مفعّل", 400);
    }
    return fail(`فشل الإرسال: ${msg.slice(0, 200)}`, 500);
  }
}
