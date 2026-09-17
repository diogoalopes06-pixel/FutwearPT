import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, MessageCircle, Package, Truck, Clock as ClockIcon, ChefHat, Download, ExternalLink } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";
import ReceiptPrint from "../components/ReceiptPrint";

const INSTAGRAM_URL = "https://www.instagram.com/futwearpt/";
const STAGES = [
  { key: "pending", label: "A aguardar pagamento", icon: ClockIcon },
  { key: "confirmed", label: "Pago", icon: CheckCircle2 },
  { key: "preparing", label: "Em produção", icon: ChefHat },
  { key: "ready", label: "Enviado", icon: Package },
  { key: "delivered", label: "Concluído", icon: Truck },
];

function Timeline({ status, paymentStatus }) {
  const effective = paymentStatus === "paid" && status === "pending" ? "confirmed" : status;
  const idx = STAGES.findIndex((s) => s.key === effective);
  if (status === "cancelled") return <p className="text-center text-red-600 font-medium py-4">Encomenda cancelada</p>;
  return <div className="grid grid-cols-5 gap-2 mt-2">{STAGES.map((s, i) => { const Icon = s.icon; const active = i <= idx; return <div key={s.key} className="flex flex-col items-center text-center"><div className={`w-10 h-10 grid place-items-center rounded-full border-2 ${active ? "border-brand-red bg-brand-red text-white" : "border-brand-border bg-white text-brand-muted"}`}><Icon size={16} /></div><p className={`mt-2 text-[10px] uppercase tracking-[0.12em] ${active ? "text-brand-espresso" : "text-brand-muted"}`}>{s.label}</p></div>; })}</div>;
}

function printPdf() {
  window.print();
  toast.success("Talão profissional pronto — escolhe 'Guardar como PDF' na janela de impressão");
}

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get("token");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const fetchOrder = () => api.get(`/orders/${id}`, { params: trackingToken ? { token: trackingToken } : {} }).then((r) => { setOrder(r.data); setError(null); }).catch(() => setError("Encomenda não encontrada."));
  useEffect(() => { fetchOrder(); const t = setInterval(fetchOrder, 30000); return () => clearInterval(t); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, trackingToken]);

  useEffect(() => {
    if (!order?.id) return;
    try {
      localStorage.setItem("fw_last_order_id", order.id);
      if (trackingToken) localStorage.setItem("fw_last_order_token", trackingToken);
      if (order.email) localStorage.setItem("fw_last_order_email", String(order.email).toLowerCase().trim());
    } catch {}
  }, [order, trackingToken]);

  if (error) return <div className="pt-32 pb-24 min-h-screen bg-brand-bone"><div className="max-w-xl mx-auto px-6 text-center py-32"><h1 className="font-serif text-5xl text-brand-espresso">{error}</h1><Link to="/loja" className="mt-10 inline-block px-8 py-4 bg-brand-red text-white text-sm uppercase tracking-[0.18em]">Voltar à loja</Link></div></div>;
  if (!order) return <div className="pt-32 pb-24 min-h-screen bg-brand-bone" />;

  const reference = order.id.slice(0, 8).toUpperCase();
  return <>
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone" data-testid="order-confirmation">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center"><CheckCircle2 size={48} className="mx-auto text-brand-red" strokeWidth={1.5} /><p className="mt-6 text-xs uppercase tracking-[0.3em] text-brand-red">Encomenda recebida</p><h1 className="mt-3 font-serif text-5xl md:text-6xl text-brand-espresso leading-tight">Obrigado, {order.customer_name.split(" ")[0]}!</h1><p className="mt-4 text-brand-muted max-w-xl mx-auto leading-relaxed">A tua encomenda ficou registada e está <strong className="text-brand-espresso">A aguardar pagamento</strong>.</p><p className="mt-2 text-sm text-brand-muted">Referência: <span className="font-mono text-brand-espresso" data-testid="order-id">{reference}</span></p></div>
        <div className="mt-8 bg-black text-white border border-brand-red p-6 text-center"><MessageCircle size={34} className="mx-auto text-brand-red" /><p className="mt-4 text-xs uppercase tracking-[0.25em] text-brand-red">Pagamento por Instagram</p><p className="mt-4 text-zinc-300 max-w-xl mx-auto leading-relaxed">Gera o talão profissional abaixo e envia-nos uma mensagem no Instagram <strong className="text-white">@futwearpt</strong>. Combinamos o pagamento por mensagem. Não mostramos números pessoais, IBAN ou dados bancários.</p><div className="mt-6 flex flex-col sm:flex-row justify-center gap-3"><button type="button" onClick={printPdf} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-red text-white text-xs uppercase tracking-[0.18em] font-bold hover:bg-brand-redDark"><Download size={16} /> Gerar talão PDF</button><a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-white text-xs uppercase tracking-[0.18em] font-bold hover:border-brand-red hover:text-brand-red"><ExternalLink size={16} /> Abrir Instagram @futwearpt</a></div><p className="mt-4 text-[11px] text-zinc-500">Ao imprimir, seleciona <strong>Guardar como PDF</strong>. Só depois da confirmação manual do pagamento a encomenda avança para produção.</p></div>
        <div className="reveal mt-10 bg-white border border-brand-border p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted text-center">Estado da encomenda</p><Timeline status={order.status} paymentStatus={order.payment_status} /><p className="text-[10px] text-brand-muted text-center mt-4">Esta página atualiza automaticamente a cada 30 segundos.</p></div>
        <div className="reveal mt-8 bg-white border border-brand-border"><div className="px-6 py-5 border-b border-brand-border"><p className="font-serif text-2xl text-brand-espresso">Resumo da encomenda</p></div><ul className="px-6 py-4 divide-y divide-brand-border">{order.items.map((it, i) => <li key={i} className="py-3 flex justify-between text-sm"><span className="text-brand-espresso">{it.name} <span className="text-brand-muted">× {it.quantity}</span>{it.size && <small className="block text-[10px] text-brand-muted">Tam. {it.size}{it.custom_name ? ` · ${it.custom_name}` : ""}{it.custom_number ? ` #${it.custom_number}` : ""}</small>}</span><span className="tabular-nums">€{(it.price * it.quantity).toFixed(2)}</span></li>)}</ul><div className="px-6 py-5 border-t border-brand-border bg-brand-cream/40 grid sm:grid-cols-2 gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Modo</p><p className="mt-1 text-brand-espresso">Envio para Portugal</p>{order.address && <p className="mt-1 text-sm text-brand-muted">{order.address}</p>}</div><div className="sm:text-right space-y-0.5"><p className="text-xs text-brand-muted">Subtotal: €{Number(order.subtotal || 0).toFixed(2)}</p>{order.discount > 0 && <p className="text-xs text-green-700">Desconto: −€{Number(order.discount).toFixed(2)}</p>}<p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mt-2">Total</p><p className="font-serif text-3xl text-brand-red tabular-nums">€{Number(order.total || 0).toFixed(2)}</p></div></div></div>
        <div className="mt-12 text-center"><Link to="/loja" className="text-sm uppercase tracking-[0.18em] text-brand-red hover:underline" data-testid="order-continue">Continuar a comprar</Link></div>
      </div>
    </div>
    <ReceiptPrint order={order} />
  </>;
}
