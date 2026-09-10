import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuth } from "../context/CustomerAuthContext";

const inputCls = "w-full bg-white border border-brand-border px-4 py-3 text-sm text-brand-espresso focus:outline-none focus:border-brand-red transition-colors";

export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const { login, register } = useCustomerAuth();
  const [mode, setMode] = useState("login");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        toast.success("Sessão iniciada");
      } else {
        await register(form);
        toast.success("Conta criada com sucesso");
      }
      navigate("/minha-conta");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Não foi possível entrar. Confirme os dados.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-red">Área de cliente</p>
          <h1 className="mt-3 font-serif text-5xl text-brand-espresso">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
          <p className="mt-4 text-brand-muted">Guarde os seus dados, veja o histórico e repita encomendas rapidamente.</p>
        </div>

        <form onSubmit={submit} className="mt-10 bg-white border border-brand-border p-6 space-y-4">
          {mode === "register" && (
            <>
              <Field label="Nome completo *"><input required value={form.name} onChange={set("name")} className={inputCls} /></Field>
              <Field label="Telemóvel"><input value={form.phone} onChange={set("phone")} className={inputCls} /></Field>
              <Field label="Morada habitual"><textarea value={form.address} onChange={set("address")} rows={3} className={`${inputCls} resize-none`} /></Field>
            </>
          )}
          <Field label="Email *"><input required type="email" value={form.email} onChange={set("email")} className={inputCls} /></Field>
          <Field label="Password *"><input required type="password" minLength={6} value={form.password} onChange={set("password")} className={inputCls} /></Field>

          <button disabled={submitting} className="w-full py-4 bg-brand-red text-white text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-60">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-brand-muted">
          {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-brand-red hover:underline">
            {mode === "login" ? "Criar conta" : "Entrar"}
          </button>
        </div>

        <div className="mt-8 text-center">
          <Link to="/loja" className="text-xs uppercase tracking-[0.18em] text-brand-red hover:underline">Voltar à loja</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
