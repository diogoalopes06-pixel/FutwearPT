import { Link } from "react-router-dom";
import { ArrowUpRight, Mail, ShieldCheck, Truck, Zap } from "lucide-react";
import { useContent } from "../context/ContentContext";

export default function Footer() {
  const { content } = useContent();
  const contactEmail = content?.contact?.email || "hello@futwearpt.pt";

  return (
    <footer className="bg-black text-white border-t border-white/10" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14">
        <div className="grid lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-3">
              <img src="/futwearpt-logo-transparent.png" alt="FutWearPT" className="w-16 h-16 object-contain" />
              <div className="text-3xl font-black tracking-[-.07em]">FUTWEAR<span className="text-[#E10600]">PT</span></div>
            </div>
            <p className="text-sm text-zinc-500 max-w-sm mt-4 leading-relaxed">Camisolas de futebol para quem não assiste ao jogo de longe. Clubes, seleções, retro, treino e personalização.</p>
            <div className="mt-7 flex flex-wrap gap-3"><span className="fw-footer-pill"><Zap size={13}/> DROPS</span><span className="fw-footer-pill"><ShieldCheck size={13}/> QUALITY</span></div>
          </div>
          <div><h4 className="fw-footer-title">Loja</h4><ul className="space-y-3 text-sm text-zinc-400"><li><Link to="/loja" className="hover:text-[#E10600]">Todas as camisolas</Link></li><li><Link to="/loja?cat=clubes" className="hover:text-[#E10600]">Clubes</Link></li><li><Link to="/loja?cat=selecoes" className="hover:text-[#E10600]">Seleções</Link></li><li><Link to="/loja?cat=retro" className="hover:text-[#E10600]">Retro</Link></li><li><Link to="/loja?cat=treino" className="hover:text-[#E10600]">Treino</Link></li></ul></div>
          <div><h4 className="fw-footer-title">FutWearPT</h4><ul className="space-y-3 text-sm text-zinc-400"><li><Link to="/sobre" className="hover:text-[#E10600]">Sobre nós</Link></li><li><Link to="/contactos" className="hover:text-[#E10600]">Contactos</Link></li><li><Link to="/termos" className="hover:text-[#E10600]">Termos</Link></li><li><Link to="/privacidade" className="hover:text-[#E10600]">Privacidade</Link></li><li><Link to="/admin/login" className="hover:text-[#E10600]">Admin</Link></li></ul></div>
          <div>
            <h4 className="fw-footer-title">Logística</h4>
            <div className="space-y-4 text-sm text-zinc-400">
              <div className="flex gap-3"><Truck size={18} className="text-[#E10600] shrink-0 mt-0.5"/><span><b className="text-white">Expedição rápida</b><br/>Pedidos preparados em 24–48h úteis.</span></div>
              <div className="flex gap-3"><ShieldCheck size={18} className="text-[#E10600] shrink-0 mt-0.5"/><span><b className="text-white">Envio seguro</b><br/>Embalagem protegida para a tua camisola.</span></div>
              <div className="flex gap-3"><Zap size={18} className="text-[#E10600] shrink-0 mt-0.5"/><span><b className="text-white">Portugal</b><br/>Portes e opções apresentados no checkout.</span></div>
            </div>
            <div className="mt-6 pt-5 border-t border-white/10">
              <h4 className="fw-footer-title mb-3">Contacto</h4>
              <p className="text-sm text-zinc-400">Portugal · Online</p>
              <a href={`mailto:${contactEmail}`} className="mt-3 flex items-center gap-2 text-sm text-white hover:text-[#E10600]"><Mail size={15}/> {contactEmail}</a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row justify-between gap-2 text-[10px] uppercase tracking-[.16em] text-zinc-600"><span>© {new Date().getFullYear()} FutWearPT</span><span className="flex items-center gap-1">Football only <ArrowUpRight size={11}/></span></div></div>
    </footer>
  );
}
