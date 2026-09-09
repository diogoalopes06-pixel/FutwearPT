import { Link } from "react-router-dom";
import { Facebook, MapPin, Phone, Mail, Clock, Instagram } from "lucide-react";
import { useContent } from "../context/ContentContext";

function TikTokIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.82a8.18 8.18 0 0 0 4.78 1.52V6.89a4.85 4.85 0 0 1-1.01-.2z" />
    </svg>
  );
}

export default function Footer() {
  const { content } = useContent();
  const { contact, footer_tagline } = content;

  return (
    <footer className="bg-brand-espresso text-brand-bone" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-20 grid md:grid-cols-4 gap-12">
        <div className="md:col-span-1">
          <h3 className="font-serif text-3xl leading-tight">FutWearPT<br />Football Store</h3>
          <p className="text-sm text-brand-bone/70 mt-4 leading-relaxed">{footer_tagline}</p>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-brand-bone/60 mb-5">FutWearPT</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3"><MapPin size={16} className="mt-0.5 shrink-0 text-brand-red" /> {contact.address_line1}<br />{contact.address_line2}</li>
            <li className="flex gap-3"><Phone size={16} className="mt-0.5 shrink-0 text-brand-red" /> <a href={`tel:${(contact.phone || "").replace(/\s/g, "")}`} className="hover:underline">{contact.phone}</a></li>
            <li className="flex gap-3"><Mail size={16} className="mt-0.5 shrink-0 text-brand-red" /><a href={`mailto:${contact.email}`} className="hover:underline break-all">{contact.email}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-brand-bone/60 mb-5">Horário</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-3"><Clock size={16} className="mt-0.5 shrink-0 text-brand-red" /><span>{contact.hours_weekday_label}<br />{contact.hours_weekday_time}</span></li>
            <li className="pl-7 text-brand-bone/60">{contact.hours_weekend_label}: {contact.hours_weekend_time}</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-brand-bone/60 mb-5">Navegar</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-brand-red">Início</Link></li>
            <li><Link to="/loja" className="hover:text-brand-red">Loja</Link></li>
            <li><Link to="/galeria" className="hover:text-brand-red">Galeria</Link></li>
            <li><Link to="/sobre" className="hover:text-brand-red">Sobre a FutWearPT</Link></li>
            <li><Link to="/contactos" className="hover:text-brand-red">Contactos</Link></li>
            <li><Link to="/termos" className="hover:text-brand-red">Termos e Condições</Link></li>
            <li><Link to="/privacidade" className="hover:text-brand-red">Privacidade</Link></li>
            <li><Link to="/admin/login" className="hover:text-brand-red text-brand-bone/50">Área do Lojista</Link></li>
          </ul>
          <div className="mt-6 flex items-center gap-4">
            <a href="https://www.facebook.com/asdeliciasdaquintinha" target="_blank" rel="noreferrer" className="hover:text-brand-red transition-colors" aria-label="Facebook">
              <Facebook size={20} />
            </a>
            <a href="https://www.instagram.com/asdeliciasdaquintinha/" target="_blank" rel="noreferrer" className="hover:text-brand-red transition-colors" aria-label="Instagram">
              <Instagram size={20} />
            </a>
            <a href="https://www.tiktok.com/@asdeliciasdaquintinha" target="_blank" rel="noreferrer" className="hover:text-brand-red transition-colors" aria-label="TikTok">
              <TikTokIcon size={20} />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-brand-bone/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-brand-bone/50">
          <p>© {new Date().getFullYear()} FutWearPT · Abrantes, Portugal</p>
          <p>Frutas, legumes & sabores autênticos</p>
        </div>
      </div>
    </footer>
  );
}
