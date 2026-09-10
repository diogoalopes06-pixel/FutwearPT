import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 12); window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll); }, []);
  const links = [
    { to: "/", label: "Início" }, { to: "/loja", label: "Loja" }, { to: "/galeria", label: "Drops" },
    { to: "/sobre", label: "Sobre" }, { to: "/contactos", label: "Contactos" }, { to: "/conta", label: "Conta" },
  ];
  return (
    <header data-testid="navbar" className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-black/95 backdrop-blur-xl border-b border-white/10" : "bg-black/70 backdrop-blur-md"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" data-testid="nav-home-logo">
          <div className="h-10 w-10 grid place-items-center bg-[#CAFF00] text-black font-black skew-x-[-8deg] group-hover:rotate-[-6deg] transition-transform"><span className="skew-x-[8deg]">FW</span></div>
          <div><span className="block text-white font-black tracking-[-.05em] text-xl leading-none">FUTWEAR<span className="text-[#CAFF00]">PT</span></span><span className="block text-[8px] uppercase tracking-[.28em] text-zinc-500 mt-1">Football only</span></div>
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({isActive}) => `text-[10px] uppercase tracking-[.2em] font-black transition-colors ${isActive ? "text-[#CAFF00]" : "text-zinc-400 hover:text-white"}`}>{l.label}</NavLink>)}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden lg:flex items-center gap-1.5 text-[8px] uppercase tracking-[.16em] font-bold text-zinc-500 mr-2"><Zap size={11} className="text-[#CAFF00]"/> Drop 01</span>
          <button onClick={() => setOpen(true)} data-testid="nav-cart-button" className="relative h-11 w-11 grid place-items-center border border-white/15 text-white hover:border-[#CAFF00] hover:text-[#CAFF00] transition-all"><ShoppingBag size={18}/>{count > 0 && <span data-testid="nav-cart-count" className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 grid place-items-center bg-[#CAFF00] text-black text-[10px] font-black rounded-full">{count.toFixed(count % 1 === 0 ? 0 : 1)}</span>}</button>
          <button className="md:hidden h-11 w-11 grid place-items-center border border-white/15 text-white" onClick={() => setMobile(v=>!v)} aria-label="Menu" data-testid="nav-mobile-toggle">{mobile ? <X size={18}/> : <Menu size={18}/>}</button>
        </div>
      </div>
      {mobile && <div className="md:hidden border-t border-white/10 bg-black"><div className="px-5 py-3">{links.map(l=><button key={l.to} onClick={()=>{setMobile(false);navigate(l.to)}} className="w-full text-left py-4 text-xs uppercase tracking-[.18em] font-black text-white border-b border-white/10 last:border-0">{l.label}</button>)}</div></div>}
    </header>
  );
}
