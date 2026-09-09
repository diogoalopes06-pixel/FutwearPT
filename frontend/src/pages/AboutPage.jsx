import { useContent } from "../context/ContentContext";

const HERO_IMG_DEFAULT = "https://static.prod-images.emergentagent.com/jobs/29644c96-d4a1-4651-9cb8-e1e8ae32b23e/images/f98aea86f70724fbb9799d980b3ef521853eda75aad46dd1aff41ab887d01aff.png";

export default function AboutPage() {
  const { content } = useContent();
  const { about, hero } = content;

  return (
    <div className="pt-32 pb-24 bg-brand-bone" data-testid="about-page">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-4">A nossa história</p>
        <h1 className="font-serif text-6xl md:text-7xl text-brand-espresso leading-tight">{about.title}</h1>

        <div className="mt-16 grid md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-5">
            <div className="aspect-[4/5] w-full overflow-hidden bg-brand-cream">
              {about.image && <img src={about.image} alt="" className="w-full h-full object-cover" />}
            </div>
          </div>
          <div className="md:col-span-7 space-y-6 text-lg leading-relaxed text-brand-muted whitespace-pre-line">
            {about.paragraph1 && (
              <p className="font-serif text-3xl text-brand-espresso leading-snug">{about.paragraph1}</p>
            )}
            {about.paragraph2 && <p>{about.paragraph2}</p>}
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8 border-t border-brand-border pt-16">
          {[
            { title: "Modelos 2026", text: "Trabalhamos com frutas e legumes da estação. Mais sabor, mais nutrientes, menos quilómetros." },
            { title: "Personalizáveis e futebol", text: "Camisolas de futebol, modelos retro e equipamento de treino escolhidos para quem não abdica do estilo." },
            { title: "Atendimento próximo", text: "Aqui ouvimos quem entra. Sugestões, receitas, conselhos — gostamos de tratar cada cliente como vizinho." },
          ].map((b, i) => (
            <div key={i}>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-red mb-3">0{i + 1}</p>
              <h3 className="font-serif text-3xl text-brand-espresso leading-tight">{b.title}</h3>
              <p className="mt-3 text-brand-muted leading-relaxed">{b.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-24 relative aspect-[16/7] overflow-hidden bg-brand-cream">
          <img src={hero.image || HERO_IMG_DEFAULT} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}
