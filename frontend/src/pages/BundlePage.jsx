import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Package2, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useCart } from "../context/CartContext";

export default function BundlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/bundles/${id}`)
      .then((r) => setBundle(r.data))
      .catch(() => navigate("/loja"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const add = () => {
    addItem({ id: `bundle-${bundle.id}`, name: bundle.name, price: bundle.price, unit: "un", image: bundle.image });
    setAdded(true);
    toast.success(`${bundle.name} adicionado ao cesto`);
    setTimeout(() => setAdded(false), 900);
  };

  if (loading || !bundle) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-10">
          <div className="aspect-square bg-brand-cream shimmer" />
          <div className="space-y-4">
            <div className="h-12 bg-brand-cream shimmer" />
            <div className="h-4 bg-brand-cream shimmer w-2/3" />
            <div className="h-32 bg-brand-cream shimmer" />
          </div>
        </div>
      </div>
    );
  }

  const soldOut = !bundle.in_stock || bundle.stock_quantity === 0;

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <button onClick={() => navigate(-1)} className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-brand-muted hover:text-brand-red">
          <ArrowLeft size={14} /> Voltar
        </button>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="reveal relative overflow-hidden bg-brand-cream border border-brand-border aspect-square">
            <div className="absolute inset-0 grid place-items-center">
              <Package2 size={90} className="text-brand-muted/20" />
            </div>
            {bundle.image && <img src={bundle.image} alt={bundle.name} className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700" />}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {bundle.featured && <Badge><Sparkles size={12} /> Destaque</Badge>}
              {bundle.badge && <Badge>{bundle.badge}</Badge>}
              {soldOut && <span className="bg-brand-red text-white text-[10px] uppercase tracking-[0.2em] px-3 py-2">Esgotado</span>}
            </div>
          </div>

          <div className="reveal reveal-delay-1">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-red">Cabaz especial</p>
            <h1 className="mt-3 font-serif text-6xl md:text-7xl text-brand-espresso leading-none">{bundle.name}</h1>
            <p className="mt-5 text-brand-muted leading-relaxed text-lg">{bundle.description || "Cabaz preparado com produtos selecionados pela nossa equipa."}</p>
            {bundle.details && <p className="mt-4 text-brand-muted leading-relaxed">{bundle.details}</p>}

            <div className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Preço</p>
              <p className="font-serif text-5xl text-brand-red">€{Number(bundle.price || 0).toFixed(2)}</p>
            </div>

            {bundle.stock_quantity !== null && bundle.stock_quantity !== undefined && (
              <div className={`mt-5 border p-4 ${bundle.stock_quantity <= 3 ? "border-brand-red bg-brand-red/5 text-brand-red" : "border-brand-border bg-white text-brand-muted"}`}>
                <p className="text-xs uppercase tracking-[0.18em]">
                  {bundle.stock_quantity > 0 ? `Stock disponível: ${bundle.stock_quantity}` : "Cabaz esgotado"}
                </p>
              </div>
            )}

            <button
              onClick={add}
              disabled={soldOut}
              className="mt-8 w-full sm:w-auto px-8 py-4 bg-brand-red text-white text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-brand-redDark transition-all active:scale-[0.99] disabled:opacity-40"
            >
              {added ? <CheckCircle2 size={16} /> : <Plus size={16} />} {soldOut ? "Esgotado" : added ? "Adicionado" : "Adicionar ao cesto"}
            </button>
          </div>
        </div>

        <section className="reveal mt-20 bg-white border border-brand-border p-6 sm:p-8">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-red">Inclui</p>
              <h2 className="font-serif text-4xl text-brand-espresso">Produtos do cabaz</h2>
            </div>
            <ShoppingBag className="text-brand-red" />
          </div>

          {bundle.items?.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bundle.items.map((it, i) => (
                <div key={`${it.name}-${i}`} className="border border-brand-border p-4 bg-brand-bone/40">
                  <p className="font-serif text-2xl text-brand-espresso">{it.name}</p>
                  <p className="text-sm text-brand-muted mt-1">{it.quantity}{it.unit === "kg" ? " kg" : ` ${it.unit}`}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-brand-muted">A composição deste cabaz é definida pela loja.</p>
          )}
        </section>

        <div className="mt-12 text-center">
          <Link to="/loja" className="inline-flex text-xs uppercase tracking-[0.18em] text-brand-red">Ver mais produtos</Link>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }) {
  return <span className="inline-flex items-center gap-1 bg-brand-bone/95 backdrop-blur-sm text-[10px] uppercase tracking-[0.18em] px-2.5 py-1.5 text-brand-espresso shadow-sm">{children}</span>;
}
