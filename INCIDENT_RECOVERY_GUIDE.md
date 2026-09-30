# دليل التعامل مع الحوادث والاستعادة — SOBIS Premium

> استخدم هذا الدليل عند تعطل النظام أو بطئه أو العودة بعد انقطاع.
> المبدأ الذهبي: **افحص أولاً، ثم استعد — لا استعداء قبل التأكد.**

---

## 1) تشخيص سريع (30 ثانية)

### أ) فحص الصحة
```bash
curl -s http://localhost:3000/api/health | jq .
```
| الحقل | طبيعي | ماذا يعني إن كان غير طبيعي |
|---|---|---|
| `status` | `healthy` | `degraded` → قاعدة البيانات منفصلة |
| `dbLatencyMs` | < 80ms | بطء الاستعلامات / تعطل |
| `respMs` | < 400ms | الخادم مثقل / لوحة جافاسكربت ضخمة |
| `monitors.failedBackups` | 0 | فشل آخر عملية نسخ — افحص السجل و `pg_dump` |
| `monitors.failedLogins24h` | قليل | محاولات اختراق — راجع Audit + نطاق معارضة |

### ب) حالة العملية
- PM2: `pm2 status`
- اتاسبكي: `ps aux | grep next`

### ج) قاعدة البيانات
```bash
psql "postgresql://postgres:postgres@127.0.0.1:5432/app_db" -c "SELECT now();"
```

---

## 2) الأعطال الشائعة والحلول

| المشكلة | السبب الأغلب | الحل السريع |
|---|---|---|
| `degraded` في health | DB خارج الخدمة | `systemctl restart postgresql` ثم تحقق health مرة أخرى (Pool يعيد الاتصال تلقائيًا) |
| AFC خطأ 500 | عملية متعطّلة | `pm2 restart sobis-supermarket` ( Graceful restart ) |
| بطء مفاجئ | منفذ الطبقات ضغط | `pm2 monit` + `pg_stat_activity` وkill الاستعلامات العالقة |
| ذاكرة تتضخم | تسرب نادر | PM2 Auto-restart عند 900MB (مضبوط في `ecosystem.config.cjs`) |
| `pg_dump: command not found` | النسخ فشل | تثبيت `postgresql-client` على الخادم |
| Login 423 | حساب مقفل | انتظر 10 دقائق أو: `UPDATE users SET failed_attempts=0, locked_until=NULL WHERE username='X';` |

---

## 3) إعادة التشغيل بعد إعادة إقلاع السيرفر

```bash
# PB2 يبدأ Next تلقائيًا إن تم ضبطه:
pm2 resurrect
pm2 startup   # مرة واحدة لتثبيت خدمة النظام
pm2 save      # حفظ قائمة العمليات
```

سلسلة التحقق بعد الإقلاع:
```bash
pm2 status
curl -s http://localhost:3000/api/health   # انتظر حتى healthy
curl -s http://localhost:3000/login -o /dev/null -w "%{http_code}\n"   # 200
```

---

## 4) الاستعادة الكاملة (Restore) — عند الضرورة فقط

> ⚠️ **حذار: Restore يستبدل كل البيانات الحالية.** لا تنفذها إلا بعد:
> 1) فشل كل الحلول أعلاه.
> 2) إنشاء نسخة من الوضع الحالي (حتى إن كان فاسدًا) عبر Settings ← Backup ← "نسخة يدوية".
> 3) إبلاغ المعنيين بالتوقف القصير.

```bash
# 1) أنشئ نسخة حالية "قبل الاستعادة"
curl -X POST http://localhost:3000/api/backups -b cookies.txt

# 2) اختر ملف نسخة سليمة من backups/ (راجع الحجم والوقت)
ls -lh backups/

# 3) استعدها (عبر واجهة Settings ← Backup ← أيقونة الاستعادة، أو):
psql "YOUR_DATABASE_URL" -f backups/sobis-backup-XXXX.sql

# 4) بعد الاستعادة: تحقق Health + وضع المستخدمين الجيري
curl -s http://localhost:3000/api/health
# إذا ظهرت خطابات رموز قديمة:
psql "$DATABASE_URL" -c "TRUNCATE users CASCADE; -- ❌ لا تنفذ — استخدم فقط استعادة أو إعادة تهيئة"
```

بدلًا من ذلك **لا تحذف المستخدمين** — استخدم "إنهاء كل الجلسات" من Settings ← الأمان لكل مستخدم، ثم تسجيل دخول عادي.

---

## 5) وحدات الأمان الذاتية (لا تتطلب تدخل)

- **Pool للـ DB**: يعيد الاتصال تلقائيًا ويمسك 20 اتصال، ولا يقتل العملية بخطأ الخامل.
- **محاولات النسخ التلقائي**: يوم عند `/api/health` يتحقق من الموعد وينفذ بخلفية.
- **تنبيه البريد**: عند فشل/نجاح النسخ إذا مفعل في Settings ← Backup.
- **إعادة التشغيل الذاتي (PM2)**: crash → auto restart + Max 20 محاولة + Memory-limit restart عند 900MB.
- **Graceful Shutdown**: عند SIGTERM/SIGINT تُغلق اتصالات DB قبل الخروج النهائي.

---

## 6) التصعيد

إن لم يعد النظام خلال 15 دقيقة وقاعدة البيانات سليمة وhealth يعرض `degraded`:
- راجع `/var/log/postgresql/` و `logs/sobis-error.log` (مسجّل عبر PM2).
- نسخة احتياطية أخيرة سليمة: من خلال Settings يُعطى اسمها + تاريخها + حجمها.
- إن بقيت المشكلة: جهّز خادم احتياطي، ركّب `app_db` بأحدث SQL من `backups/` (خطوة 4 أعلاه).
