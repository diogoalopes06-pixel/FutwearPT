import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const ContentContext = createContext(null);

const HERO_IMG = "";
const ABOUT_IMG = "";

const FALLBACK = {
  hero: { tagline: "FUTEBOL · PORTUGAL · 2026", title_part1: "Veste.", title_emphasis: "Joga.", title_part2: "Domina.", subtitle: "Camisolas para quem leva o futebol a sério. Clubes, seleções, retro, treino e personalização.", image: "", cta_primary: "Entrar na loja", cta_secondary: "Conhecer a FutWearPT", rating_value: "4.9", rating_label: "Clientes FutWearPT" },
  about: { tagline: "Football only", title: "Não é moda. É cultura.", paragraph1: "A FutWearPT nasceu para quem não consegue ver uma camisola sem imaginar um jogo.", paragraph2: "Selecionamos camisolas de clubes, seleções, retro e treino com foco em atitude, qualidade e personalização. Veste o teu clube. Veste a tua história.", image: "" },
  contact: { address_line1: "Portugal", address_line2: "Loja online", phone: "", email: "hello@futwearpt.pt", facebook_url: "", facebook_handle: "", hours_weekday_label: "Online", hours_weekday_time: "24/7", hours_weekend_label: "Encomendas", hours_weekend_time: "Sempre abertas", map_query: "Portugal" },
  reviews: [
    { name: "Cliente FutWearPT", text: "Camisola com grande qualidade e chegou rápido. A personalização ficou brutal.", stars: 5 },
    { name: "Cliente FutWearPT", text: "Finalmente uma loja com uma estética diferente. A camisola ficou mesmo como queria.", stars: 5 },
    { name: "Cliente FutWearPT", text: "Boa escolha de modelos retro e excelente atenção aos detalhes.", stars: 5 },
  ],
  categories: [
    { slug: "clubes", name: "Clubes", image: "" },
    { slug: "selecoes", name: "Seleções", image: "" },
    { slug: "retro", name: "Retro", image: "" },
    { slug: "treino", name: "Treino", image: "" },
    { slug: "crianca", name: "Junior", image: "" },
    { slug: "acessorios", name: "Acessórios", image: "" },
  ],
  cta_title: "Veste a tua história.",
  cta_subtitle: "Escolhe a camisola. Mete o nome. Entra em campo.",
  footer_tagline: "Football only. Drops, camisolas e cultura de bancada.",
  promo_banner: { active: true, text: "DROP 01 · NOVAS CAMISOLAS ONLINE", link: "/loja", bg_color: "#CAFF00", text_color: "#080808" },
  analytics: { google_analytics_id: "", meta_pixel_id: "" },
  seo: { site_title: "FutWearPT — Camisolas de Futebol", site_description: "Camisolas de futebol, retro, treino e personalização em Portugal.", og_image: "" },
};

export function ContentProvider({ children }) {
  const [content, setContent] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = async () => {
    try {
      const { data } = await api.get("/content");
      // Merge with FALLBACK so missing fields keep their defaults
      setContent({
        ...FALLBACK,
        // Keep the storefront football-first even if an older backend still has the original shop content.
        promo_banner: { ...FALLBACK.promo_banner, ...(data.promo_banner || {}) },
        analytics: { ...FALLBACK.analytics, ...(data.analytics || {}) },
        seo: { ...FALLBACK.seo, ...(data.seo || {}) },
      });
    } catch (e) {
      // Backend doesn't have /api/content yet (older deploy) — keep FALLBACK
      console.warn("[delicias] /api/content unavailable, using fallback content.");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <ContentContext.Provider value={{ content: content || FALLBACK, loaded, refresh }}>
      {children}
    </ContentContext.Provider>
  );
}

export const useContent = () => {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used within ContentProvider");
  return ctx;
};
