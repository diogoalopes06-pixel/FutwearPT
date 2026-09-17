import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Heart, Sparkles, Zap } from "lucide-react";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import { useFavorites } from "../context/FavoritesContext";

const CATEGORIES = [
  { slug: "", name: "Todos" },
  { slug: "clubes", name: "Clubes" },
  { slug: "selecoes", name: "Seleções" },
  { slug: "retro", name: "Retro" },
  { slug: "treino", name: "Treino" },
  { slug: "crianca", name: "Criança" },
  { slug: "acessorios", name: "Acessórios" },
];

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const { favoriteIds } = useFavorites();
  const cat = params.get("cat") || "";

  useEffect(() => {
  setLoading(true);

  api
    .get("/products", { params: cat ? { category: cat } : {} })
    .then((r) => {
      const data = Array.isArray(r.data)
        ? r.data
        : (r.data.products || r.data.items || []);
      setProducts(Array.isArray(data) ? data : []);
    })
    .catch((error) => {
      console.error("[futwearpt] Erro ao carregar catálogo:", error);
      setProducts([]);
    })
    .finally(() => setLoading(false));
}, [cat]);

  const normalize = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const terms = normalize(search).split(" ").filter(Boolean);

  const safeProducts = Array.isArray(products)
  ? products
  : Array.isArray(products?.items)
    ? products.items
    : [];

const filtered = safeProducts
    .filter((p) => !showFavorites || favoriteIds.includes(p.id))
    .filter((p) => {
      if (!terms.length) return true;
      const haystack = normalize(`${p.name} ${p.description || ""} ${p.category || ""}`);
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => Number(b.featured || b.seasonal || b.bestseller || b.promotion || 0) - Number(a.featured || a.seasonal || a.bestseller || a.promotion || 0));

  const seasonal = safeProducts.filter(
  (p) => p.seasonal || p.promotion || p.bestseller || p.featured
).slice(0, 4);

  return (
    <div className="pt-32 pb-24 bg-[#080808] text-white min-h-screen" data-testid="shop-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="reveal relative overflow-hidden bg-[#101010] border border-[#292929] p-6 sm:p-10 mb-10">
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-[#E10600]/10" />
          <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-[#171717]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-[#171717] px-3 py-2 mb-4">
              <Zap size={14} className="text-[#E10600]" />
              <p className="text-xs uppercase tracking-[0.25em] text-[#E10600]">FOOTBALL ONLY</p>
            </div>
            <h1 className="font-serif text-5xl md:text-7xl text-white leading-none">
              {CATEGORIES.find((c) => c.slug === cat)?.name || "Todas as camisolas"}
            </h1>
            <p className="mt-4 text-zinc-500 max-w-2xl">Drops para quem vive o futebol dentro e fora do estádio. Sem básicos. Sem desculpas.</p>
          </div>
        </div>

        <div className="reveal lg:hidden mb-8 -mx-4 px-4">
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar camisola, clube..."
              aria-label="Pesquisar produtos"
              className="w-full bg-[#111] border border-[#292929] pl-10 pr-3 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E10600]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.slug || "all-mobile"}
                onClick={() => {
                  if (c.slug) setParams({ cat: c.slug });
                  else setParams({});
                }}
                className={`px-4 py-2.5 text-xs uppercase tracking-[0.16em] border transition-colors ${
                  (cat || "") === c.slug
                    ? "bg-[#E10600] text-black border-[#E10600]"
                    : "bg-[#111] border-[#292929] text-white"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="reveal reveal-delay-1 flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <aside className="hidden lg:block lg:w-64 lg:shrink-0">
            <div className="lg:sticky lg:top-28 space-y-8">
              <div>
                <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Pesquisar</label>
                <div className="mt-2 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    data-testid="shop-search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Portugal, retro, treino..."
                    className="w-full bg-[#111] border border-[#292929] pl-9 pr-3 py-3 text-sm focus:outline-none focus:border-brand-espresso"
                  />
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-4">Categorias</p>
                <ul className="space-y-1">
                  {CATEGORIES.map((c) => (
                    <li key={c.slug || "all"}>
                      <button
                        data-testid={`shop-category-${c.slug || "all"}`}
                        onClick={() => {
                          if (c.slug) setParams({ cat: c.slug });
                          else setParams({});
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                          (cat || "") === c.slug
                            ? "bg-brand-espresso text-brand-bone"
                            : "text-white hover:bg-[#171717]"
                        }`}
                      >
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-[#111] border border-[#292929] overflow-hidden animate-pulse shimmer">
                    <div className="aspect-[4/3] bg-[#171717]" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-[#171717] w-2/3" />
                      <div className="h-3 bg-[#171717] w-full" />
                      <div className="h-10 bg-[#171717] w-1/2 mt-6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-32 text-center text-zinc-500">
                <p className="font-serif text-3xl text-white">Nenhum produto encontrado.</p>
                <p className="mt-2 text-sm">Experimente outra categoria ou pesquisa.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <p className="text-xs text-zinc-500 uppercase tracking-[0.18em]">
                    {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
                  </p>
                  <p className="hidden sm:block text-xs text-zinc-500">Clique em “Cesto” para adicionar rapidamente.</p>
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
