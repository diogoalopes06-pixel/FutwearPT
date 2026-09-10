import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Heart, Plus, Share2, ShoppingBag, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [review, setReview] = useState({ name: "", text: "", stars: 5 });
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [size, setSize] = useState("");
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/products/${id}`),
      api.get("/products").catch(() => ({ data: [] })),
      api.get(`/products/${id}/reviews`).catch(() => ({ data: [] })),
    ])
      .then(([p, all, rev]) => {
        setProduct(p.data);
        setSize((p.data.sizes || ["M"])[0]);
        setAllProducts(all.data || []);
        setReviews(rev.data || []);
      })
      .catch(() => navigate("/loja"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  // Open Graph meta tags
  useEffect(() => {
    if (!product) return;
    const setMeta = (prop, content) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    document.title = `${product.name} — FutWearPT`;
    setMeta("og:title", `${product.name} — FutWearPT`);
    setMeta("og:description", product.description || "Camisola de futebol FutWearPT.");
    setMeta("og:url", window.location.href);
    if (product.image) setMeta("og:image", product.image);
    setMeta("og:type", "product");
    return () => { document.title = "FutWearPT"; };
  }, [product]);

  const related = useMemo(() => {
    if (!product) return [];
    const manual = (Array.isArray(product.related_ids) ? product.related_ids : []).map((rid) => allProducts.find((p) => p.id === rid)).filter(Boolean);
    const automatic = allProducts
      .filter((p) => p.id !== product.id && !manual.some((m) => m.id === p.id) && (p.category === product.category || p.featured || p.seasonal || p.bestseller || p.promotion))
      .slice(0, Math.max(0, 4 - manual.length));
    return [...manual, ...automatic].slice(0, 4);
  }, [allProducts, product]);

  const suggestions = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((p) => p.id !== product.id)
      .map((p) => ({ ...p, score: (p.category === product.category ? 3 : 0) + (p.featured ? 1 : 0) + (p.seasonal ? 1 : 0) + (p.bestseller ? 1 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [allProducts, product]);

  const add = () => {
    if (!size) { toast.error("Escolhe um tamanho."); return; }
    if (product.personalizable && customNumber && !/^\d{1,2}$/.test(customNumber)) { toast.error("O número deve ter 1 ou 2 dígitos."); return; }
    addItem(product, 1, { size, custom_name: customName.trim() || null, custom_number: customNumber.trim() || null });
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  };

  const share = async () => {
    const url = window.location.href;
    const text = `${product.name} — €${Number(product.price || 0).toFixed(2)}/${product.unit} — FutWearPT`;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, text, url }); return; } catch {}
    }
    // WhatsApp fallback
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!review.name.trim() || !review.text.trim()) { toast.error("Preencha nome e comentário."); return; }
    try {
      await api.post(`/products/${product.id}/reviews`, { product_id: product.id, ...review });
      setReview({ name: "", text: "", stars: 5 });
      toast.success("Avaliação enviada. Será publicada após aprovação.");
    } catch { toast.error("Erro ao enviar avaliação."); }
  };

  if (loading || !product) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-10">
          <div className="aspect-square bg-brand-cream animate-pulse" />
          <div className="space-y-4">
            <div className="h-12 bg-brand-cream animate-pulse" />
            <div className="h-4 bg-brand-cream animate-pulse w-2/3" />
            <div className="h-32 bg-brand-cream animate-pulse" />
            <div className="h-12 bg-brand-cream animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  const fav = isFavorite(product.id);

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <button onClick={() => navigate(-1)} className="mb-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-brand-muted hover:text-brand-red">
          <ArrowLeft size={14} /> Voltar
        </button>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="reveal relative overflow-hidden bg-brand-cream border border-brand-border aspect-square">
            <div className="absolute inset-0 grid place-items-center"><span className="font-serif text-9xl text-brand-muted/15">{(product.name || "P").charAt(0)}</span></div>
            {product.image && <img src={product.image} alt={product.name || "Produto"} onError={(e) => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700" />}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.featured && <Badge><Sparkles size={12} /> Destaque</Badge>}
              {product.seasonal && <Badge>Da época</Badge>}
              {product.bestseller && <Badge>Mais vendido</Badge>}
              {product.promotion && <Badge>Promoção</Badge>}
            </div>
          </div>

          <div className="reveal reveal-delay-1">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-red">{(product.category || "produto").replace("-", " ")}</p>
            <h1 className="mt-3 font-serif text-6xl md:text-7xl text-brand-espresso leading-none">{product.name || "Produto"}</h1>
            <p className="mt-5 text-brand-muted leading-relaxed text-lg">{product.description || "Produto selecionado diariamente pela nossa equipa."}</p>

            <div className="mt-8 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Preço</p>
                <p className="font-serif text-5xl text-brand-red">€{Number(product.price || 0).toFixed(2)}<span className="text-base text-brand-muted ml-1">/ {product.unit}</span></p>
              </div>
              {reviews.length > 0 && (
                <div className="flex items-center gap-1 text-brand-red">
                  {Array(5).fill(0).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                  <span className="text-xs text-brand-muted ml-2">{reviews.length} avaliações</span>
                </div>
              )}
            </div>

            <div className="mt-8 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mb-2">Tamanho</p>
                <div className="flex flex-wrap gap-2">
                  {(product.sizes || ["S", "M", "L", "XL"]).map((s) => (
                    <button type="button" key={s} onClick={() => setSize(s)} className={`min-w-14 px-4 py-3 border text-sm ${size === s ? "border-brand-red bg-brand-red text-white" : "border-brand-border bg-white text-brand-espresso hover:border-brand-red"}`}>{s}</button>
                  ))}
                </div>
              </div>
              {product.personalizable && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block"><span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Nome (opcional)</span><input maxLength={14} value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="EX: CR7" className="mt-2 w-full border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red" /></label>
                  <label className="block"><span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Número (opcional)</span><input inputMode="numeric" maxLength={2} value={customNumber} onChange={(e) => setCustomNumber(e.target.value.replace(/\D/g, ""))} placeholder="EX: 7" className="mt-2 w-full border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red" /></label>
                </div>
              )}
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              <button onClick={add} disabled={!product.in_stock} className="py-4 bg-brand-red text-white text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-brand-redDark transition-all active:scale-[0.99] disabled:opacity-40">
                {added ? <CheckCircle2 size={16} /> : <Plus size={16} />} {added ? "Adicionado" : "Adicionar ao cesto"}
              </button>
              <button onClick={() => toggleFavorite(product)} className={`py-4 border text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${fav ? "border-brand-red text-brand-red bg-brand-red/5" : "border-brand-border text-brand-espresso hover:border-brand-red"}`}>
                <Heart size={16} fill={fav ? "currentColor" : "none"} /> {fav ? "Favorito" : "Guardar favorito"}
              </button>
            </div>

            {/* Botão partilhar */}
            <button onClick={share} className="mt-3 w-full py-3 border border-brand-border text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 text-brand-muted hover:text-brand-espresso hover:border-brand-espresso transition-all">
              <Share2 size={14} /> Partilhar produto
            </button>
          </div>
        </div>

        {suggestions.length > 0 && (
          <section className="reveal mt-20 bg-white border border-brand-border p-6 sm:p-8">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div><p className="text-xs uppercase tracking-[0.25em] text-brand-red">Sugestões</p><h2 className="font-serif text-4xl text-brand-espresso">Combina bem com...</h2></div>
              <ShoppingBag className="text-brand-red" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {suggestions.map((p) => (
                <Link key={p.id} to={`/produto/${p.id}`} className="border border-brand-border p-4 hover:border-brand-red hover:-translate-y-1 transition-all bg-brand-bone/40">
                  <p className="font-serif text-2xl text-brand-espresso">{p.name}</p>
                  <p className="text-sm text-brand-muted mt-1">€{Number(p.price || 0).toFixed(2)} / {p.unit}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="reveal mt-16 grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-brand-border p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.25em] text-brand-red">Avaliações aprovadas</p>
            <h2 className="font-serif text-4xl text-brand-espresso mt-2">Opinião dos clientes</h2>
            <div className="mt-6 space-y-4">
              {reviews.length === 0 && <p className="text-brand-muted">Ainda não existem avaliações aprovadas.</p>}
              {reviews.map((r) => (
                <div key={r.id} className="border-t border-brand-border pt-4">
                  <div className="flex items-center gap-1 text-brand-red">{Array(Number(r.stars || 5)).fill(0).map((_, i) => <Star key={i} size={13} fill="currentColor" />)}</div>
                  <p className="mt-2 text-brand-espresso">{r.text}</p>
                  <p className="mt-1 text-xs text-brand-muted">— {r.name}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={submitReview} className="bg-white border border-brand-border p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.25em] text-brand-red">Deixar avaliação</p>
            <h2 className="font-serif text-4xl text-brand-espresso mt-2">Partilhe a sua opinião</h2>
            <div className="mt-6 space-y-4">
              <input value={review.name} onChange={(e) => setReview({ ...review, name: e.target.value })} placeholder="O seu nome" className="w-full border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red" />
              <select value={review.stars} onChange={(e) => setReview({ ...review, stars: Number(e.target.value) })} className="w-full border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red">
                {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} estrelas</option>)}
              </select>
              <textarea value={review.text} onChange={(e) => setReview({ ...review, text: e.target.value })} rows={4} placeholder="Comentário" className="w-full border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red resize-none" />
              <button className="w-full py-4 bg-brand-espresso text-brand-bone text-xs uppercase tracking-[0.2em] hover:bg-brand-red transition-colors">Enviar para aprovação</button>
            </div>
          </form>
        </section>

        {related.length > 0 && (
          <section className="reveal mt-20">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div><p className="text-xs uppercase tracking-[0.25em] text-brand-red">Também pode gostar</p><h2 className="font-serif text-5xl text-brand-espresso">Produtos relacionados</h2></div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}

function Badge({ children }) {
  return <span className="inline-flex items-center gap-1 bg-brand-bone/95 backdrop-blur-sm text-[10px] uppercase tracking-[0.18em] px-2.5 py-1.5 text-brand-espresso shadow-sm">{children}</span>;
}
