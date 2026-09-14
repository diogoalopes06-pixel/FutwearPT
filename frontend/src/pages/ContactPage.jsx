import { MapPin, Phone, Mail, Clock, Facebook } from "lucide-react";
import { useContent } from "../context/ContentContext";

export default function ContactPage() {
  const { content } = useContent();
  const { contact } = content;

  return (
    <div className="pt-32 pb-24 bg-brand-bone" data-testid="contact-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-4">Fale connosco</p>
        <h1 className="font-serif text-6xl md:text-7xl text-brand-espresso leading-tight">Venha visitar-nos.<br/>Ou ligue. Adoramos conversa.</h1>

        <div className="mt-16 grid lg:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div className="bg-white border border-brand-border p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 grid place-items-center bg-brand-red text-brand-bone shrink-0"><MapPin size={18}/></div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Morada</p>
                  <p className="mt-1 font-serif text-2xl text-brand-espresso">{contact.address_line1}<br/>{contact.address_line2}</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="bg-white border border-brand-border p-6 hover:border-brand-red transition-colors group" data-testid="contact-phone">
                <div className="flex items-center gap-3 text-brand-red"><Phone size={16}/><span className="text-[10px] uppercase tracking-[0.2em]">Telefone</span></div>
                <p className="mt-2 font-serif text-2xl text-brand-espresso group-hover:text-brand-red transition-colors">{contact.phone}</p>
              </a>
              <a href={`mailto:${contact.email}`} className="bg-white border border-brand-border p-6 hover:border-brand-red transition-colors group" data-testid="contact-email">
                <div className="flex items-center gap-3 text-brand-red"><Mail size={16}/><span className="text-[10px] uppercase tracking-[0.2em]">Email</span></div>
                <p className="mt-2 font-serif text-lg text-brand-espresso group-hover:text-brand-red transition-colors break-all">{contact.email}</p>
              </a>
            </div>

            <div className="bg-white border border-brand-border p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 grid place-items-center bg-brand-espresso text-brand-bone shrink-0"><Clock size={18}/></div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Horário</p>
                  <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
                    <span className="text-brand-muted">{contact.hours_weekday_label}</span>
                    <span className="text-brand-espresso font-medium">{contact.hours_weekday_time}</span>
                    <span className="text-brand-muted">{contact.hours_weekend_label}</span>
                    <span className="text-brand-espresso font-medium">{contact.hours_weekend_time}</span>
                  </div>
                </div>
              </div>
            </div>

            {contact.facebook_url && (
              <a href={contact.facebook_url} target="_blank" rel="noreferrer" className="block bg-brand-espresso text-brand-bone p-6 hover:bg-brand-red transition-colors" data-testid="contact-facebook">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-brand-bone/70">Acompanhe-nos</p>
                    <p className="mt-1 font-serif text-2xl">Facebook · {contact.facebook_handle}</p>
                  </div>
                  <Facebook size={28}/>
                </div>
              </a>
            )}
            <a href="https://www.instagram.com/futwearpt/" target="_blank" rel="noreferrer" className="block bg-brand-espresso text-brand-bone p-6 hover:bg-brand-red transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-brand-bone/70">Acompanhe-nos</p>
                  <p className="mt-1 font-serif text-2xl">Instagram · @futwearpt</p>
                </div>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
              </div>
            </a>
            <a href="https://www.tiktok.com/@futwearpt" target="_blank" rel="noreferrer" className="block bg-brand-espresso text-brand-bone p-6 hover:bg-brand-red transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-brand-bone/70">Acompanhe-nos</p>
                  <p className="mt-1 font-serif text-2xl">TikTok · @futwearpt</p>
                </div>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.82a8.18 8.18 0 0 0 4.78 1.52V6.89a4.85 4.85 0 0 1-1.01-.2z"/></svg>
              </div>
            </a>
          </div>

          <div className="aspect-[4/5] lg:aspect-auto lg:min-h-[600px] overflow-hidden border border-brand-border">
            <iframe
              title="Localização"
              src={`https://www.google.com/maps?q=${encodeURIComponent(contact.map_query || contact.address_line1)}&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              data-testid="contact-map"
            />
          </div>
        </div>

        <div className="mt-24 border-t border-brand-border pt-16">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-4">Perguntas frequentes</p>
          <h2 className="font-serif text-5xl text-brand-espresso leading-tight">Resposta rápida.</h2>
          <div className="mt-10 grid md:grid-cols-2 gap-x-12 gap-y-10">
            {[
              { q: "Que tipo de produtos vendem?", a: "Camisolas de clubes, seleções, modelos retro, treino, criança e acessórios de futebol." },
              { q: "Aceitam encomendas online?", a: "Sim! Pode preencher o cesto neste site e finalizar a encomenda. Confirmamos por telefone." },
              { q: "Fazem entregas?", a: "Sim, entregamos na zona de Abrantes. Pode também levantar na loja sem custos." },
              { q: "Os produtos são da época?", a: "Sempre. Trabalhamos com produtores locais e tudo é selecionado consoante a estação." },
            ].map((f, i) => (
              <div key={i}>
                <h3 className="font-serif text-2xl text-brand-espresso">{f.q}</h3>
                <p className="mt-2 text-brand-muted leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
