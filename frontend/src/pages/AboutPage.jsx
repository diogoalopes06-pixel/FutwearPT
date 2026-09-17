import { ShieldCheck, Zap, Trophy, Target } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="pt-32 pb-24 bg-[#080808] text-white min-h-screen" data-testid="about-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
        <p className="fw-kicker">FUTWEARPT / FOOTBALL ONLY</p>
        <h1 className="text-6xl md:text-8xl font-black tracking-[-.07em] leading-[.85] mt-4">NÃO É MODA.<br/><span className="text-[#E10600] italic">É CULTURA.</span></h1>
        <div className="mt-16 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 border border-[#292929] bg-[#101010] p-8 md:p-12">
            <p className="text-2xl md:text-4xl font-black leading-tight">A FutWearPT existe para quem vê uma camisola e vê muito mais do que tecido.</p>
            <p className="mt-8 text-zinc-400 text-lg leading-relaxed">É clube. É memória. É bancada. É aquele jogo que nunca esqueceste. Criámos uma loja focada em camisolas de futebol, drops retro, treino e personalização — sem a estética de catálogo genérico.</p>
            <p className="mt-5 text-zinc-400 text-lg leading-relaxed">Escolhe o teu lado, mete o teu nome e veste a tua história.</p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 gap-2">
            {[ [Zap,"NOVIDADES","Limitadas"],[ShieldCheck,"QUALIDADE","Sem atalhos"],[Trophy,"FUTEBOL","Primeiro"],[Target,"ATITUDE","Sempre"] ].map(([Icon,t,d])=><div key={t} className="bg-[#111] border border-[#292929] p-6 min-h-[170px] hover:border-[#E10600] transition-colors"><Icon className="text-[#E10600]" size={22}/><h3 className="font-black text-xl mt-12">{t}</h3><p className="text-xs uppercase tracking-[.16em] text-zinc-600 mt-1">{d}</p></div>)}
          </div>
        </div>
        <div className="mt-20 border-y border-[#292929] py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div><p className="fw-kicker">A NOSSA REGRA</p><p className="text-3xl md:text-5xl font-black tracking-[-.05em] mt-2">SE NÃO TEM ATITUDE,<br/>NÃO É FUTWEAR.</p></div>
          <div className="text-right text-zinc-500 text-sm max-w-sm">Portugal · Online<br/>Camisolas · Retro · Treino · Personalização</div>
        </div>
      </div>
    </div>
  );
}
