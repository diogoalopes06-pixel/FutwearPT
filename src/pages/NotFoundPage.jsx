import { Link } from "react-router-dom";
import { useSeo } from "../components/Seo";

export default function NotFoundPage() {
  useSeo({ title: "Página não encontrada", description: "A página que procura não existe." });
  return (
    <main className="pt-32 pb-24 min-h-screen bg-brand-bone grid place-items-center" data-testid="not-found-page">
      <div className="max-w-xl px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-red">Erro 404</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl text-brand-espresso">Esta página não existe.</h1>
        <p className="mt-5 text-brand-muted">Pode regressar ao início ou continuar a descobrir os produtos Football Store.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link to="/" className="px-7 py-3 border border-brand-espresso text-brand-espresso">Ir ao início</Link>
          <Link to="/loja" className="px-7 py-3 bg-brand-red text-white">Ver a loja</Link>
        </div>
      </div>
    </main>
  );
}
