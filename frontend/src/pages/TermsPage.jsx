import { Link } from "react-router-dom";
import { useSeo } from "../components/Seo";

export default function TermsPage() {
  useSeo({ title: "Termos e Condições", description: "Condições aplicáveis às encomendas feitas nas Delícias Football Store." });
  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone" data-testid="terms-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-3">Encomendas · Condições</p>
        <h1 className="font-serif text-5xl md:text-6xl text-brand-espresso leading-tight">Termos e Condições</h1>
        <p className="mt-6 text-brand-muted leading-relaxed">
          Estes termos aplicam-se às encomendas feitas através do site FutWearPT.
        </p>

        <div className="mt-12 bg-white border border-brand-border p-6 sm:p-10 space-y-8 text-brand-muted leading-relaxed">
          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">1. Encomendas</h2>
            <p>
              As encomendas realizadas no site ficam sujeitas a confirmação pela equipa da loja. Alguns produtos podem variar conforme disponibilidade, sazonalidade e stock.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">2. Preços</h2>
            <p>
              Os preços apresentados no site podem ser atualizados a qualquer momento. Em produtos vendidos ao peso, o valor final pode variar ligeiramente conforme preparação e pesagem final.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">3. Pagamentos</h2>
            <p>
              O pagamento pode ser combinado após a encomenda, incluindo opções disponíveis na loja. Quando usado MBWay manual, a encomenda é preparada após confirmação do pagamento pela equipa.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">4. Entrega e levantamento</h2>
            <p>
              As encomendas podem ser levantadas na loja ou, quando disponível, entregues ao domicílio na zona indicada. Horários e custos de entrega são confirmados pela equipa.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">5. Cancelamentos</h2>
            <p>
              Caso pretenda cancelar ou alterar uma encomenda, contacte a loja o mais cedo possível por telefone ou email. Encomendas já preparadas podem não ser canceláveis.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">6. Faturação</h2>
            <p>
              A faturação é tratada pela loja física, de acordo com as regras fiscais aplicáveis. O cliente pode solicitar fatura no momento do pagamento ou levantamento.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-3xl text-brand-espresso mb-3">7. Contacto</h2>
            <p>
              Para dúvidas sobre encomendas, contacte-nos pelo telefone <a className="text-brand-red hover:underline" href="tel:+351241402897">+351 241 402 897</a> ou por email <a className="text-brand-red hover:underline" href="mailto:deliciasdaquintinha.financeira@gmail.com">deliciasdaquintinha.financeira@gmail.com</a>.
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
