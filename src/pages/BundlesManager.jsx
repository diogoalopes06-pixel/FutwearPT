import { useEffect, useState } from "react";
import { Plus, Trash2, Edit, X, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "../lib/api";

export default function BundlesManager() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [show, setShow] = useState(false);

  const load = () => api.get("/bundles", { params: { active: false } }).then((r) => setList(r.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Apagar este cabaz?")) return;
    try { await api.delete(`/admin/bundles/${id}`); toast.success("Apagado"); load(); }
    catch { toast.error("Erro"); }
  };

  return (
    <div data-testid="bundles-manager">
      <button onClick={() => { setEditing(null); setShow(true); }} className="mb-6 px-5 py-3 bg-brand-red text-white text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:bg-brand-redDark" data-testid="bundle-add">
        <Plus size={14} /> Novo cabaz
      </button>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((b) => {
          const soldOut = !b.in_stock || b.stock_quantity === 0 || !b.active;
          return (
            <div key={b.id} className="bg-white border border-brand-border p-4 flex gap-4">
              <div className="w-20 h-20 bg-brand-cream shrink-0 overflow-hidden">{b.image && <img src={b.image} alt="" className="w-full h-full object-cover" />}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-brand-espresso truncate">{b.name}</p>
                <p className="text-xs text-brand-muted">€{Number(b.price || 0).toFixed(2)} · {b.items?.length || 0} itens · {soldOut ? "esgotado" : b.active ? "ativo" : "inativo"}</p>
                {b.stock_quantity !== null && b.stock_quantity !== undefined && (
                  <p className={`text-xs mt-1 ${b.stock_quantity <= 3 ? "text-brand-red" : "text-brand-muted"}`}>
                    Stock: {b.stock_quantity}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => { setEditing(b); setShow(true); }} className="text-xs hover:text-brand-red flex items-center gap-1"><Edit size={12} /> Editar</button>
                  <Link to={`/cabaz/${b.id}`} target="_blank" className="text-xs hover:text-brand-red flex items-center gap-1"><Eye size={12} /> Ver</Link>
                  <button onClick={() => remove(b.id)} className="text-xs text-brand-muted hover:text-brand-red flex items-center gap-1"><Trash2 size={12} /> Apagar</button>
                </div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && <p className="text-brand-muted col-span-full text-center py-12">Nenhum cabaz criado.</p>}
      </div>

      {show && <BundleForm initial={editing} onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </div>
  );
}

function BundleForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    details: initial?.details || "",
    price: initial?.price ?? "",
    image: initial?.image || "",
    badge: initial?.badge || "",
    stock_quantity: initial?.stock_quantity ?? "",
    in_stock: initial?.in_stock ?? true,
    items: initial?.items || [{ name: "", quantity: 1, unit: "un" }],
    active: initial?.active ?? true,
    featured: initial?.featured ?? false,
  });
  const [saving, setSaving] = useState(false);

  const setItem = (i, k, v) => setForm((f) => ({ ...f, items: f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { name: "", quantity: 1, unit: "un" }] }));
  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const stock = form.stock_quantity === "" || form.stock_quantity === null ? null : parseInt(form.stock_quantity, 10);
      const payload = {
        ...form,
        price: parseFloat(form.price),
        stock_quantity: Number.isNaN(stock) ? null : stock,
        in_stock: stock === 0 ? false : form.in_stock,
        active: stock === 0 ? false : form.active,
        items: form.items.map((it) => ({ ...it, quantity: parseFloat(it.quantity) || 1 })),
      };
      if (initial) await api.put(`/admin/bundles/${initial.id}`, payload);
      else await api.post("/admin/bundles", payload);
      toast.success("Guardado"); onSaved();
    } catch { toast.error("Erro"); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-espresso/60 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-brand-bone w-full max-w-2xl p-8 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-6">
          <h2 className="font-serif text-3xl text-brand-espresso">{initial ? "Editar cabaz" : "Novo cabaz"}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Nome"><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inp} /></Field>
          <Field label="Descrição curta"><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={`${inp} resize-none`} /></Field>
          <Field label="Descrição detalhada para a página do cabaz"><textarea value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} rows={4} placeholder="Ex: ideal para oferecer, produtos incluídos, conservação..." className={`${inp} resize-none`} /></Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Preço (€)"><input required type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className={inp} /></Field>
            <Field label="Stock disponível (vazio = sem limite)"><input type="number" step="1" min="0" value={form.stock_quantity} onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))} className={inp} /></Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="URL imagem"><input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} className={inp} /></Field>
            <Field label="Etiqueta/Badge"><input value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} placeholder="Limitado, Natal, Premium..." className={inp} /></Field>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mb-2">Itens incluídos</p>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <input value={it.name} onChange={(e) => setItem(i, "name", e.target.value)} placeholder="Nome (ex: Maçã)" className={`${inp} flex-1`} />
                  <input type="number" step="0.5" value={it.quantity} onChange={(e) => setItem(i, "quantity", e.target.value)} className={`${inp} w-24`} />
                  <select value={it.unit} onChange={(e) => setItem(i, "unit", e.target.value)} className={`${inp} w-20`}>
                    <option value="kg">kg</option><option value="un">un</option><option value="g">g</option>
                  </select>
                  <button type="button" onClick={() => removeItem(i)} className="text-brand-muted hover:text-brand-red"><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={addItem} className="text-xs uppercase tracking-[0.18em] text-brand-red flex items-center gap-1"><Plus size={12} /> Item</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} /> Ativo</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.in_stock} onChange={(e) => setForm((f) => ({ ...f, in_stock: e.target.checked }))} /> Em stock</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} /> Destaque</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-brand-border text-sm uppercase tracking-[0.18em]">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-brand-red text-white text-sm uppercase tracking-[0.18em] disabled:opacity-60">{saving ? "A guardar..." : "Guardar"}</button>
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
