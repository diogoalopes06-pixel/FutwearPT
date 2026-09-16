import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, Loader2, Tag, Clock, MessageCircle, CheckCircle2, UserRound, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import api from "../lib/api";

const DELIVERY_SLOTS = [
  "Sem preferência",
  "Manhã (09h–13h)",
  "Tarde (14h–18h)",
  "Fim do dia (18h–20h)",
];

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [clientOrderId] = useState(() => {
    const saved = sessionStorage.getItem("fw_checkout_id");
    if (saved) return saved;
    const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
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
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const token = localStorage.getItem("fw_customer_token");
    if (!token) return;
    api.get("/customers/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        setForm((f) => ({
          ...f,
          customer_name: f.customer_name || data.name || "",
          phone: f.phone || data.phone || "",
          email: f.email || data.email || "",
          address: f.address || data.address || "",
        }));
      })
      .catch(() => {});
  }, []);

  const total = Math.max(0, subtotal - coupon.discount);

  const validateCoupon = async () => {
    if (!coupon.code.trim()) return;
    setCoupon((c) => ({ ...c, checking: true, msg: "" }));
    try {
      const { data } = await api.post("/coupons/validate", { code: coupon.code, subtotal });
      setCoupon((c) => ({ ...c, discount: data.discount, msg: `Desconto aplicado: −€${data.discount.toFixed(2)}`, checking: false }));
      toast.success("Código aplicado");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setCoupon((c) => ({ ...c, discount: 0, msg: typeof detail === "string" ? detail : "Código inválido", checking: false }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (items.length === 0) {
      toast.error("O cesto está vazio.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        email: form.email || null,
        address: form.delivery_method === "delivery" ? form.address : "",
        delivery_slot: form.delivery_slot || null,
        coupon_code: coupon.code.trim() || null,
        client_order_id: clientOrderId,
        items: items.map((i) => ({
          product_id: i.product_id,
          name: i.name,
          price: i.price,
          unit: i.unit,
          quantity: i.quantity,
          size: i.size || null,
          custom_name: i.custom_name || null,
          custom_number: i.custom_number || null,
        })),
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

  if (items.length === 0) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-brand-bone" data-testid="checkout-empty">
        <div className="max-w-xl mx-auto px-6 text-center py-32">
          <h1 className="font-serif text-5xl text-brand-espresso">O seu cesto está vazio.</h1>
          <p className="text-brand-muted mt-4">Adicione produtos para finalizar a sua encomenda.</p>
          <button onClick={() => navigate("/loja")} className="mt-10 px-8 py-4 bg-brand-red text-white text-sm uppercase tracking-[0.18em] hover:bg-brand-redDark transition-colors" data-testid="checkout-empty-shop">
            Ir para a loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone" data-testid="checkout-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
        <button onClick={() => navigate(-1)} className="text-xs uppercase tracking-[0.18em] text-brand-muted hover:text-brand-red flex items-center gap-2 mb-8">
          <ArrowLeft size={14} /> Voltar
        </button>
        <div className="reveal bg-white border border-brand-border p-6 sm:p-10 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-3">Finalizar encomenda</p>
          <h1 className="font-serif text-5xl md:text-6xl text-brand-espresso leading-tight">Quase pronto.</h1>
          <p className="mt-4 text-brand-muted max-w-2xl">Confirme os seus dados, escolha entrega e método de pagamento. A loja acompanha tudo no painel em tempo real.</p>

          <div className="mt-8 grid sm:grid-cols-3 gap-3">
            <Step icon={UserRound} title="Dados" active />
            <Step icon={MapPin} title="Entrega" active />
            <Step icon={CheckCircle2} title="Confirmar" active />
          </div>
        </div>

        <form onSubmit={submit} className="mt-10 grid lg:grid-cols-3 gap-10 reveal reveal-delay-1">
          <div className="lg:col-span-2 space-y-10">
            <section className="bg-white border border-brand-border p-5 sm:p-7 transition-all duration-300 hover:shadow-sm">
              <SectionTitle number="1" title="Os seus dados" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nome completo *">
                  <input required minLength={2} maxLength={120} autoComplete="name" value={form.customer_name} onChange={set("customer_name")} data-testid="checkout-name" className={inputCls} />
                </Field>
                <Field label="Telemóvel *">
                  <input required type="tel" minLength={6} maxLength={30} autoComplete="tel" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="+351 9XX XXX XXX" data-testid="checkout-phone" className={inputCls} />
                </Field>
                <Field label="Email" className="sm:col-span-2">
                  <input type="email" maxLength={254} autoComplete="email" value={form.email} onChange={set("email")} placeholder="opcional — receba confirmação por email" data-testid="checkout-email" className={inputCls} />
                </Field>
              </div>
            </section>

            <section className="bg-white border border-brand-border p-5 sm:p-7 transition-all duration-300 hover:shadow-sm">
              <SectionTitle number="2" title="Entrega" />
              <div className="grid sm:grid-cols-2 gap-4">
                <DeliveryOption icon={Truck} selected={form.delivery_method === "delivery"} onClick={() => setForm((f) => ({ ...f, delivery_method: "delivery" }))} title="Envio para Portugal" desc="Expedição em 24–48h úteis" data-testid="checkout-delivery-option" />
              </div>
              {form.delivery_method === "delivery" && (
                <Field label="Morada de entrega *" className="mt-4">
                  <textarea required maxLength={500} autoComplete="street-address" value={form.address} onChange={set("address")} rows={3} placeholder="Rua, número, andar, código postal, localidade" data-testid="checkout-address" className={`${inputCls} resize-none`} />
                </Field>
              )}
              <Field label="Hora preferida" className="mt-4">
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                  <select value={form.delivery_slot} onChange={set("delivery_slot")} data-testid="checkout-slot" className={`${inputCls} pl-9 appearance-none`}>
                    {DELIVERY_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="Notas para a loja" className="mt-4">
                <textarea maxLength={1000} value={form.notes} onChange={set("notes")} rows={2} placeholder="Ex: instruções para a transportadora ou pedido especial..." data-testid="checkout-notes" className={`${inputCls} resize-none`} />
              </Field>
            </section>

            <section className="bg-white border border-brand-border p-5 sm:p-7 transition-all duration-300 hover:shadow-sm">
              <SectionTitle number="3" title="Pagamento" />
              <div className="grid sm:grid-cols-1 gap-4 max-w-2xl">
                <PaymentOption
                  icon={MessageCircle}
                  selected={form.payment_method === "manual"}
                  onClick={() => setForm((f) => ({ ...f, payment_method: "manual" }))}
                  title="Pagamento por Instagram"
                  desc="Depois de confirmar a encomenda, recebe um comprovativo em PDF e fala connosco no Instagram @futwearpt para combinar o pagamento."
                />
              </div>
              <p className="mt-3 text-xs text-brand-muted bg-brand-red/5 border border-brand-red/20 p-4">
                A encomenda fica <strong className="text-brand-espresso">A aguardar pagamento</strong>. Não é apresentado qualquer número pessoal, IBAN ou pagamento automático no site.
              </p>
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 bg-white border border-brand-border">
              <div className="px-6 py-4 border-b border-brand-border">
                <p className="text-[10px] uppercase tracking-[0.2em] text-brand-red">A sua encomenda</p>
                <p className="font-serif text-2xl text-brand-espresso">Resumo</p>
              </div>
              <ul className="px-6 py-4 divide-y divide-brand-border max-h-64 overflow-y-auto">
                {items.map((i) => (
                  <li key={i.product_id} className="py-3 flex justify-between gap-3 text-sm">
                    <span className="text-brand-espresso">{i.name} <span className="text-brand-muted">× {i.quantity}</span>{(i.size || i.custom_name || i.custom_number) && <small className="block text-[10px] text-brand-muted">{i.size && `Tam. ${i.size}`}{i.custom_name && ` · ${i.custom_name}`}{i.custom_number && ` #${i.custom_number}`}</small>}</span>
                    <span className="tabular-nums text-brand-espresso">€{(i.price * i.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="px-6 py-4 border-t border-brand-border">
                <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mb-2">Código de desconto</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                    <input
                      value={coupon.code}
                      onChange={(e) => setCoupon((c) => ({ ...c, code: e.target.value.toUpperCase(), discount: 0, msg: "" }))}
                      placeholder="EX: PRIMEIRO10"
                      data-testid="checkout-coupon-input"
                      className="w-full bg-white border border-brand-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand-red uppercase"
                    />
                  </div>
                  <button type="button" onClick={validateCoupon} disabled={coupon.checking || !coupon.code.trim()} data-testid="checkout-coupon-apply" className="px-4 py-2 bg-brand-espresso text-brand-bone text-xs uppercase tracking-[0.18em] disabled:opacity-50">
                    {coupon.checking ? "..." : "Aplicar"}
                  </button>
                </div>
                {coupon.msg && (
                  <p className={`text-xs mt-2 ${coupon.discount > 0 ? "text-green-700" : "text-brand-red"}`}>{coupon.msg}</p>
                )}
              </div>
              <div className="px-6 py-5 border-t border-brand-border bg-brand-cream/40 space-y-1.5">
                <div className="flex justify-between text-sm text-brand-muted">
                  <span>Subtotal</span>
                  <span className="tabular-nums">€{subtotal.toFixed(2)}</span>
                </div>
                {coupon.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Desconto ({coupon.code})</span>
                    <span className="tabular-nums">−€{coupon.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-brand-muted">
                  <span>{form.delivery_method === "pickup" ? "Levantamento" : "Entrega"}</span>
                  <span className="tabular-nums">a combinar</span>
                </div>
                <div className="flex justify-between text-sm text-brand-muted">
                  <span>Pagamento</span>
                  <span className="tabular-nums">Instagram · pagamento combinado</span>
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-brand-border">
                  <span className="font-serif text-2xl text-brand-espresso">Total</span>
                  <span className="font-serif text-2xl text-brand-red tabular-nums" data-testid="checkout-total">€{total.toFixed(2)}</span>
                </div>
                <label className="mt-4 flex items-start gap-3 text-xs text-brand-muted leading-relaxed cursor-pointer">
                  <input type="checkbox" required checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 accent-brand-red" />
                  <span>Li e aceito os <Link to="/termos" target="_blank" className="text-brand-red underline">Termos e Condições</Link> e a <Link to="/privacidade" target="_blank" className="text-brand-red underline">Política de Privacidade</Link>.</span>
                </label>
                <button type="submit" disabled={submitting || !acceptedTerms} data-testid="checkout-submit" className="mt-4 w-full py-4 bg-brand-red active:scale-[0.99] text-white text-sm uppercase tracking-[0.2em] hover:bg-brand-redDark transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Confirmar encomenda
                </button>
                <p className="mt-3 text-[11px] text-brand-muted leading-relaxed">
                  Após confirmar, recebe a página de acompanhamento e um comprovativo em PDF com as instruções para falar connosco no Instagram.
                </p>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-white border border-brand-border px-4 py-3.5 text-sm text-brand-espresso focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SectionTitle({ number, title }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="w-8 h-8 grid place-items-center bg-brand-red text-white text-xs font-medium">{number}</span>
      <h2 className="font-serif text-3xl text-brand-espresso">{title}</h2>
    </div>
  );
}

function Step({ icon: Icon, title, active }) {
  return (
    <div className={`border px-4 py-3 flex items-center gap-3 ${active ? "border-brand-red bg-brand-red/5" : "border-brand-border bg-white"}`}>
      <Icon size={17} className={active ? "text-brand-red" : "text-brand-muted"} />
      <span className="text-xs uppercase tracking-[0.18em] text-brand-espresso">{title}</span>
    </div>
  );
}

function PaymentOption({ icon: Icon, selected, onClick, title, desc }) {
  return (
    <button type="button" onClick={onClick} className={`text-left p-5 border transition-all relative overflow-hidden ${selected ? "border-brand-red bg-brand-red/5 shadow-sm" : "border-brand-border hover:border-brand-espresso bg-white"}`}>
      {selected && <CheckCircle2 size={18} className="absolute top-4 right-4 text-brand-red" />}
      <Icon size={24} className={selected ? "text-brand-red" : "text-brand-espresso"} />
      <p className="mt-3 font-serif text-xl text-brand-espresso">{title}</p>
      <p className="text-xs text-brand-muted mt-1 leading-relaxed pr-6">{desc}</p>
    </button>
  );
}

function DeliveryOption({ icon: Icon, selected, onClick, title, desc, ...rest }) {
  return (
    <button type="button" onClick={onClick} className={`text-left p-5 border transition-all relative overflow-hidden ${selected ? "border-brand-red bg-brand-red/5 shadow-sm" : "border-brand-border hover:border-brand-espresso bg-white"}`} {...rest}>
      {selected && <CheckCircle2 size={18} className="absolute top-4 right-4 text-brand-red" />}
      <Icon size={24} className={selected ? "text-brand-red" : "text-brand-espresso"} />
      <p className="mt-3 font-serif text-xl text-brand-espresso">{title}</p>
      <p className="text-xs text-brand-muted mt-1 leading-relaxed pr-6">{desc}</p>
    </button>
  );
}
