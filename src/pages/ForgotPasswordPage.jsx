import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/customers/password-reset/request", { email });
      setSent(true);
      toast.success("Email enviado se a conta existir");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Não foi possível enviar o email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
      <div className="max-w-xl mx-auto px-6 text-center">
        <Mail size={42} className="mx-auto text-brand-red" strokeWidth={1.5} />
        <p className="mt-5 text-xs uppercase tracking-[0.3em] text-brand-red">Recuperar password</p>
        <h1 className="mt-3 font-serif text-5xl text-brand-espresso">Aceder à conta</h1>
        <p className="mt-4 text-brand-muted">Indique o email da sua conta e enviaremos um link para criar uma nova password.</p>

        <div className="mt-10 bg-white border border-brand-border p-6 text-left">
          {sent ? (
            <div className="text-center py-6">
              <p className="font-serif text-2xl text-brand-espresso">Verifique o seu email.</p>
              <p className="mt-3 text-brand-muted">Se existir uma conta com esse email, receberá um link válido durante 1 hora.</p>
              <Link to="/conta" className="mt-8 inline-block px-6 py-3 bg-brand-red text-white text-xs uppercase tracking-[0.18em]">Voltar ao login</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Email</span>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full bg-white border border-brand-border px-3 py-3 text-sm focus:outline-none focus:border-brand-red" />
              </label>
              <button disabled={busy} className="w-full py-4 bg-brand-red text-white text-xs uppercase tracking-[0.2em] disabled:opacity-60">
                {busy ? <Loader2 className="mx-auto animate-spin" size={18} /> : "Enviar link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
