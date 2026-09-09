import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Eye, Package2 } from "lucide-react";
import api from "../lib/api";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";

export default function BundlesSection() {
  const [bundles, setBundles] = useState([]);
  const { addItem } = useCart();

  useEffect(() => {
  api.get("/bundles", { params: { active: true } })
    .then((r) => {
      const data = Array.isArray(r.data) ? r.data : [];
      setBundles(data.slice(0, 3));
    })
    .catch(() => {});
}, []);

  if (bundles.length === 0) return null;

  return (
    <section className="py-24 lg:py-32 bg-brand-bone" data-testid="bundles-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-3">Cabazes da semana</p>
            <h2 className="font-serif text-5xl md:text-6xl text-brand-espresso leading-tight">Pequenos prazeres,<br/>pré-escolhidos.</h2>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(bundles) ? bundles : []).map((b) => {
            const soldOut = !b.in_stock || b.stock_quantity === 0 || !b.active;
            return (
              <article key={b.id} className="bg-white border border-brand-border overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(44,39,36,0.12)] transition-all duration-500" data-testid={`bundle-${b.id}`}>
                <div className="relative aspect-[4/3] bg-brand-cream overflow-hidden">
                  {b.image ? (
                    <img src={b.image} alt={b.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center"><Package2 size={48} className="text-brand-muted/30" /></div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {b.featured && <span className="bg-brand-red text-white text-[10px] uppercase tracking-[0.2em] px-2 py-1">Destaque</span>}
                    {b.badge && <span className="bg-brand-espresso text-white text-[10px] uppercase tracking-[0.2em] px-2 py-1">{b.badge}</span>}
                    {soldOut && <span className="bg-brand-espresso/80 text-white text-[10px] uppercase tracking-[0.2em] px-2 py-1">Esgotado</span>}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-serif text-3xl text-brand-espresso leading-tight">{b.name}</h3>
                  {b.description && <p className="text-sm text-brand-muted mt-2 leading-relaxed">{b.description}</p>}

                  {b.items?.length > 0 && (
                    <ul className="mt-4 text-sm text-brand-muted space-y-1">
                      {b.items.slice(0, 6).map((it, i) => (
                        <li key={i}>• {it.name} <span className="text-brand-muted/70">{it.quantity}{it.unit === "kg" ? " kg" : ` ${it.unit}`}</span></li>
                      ))}
                    </ul>
                  )}

                  {b.stock_quantity !== null && b.stock_quantity !== undefined && (
                    <p className={`mt-4 text-xs uppercase tracking-[0.16em] ${b.stock_quantity <= 3 ? "text-brand-red" : "text-brand-muted"}`}>
                      {b.stock_quantity > 0 ? `Disponíveis: ${b.stock_quantity}` : "Esgotado"}
                    </p>
                  )}

                  <div className="mt-6 pt-6 border-t border-brand-border flex items-center justify-between gap-2">
                    <p className="font-serif text-3xl text-brand-red tabular-nums">€{Number(b.price || 0).toFixed(2)}</p>
                    <div className="flex gap-2">
                      <Link to={`/cabaz/${b.id}`} className="h-11 w-11 grid place-items-center border border-brand-border text-brand-espresso hover:border-brand-red hover:text-brand-red" aria-label="Ver cabaz">
                        <Eye size={15} />
                      </Link>
                      <button
                        onClick={() => {
                          addItem({ id: `bundle-${b.id}`, name: b.name, price: b.price, unit: "un", image: b.image });
                          toast.success(`${b.name} adicionado ao cesto`);
                        }}
                        disabled={soldOut}
                        data-testid={`bundle-add-${b.id}`}
                        className="px-5 py-3 bg-brand-espresso text-brand-bone text-xs uppercase tracking-[0.18em] hover:bg-brand-red transition-colors disabled:opacity-40"
                      >
                        {soldOut ? "Esgotado" : "Encomendar"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
