import { useNavigate } from "react-router-dom";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";
import { useCart } from "../context/CartContext";
import FwImage from "./FwImage";

export default function CartDrawer() {
  const { items, open, setOpen, setQty, removeItem, subtotal, clear, itemKey } = useCart();
  const navigate = useNavigate();
  const totalUnits = items.reduce((n, i) => n + Number(i.quantity || 0), 0);

  return (
    <>
      <div data-testid="cart-overlay" onClick={() => setOpen(false)}
        className={"fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 " + (open ? "opacity-100" : "opacity-0 pointer-events-none")} />
      <aside data-testid="cart-drawer"
        className={"fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-brand-bone shadow-[-14px_0_60px_rgba(0,0,0,.35)] flex flex-col transition-transform duration-300 ease-out " + (open ? "translate-x-0" : "translate-x-full")}>
        <div className="px-5 sm:px-6 py-5 border-b border-brand-border flex items-center justify-between bg-white safe-top">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-red">FutWearPT</p>
            <h3 className="font-serif text-2xl text-brand-espresso">O teu cesto</h3>
            <p className="text-xs text-brand-muted mt-1">{items.length} artigo{items.length === 1 ? "" : "s"} · {totalUnits} unidade{totalUnits === 1 ? "" : "s"}</p>
          </div>
          <button onClick={() => setOpen(false)} data-testid="cart-close-button" className="h-11 w-11 grid place-items-center border border-brand-border hover:border-brand-red hover:text-brand-red" aria-label="Fechar cesto"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-16 h-16 rounded-full bg-white border border-brand-border grid place-items-center mb-5"><ShoppingBag size={26} className="text-brand-red" /></div>
              <p className="font-serif text-2xl text-brand-espresso">O teu cesto está vazio</p>
              <p className="text-sm text-brand-muted mt-2 max-w-xs">Escolhe uma camisola e guarda-a aqui antes de finalizar a encomenda.</p>
              <button onClick={() => { setOpen(false); navigate("/loja"); }} data-testid="cart-continue-shopping"
                className="mt-6 w-full max-w-xs px-6 py-4 bg-brand-red text-white text-sm uppercase tracking-[0.18em] font-bold hover:bg-brand-redDark">Ver camisolas</button>
            </div>
          ) : (
            <ul className="divide-y divide-brand-border">
              {items.map((it) => {
                const key = itemKey(it);
                const step = it.unit === "kg" ? 0.5 : 1;
                return (
                  <li key={key} className="py-4 flex gap-3 sm:gap-4" data-testid={"cart-item-" + key}>
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-brand-cream overflow-hidden shrink-0">
                      <FwImage src={it.image} alt={it.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <p className="font-semibold text-brand-espresso leading-tight">{it.name}</p>
                        <button onClick={() => removeItem(key)} data-testid={"cart-remove-" + key} className="text-brand-muted hover:text-brand-red shrink-0" aria-label={"Remover " + it.name}><Trash2 size={16} /></button>
                      </div>
                      <p className="text-xs text-brand-muted mt-1">€{Number(it.price).toFixed(2)} / {it.unit}</p>
                      {(it.size || it.custom_name || it.custom_number) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {it.size && <span className="px-2 py-1 bg-brand-cream text-[10px] uppercase tracking-[0.12em] text-brand-espresso">Tam. {it.size}</span>}
                          {it.custom_name && <span className="px-2 py-1 bg-brand-cream text-[10px] text-brand-espresso">{it.custom_name}</span>}
                          {it.custom_number && <span className="px-2 py-1 bg-brand-cream text-[10px] text-brand-espresso">#{it.custom_number}</span>}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center border border-brand-border bg-white">
                          <button onClick={() => setQty(key, Math.max(0, +(Number(it.quantity) - step).toFixed(2)))} className="h-9 w-9 grid place-items-center hover:bg-brand-cream" aria-label="Diminuir"><Minus size={14} /></button>
                          <span className="min-w-10 text-center text-sm tabular-nums">{it.quantity}{it.unit === "kg" ? " kg" : ""}</span>
                          <button onClick={() => setQty(key, +(Number(it.quantity) + step).toFixed(2))} className="h-9 w-9 grid place-items-center hover:bg-brand-cream" aria-label="Aumentar"><Plus size={14} /></button>
                        </div>
                        <p className="font-bold tabular-nums text-brand-espresso">€{(Number(it.price) * Number(it.quantity)).toFixed(2)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-brand-border px-5 sm:px-6 py-5 space-y-4 bg-white safe-bottom">
            <div className="flex items-start gap-3 p-3 bg-brand-red/5 border border-brand-red/15">
              <ShieldCheck size={17} className="text-brand-red shrink-0 mt-0.5" />
              <p className="text-xs text-brand-muted leading-relaxed">Portes e condições de entrega são calculados na finalização. Preparação habitual: <strong className="text-brand-espresso">24–48h úteis</strong>.</p>
            </div>
            <div className="flex justify-between text-sm"><span className="text-brand-muted">Subtotal</span><span className="font-bold tabular-nums text-brand-espresso">€{subtotal.toFixed(2)}</span></div>
            <button onClick={() => { setOpen(false); navigate("/checkout"); }} data-testid="cart-checkout-button"
              className="w-full py-4 bg-brand-red text-white text-sm uppercase tracking-[0.18em] font-bold hover:bg-brand-redDark transition-colors flex items-center justify-center gap-2">Finalizar encomenda <ArrowRight size={16} /></button>
            <button onClick={clear} data-testid="cart-clear-button" className="w-full text-xs text-brand-muted hover:text-brand-red py-1">Esvaziar cesto</button>
          </div>
        )}
      </aside>
    </>
  );
}
