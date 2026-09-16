import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Lock, Mail, User, Phone, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const inputCls = "w-full bg-white border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red";

function Field({ icon: Icon, children }) {
  return <div className="relative">{Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />}{children}</div>;
}

export default function CustomerAuthPage() {
  const { user, customerLogin, customerRegister } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "" });

  if (user?.role === "customer") return <Navigate to="/minha-conta" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await customerLogin(form.email, form.password);
        toast.success("Sessão iniciada.");
      } else {
        await customerRegister(form);
        toast.success("Conta criada com sucesso.");
      }
      navigate("/minha-conta");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
      <div className="max-w-xl mx-auto px-6">
        <Link to="/" className="text-xs uppercase tracking-[0.18em] text-brand-muted hover:text-brand-red flex items-center gap-2 mb-8"><ArrowLeft size={14} /> Voltar</Link>
        <p className="text-xs uppercase tracking-[0.3em] text-brand-red mb-3">Área cliente</p>
        <h1 className="font-serif text-5xl text-brand-espresso">{mode === "login" ? "Entrar na conta" : "Criar conta"}</h1>
        <p className="text-brand-muted mt-4">Acompanhe encomendas, veja o histórico e repita pedidos anteriores.</p>

        <form onSubmit={submit} className="mt-10 bg-white border border-brand-border p-6 space-y-4">
          {mode === "register" && (
            <Field icon={User}><input required value={form.name} onChange={set("name")} placeholder="Nome completo" className={`${inputCls} pl-10`} /></Field>
          )}
          <Field icon={Mail}><input required type="email" value={form.email} onChange={set("email")} placeholder="Email" className={`${inputCls} pl-10`} /></Field>
          <Field icon={Lock}><input required type="password" minLength={6} value={form.password} onChange={set("password")} placeholder="Password" className={`${inputCls} pl-10`} /></Field>
          {mode === "register" && (
            <>
              <Field icon={Phone}><input value={form.phone} onChange={set("phone")} placeholder="Telemóvel" className={`${inputCls} pl-10`} /></Field>
              <Field icon={MapPin}><input value={form.address} onChange={set("address")} placeholder="Morada habitual" className={`${inputCls} pl-10`} /></Field>
            </>
          )}
          <button disabled={loading} className="w-full bg-brand-red text-white py-4 text-xs uppercase tracking-[0.2em] disabled:opacity-60">
            {loading ? "A processar..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-6 text-sm text-brand-muted hover:text-brand-red">
          {mode === "login" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
