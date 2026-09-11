import { Link } from "react-router-dom";
import { useSeo } from "../components/Seo";

export default function PrivacyPolicyPage() {
  useSeo({ title: "Política de Privacidade", description: "Saiba como as Delícias Football Store tratam os seus dados pessoais." });
  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone" data-testid="privacy-policy-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-3">RGPD · Privacidade</p>
        <h1 className="font-serif text-5xl md:text-6xl text-brand-espresso leading-tight">Política de Privacidade</h1>
        <p className="mt-6 text-brand-muted leading-relaxed">
          Esta política explica como FutWearPT recolhe e utiliza os dados fornecidos pelos clientes no site.
        </p>

        <div className="mt-12 bg-white border border-brand-border p-6 sm:p-10 space-y-8 text-brand-muted leading-relaxed">
          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">1. Quem somos</h2>
            <p>
              FutWearPT é uma loja física em Abrantes, Portugal. O site permite consultar produtos e fazer encomendas para levantamento ou entrega.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">2. Dados que recolhemos</h2>
            <p>Quando faz uma encomenda podemos recolher:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>nome;</li>
              <li>email;</li>
              <li>telefone;</li>
              <li>morada de entrega, quando aplicável;</li>
              <li>produtos encomendados;</li>
              <li>notas introduzidas pelo cliente.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">3. Para que usamos os dados</h2>
            <p>Usamos os dados apenas para:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>processar encomendas;</li>
              <li>contactar o cliente sobre a encomenda;</li>
              <li>preparar levantamento ou entrega;</li>
              <li>enviar emails relacionados com o estado da encomenda;</li>
              <li>cumprir obrigações legais e fiscais associadas à loja física.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">4. Conservação dos dados</h2>
            <p>
              Guardamos os dados pelo tempo necessário para gerir encomendas, atendimento ao cliente e cumprimento de obrigações legais. Quando deixarem de ser necessários, os dados podem ser removidos ou anonimizados.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">5. Partilha de dados</h2>
            <p>
              Não vendemos dados pessoais. Podemos usar serviços técnicos necessários para o funcionamento do site, como alojamento, base de dados e envio de emails transacionais.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">6. Direitos do cliente</h2>
            <p>
              Pode pedir acesso, correção ou eliminação dos seus dados, dentro dos limites legais aplicáveis, contactando-nos através do email da loja.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">7. Contacto</h2>
            <p>
              Para questões sobre privacidade, contacte-nos por email: <a className="text-brand-red hover:underline" href="mailto:hello@futwearpt.pt">hello@futwearpt.pt</a>
            </p>
          </section>
        </div>

        <div className="mt-10">
          <Link to="/" className="text-sm uppercase tracking-[0.18em] text-brand-red hover:underline">Voltar ao início</Link>
        </div>
      </div>
    </div>
  );
}
