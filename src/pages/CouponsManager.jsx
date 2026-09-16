import { useEffect, useState } from "react";
import { Plus, Trash2, Edit, X, Tag } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

export default function CouponsManager() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [show, setShow] = useState(false);

  const load = () => api.get("/admin/coupons").then((r) => setList(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Apagar código?")) return;
    try { await api.delete(`/admin/coupons/${id}`); toast.success("Apagado"); load(); }
    catch { toast.error("Erro"); }
  };

  return (
    <div data-testid="coupons-manager">
      <button onClick={() => { setEditing(null); setShow(true); }} className="mb-6 px-5 py-3 bg-brand-red text-white text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:bg-brand-redDark" data-testid="coupon-add">
        <Plus size={14} /> Novo código
      </button>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((c) => {
          const off = c.percent_off > 0 ? `${c.percent_off}%` : `€${c.fixed_off?.toFixed(2)}`;
          return (
            <div key={c.id} className="bg-white border border-brand-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><Tag size={14} className="text-brand-red" /><p className="font-mono font-semibold text-brand-espresso">{c.code}</p></div>
                  <p className="font-serif text-3xl text-brand-red mt-2">−{off}</p>
                  {c.description && <p className="text-xs text-brand-muted mt-1">{c.description}</p>}
                  <p className="text-[10px] uppercase tracking-[0.18em] text-brand-muted mt-3">
                    {c.active ? "Ativo" : "Inativo"} · usado {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}
                  </p>
                  {c.min_order > 0 && <p className="text-xs text-brand-muted">Min. €{c.min_order.toFixed(2)}</p>}
                </div>
              </div>
              <div className="mt-3 flex gap-3">
                <button onClick={() => { setEditing(c); setShow(true); }} className="text-xs hover:text-brand-red flex items-center gap-1"><Edit size={12} /> Editar</button>
                <button onClick={() => remove(c.id)} className="text-xs text-brand-muted hover:text-brand-red flex items-center gap-1"><Trash2 size={12} /> Apagar</button>
              </div>
            </div>
          );
        })}
        {list.length === 0 && <p className="text-brand-muted col-span-full text-center py-12">Nenhum código criado.</p>}
      </div>
      {show && <CouponForm initial={editing} onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </div>
  );
}

function CouponForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    code: initial?.code || "",
    description: initial?.description || "",
    percent_off: initial?.percent_off || 0,
    fixed_off: initial?.fixed_off || 0,
    min_order: initial?.min_order || 0,
    max_uses: initial?.max_uses || 0,
    expires_at: initial?.expires_at || "",
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        percent_off: parseInt(form.percent_off) || 0,
        fixed_off: parseFloat(form.fixed_off) || 0,
        min_order: parseFloat(form.min_order) || 0,
        max_uses: parseInt(form.max_uses) || 0,
        expires_at: form.expires_at || null,
      };
      if (initial) await api.put(`/admin/coupons/${initial.id}`, payload);
      else await api.post("/admin/coupons", payload);
      toast.success("Guardado"); onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Erro");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-espresso/60 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-brand-bone w-full max-w-lg p-8 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-6">
          <h2 className="font-serif text-3xl text-brand-espresso">{initial ? "Editar código" : "Novo código"}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Código (ex: PRIMEIRO10)"><input required value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className={`${inp} font-mono uppercase`} /></Field>
          <Field label="Descrição (interna)"><input value={form.description} onChange={(e) => set("description", e.target.value)} className={inp} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Desconto %"><input type="number" min="0" max="100" value={form.percent_off} onChange={(e) => set("percent_off", e.target.value)} className={inp} /></Field>
            <Field label="OU desconto fixo €"><input type="number" step="0.01" value={form.fixed_off} onChange={(e) => set("fixed_off", e.target.value)} className={inp} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Encomenda mínima €"><input type="number" step="0.01" value={form.min_order} onChange={(e) => set("min_order", e.target.value)} className={inp} /></Field>
            <Field label="Máx. utilizações (0 = ilimitado)"><input type="number" min="0" value={form.max_uses} onChange={(e) => set("max_uses", e.target.value)} className={inp} /></Field>
          </div>
          <Field label="Data de expiração (opcional)"><input type="date" value={form.expires_at?.slice(0, 10) || ""} onChange={(e) => set("expires_at", e.target.value ? `${e.target.value}T23:59:59Z` : "")} className={inp} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Ativo</label>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-brand-border text-sm uppercase tracking-[0.18em]">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-brand-red text-white text-sm uppercase tracking-[0.18em] disabled:opacity-60">{saving ? "..." : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inp = "w-full bg-white border border-brand-border px-3 py-2.5 text-sm focus:outline-none focus:border-brand-red";
function Field({ label, children }) {
  return <label className="block"><span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">{label}</span><div className="mt-1.5">{children}</div></label>;
}
