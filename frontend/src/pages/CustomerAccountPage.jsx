import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { User, Package, LogOut, Loader2, Repeat2, Bell, BellOff, Camera, X } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { pushSupported, getPushStatus, subscribeToPush, unsubscribeFromPush, testPush } from "../lib/push";

const tokenKey = "dq_customer_token";

function authHeaders() {
  const token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCustomerToken() {
  return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
}

function saveCustomerSession(token, email, remember) {
  const storage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;

  storage.setItem(tokenKey, token);
  otherStorage.removeItem(tokenKey);

  if (remember) {
    localStorage.setItem("dq_customer_remember", "true");
    localStorage.setItem("dq_customer_email", email || "");
  } else {
    localStorage.removeItem("dq_customer_remember");
    localStorage.removeItem("dq_customer_email");
  }
}

function clearCustomerSession() {
  localStorage.removeItem(tokenKey);
  sessionStorage.removeItem(tokenKey);
}

export default function CustomerAccountPage() {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(() => ({ name: "", phone: "", email: localStorage.getItem("dq_customer_email") || "", password: "" }));
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("dq_customer_remember") === "true");
  const [push, setPush] = useState({ supported: false, subscribed: false, permission: "default", busy: false });
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  const load = async () => {
    const token = getCustomerToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.get("/customers/me", { headers: authHeaders() });
      setUser(me.data);
      const history = await api.get("/customers/orders", { headers: authHeaders() });
      setOrders(history.data || []);
    } catch {
      clearCustomerSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshPush = async () => {
    if (!pushSupported()) {
      setPush((p) => ({ ...p, supported: false }));
      return;
    }
    try {
      const status = await getPushStatus();
      setPush((p) => ({ ...p, ...status, busy: false }));
    } catch {
      setPush((p) => ({ ...p, supported: false, busy: false }));
    }
  };

  useEffect(() => {
    load();
    refreshPush();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!push.supported || push.subscribed || push.permission !== "default") return;
    const dismissed = sessionStorage.getItem("dq_customer_push_prompt_dismissed");
    if (!dismissed) setShowPushPrompt(true);
  }, [user, push.supported, push.subscribed, push.permission]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const endpoint = mode === "register" ? "/customers/register" : "/customers/login";
      const payload = mode === "register" ? form : { email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      saveCustomerSession(data.access_token, form.email, rememberMe);
      setUser(data.user);
      toast.success(mode === "register" ? "Conta criada" : "Sessão iniciada");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Não foi possível entrar");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    clearCustomerSession();
    setUser(null);
    setOrders([]);
  };

  const togglePush = async () => {
    setPush((p) => ({ ...p, busy: true }));
    try {
      if (push.subscribed) {
        await unsubscribeFromPush("customer", { headers: authHeaders() });
        toast.success("Notificações desativadas");
      } else {
        await subscribeToPush("customer", { headers: authHeaders() });
        toast.success("Notificações ativadas");
      }
      setShowPushPrompt(false);
      await refreshPush();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Não foi possível ativar notificações");
      await refreshPush();
    }
  };

  const dismissPushPrompt = () => {
    sessionStorage.setItem("dq_customer_push_prompt_dismissed", "1");
    setShowPushPrompt(false);
  };

  const sendTestPush = async () => {
    try {
      await testPush("customer", { headers: authHeaders() });
      toast.success("Notificação de teste enviada");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Não foi possível enviar teste");
    }
  };

  const saveProfilePhoto = async (avatarUrl) => {
    try {
      const { data } = await api.patch("/customers/me", { avatar_url: avatarUrl }, { headers: authHeaders() });
      setUser(data);
      toast.success(avatarUrl ? "Foto guardada" : "Foto removida");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Não foi possível guardar a foto");
    }
  };

  const handleProfilePhoto = (file) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxBytes = 6 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      toast.error("Use uma imagem em JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > maxBytes) {
      toast.error("Imagem demasiado grande. Use uma imagem até 6 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = async () => {
        try {
          const maxSize = 520;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            toast.error("Não foi possível preparar a imagem.");
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL("image/jpeg", 0.72);
          await saveProfilePhoto(compressed);
        } catch {
          toast.error("Não foi possível guardar a imagem.");
        }
      };

      img.onerror = () => {
        toast.error("Não foi possível ler a imagem. Use JPG, PNG ou WEBP.");
      };

      img.src = String(reader.result || "");
    };

    reader.onerror = () => toast.error("Não foi possível ler a imagem.");
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="pt-32 pb-24 min-h-screen bg-brand-bone grid place-items-center"><Loader2 className="animate-spin" /></div>;

  if (!user) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-10">
            <User size={42} className="mx-auto text-brand-red" strokeWidth={1.5} />
            <p className="mt-5 text-xs uppercase tracking-[0.3em] text-brand-red">Área de cliente</p>
            <h1 className="mt-3 font-serif text-5xl text-brand-espresso">A sua conta</h1>
            <p className="mt-4 text-brand-muted">Entre para ver o histórico das suas encomendas.</p>
          </div>

          <div className="bg-white border border-brand-border p-6">
            <div className="grid grid-cols-2 mb-6 border border-brand-border">
              <button onClick={() => setMode("login")} className={`py-3 text-xs uppercase tracking-[0.18em] ${mode === "login" ? "bg-brand-espresso text-white" : "text-brand-muted"}`}>Entrar</button>
              <button onClick={() => setMode("register")} className={`py-3 text-xs uppercase tracking-[0.18em] ${mode === "register" ? "bg-brand-espresso text-white" : "text-brand-muted"}`}>Criar conta</button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              {mode === "register" && (
                <>
                  <Field label="Nome">
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} />
                  </Field>
                  <Field label="Telemóvel">
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} />
                  </Field>
                </>
              )}
              <Field label="Email">
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} />
              </Field>
              <Field label="Password">
                <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inp} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-brand-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Manter sessão iniciada neste dispositivo
              </label>

              <button disabled={busy} className="w-full py-4 bg-brand-red text-white text-xs uppercase tracking-[0.2em] disabled:opacity-60">
                {busy ? "A processar..." : mode === "register" ? "Criar conta" : "Entrar"}
              </button>
              {mode === "login" && (
                <div className="text-center">
                  <Link to="/recuperar-password" className="text-xs uppercase tracking-[0.16em] text-brand-red hover:underline">Esqueci-me da password</Link>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 min-h-screen bg-brand-bone">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-white border border-brand-border grid place-items-center">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-brand-muted" />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-brand-red text-white grid place-items-center cursor-pointer shadow-md">
                <Camera size={15} />
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleProfilePhoto(e.target.files?.[0])} />
              </label>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brand-red">Área de cliente</p>
              <h1 className="mt-3 font-serif text-5xl text-brand-espresso">Olá, {user.name}</h1>
              <p className="mt-2 text-brand-muted">Histórico de encomendas associado a {user.email}</p>
              {user.avatar_url && (
                <button onClick={() => saveProfilePhoto("")} className="mt-2 text-xs uppercase tracking-[0.14em] text-brand-muted hover:text-brand-red inline-flex items-center gap-1">
                  <X size={12} /> Remover foto
                </button>
              )}
            </div>
          </div>
          <button onClick={logout} className="px-5 py-3 border border-brand-border text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:border-brand-red hover:text-brand-red">
            <LogOut size={14} /> Sair
          </button>
        </div>

        {showPushPrompt && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center px-4">
            <div className="bg-white border border-brand-border p-6 max-w-md w-full shadow-2xl">
              <div className="w-12 h-12 grid place-items-center bg-brand-red text-white mx-auto">
                <Bell size={22} />
              </div>
              <p className="mt-5 text-center text-xs uppercase tracking-[0.25em] text-brand-red">Notificações</p>
              <h2 className="mt-2 text-center font-serif text-3xl text-brand-espresso">Receber avisos da encomenda?</h2>
              <p className="mt-3 text-center text-sm text-brand-muted leading-relaxed">
                Podemos avisá-lo quando a sua encomenda for confirmada, estiver em preparação, pronta ou entregue.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={dismissPushPrompt} className="py-3 border border-brand-border text-xs uppercase tracking-[0.16em]">
                  Agora não
                </button>
                <button onClick={togglePush} disabled={push.busy} className="py-3 bg-brand-red text-white text-xs uppercase tracking-[0.16em] disabled:opacity-60">
                  {push.busy ? "Aguarde..." : "Permitir"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-wrap items-center justify-end gap-2">
          {push.permission === "denied" && (
            <p className="text-xs text-brand-red mr-auto">Notificações bloqueadas nas definições do navegador/app.</p>
          )}
          {push.subscribed && (
            <button onClick={sendTestPush} className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.16em]">
              Testar notificação
            </button>
          )}
          <button onClick={togglePush} disabled={push.busy || push.permission === "denied"} className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.16em] flex items-center gap-2 disabled:opacity-50">
            {push.subscribed ? <Bell size={14} /> : <BellOff size={14} />}
            {push.busy ? "Aguarde..." : push.subscribed ? "Notificações ativas" : "Ativar notificações"}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-brand-border p-5">
            <Package size={20} className="text-brand-red" />
            <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-brand-muted">Total encomendas</p>
            <p className="font-serif text-4xl text-brand-espresso">{orders.length}</p>
          </div>
          <div className="bg-white border border-brand-border p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Última encomenda</p>
            <p className="font-serif text-2xl text-brand-espresso mt-2">{orders[0] ? `#${orders[0].id.slice(0, 8).toUpperCase()}` : "—"}</p>
          </div>
          <Link to="/loja" className="bg-brand-espresso text-brand-bone p-5 hover:bg-brand-red transition-colors">
            <Repeat2 size={20} />
            <p className="mt-3 text-xs uppercase tracking-[0.2em]">Fazer nova encomenda</p>
          </Link>
        </div>

        <div className="space-y-4">
          {orders.length === 0 && <div className="bg-white border border-brand-border p-8 text-center text-brand-muted">Ainda não existem encomendas nesta conta.</div>}
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-brand-border p-6 flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-mono text-sm text-brand-muted">#{o.id.slice(0, 8).toUpperCase()}</p>
                <p className="font-serif text-2xl text-brand-espresso mt-1">€{Number(o.total || 0).toFixed(2)}</p>
                <p className="text-sm text-brand-muted mt-1">{new Date(o.created_at).toLocaleString("pt-PT")}</p>
                <p className="text-xs text-brand-muted mt-1">Estado: {o.status} · Pagamento: {o.payment_status}</p>
              </div>
              <Link to={`/encomenda/${o.id}`} className="self-center px-5 py-3 bg-brand-red text-white text-xs uppercase tracking-[0.18em]">Ver estado</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inp = "w-full bg-white border border-brand-border px-3 py-3 text-sm focus:outline-none focus:border-brand-red";
function Field({ label, children }) {
  return <label className="block"><span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">{label}</span><div className="mt-1.5">{children}</div></label>;
}
