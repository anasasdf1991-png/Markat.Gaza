"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Pencil, UserX, ShieldCheck, CheckCircle2, X, KeyRound, UserCheck,
} from "lucide-react";
import { fmtNum, fmtDate, cn, initials } from "@/lib/format";
import { Btn, Modal, Input, Select, Field, useToast, Empty, Spinner, Badge, PageHeader, api, Card } from "@/components/ui";
import { useUser } from "@/components/shell";

type Employee = {
  id: number; username: string; fullName: string; role: string;
  permissions: string[]; active: boolean; createdAt: string;
};
type Role = { key: string; label: string; perms: string[]; tone: string };
type Perm = { key: string; label: string; group: string };

const roleTones: Record<string, string> = { admin: "rose", manager: "amber", cashier: "emerald", warehouse: "sky", accountant: "violet" };

export default function UsersPage() {
  const me = useUser();
  const { push } = useToast();
  const [rows, setRows] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Perm[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ fullName: "", username: "", password: "", role: "cashier", permissions: [] as string[], active: true });
  const [saving, setSaving] = useState(false);
  const [disableTarget, setDisableTarget] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    const d = await api<{ users: Employee[]; roles: Role[]; permissions: Perm[] }>("/api/users");
    setRows(d.users); setRoles(d.roles); setPermissions(d.permissions);
    setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => push("error", "تعذر تحميل الموظفين")); }, [load, push]);

  function openAdd() {
    setEditing(null);
    setForm({ fullName: "", username: "", password: "", role: "cashier", permissions: roles.find((r) => r.key === "cashier")?.perms ?? [], active: true });
    setModal(true);
  }
  function openEdit(u: Employee) {
    setEditing(u);
    setForm({ fullName: u.fullName, username: u.username, password: "", role: u.role, permissions: [...u.permissions], active: u.active });
    setModal(true);
  }

  function onRoleChange(role: string) {
    const preset = roles.find((r) => r.key === role);
    setForm((f) => ({ ...f, role, permissions: preset?.perms ?? f.permissions }));
  }

  function togglePerm(key: string) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter((p) => p !== key) : [...f.permissions, key],
    }));
  }

  async function save() {
    const needsUsername = !editing;
    if (!form.fullName.trim()) return push("error", "الاسم الكامل مطلوب");
    if (needsUsername && (!form.username.trim() || form.username.length < 3)) return push("error", "اسم المستخدم 3 أحرف على الأقل");
    if (!editing && form.password.length < 4) return push("error", "كلمة المرور 4 أحرف على الأقل");
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/users/${editing.id}`, { method: "PUT", body: { fullName: form.fullName, role: form.role, permissions: form.permissions, active: form.active, password: form.password || undefined } });
        push("success", "تم تحديث بيانات الموظف وصلاحياته");
      } else {
        await api("/api/users", { method: "POST", body: { fullName: form.fullName, username: form.username, password: form.password, role: form.role, permissions: form.permissions } });
        push("success", "تمت إضافة الموظف بنجاح");
      }
      setModal(false); load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر الحفظ"); }
    setSaving(false);
  }

  async function confirmDisable() {
    if (!disableTarget) return;
    try {
      await api(`/api/users/${disableTarget.id}`, { method: "DELETE" });
      push("success", `تم تعطيل حساب ${disableTarget.fullName}`);
      setDisableTarget(null); load();
    } catch (e) { push("error", e instanceof Error ? e.message : "تعذر التعطيل"); }
  }

  const roleLabel = (k: string) => roles.find((r) => r.key === k)?.label ?? k;
  const groups = [...new Set(permissions.map((p) => p.group))];

  return (
    <div>
      <PageHeader
        title="الموظفون والصلاحيات"
        subtitle={`${fmtNum(rows.filter((r) => r.active).length)} موظف نشط من أصل ${fmtNum(rows.length)}`}
        actions={<Btn variant="primary" onClick={openAdd}><Plus size={17} /> إضافة موظف</Btn>}
      />

      {loading ? <Spinner /> : rows.length === 0 ? (
        <Card><Empty icon={<ShieldCheck size={28} />} title="لا يوجد موظفون" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 stagger">
          {rows.map((u) => {
            const tone = roleTones[u.role] ?? "slate";
            return (
              <Card key={u.id} className={cn("p-5 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl", !u.active && "opacity-60")}>
                <div className="flex items-start gap-3.5 mb-4">
                  <div className={cn("w-[52px] h-[52px] rounded-2xl flex items-center justify-center font-black text-base text-white shrink-0 shadow-lg",
                    u.active ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25" : "bg-slate-400")}>
                    {initials(u.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-slate-900 truncate">{u.fullName}</h3>
                    <div className="text-[11px] font-bold text-slate-400" dir="ltr">@{u.username}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge tone={tone}>{roleLabel(u.role)}</Badge>
                      <Badge tone={u.active ? "emerald" : "slate"}>{u.active ? "نشط" : "موقوف"}</Badge>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2.5 flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold text-slate-400">عدد الصلاحيات الممنوحة</span>
                  <span className="font-black text-sm tnum">{fmtNum(u.permissions.length)} / {fmtNum(permissions.length || 14)}</span>
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" variant="secondary" className="flex-1" onClick={() => openEdit(u)}>
                    <Pencil size={13} /> تعديل وصلاحيات
                  </Btn>
                  {u.id !== me.id && u.active && (
                    <Btn size="sm" variant="danger" onClick={() => setDisableTarget(u)}><UserX size={13} /></Btn>
                  )}
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-3">انضم في {fmtDate(u.createdAt)}</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* نموذج موظف */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `تعديل: ${editing.fullName}` : "إضافة موظف جديد"} subtitle="حدد الدور ثم عدّل الصلاحيات التفصيلية حسب الحاجة" wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
          <Field label="الاسم الكامل" required><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="مثال: سارة أحمد" /></Field>
          {!editing && <Field label="اسم المستخدم" required><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })} dir="ltr" placeholder="sara" /></Field>}
          <Field label={editing ? "كلمة مرور جديدة (اتركها فارغة للإبقاء)" : "كلمة المرور"} required={!editing}>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" placeholder="••••••" />
          </Field>
          <Field label="الدور الوظيفي (يملأ الصلاحيات تلقائيًا)">
            <Select value={form.role} onChange={(e) => onRoleChange(e.target.value)}>
              {roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </Select>
          </Field>
          {editing && (
            <Field label="حالة الحساب">
              <Select value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}>
                <option value="1">نشط — يستطيع الدخول</option>
                <option value="0">موقوف — لا يستطيع الدخول</option>
              </Select>
            </Field>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-3.5">
            <ShieldCheck size={16} className="text-emerald-600" />
            <h4 className="font-black text-sm text-slate-800 font-display">الصلاحيات التفصيلية <span className="text-slate-400 font-bold tnum">({form.permissions.length} محددة)</span></h4>
          </div>
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g}>
                <div className="text-[11px] font-extrabold text-slate-500 mb-2">{g}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {permissions.filter((p) => p.group === g).map((p) => {
                    const on = form.permissions.includes(p.key);
                    return (
                      <button key={p.key} type="button" onClick={() => togglePerm(p.key)}
                        className={cn("flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-xs font-bold text-start transition-all",
                          on ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300")}>
                        <span className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all",
                          on ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300")}>
                          {on && <CheckCircle2 size={13} />}
                        </span>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-6 pt-5 border-t border-slate-100">
          <Btn variant="secondary" onClick={() => setModal(false)} className="flex-1"><X size={15} /> إلغاء</Btn>
          <Btn variant="primary" onClick={save} loading={saving} className="flex-[2]">
            {editing ? <><KeyRound size={16} /> حفظ التعديلات</> : <><UserCheck size={16} /> حفظ الموظف</>}
          </Btn>
        </div>
      </Modal>

      {/* تعطيل */}
      <Modal open={!!disableTarget} onClose={() => setDisableTarget(null)} title="تعطيل حساب الموظف">
        <p className="text-sm text-slate-600 leading-relaxed">
          تعطيل حساب <span className="font-black">«{disableTarget?.fullName}»</span> سيمنعه فورًا من تسجيل الدخول إلى النظام. يمكن إعادة تفعيله لاحقًا من شاشة التعديل.
        </p>
        <div className="flex gap-2 mt-5">
          <Btn variant="secondary" className="flex-1" onClick={() => setDisableTarget(null)}>تراجع</Btn>
          <Btn variant="danger" className="flex-1" onClick={confirmDisable}><UserX size={15} /> تعطيل الحساب</Btn>
        </div>
      </Modal>
    </div>
  );
}
