import { useNavigate } from "react-router-dom";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function CartDrawer() {
  const { items, open, setOpen, setQty, removeItem, subtotal, clear } = useCart();
  const navigate = useNavigate();

  return (
    <>
      <div
        data-testid="cart-overlay"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-brand-espresso/40 backdrop-blur-md transition-opacity duration-500 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        data-testid="cart-drawer"
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-brand-bone shadow-[-14px_0_60px_rgba(44,39,36,0.18)] flex flex-col transition-transform duration-500 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-muted">O seu cesto</p>
            <h3 className="font-serif text-2xl text-brand-espresso">Cesto Football Store</h3>
          </div>
          <button
            onClick={() => setOpen(false)}
            data-testid="cart-close-button"
            className="h-10 w-10 grid place-items-center rounded-sm hover:bg-brand-cream"
            aria-label="Fechar cesto"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <ShoppingBag size={32} className="text-brand-muted mb-4" />
              <p className="font-serif text-2xl text-brand-espresso">O seu cesto está vazio</p>
              <p className="text-sm text-brand-muted mt-2">Adicione produtos frescos da nossa quintinha.</p>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/loja");
                }}
                data-testid="cart-continue-shopping"
                className="mt-6 px-6 py-3 bg-brand-red text-white text-sm uppercase tracking-[0.18em] hover:bg-brand-redDark transition-colors"
              >
                Ver produtos
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-brand-border">
              {items.map((it) => (
                <li key={it.product_id} className="py-4 flex gap-4 transition-all duration-300 hover:bg-brand-cream/40 -mx-2 px-2" data-testid={`cart-item-${it.product_id}`}>
                  <div className="w-20 h-20 bg-brand-cream rounded-sm overflow-hidden shrink-0">
                    {it.image && <img src={it.image} alt={it.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium text-brand-espresso truncate">{it.name}</p>
                      <button
                        onClick={() => removeItem(it.product_id)}
                        data-testid={`cart-remove-${it.product_id}`}
                        className="text-brand-muted hover:text-brand-red"
                        aria-label="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-brand-muted mt-0.5">€{it.price.toFixed(2)} / {it.unit}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center border border-brand-border rounded-sm">
                        <button
                          onClick={() => setQty(it.product_id, Math.max(0, +(it.quantity - (it.unit === "kg" ? 0.5 : 1)).toFixed(2)))}
                          data-testid={`cart-decrease-${it.product_id}`}
                          className="h-8 w-8 grid place-items-center hover:bg-brand-cream"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-3 text-sm tabular-nums">{it.quantity}{it.unit === "kg" ? " kg" : ""}</span>
                        <button
                          onClick={() => setQty(it.product_id, +(it.quantity + (it.unit === "kg" ? 0.5 : 1)).toFixed(2))}
                          data-testid={`cart-increase-${it.product_id}`}
                          className="h-8 w-8 grid place-items-center hover:bg-brand-cream"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="font-medium tabular-nums">€{(it.price * it.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-brand-border px-6 py-5 space-y-4 bg-white">
            <div className="flex justify-between text-sm">
              <span className="text-brand-muted">Subtotal</span>
              <span className="font-medium tabular-nums" data-testid="cart-subtotal">€{subtotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-brand-muted leading-relaxed">
              Custos de entrega calculados na finalização. Levantamento na loja gratuito.
            </p>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/checkout");
              }}
              data-testid="cart-checkout-button"
              className="w-full py-4 bg-brand-red text-white text-sm uppercase tracking-[0.18em] hover:bg-brand-redDark transition-colors"
            >
              Finalizar encomenda
            </button>
            <button
              onClick={clear}
              data-testid="cart-clear-button"
              className="w-full text-xs text-brand-muted hover:text-brand-red"
            >
              Esvaziar cesto
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
