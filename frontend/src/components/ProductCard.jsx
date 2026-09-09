import { Heart, Eye, Plus, Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [added, setAdded] = useState(false);
  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 900);
  };
  const fav = isFavorite(product.id);
  const lowStock = product.in_stock && product.stock_quantity !== null && product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity <= 5;

  return (
    <article
      data-testid={`product-card-${product.id}`}
      className="group bg-white border border-brand-border/80 overflow-hidden hover:-translate-y-1 active:scale-[0.99] hover:shadow-[0_18px_50px_rgba(44,39,36,0.12)] transition-all duration-500 flex flex-col rounded-sm"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-cream">
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <span className="font-serif text-7xl text-brand-muted/20">{(product.name || "P").charAt(0)}</span>
        </div>

        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.featured && (
            <span className="inline-flex items-center gap-1 bg-brand-bone/95 backdrop-blur-sm text-[10px] uppercase tracking-[0.18em] px-2.5 py-1.5 text-brand-espresso shadow-sm">
              <Sparkles size={11} /> Destaque
            </span>
          )}
          {product.seasonal && <span className="bg-green-700/95 text-white text-[10px] uppercase tracking-[0.18em] px-2.5 py-1.5 shadow-sm">Da época</span>}
          {product.bestseller && <span className="bg-brand-espresso/95 text-white text-[10px] uppercase tracking-[0.18em] px-2.5 py-1.5 shadow-sm">Mais vendido</span>}
          {product.promotion && <span className="bg-brand-red/95 text-white text-[10px] uppercase tracking-[0.18em] px-2.5 py-1.5 shadow-sm">Promoção</span>}
          {lowStock && (
            <span className="bg-brand-red/95 text-white text-[10px] uppercase tracking-[0.18em] px-2.5 py-1.5 shadow-sm">
              Últimas {product.stock_quantity}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product); }}
          className={`absolute top-3 right-3 h-10 w-10 grid place-items-center bg-brand-bone/95 backdrop-blur-sm shadow-sm transition-all hover:scale-105 ${fav ? "text-brand-red" : "text-brand-espresso"}`}
          aria-label="Favorito"
        >
          <Heart size={16} fill={fav ? "currentColor" : "none"} />
        </button>

        {!product.in_stock && (
          <div className="absolute inset-0 bg-brand-espresso/65 grid place-items-center">
            <span className="text-brand-bone text-xs uppercase tracking-[0.25em] border border-brand-bone/40 px-4 py-2">Esgotado</span>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-red mb-2">{(product.category || "produto").replace("-", " ")}</p>
          <Link to={`/produto/${product.id}`}><h3 className="font-serif text-2xl leading-snug text-brand-espresso group-hover:text-brand-red transition-colors">{product.name || "Produto"}</h3></Link>
          <p className="text-xs text-brand-muted mt-2 line-clamp-2 leading-relaxed min-h-[2.5rem]">{product.description || ""}</p>
        </div>

        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Preço</p>
            <p className="font-serif text-2xl text-brand-espresso tabular-nums">
              €{Number(product.price || 0).toFixed(2)}
              <span className="text-xs text-brand-muted ml-1">/ {product.unit}</span>
            </p>
          </div>

          <Link to={`/produto/${product.id}`} className="h-12 w-12 grid place-items-center border border-brand-border text-brand-espresso hover:border-brand-red hover:text-brand-red transition-colors" aria-label="Ver produto">
            <Eye size={15} />
          </Link>
          <button
            onClick={handleAdd}
            disabled={!product.in_stock}
            data-testid={`add-to-cart-${product.id}`}
            className="h-12 px-4 sm:px-5 bg-brand-espresso text-brand-bone text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:bg-brand-red transition-all disabled:opacity-40 active:scale-95"
          >
            {added ? <Check size={15} /> : <Plus size={15} />} {added ? "OK" : "Cesto"}
          </button>
        </div>
      </div>
    </article>
  );
}
