import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronRight, Crown, ShieldCheck, Truck, Zap, Trophy, UserRound, PackageCheck } from "lucide-react";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import { useSeo } from "../components/Seo";

const CATEGORIES = [
  { slug: "clubes", name: "CLUBES", kicker: "01", icon: "01" },
  { slug: "selecoes", name: "SELEÇÕES", kicker: "02", icon: "02" },
  { slug: "retro", name: "RETRO", kicker: "03", icon: "03" },
  { slug: "treino", name: "TREINO", kicker: "04", icon: "04" },
  { slug: "crianca", name: "JUNIOR", kicker: "05", icon: "05" },
  { slug: "acessorios", name: "ACESSÓRIOS", kicker: "06", icon: "06" },
];

const HOW_IT_WORKS = [
  ["01", UserRound, "ESCOLHE", "Encontra a camisola que queres na loja."],
  ["02", PackageCheck, "PERSONALIZA", "Escolhe o tamanho e, quando disponível, adiciona nome e número."],
  ["03", ShieldCheck, "CONFIRMA", "Regista a encomenda e recebe a referência."],
  ["04", Truck, "RECEBE", "Acompanha o estado até chegar a tua casa."],
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  useSeo({ title: "FutWearPT — Camisolas de Futebol", description: "Camisolas de futebol, retro, treino e personalização. Veste o teu clube." });

  useEffect(() => {
    let alive = true;
    api.get("/products", { params: { featured: true } })
      .then((r) => {
        if (!alive) return;
        const data = Array.isArray(r.data) ? r.data : (r.data?.products || r.data?.items || []);
        setFeatured(data.slice(0, 6));
      })
      .catch(() => alive && setFeatured([]));
    return () => { alive = false; };
  }, []);

  return (
    <div data-testid="home-page" className="fw-home">
      <section className="fw-hero">
        <div className="fw-grid" /><div className="fw-noise" />
        <div className="fw-speed fw-speed-1" /><div className="fw-speed fw-speed-2" /><div className="fw-speed fw-speed-3" />
        <div className="fw-hero-inner">
          <div className="fw-hero-copy">
            <div className="fw-eyebrow"><span /> FUTEBOL · PORTUGAL · 2026</div>
            <h1><span>VESTE.</span><span>JOGA.</span><strong>DOMINA.</strong></h1>
            <p className="fw-hero-sub">Camisolas para quem leva o futebol a sério. <b>Clubes, seleções, retro, treino e personalização.</b></p>
            <div className="fw-actions">
              <Link to="/loja" className="fw-btn fw-btn-acid">VER CAMISOLAS <ArrowRight size={18} /></Link>
              <Link to="/loja?cat=retro" className="fw-btn fw-btn-ghost">EXPLORAR RETRO</Link>
            </div>
            <div className="fw-proof-row">
              <div><Zap size={17} /><span>NOVIDADES<br/><b>LIMITADAS</b></span></div>
              <div><ShieldCheck size={17} /><span>QUALIDADE<br/><b>FOOTBALL</b></span></div>
              <div><Truck size={17} /><span>ENVIO<br/><b>PORTUGAL</b></span></div>
            </div>
          </div>
          <div className="fw-hero-art" aria-hidden="true">
            <div className="fw-circle fw-circle-a" /><div className="fw-circle fw-circle-b" />
            <div className="fw-jersey"><div className="fw-jersey-collar" /><div className="fw-jersey-sleeve fw-jersey-left" /><div className="fw-jersey-sleeve fw-jersey-right" /><div className="fw-jersey-body"><span className="fw-jersey-mini">FW</span><b>7</b><small>FUTWEARPT</small></div></div>
            <div className="fw-stamp"><Crown size={16} /><span>FOOTBALL<br/>CULTURE</span></div>
            <div className="fw-vertical">FUTWEARPT / 2026 / FOOTBALL ONLY</div>
          </div>
        </div>
        <div className="fw-marquee"><div>CAMISOLAS DE FUTEBOL <span>✦</span> CLUBES <span>✦</span> SELEÇÕES <span>✦</span> RETRO <span>✦</span> PERSONALIZAÇÃO <span>✦</span> ENVIO EM PORTUGAL <span>✦</span> CAMISOLAS DE FUTEBOL <span>✦</span></div></div>
      </section>

      <section className="fw-drop-bar">
        <div><span className="fw-live-dot" /> FUTWEARPT / AGORA ONLINE</div>
        <div className="fw-drop-count">6 CATEGORIAS <ChevronRight size={16} /></div>
      </section>

      <section className="fw-section fw-categories">
        <div className="fw-section-head reveal">
          <div><p className="fw-kicker">ESCOLHE O TEU LADO</p><h2>SEM DESCULPAS.<br/><em>SÓ FUTEBOL.</em></h2></div>
          <Link to="/loja" className="fw-text-link">VER TODA A LOJA <ArrowRight size={16} /></Link>
        </div>
        <div className="fw-category-grid">
          {CATEGORIES.map((c, i) => <Link key={c.slug} to={"/loja?cat=" + c.slug} className={"fw-category fw-cat-" + (i + 1) + " reveal reveal-delay-" + ((i % 3) + 1)}><span className="fw-cat-num">{c.kicker}</span><span className="fw-cat-icon">{c.icon}</span><div><small>FUTWEARPT</small><h3>{c.name}</h3></div><ArrowRight className="fw-cat-arrow" size={22} /></Link>)}
        </div>
      </section>

      {featured.length > 0 && <section className="fw-section fw-products">
        <div className="fw-section-head reveal"><div><p className="fw-kicker">DESTAQUES</p><h2>AS MAIS<br/><em>QUENTES.</em></h2></div><Link to="/loja" className="fw-text-link">VER TUDO <ArrowRight size={16} /></Link></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{featured.map((p, i) => <div key={p.id} className={"reveal reveal-delay-" + ((i % 3) + 1)}><ProductCard product={p} /></div>)}</div>
      </section>}

      <section className="fw-section fw-how">
        <div className="fw-section-head reveal">
          <div><p className="fw-kicker">COMPRA SEM COMPLICAÇÕES</p><h2>DO SITE<br/><em>À TUA PORTA.</em></h2></div>
          <p className="max-w-md text-sm text-zinc-500 leading-relaxed">Tudo pensado para escolher, personalizar e acompanhar a tua encomenda sem perder tempo.</p>
        </div>
        <div className="fw-value-grid">
          {HOW_IT_WORKS.map(([n, Icon, title, desc], i) => <div key={n} className={"fw-value reveal reveal-delay-" + ((i % 3) + 1)}><span>{n}</span><Icon size={18}/><h3>{title}</h3><p>{desc}</p></div>)}
        </div>
        <div className="mt-8 text-center"><Link to="/loja" className="fw-btn fw-btn-acid">COMEÇAR A COMPRAR <ArrowRight size={17}/></Link></div>
      </section>

      <section className="fw-attack">
        <div className="fw-attack-grid" />
        <div className="fw-section fw-attack-inner">
          <div className="fw-attack-number">90</div>
          <div className="fw-attack-copy"><p className="fw-kicker">NÃO É MODA. É CULTURA.</p><h2>O TEU CLUBE<br/><em>NO PEITO.</em></h2><p>Escolhe a camisola, mete o teu nome quando disponível e entra em campo como se fosse final.</p><Link to="/loja" className="fw-btn fw-btn-acid">VER CAMISOLAS <ArrowRight size={18} /></Link></div>
          <div className="fw-attack-badge"><Trophy size={28}/><span>BUILT FOR<br/><b>FOOTBALL</b></span></div>
        </div>
      </section>

      <section className="fw-section fw-values">
        <div className="fw-section-head reveal"><div><p className="fw-kicker">LOGÍSTICA FUTWEARPT</p><h2>ACOMPANHA<br/><em>CADA PASSO.</em></h2></div><p className="max-w-md text-sm text-zinc-500 leading-relaxed">Depois da encomenda, podes acompanhar o estado na tua conta ou através da página da encomenda.</p></div>
        <div className="fw-value-grid">
          {[
            ["01", "PAGAMENTO", "A encomenda fica a aguardar confirmação do pagamento."],
            ["02", "PRODUÇÃO", "Depois da confirmação, começamos a preparar a encomenda."],
            ["03", "ENVIO", "A encomenda é expedida para a morada indicada."],
            ["04", "CONCLUÍDO", "Acompanha o estado até receberes a tua encomenda."],
          ].map(([n, t, d], i) => <div key={n} className={"fw-value reveal reveal-delay-" + ((i % 3) + 1)}><span>{n}</span><Truck size={17}/><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </section>

      <section className="fw-final-cta"><div className="fw-final-lines" /><p className="fw-kicker">FUTWEARPT / FOOTBALL ONLY</p><h2>VESTE A<br/><em>TUA HISTÓRIA.</em></h2><Link to="/loja" className="fw-btn fw-btn-acid">COMPRAR AGORA <ArrowRight size={18}/></Link></section>
    </div>
  );
}
