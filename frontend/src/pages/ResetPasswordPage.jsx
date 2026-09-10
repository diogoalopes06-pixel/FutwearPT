import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LockKeyhole, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

export default function ResetPasswordPage() {
  const location = useLocation();
  const token = useMemo(() => new URLSearchParams(location.search).get("token") || "", [location.search]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A password deve ter pelo menos 6 caracteres");
    if (password !== confirm) return toast.error("As passwords não coincidem");
    setBusy(true);
    try {
      await api.post("/customers/password-reset/confirm", { token, password });
      setDone(true);
      toast.success("Password atualizada");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Link inválido ou expirado");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
      <div className="max-w-xl mx-auto px-6 text-center">
        <LockKeyhole size={42} className="mx-auto text-brand-red" strokeWidth={1.5} />
        <p className="mt-5 text-xs uppercase tracking-[0.3em] text-brand-red">Nova password</p>
        <h1 className="mt-3 font-serif text-5xl text-brand-espresso">Criar nova password</h1>

        <div className="mt-10 bg-white border border-brand-border p-6 text-left">
          {done ? (
            <div className="text-center py-6">
              <p className="font-serif text-2xl text-brand-espresso">Password alterada.</p>
              <Link to="/conta" className="mt-8 inline-block px-6 py-3 bg-brand-red text-white text-xs uppercase tracking-[0.18em]">Entrar na conta</Link>
            </div>
          ) : !token ? (
            <div className="text-center py-6">
              <p className="text-brand-muted">Link inválido.</p>
              <Link to="/recuperar-password" className="mt-6 inline-block text-brand-red uppercase tracking-[0.18em] text-xs">Pedir novo link</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Nova password</span>
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full bg-white border border-brand-border px-3 py-3 text-sm focus:outline-none focus:border-brand-red" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Confirmar password</span>
                <input required type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5 w-full bg-white border border-brand-border px-3 py-3 text-sm focus:outline-none focus:border-brand-red" />
              </label>
              <button disabled={busy} className="w-full py-4 bg-brand-red text-white text-xs uppercase tracking-[0.2em] disabled:opacity-60">
                {busy ? <Loader2 className="mx-auto animate-spin" size={18} /> : "Guardar password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
