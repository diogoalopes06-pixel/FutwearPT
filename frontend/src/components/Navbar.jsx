import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";

const LOGO = "/futwearpt-logo.png";

export default function Navbar() {
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { to: "/", label: "Início" },
    { to: "/loja", label: "Loja" },
    { to: "/galeria", label: "Galeria" },
    { to: "/sobre", label: "Sobre nós" },
    { to: "/contactos", label: "Contactos" },
    { to: "/conta", label: "Conta" },
  ];

  return (
    <header
      data-testid="navbar"
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-brand-bone/95 backdrop-blur-md border-b border-brand-border/60 shadow-sm"
          : "bg-brand-bone/70 backdrop-blur-xl"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" data-testid="nav-home-logo">
          <img src={LOGO} alt="FutWearPT" className={`rounded-sm object-cover ring-1 ring-brand-border transition-all duration-300 ${scrolled ? "h-10 w-10" : "h-12 w-12"}`} />
          <span className="hidden sm:block">
            <span className="block font-serif text-xl leading-none text-brand-espresso">FutWearPT</span>
            <span className="block text-[10px] uppercase tracking-[0.25em] text-brand-muted mt-1">Football Store</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-link-${l.label.toLowerCase().replace(/\s/g, "-")}`}
              className={({ isActive }) =>
                `text-sm uppercase tracking-[0.18em] font-medium transition-colors ${
                  isActive ? "text-brand-red" : "text-brand-muted hover:text-brand-red"
                }`
              }
              end={l.to === "/"}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            data-testid="nav-cart-button"
            className="relative h-11 w-11 grid place-items-center rounded-sm border border-brand-border hover:border-brand-espresso hover:-translate-y-0.5 transition-all duration-300"
            aria-label="Abrir cesto"
          >
            <ShoppingBag size={18} className="text-brand-espresso" />
            {count > 0 && (
              <span
                data-testid="nav-cart-count"
                className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 grid place-items-center bg-brand-red text-white text-[10px] font-semibold rounded-full"
              >
                {count.toFixed(count % 1 === 0 ? 0 : 1)}
              </span>
            )}
          </button>
          <button
            className="md:hidden h-11 w-11 grid place-items-center rounded-sm border border-brand-border"
            onClick={() => setMobile((v) => !v)}
            aria-label="Menu"
            data-testid="nav-mobile-toggle"
          >
            {mobile ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="md:hidden border-t border-brand-border bg-brand-bone">
          <div className="px-6 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <button
                key={l.to}
                onClick={() => { setMobile(false); navigate(l.to); }}
                data-testid={`nav-mobile-link-${l.label.toLowerCase()}`}
                className="text-left py-3 text-sm uppercase tracking-[0.18em] font-medium text-brand-espresso border-b border-brand-border/60 last:border-0"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
