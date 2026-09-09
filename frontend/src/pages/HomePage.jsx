import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Star, Leaf, Sparkles, Truck } from "lucide-react";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import BundlesSection from "../components/BundlesSection";
import { useContent } from "../context/ContentContext";
import { useSeo } from "../components/Seo";

const JAMS_IMG = "https://static.prod-images.emergentagent.com/jobs/29644c96-d4a1-4651-9cb8-e1e8ae32b23e/images/acbc8436dac892a2a9193176b7908927dbc1ee336e5c278fe899743ef72a404e.png";

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const { content } = useContent();
  const { hero, about, reviews, categories, cta_title, cta_subtitle } = content;
  useSeo();

  useEffect(() => {
  api.get("/products", { params: { featured: true } })
    .then((r) => {
      const data = Array.isArray(r.data) ? r.data : [];
      setFeatured(data.slice(0, 6));
    });
}, []);

  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative min-h-[92vh] pt-20 overflow-hidden bg-brand-bone">
        <div className="absolute inset-0 paper-texture opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 grid lg:grid-cols-12 gap-10 items-center min-h-[92vh] py-16">
          <div className="lg:col-span-6 z-10">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-brand-red mb-6">
              <span className="w-8 h-px bg-brand-red"></span> {hero.tagline}
            </p>
            <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-brand-espresso">
              {hero.title_part1} <em className="text-brand-red not-italic">{hero.title_emphasis}</em> {hero.title_part2}
            </h1>
            {hero.subtitle && (
              <p className="mt-8 max-w-lg text-lg text-brand-muted leading-relaxed">{hero.subtitle}</p>
            )}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/loja" data-testid="hero-shop-button" className="px-8 py-4 bg-brand-red text-white text-sm uppercase tracking-[0.18em] hover:bg-brand-redDark transition-all duration-300 inline-flex items-center gap-3 group">
                {hero.cta_primary}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/sobre" data-testid="hero-about-button" className="px-8 py-4 border border-brand-espresso text-brand-espresso text-sm uppercase tracking-[0.18em] hover:bg-brand-espresso hover:text-brand-bone transition-all">
                {hero.cta_secondary}
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-4 max-w-md">
              {[
                { icon: Leaf, label: "Modelos 2026" },
                { icon: Sparkles, label: "Personalizáveis" },
                { icon: Truck, label: "Envio para Portugal" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-start gap-2">
                  <Icon size={20} className="text-brand-red" />
                  <span className="text-xs text-brand-muted leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="relative aspect-[4/5] overflow-hidden bg-brand-cream float-soft">
              {hero.image && <img src={hero.image} alt="Hero" className="w-full h-full object-cover" />}
            </div>
            <div className="hidden md:block absolute -bottom-8 -left-8 w-44 bg-brand-red text-brand-bone p-6 z-10">
              <p className="font-serif text-3xl leading-none">{hero.rating_value}<span className="text-base">/5</span></p>
              <div className="flex gap-0.5 mt-2">
                {Array(5).fill(0).map((_, i) => <Star key={i} size={11} fill="currentColor" />)}
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] mt-3 opacity-80">{hero.rating_label}</p>
            </div>
          </div>
        </div>
      </section>

      
      <section className="relative overflow-hidden py-24 bg-brand-espresso text-brand-bone">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-brand-red blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-brand-bone blur-3xl" />
        </div>

        <div className="reveal relative max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-brand-bone/70 mb-5">
            FutWearPT
          </p>

          <h2 className="font-serif text-5xl md:text-7xl leading-tight">
            Veste a tua paixão.
          </h2>

          <p className="mt-6 text-brand-bone/75 max-w-2xl mx-auto leading-relaxed">
            Camisolas de futebol, modelos retro e equipamento de treino com personalização.
          </p>
        </div>
      </section>


      {/* CATEGORIES */}
      {categories?.length > 0 && (
        <section className="py-24 lg:py-32 bg-brand-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
            <div className="reveal flex items-end justify-between mb-14 flex-wrap gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-3">Coleção</p>
                <h2 className="font-serif text-5xl md:text-6xl text-brand-espresso leading-tight">Da terra<br/>à sua mesa.</h2>
              </div>
              <Link to="/loja" className="text-sm uppercase tracking-[0.18em] text-brand-espresso hover:text-brand-red flex items-center gap-2">
                Ver tudo <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/loja?cat=${c.slug}`}
                  data-testid={`category-${c.slug}`}
                  className="group relative aspect-[3/4] overflow-hidden bg-brand-espresso"
                >
                  {c.image && <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-espresso via-brand-espresso/30 to-transparent" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <h3 className="font-serif text-3xl text-brand-bone leading-tight">{c.name}</h3>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-brand-bone/70 mt-2 inline-flex items-center gap-2">
                      Comprar <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="py-24 lg:py-32 bg-brand-bone">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
            <div className="reveal flex items-end justify-between mb-14 flex-wrap gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-3">Destaques</p>
                <h2 className="font-serif text-5xl md:text-6xl text-brand-espresso leading-tight">Os preferidos da semana.</h2>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* BUNDLES */}
      <BundlesSection />

      {/* ABOUT */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="aspect-[4/5] overflow-hidden bg-brand-cream">
              {about.image && <img src={about.image} alt="" className="w-full h-full object-cover" />}
            </div>
          </div>
          <div className="lg:col-span-6 order-1 lg:order-2">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-4">{about.tagline}</p>
            <h2 className="font-serif text-5xl md:text-6xl leading-tight text-brand-espresso">{about.title}</h2>
            <div className="mt-8 space-y-5 text-brand-muted leading-relaxed whitespace-pre-line">
              {about.paragraph1 && <p>{about.paragraph1}</p>}
              {about.paragraph2 && <p>{about.paragraph2}</p>}
            </div>
            <Link to="/sobre" className="mt-10 inline-flex items-center gap-3 text-sm uppercase tracking-[0.18em] text-brand-red hover:gap-4 transition-all">
              Ler a nossa história <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      {reviews?.length > 0 && (
        <section className="py-24 lg:py-32 bg-brand-cream">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-3">Recomendado por quem nos visita</p>
              <h2 className="font-serif text-5xl md:text-6xl text-brand-espresso leading-tight">{hero.rating_value} estrelas no Google.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {reviews.map((r, i) => (
                <div key={i} className="bg-white border border-brand-border p-8 flex flex-col" data-testid={`review-${i}`}>
                  <div className="flex gap-0.5 text-brand-red mb-5">
                    {Array(r.stars || 5).fill(0).map((_, j) => <Star key={j} size={14} fill="currentColor" />)}
                  </div>
                  <p className="font-serif text-xl text-brand-espresso leading-snug flex-1">"{r.text}"</p>
                  <p className="text-sm text-brand-muted mt-6 uppercase tracking-[0.18em]">— {r.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative py-32 overflow-hidden bg-brand-red">
        <div className="absolute inset-0 opacity-15">
          <img src={JAMS_IMG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-5xl md:text-7xl text-brand-bone leading-tight whitespace-pre-line">{cta_title}</h2>
          {cta_subtitle && <p className="text-brand-bone/85 mt-6 max-w-xl mx-auto leading-relaxed">{cta_subtitle}</p>}
          <Link to="/loja" data-testid="cta-shop-button" className="mt-10 inline-block px-10 py-4 bg-brand-bone text-brand-espresso text-sm uppercase tracking-[0.2em] hover:bg-white transition-colors">
            Começar a encomendar
          </Link>
        </div>
      </section>
    </div>
  );
}
