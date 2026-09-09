import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const ContentContext = createContext(null);

const HERO_IMG = "";
const ABOUT_IMG = "";

const FALLBACK = {
  hero: {
    tagline: "FUTEBOL · PORTUGAL",
    title_part1: "Futebol",
    title_emphasis: "sem limites",
    title_part2: "na tua camisola.",
    subtitle: "Camisolas de futebol, modelos retro e equipamento de treino. Escolhe o teu tamanho, personaliza e veste a tua paixão.",
    image: HERO_IMG,
    cta_primary: "Encomendar agora",
    cta_secondary: "Conhecer a FutWearPT",
    rating_value: "4.6",
    rating_label: "Avaliações Google",
  },
  about: {
    tagline: "Sobre nós",
    title: "A tua paixão. A tua camisola.",
    paragraph1: "Na Delícias Football Store celebramos o sabor genuíno dos produtos caseiros. Frutas e legumes frescos, compotas artesanais, vinhos regionais, queijos e enchidos tradicionais fazem parte de uma seleção cuidada — sempre com a qualidade e o carinho de quem valoriza o que é simples e verdadeiro.",
    paragraph2: "Trabalhamos com pequenos produtores locais e em cada época da nossa horta. FutWearPT em Abrantes ou faça a sua encomenda online — entregamos em sua casa.",
    image: ABOUT_IMG,
  },
  contact: {
    address_line1: "Av. Mário Soares 37 loja 1",
    address_line2: "2200-192 Abrantes",
    phone: "+351 241 402 897",
    email: "deliciasdaquintinha.financeira@gmail.com",
    facebook_url: "https://www.facebook.com/asdeliciasdaquintinha",
    facebook_handle: "@asdeliciasdaquintinha",
    hours_weekday_label: "Segunda – Sábado",
    hours_weekday_time: "08:00 – 20:00",
    hours_weekend_label: "Domingo",
    hours_weekend_time: "Encerrado",
    map_query: "Av. Mário Soares 37 Abrantes",
  },
  reviews: [
    { name: "Fátima Rodrigues", text: "Uma mercearia onde é possível comprar tudo o que é preciso para o dia a dia. Produtos de excelente qualidade e muito fresquinhos. Atendimento muito bom.", stars: 5 },
    { name: "Vanda Enfermeiro", text: "Dona muito querida e muito disponível para ajudar na escolha dos seus produtos. Frutos e legumes muito bons e de grande qualidade.", stars: 5 },
    { name: "Maria Isabel Lopes", text: "Do melhor que existe em Abrantes — legumes, frutas, queijos, vinhos, pão, leguminosas, mercearia, bolos, frutos secos e tantos outros produtos.", stars: 5 },
  ],
  categories: [
    { slug: "clubes", name: "Clubes", image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=800" },
    { slug: "selecoes", name: "Seleções", image: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&q=80&w=800" },
    { slug: "queijos-enchidos", name: "Queijos & Enchidos", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&q=80&w=800" },
    { slug: "vinhos", name: "Vinhos Regionais", image: "https://images.pexels.com/photos/20411281/pexels-photo-20411281.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" },
  ],
  cta_title: "Encomende hoje. Receba ainda mais fresco.",
  cta_subtitle: "Entrega ao domicílio em Abrantes ou levantamento na loja. Sem complicações.",
  footer_tagline: "Camisolas de futebol, retro e treino. Personaliza a tua camisola e veste a tua paixão.",
  promo_banner: { active: false, text: "", link: "", bg_color: "#C1292E", text_color: "#FDFBF7" },
  analytics: { google_analytics_id: "", meta_pixel_id: "" },
  seo: { site_title: "FutWearPT — Camisolas de Futebol", site_description: "Camisolas de futebol, retro e treino. Personaliza a tua camisola e compra online em Portugal.", og_image: "" },
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
        ...data,
        hero: { ...FALLBACK.hero, ...(data.hero || {}) },
        about: { ...FALLBACK.about, ...(data.about || {}) },
        contact: { ...FALLBACK.contact, ...(data.contact || {}) },
        reviews: data.reviews?.length ? data.reviews : FALLBACK.reviews,
        categories: data.categories?.length ? data.categories : FALLBACK.categories,
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
