import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, Tag, MessageCircle, CheckCircle2, UserRound, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import api from "../lib/api";

const inputCls = "w-full bg-white border border-brand-border px-3 py-3 text-sm text-brand-espresso focus:outline-none focus:border-brand-red";

function SectionTitle({ number, title }) {
  return <h2 className="text-xl font-semibold text-brand-espresso mb-5 flex items-center gap-3"><span className="w-7 h-7 flex items-center justify-center bg-brand-red text-white text-xs">{number}</span>{title}</h2>;
}

function Field({ label, children, className = "" }) {
  return <label className={`block text-xs uppercase tracking-[0.12em] text-brand-muted ${className}`}>{label}{children}</label>;
}

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [clientOrderId] = useState(() => {
    const saved = sessionStorage.getItem("fw_checkout_id");
    if (saved) return saved;
    const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("fw_checkout_id", id);
    return id;
  });
  const [coupon, setCoupon] = useState({ code: "", discount: 0, msg: "", checking: false });
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    email: "",
    delivery_method: "delivery",
    address: "",
    notes: "",
    delivery_slot: "Sem preferência",
    payment_method: "manual",
  });

  useEffect(() => {
    const token = localStorage.getItem("dq_customer_token") || sessionStorage.getItem("dq_customer_token");
    if (!token) return;
    api.get("/customers/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setForm((f) => ({ ...f, customer_name: f.customer_name || data.name || "", phone: f.phone || data.phone || "", email: f.email || data.email || "", address: f.address || data.address || "" })))
      .catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const total = Math.max(0, Number(subtotal || 0) - Number(coupon.discount || 0));

  const validateCoupon = async () => {
    if (!coupon.code.trim()) return;
    setCoupon((c) => ({ ...c, checking: true, msg: "" }));
    try {
      const { data } = await api.post("/coupons/validate", { code: coupon.code.trim(), subtotal });
      setCoupon((c) => ({ ...c, discount: Number(data.discount || 0), msg: `Desconto aplicado: −€${Number(data.discount || 0).toFixed(2)}`, checking: false }));
      toast.success("Código aplicado");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setCoupon((c) => ({ ...c, discount: 0, msg: typeof detail === "string" ? detail : "Código inválido", checking: false }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!items.length) return toast.error("O cesto está vazio.");
    if (!form.customer_name.trim() || !form.phone.trim() || !form.address.trim()) return toast.error("Preenche o nome, telemóvel e morada.");
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        email: form.email || null,
        delivery_method: "delivery",
        address: form.address,
        payment_method: "manual",
        coupon_code: coupon.code.trim() || null,
        client_order_id: clientOrderId,
        items: items.map((i) => ({ product_id: i.product_id, name: i.name, price: i.price, unit: i.unit, quantity: i.quantity, size: i.size || null, custom_name: i.custom_name || null, custom_number: i.custom_number || null })),
      };
      const { data } = await api.post("/orders", payload);
      toast.success("Encomenda criada com sucesso");
      clear();
      sessionStorage.removeItem("fw_checkout_id");
      navigate(`/encomenda/${data.id}?token=${encodeURIComponent(data.tracking_token)}`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Erro ao criar encomenda. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!items.length) {
    return <div className="pt-32 pb-24 min-h-screen bg-brand-bone"><div className="max-w-xl mx-auto px-6 text-center py-32"><h1 className="font-serif text-5xl text-brand-espresso">O seu cesto está vazio.</h1><p className="text-brand-muted mt-4">Adicione produtos para finalizar a sua encomenda.</p><button onClick={() => navigate("/loja")} className="mt-10 px-8 py-4 bg-brand-red text-white text-sm uppercase tracking-[0.18em]">Ir para a loja</button></div></div>;
  }

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone" data-testid="checkout-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
        <button type="button" onClick={() => navigate(-1)} className="text-xs uppercase tracking-[0.18em] text-brand-muted hover:text-brand-red flex items-center gap-2 mb-8"><ArrowLeft size={14} /> Voltar</button>
        <div className="bg-white border border-brand-border p-6 sm:p-10 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-3">Finalizar encomenda</p>
          <h1 className="font-serif text-5xl md:text-6xl text-brand-espresso leading-tight">Quase pronto.</h1>
          <p className="mt-4 text-brand-muted max-w-2xl">Confirma os teus dados e a entrega. Depois de registar a encomenda, recebe o resumo e fala connosco no Instagram para combinar o pagamento.</p>
          <div className="mt-8 grid sm:grid-cols-3 gap-3"><Step icon={UserRound} title="Dados" /><Step icon={MapPin} title="Entrega" /><Step icon={CheckCircle2} title="Confirmar" /></div>
        </div>

        <form onSubmit={submit} className="mt-10 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <section className="bg-white border border-brand-border p-5 sm:p-7"><SectionTitle number="1" title="Os teus dados" /><div className="grid sm:grid-cols-2 gap-4"><Field label="Nome completo *"><input required minLength={2} maxLength={120} value={form.customer_name} onChange={set("customer_name")} className={inputCls} /></Field><Field label="Telemóvel *"><input required type="tel" minLength={6} maxLength={30} value={form.phone} onChange={set("phone")} placeholder="+351 9XX XXX XXX" className={inputCls} /></Field><Field label="Email" className="sm:col-span-2"><input type="email" maxLength={254} value={form.email} onChange={set("email")} placeholder="opcional — recebe confirmação por email" className={inputCls} /></Field></div></section>

            <section className="bg-white border border-brand-border p-5 sm:p-7"><SectionTitle number="2" title="Entrega" /><div className="border-2 border-brand-red bg-brand-red/5 p-5 flex gap-4 items-start"><Truck className="text-brand-red mt-1" size={22} /><div><p className="font-semibold text-brand-espresso">Envio para Portugal</p><p className="text-sm text-brand-muted mt-1">Expedição em 24–48h úteis.</p></div></div><Field label="Morada de entrega *" className="mt-5"><textarea required maxLength={500} value={form.address} onChange={set("address")} rows={3} placeholder="Rua, número, andar, código postal, localidade" className={`${inputCls} resize-none`} /></Field><Field label="Hora preferida" className="mt-4"><select value={form.delivery_slot} onChange={set("delivery_slot")} className={inputCls}><option>Sem preferência</option><option>Manhã (09h–13h)</option><option>Tarde (14h–18h)</option><option>Fim do dia (18h–20h)</option></select></Field><Field label="Notas para a loja" className="mt-4"><textarea maxLength={1000} value={form.notes} onChange={set("notes")} rows={2} placeholder="Instruções para a transportadora ou pedido especial..." className={`${inputCls} resize-none`} /></Field></section>

            <section className="bg-white border border-brand-border p-5 sm:p-7"><SectionTitle number="3" title="Pagamento" /><div className="border-2 border-brand-red bg-brand-red/5 p-5"><div className="flex gap-4"><MessageCircle className="text-brand-red mt-1" size={22} /><div><p className="text-xs uppercase tracking-[0.2em] text-brand-red">Pagamento por Instagram</p><h3 className="text-xl font-semibold text-brand-espresso mt-1">Combina o pagamento connosco</h3><p className="text-sm text-brand-muted mt-2">A encomenda fica <strong className="text-brand-espresso">A aguardar pagamento</strong>. Depois de confirmares, abre o Instagram da FutWearPT e envia-nos o número da encomenda para combinar o pagamento.</p><a href="https://www.instagram.com/futwearpt" target="_blank" rel="noreferrer" className="inline-flex mt-4 bg-brand-red text-white px-5 py-3 text-xs uppercase tracking-[0.15em]">Abrir Instagram @futwearpt</a></div></div></div><p className="mt-3 text-xs text-brand-muted bg-brand-red/5 border border-brand-red/20 p-4">Não é apresentado qualquer número pessoal, IBAN, MB WAY pessoal ou pagamento automático no site.</p></section>
          </div>

          <aside className="lg:col-span-1"><div className="lg:sticky lg:top-28 bg-white border border-brand-border"><div className="px-6 py-4 border-b border-brand-border"><p className="text-[10px] uppercase tracking-[0.2em] text-brand-red">A tua encomenda</p><p className="font-serif text-2xl text-brand-espresso">Resumo</p></div><ul className="px-6 py-4 divide-y divide-brand-border max-h-64 overflow-y-auto">{items.map((i, index) => <li key={`${i.product_id}-${i.size || ""}-${index}`} className="py-3 flex justify-between gap-3 text-sm"><span className="text-brand-espresso">{i.name} <span className="text-brand-muted">× {i.quantity}</span>{(i.size || i.custom_name || i.custom_number) && <small className="block text-[10px] text-brand-muted">{i.size && `Tam. ${i.size}`}{i.custom_name && ` · ${i.custom_name}`}{i.custom_number && ` #${i.custom_number}`}</small>}</span><span className="tabular-nums text-brand-espresso">€{(Number(i.price || 0) * Number(i.quantity || 1)).toFixed(2)}</span></li>)}</ul><div className="px-6 py-4 border-t border-brand-border"><p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mb-2">Código de desconto</p><div className="flex gap-2"><div className="relative flex-1"><Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" /><input value={coupon.code} onChange={(e) => setCoupon((c) => ({ ...c, code: e.target.value.toUpperCase(), discount: 0, msg: "" }))} placeholder="EX: PRIMEIRO10" className="w-full bg-white border border-brand-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand-red uppercase" /></div><button type="button" onClick={validateCoupon} disabled={coupon.checking || !coupon.code.trim()} className="px-4 py-2 bg-brand-espresso text-brand-bone text-xs uppercase tracking-[0.18em] disabled:opacity-50">{coupon.checking ? "..." : "Aplicar"}</button></div>{coupon.msg && <p className={`text-xs mt-2 ${coupon.discount > 0 ? "text-green-700" : "text-brand-red"}`}>{coupon.msg}</p>}</div><div className="px-6 py-5 border-t border-brand-border bg-brand-cream/40 space-y-2"><div className="flex justify-between text-sm text-brand-muted"><span>Subtotal</span><span>€{Number(subtotal || 0).toFixed(2)}</span></div>{coupon.discount > 0 && <div className="flex justify-between text-sm text-green-700"><span>Desconto</span><span>−€{coupon.discount.toFixed(2)}</span></div>}<div className="flex justify-between text-sm text-brand-muted"><span>Entrega</span><span>a calcular</span></div><div className="flex justify-between mt-3 pt-3 border-t border-brand-border"><span className="font-serif text-2xl text-brand-espresso">Total</span><span className="font-serif text-2xl text-brand-red">€{total.toFixed(2)}</span></div><label className="mt-4 flex items-start gap-3 text-xs text-brand-muted leading-relaxed cursor-pointer"><input type="checkbox" required checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 accent-brand-red" /><span>Li e aceito os <Link to="/termos" target="_blank" className="text-brand-red underline">Termos e Condições</Link> e a <Link to="/privacidade" target="_blank" className="text-brand-red underline">Política de Privacidade</Link>.</span></label><button type="submit" disabled={submitting || !acceptedTerms} className="mt-4 w-full py-4 bg-brand-red text-white text-sm uppercase tracking-[0.2em] disabled:opacity-60">{submitting ? "A registar…" : "Confirmar encomenda"}</button></div></div></aside>
        </form>
      </div>
    </div>
  );
}

function Step({ icon: Icon, title }) {
  return <div className="border border-brand-red bg-brand-red/5 p-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-brand-espresso"><Icon size={14} className="text-brand-red" />{title}</div>;
}
