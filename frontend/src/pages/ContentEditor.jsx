import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Upload, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useContent } from "../context/ContentContext";

export default function ContentEditor({ initialSection = "hero" }) {
  const { content: initial, refresh } = useContent();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState(initialSection);

  useEffect(() => {
    if (initial) setDraft(JSON.parse(JSON.stringify(initial)));
  }, [initial]);

  if (!draft) return null;

  const update = (path, value) => {
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/admin/content", draft);
      toast.success("Conteúdo guardado");
      refresh();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        toast.error("Backend desatualizado: faça redeploy do Render com o código mais recente.");
      } else {
        toast.error("Erro ao guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "hero", label: "Hero" },
    { id: "about", label: "Sobre a FutWearPT" },
    { id: "contact", label: "Contactos" },
    { id: "logistics", label: "Logística" },
    { id: "reviews", label: "Avaliações" },
    { id: "categories", label: "Categorias" },
    { id: "banner", label: "Banner Promo" },
    { id: "seo", label: "SEO" },
    { id: "analytics", label: "Analytics" },
    { id: "general", label: "Outros" },
  ];

  return (
    <div data-testid="content-editor">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              data-testid={`content-section-${s.id}`}
              className={`px-4 py-2 text-xs uppercase tracking-[0.18em] border ${
                section === s.id ? "bg-brand-espresso text-brand-bone border-brand-espresso" : "bg-white text-brand-espresso border-brand-border hover:border-brand-espresso"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={save}
          disabled={saving}
          data-testid="content-save"
          className="px-5 py-2.5 bg-brand-red text-white text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:bg-brand-redDark disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar alterações
        </button>
      </div>

      {section === "hero" && <HeroEditor data={draft.hero} update={update} />}
      {section === "about" && <AboutEditor data={draft.about} update={update} />}
      {section === "contact" && <ContactEditor data={draft.contact} update={update} />}
      {section === "logistics" && <LogisticsEditor data={draft.logistics || {}} update={update} />}
      {section === "reviews" && <ReviewsEditor reviews={draft.reviews} setDraft={setDraft} />}
      {section === "categories" && <CategoriesEditor categories={draft.categories} setDraft={setDraft} />}
      {section === "banner" && <BannerEditor data={draft.promo_banner || {}} update={update} />}
      {section === "seo" && <SeoEditor data={draft.seo || {}} update={update} />}
      {section === "analytics" && <AnalyticsEditor data={draft.analytics || {}} update={update} />}
      {section === "general" && <GeneralEditor data={draft} update={update} />}
    </div>
  );
}

function BannerEditor({ data, update }) {
  return (
    <Card title="Banner Promocional (topo do site)">
      <p className="text-xs text-brand-muted">Quando ativo, aparece uma faixa colorida no topo de todas as páginas. Útil para campanhas (ex: "🌰 Castanhas no S. Martinho — 5€/kg").</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={data.active || false} onChange={(e) => update("promo_banner.active", e.target.checked)} data-testid="banner-active" /> Ativar banner
      </label>
      <Field label="Texto"><Input value={data.text} onChange={(v) => update("promo_banner.text", v)} /></Field>
      <Field label="Link (opcional)"><Input value={data.link} onChange={(v) => update("promo_banner.link", v)} placeholder="/loja?cat=clubes ou https://..." /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Cor de fundo"><Input value={data.bg_color} onChange={(v) => update("promo_banner.bg_color", v)} placeholder="#C1292E" /></Field>
        <Field label="Cor do texto"><Input value={data.text_color} onChange={(v) => update("promo_banner.text_color", v)} placeholder="#FDFBF7" /></Field>
      </div>
      {data.text && (
        <div style={{ background: data.bg_color, color: data.text_color }} className="px-4 py-2 text-sm text-center mt-2">
          Pré-visualização: {data.text}
        </div>
      )}
    </Card>
  );
}

function SeoEditor({ data, update }) {
  return (
    <Card title="SEO (Otimização para Google)">
      <p className="text-xs text-brand-muted">Estes campos aparecem no Google e quando partilhar o site no WhatsApp/Facebook.</p>
      <Field label="Título do site (até 60 caracteres)"><Input value={data.site_title} onChange={(v) => update("seo.site_title", v)} maxLength={60} /></Field>
      <Field label="Descrição (até 160 caracteres)"><Textarea value={data.site_description} onChange={(v) => update("seo.site_description", v)} rows={3} /></Field>
      <Field label="Imagem para partilha (URL)"><Input value={data.og_image} onChange={(v) => update("seo.og_image", v)} placeholder="https://..." /></Field>
    </Card>
  );
}

function AnalyticsEditor({ data, update }) {
  return (
    <Card title="Análise de Visitas">
      <p className="text-xs text-brand-muted">Adicione os IDs para começar a receber dados em Google Analytics e Facebook Ads.</p>
      <Field label="Google Analytics 4 (ex: G-XXXXXXX)"><Input value={data.google_analytics_id} onChange={(v) => update("analytics.google_analytics_id", v)} placeholder="G-XXXXXXX" /></Field>
      <Field label="Meta Pixel ID (Facebook)"><Input value={data.meta_pixel_id} onChange={(v) => update("analytics.meta_pixel_id", v)} placeholder="123456789012345" /></Field>
    </Card>
  );
}

// ---------- Sections ----------

function HeroEditor({ data, update }) {
  return (
    <Card title="Bloco Principal (Hero)">
      <Field label="Frase pequena (acima do título)"><Input value={data.tagline} onChange={(v) => update("hero.tagline", v)} /></Field>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Título — parte 1"><Input value={data.title_part1} onChange={(v) => update("hero.title_part1", v)} /></Field>
        <Field label="Título — palavra destaque (vermelho)"><Input value={data.title_emphasis} onChange={(v) => update("hero.title_emphasis", v)} /></Field>
        <Field label="Título — parte 2"><Input value={data.title_part2} onChange={(v) => update("hero.title_part2", v)} /></Field>
      </div>
      <Field label="Subtítulo"><Textarea value={data.subtitle} onChange={(v) => update("hero.subtitle", v)} rows={3} /></Field>
      <Field label="Imagem principal"><ImagePicker value={data.image} onChange={(v) => update("hero.image", v)} /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Botão primário (texto)"><Input value={data.cta_primary} onChange={(v) => update("hero.cta_primary", v)} /></Field>
        <Field label="Botão secundário (texto)"><Input value={data.cta_secondary} onChange={(v) => update("hero.cta_secondary", v)} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Avaliação (valor, ex: 4.6)"><Input value={data.rating_value} onChange={(v) => update("hero.rating_value", v)} /></Field>
        <Field label="Etiqueta da avaliação"><Input value={data.rating_label} onChange={(v) => update("hero.rating_label", v)} /></Field>
      </div>
    </Card>
  );
}

function AboutEditor({ data, update }) {
  return (
    <Card title="Secção “Sobre a FutWearPT”">
      <Field label="Etiqueta"><Input value={data.tagline} onChange={(v) => update("about.tagline", v)} /></Field>
      <Field label="Título"><Input value={data.title} onChange={(v) => update("about.title", v)} /></Field>
      <Field label="Parágrafo 1"><Textarea value={data.paragraph1} onChange={(v) => update("about.paragraph1", v)} rows={4} /></Field>
      <Field label="Parágrafo 2"><Textarea value={data.paragraph2} onChange={(v) => update("about.paragraph2", v)} rows={4} /></Field>
      <Field label="Imagem"><ImagePicker value={data.image} onChange={(v) => update("about.image", v)} /></Field>
    </Card>
  );
}

function ContactEditor({ data, update }) {
  return (
    <Card title="Contactos">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Morada — linha 1"><Input value={data.address_line1} onChange={(v) => update("contact.address_line1", v)} /></Field>
        <Field label="Morada — linha 2 (cód. postal + cidade)"><Input value={data.address_line2} onChange={(v) => update("contact.address_line2", v)} /></Field>
        <Field label="Telefone"><Input value={data.phone} onChange={(v) => update("contact.phone", v)} /></Field>
        <Field label="Email"><Input value={data.email} onChange={(v) => update("contact.email", v)} /></Field>
        <Field label="Facebook URL"><Input value={data.facebook_url} onChange={(v) => update("contact.facebook_url", v)} /></Field>
        <Field label="Facebook handle (ex: @futwearpt)"><Input value={data.facebook_handle} onChange={(v) => update("contact.facebook_handle", v)} /></Field>
      </div>
      <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mt-6 mb-2">Horário</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Dias úteis (texto)"><Input value={data.hours_weekday_label} onChange={(v) => update("contact.hours_weekday_label", v)} /></Field>
        <Field label="Dias úteis (horário)"><Input value={data.hours_weekday_time} onChange={(v) => update("contact.hours_weekday_time", v)} /></Field>
        <Field label="Fim de semana (texto)"><Input value={data.hours_weekend_label} onChange={(v) => update("contact.hours_weekend_label", v)} /></Field>
        <Field label="Fim de semana (horário)"><Input value={data.hours_weekend_time} onChange={(v) => update("contact.hours_weekend_time", v)} /></Field>
      </div>
      <Field label="Pesquisa do mapa (Google Maps)"><Input value={data.map_query} onChange={(v) => update("contact.map_query", v)} /></Field>
    </Card>
  );
}

function LogisticsEditor({ data, update }) {
  return (
    <Card title="Logística e entregas">
      <p className="text-xs text-brand-muted">Define aqui prazos, portes e acompanhamento. As chaves de email/API ficam nas variáveis de ambiente do backend.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.enabled !== false} onChange={(e) => update("logistics.enabled", e.target.checked)} /> Ativar entregas</label>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Método de envio"><Input value={data.delivery_label || ""} onChange={(v) => update("logistics.delivery_label", v)} /></Field>
        <Field label="Prazo de entrega"><Input value={data.delivery_time || ""} onChange={(v) => update("logistics.delivery_time", v)} /></Field>
        <Field label="Preparação"><Input value={data.preparation_time || ""} onChange={(v) => update("logistics.preparation_time", v)} /></Field>
        <Field label="Transportadora"><Input value={data.carrier || ""} onChange={(v) => update("logistics.carrier", v)} /></Field>
        <Field label="Portes (€)"><Input type="number" step="0.01" min="0" value={data.shipping_price ?? 0} onChange={(v) => update("logistics.shipping_price", Number(v) || 0)} /></Field>
        <Field label="Portes grátis a partir de (€)"><Input type="number" step="0.01" min="0" value={data.free_shipping_threshold ?? 0} onChange={(v) => update("logistics.free_shipping_threshold", Number(v) || 0)} /></Field>
        <Field label="Email de apoio"><Input type="email" value={data.support_email || ""} onChange={(v) => update("logistics.support_email", v)} /></Field>
        <Field label="Prazo de devolução (dias)"><Input type="number" min="0" value={data.returns_days ?? 14} onChange={(v) => update("logistics.returns_days", Number(v) || 0)} /></Field>
      </div>
      <div className="border-t border-brand-border pt-5 space-y-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.pickup_enabled !== false} onChange={(e) => update("logistics.pickup_enabled", e.target.checked)} /> Permitir levantamento</label>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome do levantamento"><Input value={data.pickup_label || ""} onChange={(v) => update("logistics.pickup_label", v)} /></Field>
          <Field label="Disponibilidade"><Input value={data.pickup_time || ""} onChange={(v) => update("logistics.pickup_time", v)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.tracking_enabled !== false} onChange={(e) => update("logistics.tracking_enabled", e.target.checked)} /> Acompanhamento de encomenda</label>
      </div>
      <div className="bg-brand-red/5 border border-brand-red/20 p-4 text-xs text-brand-muted leading-relaxed"><strong className="text-brand-red">Emails:</strong> confirmação, alterações de estado, pagamento confirmado, encomenda pronta e recuperação de password são enviados pelo Resend quando as variáveis do backend estiverem configuradas.</div>
    </Card>
  );
}

function ReviewsEditor({ reviews, setDraft }) {
  const setReviews = (next) => setDraft((d) => ({ ...d, reviews: next }));
  const updateField = (i, key, val) => setReviews(reviews.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const add = () => setReviews([...reviews, { name: "", text: "", stars: 5 }]);
  const remove = (i) => setReviews(reviews.filter((_, idx) => idx !== i));

  return (
    <Card title="Avaliações de clientes">
      <div className="space-y-4">
        {reviews.map((r, i) => (
          <div key={i} className="bg-brand-cream/40 border border-brand-border p-5">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">Review #{i + 1}</p>
              <button onClick={() => remove(i)} className="text-brand-muted hover:text-brand-red" data-testid={`review-remove-${i}`}><Trash2 size={14} /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Field label="Nome"><Input value={r.name} onChange={(v) => updateField(i, "name", v)} /></Field>
              <Field label="Estrelas (1-5)"><Input type="number" min="1" max="5" value={r.stars} onChange={(v) => updateField(i, "stars", parseInt(v) || 5)} /></Field>
            </div>
            <Field label="Texto da review"><Textarea value={r.text} onChange={(v) => updateField(i, "text", v)} rows={3} /></Field>
          </div>
        ))}
        <button onClick={add} data-testid="review-add" className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.18em] hover:border-brand-espresso flex items-center gap-2">
          <Plus size={14} /> Adicionar review
        </button>
      </div>
    </Card>
  );
}

function CategoriesEditor({ categories, setDraft }) {
  const setCats = (next) => setDraft((d) => ({ ...d, categories: next }));
  const updateField = (i, key, val) => setCats(categories.map((c, idx) => (idx === i ? { ...c, [key]: val } : c)));
  const add = () => setCats([...categories, { slug: "", name: "", image: "" }]);
  const remove = (i) => setCats(categories.filter((_, idx) => idx !== i));

  return (
    <Card title="Categorias da Loja">
      <p className="text-xs text-brand-muted mb-4">O <strong>slug</strong> deve corresponder ao slug do produto (ex: clubes, selecoes, retro, treino, crianca, acessorios).</p>
      <div className="space-y-4">
        {categories.map((c, i) => (
          <div key={i} className="bg-brand-cream/40 border border-brand-border p-5">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-muted">Categoria #{i + 1}</p>
              <button onClick={() => remove(i)} className="text-brand-muted hover:text-brand-red" data-testid={`category-remove-${i}`}><Trash2 size={14} /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Field label="Slug"><Input value={c.slug} onChange={(v) => updateField(i, "slug", v)} /></Field>
              <Field label="Nome"><Input value={c.name} onChange={(v) => updateField(i, "name", v)} /></Field>
            </div>
            <Field label="Imagem"><ImagePicker value={c.image} onChange={(v) => updateField(i, "image", v)} /></Field>
          </div>
        ))}
        <button onClick={add} data-testid="category-add" className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.18em] hover:border-brand-espresso flex items-center gap-2">
          <Plus size={14} /> Adicionar categoria
        </button>
      </div>
    </Card>
  );
}

function GeneralEditor({ data, update }) {
  return (
    <Card title="Outros textos">
      <Field label="Título do CTA final (página inicial)"><Input value={data.cta_title} onChange={(v) => update("cta_title", v)} /></Field>
      <Field label="Subtítulo do CTA final"><Textarea value={data.cta_subtitle} onChange={(v) => update("cta_subtitle", v)} rows={2} /></Field>
      <Field label="Texto do rodapé"><Textarea value={data.footer_tagline} onChange={(v) => update("footer_tagline", v)} rows={2} /></Field>
    </Card>
  );
}

// ---------- Primitives ----------

function Card({ title, children }) {
  return (
    <div className="bg-white border border-brand-border p-6 sm:p-8">
      <h3 className="font-serif text-3xl text-brand-espresso mb-6">{title}</h3>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Input({ value = "", onChange, type = "text", ...rest }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white border border-brand-border px-3 py-2.5 text-sm focus:outline-none focus:border-brand-red"
      {...rest}
    />
  );
}

function Textarea({ value = "", onChange, rows = 3 }) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white border border-brand-border px-3 py-2.5 text-sm focus:outline-none focus:border-brand-red resize-none"
    />
  );
}

function ImagePicker({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx 4 MB)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(data.url);
      toast.success("Imagem carregada");
    } catch (err) {
      toast.error("Erro ao carregar imagem");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {value && (
        <div className="relative w-40 h-32 bg-brand-cream border border-brand-border overflow-hidden">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-white/90 text-brand-red p-1 hover:bg-white"
            aria-label="Remover imagem"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.18em] hover:border-brand-espresso flex items-center gap-2 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Carregar ficheiro
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
        <span className="text-xs text-brand-muted">ou cole URL:</span>
        <input
          type="text"
          value={value && value.startsWith("data:") ? "" : value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 min-w-[200px] bg-white border border-brand-border px-3 py-2 text-sm focus:outline-none focus:border-brand-red"
        />
      </div>
    </div>
  );
}
