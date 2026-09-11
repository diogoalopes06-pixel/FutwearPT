import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const LOGO = "/futwearpt-logo-square.png";

export default function AdminLoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => localStorage.getItem("adminRememberEmail") || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("adminRememberMe") === "true");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password, rememberMe);

      if (rememberMe) {
        localStorage.setItem("adminRememberMe", "true");
        localStorage.setItem("adminRememberEmail", email);
      } else {
        localStorage.removeItem("adminRememberMe");
        localStorage.removeItem("adminRememberEmail");
      }

      navigate("/admin");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Erro ao iniciar sessão");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bone grid lg:grid-cols-2" data-testid="admin-login-page">
      <div className="hidden lg:block relative overflow-hidden bg-brand-red">
        <div className="absolute inset-0 grid place-items-center p-12">
          <img src={LOGO} alt="" className="w-64 h-64 object-cover" />
        </div>
      </div>

      <div className="grid place-items-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="text-xs uppercase tracking-[0.18em] text-brand-muted hover:text-brand-red">← Voltar ao site</Link>
          <p className="mt-10 text-xs uppercase tracking-[0.3em] text-brand-red">Área do Lojista</p>
          <h1 className="mt-3 font-serif text-5xl text-brand-espresso leading-tight">Iniciar sessão</h1>

          <form onSubmit={submit} className="mt-10 space-y-5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="admin-login-email"
                className="mt-2 w-full bg-white border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Palavra-passe</span>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="admin-login-password"
                className="mt-2 w-full bg-white border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red"
              />
            </label>
                        <label className="flex items-center gap-2 text-sm text-brand-muted cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Memorizar esta conta neste dispositivo
            </label>

<button
              type="submit"
              disabled={submitting}
              data-testid="admin-login-submit"
              className="w-full py-4 bg-brand-red text-white text-sm uppercase tracking-[0.2em] hover:bg-brand-redDark transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
