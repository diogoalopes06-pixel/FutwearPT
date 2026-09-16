import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Phone, Mail, Package, Truck, Clock as ClockIcon, ChefHat, Smartphone, Copy, QrCode, Timer } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

const MBWAY_PHONE = process.env.REACT_APP_MBWAY_PHONE || "93X XXX XXX";

const STAGES = [
  { key: "pending", label: "Pendente", icon: ClockIcon },
  { key: "confirmed", label: "Confirmada", icon: CheckCircle2 },
  { key: "preparing", label: "A preparar", icon: ChefHat },
  { key: "ready", label: "Pronta", icon: Package },
  { key: "delivered", label: "Entregue", icon: Truck },
];

function Timeline({ status }) {
  const idx = STAGES.findIndex((s) => s.key === status);
  if (status === "cancelled") {
    return <p className="text-center text-brand-red font-medium py-4">Encomenda cancelada</p>;
  }
  return (
    <div className="grid grid-cols-5 gap-2 mt-2">
      {STAGES.map((s, i) => {
        const Icon = s.icon;
        const active = i <= idx;
        return (
          <div key={s.key} className="flex flex-col items-center text-center">
            <div className={`w-10 h-10 grid place-items-center rounded-full border-2 ${active ? "border-brand-red bg-brand-red text-white" : "border-brand-border bg-white text-brand-muted"}`}>
              <Icon size={16} />
            </div>
            <p className={`mt-2 text-[10px] uppercase tracking-[0.15em] ${active ? "text-brand-espresso" : "text-brand-muted"}`}>{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get("token");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const fetchOrder = () => api.get(`/orders/${id}`, { params: trackingToken ? { token: trackingToken } : {} }).then((r) => { setOrder(r.data); setError(null); }).catch(() => setError("Encomenda não encontrada."));

  useEffect(() => {
    fetchOrder();
    const t = setInterval(fetchOrder, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, trackingToken]);

  if (error) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
        <div className="max-w-xl mx-auto px-6 text-center py-32">
          <h1 className="font-serif text-5xl text-brand-espresso">{error}</h1>
          <Link to="/loja" className="mt-10 inline-block px-8 py-4 bg-brand-red text-white text-sm uppercase tracking-[0.18em]">
            Voltar à loja
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return <div className="pt-32 pb-24 min-h-screen bg-brand-bone" />;
  }

  const reference = order.id.slice(0, 8).toUpperCase();
  const isMbway = order.payment_method === "mbway" || order.payment_method === "MBWay";
  const createdAt = order.created_at ? new Date(order.created_at) : new Date();
  const paidUntil = new Date(createdAt.getTime() + 30 * 60 * 1000);
  const paymentNote = `FutWearPT · Encomenda ${reference} · €${Number(order.total || 0).toFixed(2)}`;
  const qrData = encodeURIComponent(`MBWay ${MBWAY_PHONE} ${paymentNote}`);
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado");
    } catch {
      toast.info(text);
    }
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone" data-testid="order-confirmation">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <CheckCircle2 size={48} className="mx-auto text-brand-red cart-pop" strokeWidth={1.5} />
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-brand-red">Encomenda recebida</p>
          <h1 className="mt-3 font-serif text-5xl md:text-6xl text-brand-espresso leading-tight">
            Obrigado, {order.customer_name.split(" ")[0]}!
          </h1>
          <p className="mt-4 text-brand-muted max-w-xl mx-auto leading-relaxed">
            Recebemos a sua encomenda. Vamos contactá-lo em breve para confirmar detalhes e combinar pagamento.
          </p>
          <p className="mt-2 text-sm text-brand-muted">
            Referência: <span className="font-mono text-brand-espresso" data-testid="order-id">{reference}</span>
          </p>
        </div>

        {isMbway && (
          <div className="mt-8 bg-white border-2 border-brand-red p-6 text-center">
            <Smartphone size={34} className="mx-auto text-brand-red" />
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-brand-red">
              Pagamento MBWay
            </p>
            <p className="mt-4 text-brand-muted">
              Para concluir a encomenda, envie o pagamento por MBWay para:
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <p className="font-serif text-3xl text-brand-espresso">{MBWAY_PHONE}</p>
              <button type="button" onClick={() => copyText(MBWAY_PHONE)} className="p-2 border border-brand-border hover:border-brand-red" title="Copiar número MBWay">
                <Copy size={16} />
              </button>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-4 items-center">
              <div className="bg-brand-cream/40 border border-brand-border p-4">
                <p className="text-sm text-brand-muted">Valor</p>
                <p className="font-serif text-3xl text-brand-red tabular-nums">€{order.total.toFixed(2)}</p>
                <button type="button" onClick={() => copyText(order.total.toFixed(2))} className="mt-2 text-xs uppercase tracking-[0.18em] text-brand-red hover:underline">Copiar valor</button>
              </div>
              <div className="bg-brand-cream/40 border border-brand-border p-4">
                <p className="text-sm text-brand-muted">Referência</p>
                <p className="font-mono text-xl text-brand-espresso">{reference}</p>
                <button type="button" onClick={() => copyText(reference)} className="mt-2 text-xs uppercase tracking-[0.18em] text-brand-red hover:underline">Copiar referência</button>
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-brand-muted">
                <QrCode size={16} /> QR auxiliar
              </div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`}
                alt="QR com dados MBWay da encomenda"
                className="w-36 h-36 border border-brand-border p-2 bg-white"
              />
              <p className="text-[11px] text-brand-muted max-w-md leading-relaxed">
                O QR serve apenas para copiar/partilhar os dados do pagamento. Confirme sempre o número, valor e referência na app MBWay.
              </p>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 bg-brand-espresso text-brand-bone px-4 py-2 text-xs uppercase tracking-[0.18em]">
              <Timer size={14} /> Preferencialmente até {paidUntil.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <p className="mt-5 text-xs text-brand-muted max-w-lg mx-auto leading-relaxed">
              A encomenda será preparada após confirmação manual do pagamento pela nossa equipa.
            </p>
          </div>
        )}

        <div className="reveal mt-10 bg-white border border-brand-border p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted text-center">Estado da encomenda</p>
          <Timeline status={order.status} />
          <p className="text-[10px] text-brand-muted text-center mt-4">Esta página atualiza automaticamente a cada 30 segundos.</p>
        </div>

        <div className="reveal reveal-delay-1 mt-8 bg-white border border-brand-border">
          <div className="px-6 py-5 border-b border-brand-border">
            <p className="font-serif text-2xl text-brand-espresso">Resumo da encomenda</p>
          </div>
          <ul className="px-6 py-4 divide-y divide-brand-border">
            {order.items.map((it, i) => (
              <li key={i} className="py-3 flex justify-between text-sm">
                <span className="text-brand-espresso">{it.name} <span className="text-brand-muted">× {it.quantity}{it.unit === "kg" ? " kg" : ""}</span></span>
                <span className="tabular-nums">€{(it.price * it.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="px-6 py-5 border-t border-brand-border bg-brand-cream/40 grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Modo</p>
              <p className="mt-1 text-brand-espresso">
                {order.delivery_method === "delivery" ? "Entrega ao domicílio" : "Levantamento na loja"}
              </p>
              {order.delivery_method === "delivery" && order.address && (
                <p className="mt-1 text-sm text-brand-muted">{order.address}</p>
              )}
              {order.delivery_slot && order.delivery_slot !== "Sem preferência" && (
                <p className="mt-1 text-sm text-brand-muted">Hora: {order.delivery_slot}</p>
              )}
            </div>
            <div className="sm:text-right space-y-0.5">
              {order.discount > 0 && (
                <>
                  <p className="text-xs text-brand-muted">Subtotal: <span className="tabular-nums">€{order.subtotal.toFixed(2)}</span></p>
                  <p className="text-xs text-green-700">Desconto: <span className="tabular-nums">−€{order.discount.toFixed(2)}</span></p>
                </>
              )}
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mt-2">Total</p>
              <p className="font-serif text-3xl text-brand-red tabular-nums">€{order.total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          <a href="tel:+351241402897" className="bg-brand-espresso text-brand-bone p-5 hover:bg-brand-red transition-colors">
            <Phone size={18} className="text-brand-red" />
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-brand-bone/70">Falar connosco</p>
            <p className="font-serif text-xl">+351 241 402 897</p>
          </a>
          <a href="mailto:hello@futwearpt.pt" className="bg-white border border-brand-border p-5 hover:border-brand-espresso transition-colors">
            <Mail size={18} className="text-brand-red" />
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-brand-muted">Email</p>
            <p className="font-serif text-base text-brand-espresso break-all">hello@futwearpt.pt</p>
          </a>
        </div>

        <div className="mt-12 text-center">
          <Link to="/loja" className="text-sm uppercase tracking-[0.18em] text-brand-red hover:underline" data-testid="order-continue">
            Continuar a comprar
          </Link>
        </div>
      </div>
    </div>
  );
}
