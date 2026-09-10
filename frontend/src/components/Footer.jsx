import { Link } from "react-router-dom";
import { ArrowUpRight, Mail, ShieldCheck, Truck, Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black text-white border-t border-white/10" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14">
        <div className="grid lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div><div className="text-3xl font-black tracking-[-.07em]">FUTWEAR<span className="text-[#CAFF00]">PT</span></div><p className="text-sm text-zinc-500 max-w-sm mt-4 leading-relaxed">Camisolas de futebol para quem não assiste ao jogo de longe. Clubes, seleções, retro, treino e personalização.</p><div className="mt-7 flex flex-wrap gap-3"><span className="fw-footer-pill"><Zap size={13}/> DROPS</span><span className="fw-footer-pill"><ShieldCheck size={13}/> QUALITY</span></div></div>
          <div><h4 className="fw-footer-title">Loja</h4><ul className="space-y-3 text-sm text-zinc-400"><li><Link to="/loja" className="hover:text-[#CAFF00]">Todas as camisolas</Link></li><li><Link to="/loja?cat=clubes" className="hover:text-[#CAFF00]">Clubes</Link></li><li><Link to="/loja?cat=selecoes" className="hover:text-[#CAFF00]">Seleções</Link></li><li><Link to="/loja?cat=retro" className="hover:text-[#CAFF00]">Retro</Link></li><li><Link to="/loja?cat=treino" className="hover:text-[#CAFF00]">Treino</Link></li></ul></div>
          <div><h4 className="fw-footer-title">FutWearPT</h4><ul className="space-y-3 text-sm text-zinc-400"><li><Link to="/sobre" className="hover:text-[#CAFF00]">Sobre nós</Link></li><li><Link to="/contactos" className="hover:text-[#CAFF00]">Contactos</Link></li><li><Link to="/termos" className="hover:text-[#CAFF00]">Termos</Link></li><li><Link to="/privacidade" className="hover:text-[#CAFF00]">Privacidade</Link></li></ul></div>
          <div><h4 className="fw-footer-title">Contacto</h4><p className="text-sm text-zinc-400">Portugal · Online</p><a href="mailto:hello@futwearpt.pt" className="mt-3 flex items-center gap-2 text-sm text-white hover:text-[#CAFF00]"><Mail size={15}/> hello@futwearpt.pt</a><div className="mt-6 text-xs text-zinc-600 flex items-center gap-2"><Truck size={14}/> Envio para Portugal</div></div>
        </div>
      </div>
      <div className="border-t border-white/10"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row justify-between gap-2 text-[10px] uppercase tracking-[.16em] text-zinc-600"><span>© {new Date().getFullYear()} FutWearPT</span><span className="flex items-center gap-1">Football only <ArrowUpRight size={11}/></span></div></div>
    </footer>
  );
}
