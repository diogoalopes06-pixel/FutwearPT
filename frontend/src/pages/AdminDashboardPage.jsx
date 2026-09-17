import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { LogOut, Package, ClipboardList, Plus, Edit, Trash2, X, Loader2, MessageCircle, Mail, Bell, BellOff, FileEdit, Tag, Download, TrendingUp, BarChart3, AlertTriangle, Archive, RotateCcw, Star, Images } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { pushSupported, getPushStatus, subscribeToPush, unsubscribeFromPush, testPush } from "../lib/push";
import ContentEditor from "./ContentEditor";
import CouponsManager from "./CouponsManager";

const STATUS_OPTIONS = [
  { v: "pending", label: "Pendente", cls: "bg-yellow-100 text-yellow-800" },
  { v: "confirmed", label: "Confirmada", cls: "bg-blue-100 text-blue-800" },
  { v: "preparing", label: "A preparar", cls: "bg-orange-100 text-orange-800" },
  { v: "ready", label: "Pronta", cls: "bg-purple-100 text-purple-800" },
  { v: "delivered", label: "Entregue", cls: "bg-green-100 text-green-800" },
  { v: "cancelled", label: "Cancelada", cls: "bg-red-100 text-red-800" },
];

const CATEGORIES = ["clubes", "selecoes", "retro", "treino", "crianca", "acessorios"];
const UNITS = ["un"];

const euro = (value = 0) => `€${Number(value || 0).toFixed(2)}`;

function maxRevenue(rows = []) {
  return Math.max(1, ...rows.map((r) => Number(r.revenue || 0)));
}

export default function AdminDashboardPage() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [productReviews, setProductReviews] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [push, setPush] = useState({ supported: false, subscribed: false, permission: "default", busy: false });
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [archiveView, setArchiveView] = useState("active");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [productCategory, setProductCategory] = useState("all");
  const knownOrderIdsRef = useRef(new Set());
  const ordersInitializedRef = useRef(false);

  const refreshPushStatus = async () => {
    if (!pushSupported()) {
      setPush((p) => ({ ...p, supported: false }));
      return;
    }
    const s = await getPushStatus();
    setPush((p) => ({ ...p, ...s }));
  };

  useEffect(() => {
    if (user) refreshPushStatus();
  }, [user, archiveView]);

  useEffect(() => {
    if (!user) return;
    if (!push.supported || push.subscribed || push.permission !== "default") return;
    const dismissed = sessionStorage.getItem("dq_admin_push_prompt_dismissed");
    if (!dismissed) setShowPushPrompt(true);
  }, [user, push.supported, push.subscribed, push.permission]);

  const togglePush = async () => {
    setPush((p) => ({ ...p, busy: true }));
    try {
      if (push.subscribed) {
        await unsubscribeFromPush();
        toast.success("Notificações desativadas");
      } else {
        await subscribeToPush();
        toast.success("Notificações ativadas neste dispositivo");
      }
      setShowPushPrompt(false);
      await refreshPushStatus();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        toast.error("Backend desatualizado: faça redeploy do Render com o código mais recente.");
      } else {
        toast.error(e?.message || "Erro ao alterar notificações");
      }
    } finally {
      setPush((p) => ({ ...p, busy: false }));
    }
  };

  const dismissPushPrompt = () => {
    sessionStorage.setItem("dq_admin_push_prompt_dismissed", "1");
    setShowPushPrompt(false);
  };

  const sendTestPush = async () => {
    try {
      const r = await testPush();
      toast.success(`Notificação de teste enviada (${r.sent} dispositivos)`);
    } catch {
      toast.error("Erro ao enviar teste");
    }
  };

  const playAdminSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  };

  const loadAll = async () => {
    try {
      const [ordersRes, productsRes, statsRes, reviewsRes] = await Promise.all([
        api.get(`/admin/orders?view=${archiveView}`),
        api.get("/products"),
        api.get("/admin/stats"),
        api.get("/admin/product-reviews"),
      ]);

      const nextOrders = ordersRes.data || [];
      setOrders(() => {
        const previousIds = knownOrderIdsRef.current;
        const nextIds = new Set(nextOrders.map((o) => o.id));
        const hasNewOrder = ordersInitializedRef.current && nextOrders.some((o) => !previousIds.has(o.id));
        knownOrderIdsRef.current = nextIds;
        ordersInitializedRef.current = true;
        if (hasNewOrder) {
          toast.success("Nova encomenda recebida");
          playAdminSound();
        }
        return nextOrders;
      });

      setProducts(productsRes.data || []);
      setStats(statsRes.data || null);
      setProductReviews(reviewsRes.data || []);
    } catch (_) {}
  };

  useEffect(() => {
    if (user) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, archiveView]);

  useEffect(() => {
    if (!user || !autoRefresh) return;
    const timer = setInterval(() => { if (["orders", "stats"].includes(tab) || autoRefresh) loadAll(); }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, archiveView, autoRefresh, soundEnabled]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-brand-bone"><Loader2 className="animate-spin" /></div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.trim().toLowerCase();
    const created = new Date(o.created_at);
    const now = new Date();
    const matchesSearch = !q || [
      o.id,
      o.customer_name,
      o.phone,
      o.email,
      o.address,
      ...(o.items || []).map((it) => it.name),
    ].filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || (o.payment_status || "pending") === paymentFilter;
    const matchesDate = dateFilter === "all"
      || (dateFilter === "today" && created.toDateString() === now.toDateString())
      || (dateFilter === "7d" && created >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
      || (dateFilter === "30d" && created >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const frequentCustomers = Object.values(orders.reduce((acc, o) => {
    const key = (o.email || o.phone || o.customer_name || "cliente").toLowerCase();
    if (!acc[key]) acc[key] = { name: o.customer_name, email: o.email, phone: o.phone, orders: 0, total: 0 };
    acc[key].orders += 1;
    if (o.status !== "cancelled") acc[key].total += Number(o.total || 0);
    return acc;
  }, {})).sort((a, b) => b.orders - a.orders || b.total - a.total).slice(0, 5);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status });
      toast.success("Estado atualizado");
      loadAll();
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const updatePaymentStatus = async (id, payment_status) => {
    try {
      await api.patch(`/admin/orders/${id}/payment`, { payment_status });
      toast.success(payment_status === "paid" ? "Pagamento confirmado" : "Pagamento atualizado");
      loadAll();
    } catch {
      toast.error("Erro ao atualizar pagamento");
    }
  };

  const exportOrders = async () => {
    try {
      const response = await api.get("/admin/orders/export.csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `encomendas-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao exportar encomendas");
    }
  };

  const notifyReady = async (order) => {
    if (!order.email) {
      toast.error("Esta encomenda não tem email registado.");
      return;
    }
    try {
      const { data } = await api.post(`/admin/orders/${order.id}/notify-ready`);
      toast.success(data.message || "Email enviado");
      loadAll();
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 404) {
        toast.error("Backend desatualizado: faça redeploy do Render com o código mais recente.");
      } else {
        toast.error(typeof detail === "string" ? detail : "Erro ao enviar email");
      }
    }
  };

  const archiveOrder = async (id) => {
    try {
      await api.patch(`/admin/orders/${id}/archive`);
      toast.success("Encomenda arquivada");
      loadAll();
    } catch {
      toast.error("Erro ao arquivar");
    }
  };

  const restoreOrder = async (id) => {
    try {
      await api.patch(`/admin/orders/${id}/unarchive`);
      toast.success("Encomenda reposta");
      loadAll();
    } catch {
      toast.error("Erro ao repor");
    }
  };

  const whatsappLink = (order) => {
    const ref = order.id.slice(0, 8).toUpperCase();
    const method = order.delivery_method === "delivery" ? "para entrega" : "para levantamento na loja";
    const msg = `Olá ${order.customer_name.split(" ")[0]}! 🍎 A sua encomenda #${ref} (FutWearPT) está pronta ${method}. Total: €${order.total.toFixed(2)}. Aguardamos contacto. Obrigado!`;
    const phone = order.phone.replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const visibleProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    const matchesSearch = !q || `${p.name || ""} ${p.description || ""}`.toLowerCase().includes(q);
    const matchesCategory = productCategory === "all" || p.category === productCategory;
    return matchesSearch && matchesCategory;
  });

  const deleteProduct = async (id) => {
    if (!window.confirm("Apagar este produto?")) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success("Produto apagado");
      loadAll();
    } catch {
      toast.error("Erro");
    }
  };

  return (
    <div className="min-h-screen bg-brand-bone text-brand-espresso admin-page" data-testid="admin-dashboard">
      <header className="bg-brand-espresso text-brand-bone">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-serif text-2xl">FutWearPT <span className="text-brand-red">·</span> <span className="text-brand-bone/70">Admin</span></Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline text-brand-bone/70">{user.email}</span>
            <button onClick={logout} data-testid="admin-logout" className="px-4 py-2 border border-brand-bone/20 hover:border-brand-red hover:text-brand-red flex items-center gap-2 text-xs uppercase tracking-[0.18em]">
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
        {showPushPrompt && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center px-4">
            <div className="bg-white border border-brand-border p-6 max-w-md w-full shadow-2xl">
              <div className="w-12 h-12 grid place-items-center bg-brand-red text-white mx-auto">
                <Bell size={22} />
              </div>
              <p className="mt-5 text-center text-xs uppercase tracking-[0.25em] text-brand-red">Notificações</p>
              <h2 className="mt-2 text-center font-serif text-3xl text-brand-espresso">Receber novas encomendas?</h2>
              <p className="mt-3 text-center text-sm text-brand-muted leading-relaxed">
                Ative para receber uma notificação no telemóvel/computador sempre que entrar uma nova encomenda.
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

        <div className="mb-4 flex flex-wrap justify-end gap-2">
          {push.permission === "denied" && (
            <p className="text-xs text-brand-red mr-auto">Notificações bloqueadas nas definições do navegador/app.</p>
          )}
          {push.subscribed && (
            <button
              onClick={sendTestPush}
              data-testid="admin-push-test"
              className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.18em] hover:border-brand-espresso"
            >
              Testar notificação
            </button>
          )}
          <button
            onClick={togglePush}
            disabled={push.busy || push.permission === "denied"}
            data-testid="admin-push-toggle"
            className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.18em] flex items-center gap-2 disabled:opacity-50 hover:border-brand-red"
          >
            {push.busy ? <Loader2 size={14} className="animate-spin" /> : push.subscribed ? <Bell size={14} /> : <BellOff size={14} />}
            {push.busy ? "Aguarde..." : push.subscribed ? "Notificações ativas" : "Ativar notificações"}
          </button>
        </div>

        <div className="mb-6 bg-white border border-brand-border p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Painel em tempo real</p>
            <p className="text-sm text-brand-espresso">
              {autoRefresh ? "Atualização automática a cada 30 segundos" : "Atualização automática pausada"}
              {soundEnabled ? " · som ligado" : " · som desligado"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadAll()}
              className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.16em] hover:border-brand-red hover:text-brand-red"
            >
              Atualizar agora
            </button>
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`px-4 py-2 border text-xs uppercase tracking-[0.16em] ${autoRefresh ? "border-brand-red text-brand-red" : "border-brand-border text-brand-muted"}`}
            >
              {autoRefresh ? "Pausar refresh" : "Retomar refresh"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSoundEnabled((v) => !v);
                if (!soundEnabled) setTimeout(playAdminSound, 50);
              }}
              className={`px-4 py-2 border text-xs uppercase tracking-[0.16em] ${soundEnabled ? "border-brand-red text-brand-red" : "border-brand-border text-brand-muted"}`}
            >
              {soundEnabled ? "Som ligado" : "Som desligado"}
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-10 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {[
                { l: "Faturação total", v: euro(stats.total_revenue), icon: TrendingUp },
                { l: "Este mês", v: euro(stats.month_revenue), sub: `${stats.month_orders || 0} encomendas`, icon: BarChart3 },
                { l: "Hoje", v: euro(stats.today_revenue), sub: `${stats.today_orders || 0} encomendas`, icon: TrendingUp },
                { l: "Pendentes", v: stats.pending },
                { l: "Prontas", v: stats.ready },
                { l: "Produtos", v: stats.products },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.l} className="bg-white border border-brand-border p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-brand-muted">{s.l}</p>
                      {Icon && <Icon size={16} className="text-brand-red" />}
                    </div>
                    <p className="font-serif text-3xl text-brand-espresso mt-1">{s.v}</p>
                    {s.sub && <p className="text-xs text-brand-muted mt-1">{s.sub}</p>}
                  </div>
                );
              })}
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white border border-brand-border p-6">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-brand-muted">Vendas por dia</p>
                    <h3 className="font-serif text-2xl text-brand-espresso">Últimos 30 dias</h3>
                  </div>
                  <button onClick={exportOrders} className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:border-brand-red hover:text-brand-red">
                    <Download size={14} /> Exportar CSV
                  </button>
                </div>
                <div className="space-y-3">
                  {(stats.daily_sales || []).slice(-10).map((d) => {
                    const max = maxRevenue(stats.daily_sales);
                    return (
                      <div key={d.date}>
                        <div className="flex justify-between text-xs text-brand-muted mb-1">
                          <span>{new Date(d.date).toLocaleDateString("pt-PT")}</span>
                          <span>{d.orders} enc. · {euro(d.revenue)}</span>
                        </div>
                        <div className="h-2 bg-brand-cream overflow-hidden">
                          <div className="h-full bg-brand-red" style={{ width: `${Math.max(4, (Number(d.revenue || 0) / max) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {(!stats.daily_sales || stats.daily_sales.length === 0) && <p className="text-sm text-brand-muted">Ainda sem vendas registadas.</p>}
                </div>
              </div>

              <div className="bg-white border border-brand-border p-6">
                <p className="text-[10px] uppercase tracking-[0.18em] text-brand-muted">Produtos mais vendidos</p>
                <h3 className="font-serif text-2xl text-brand-espresso mb-5">Top produtos</h3>
                <div className="space-y-3">
                  {(stats.top_products || []).slice(0, 6).map((p, idx) => (
                    <div key={`${p.product_id}-${p.name}`} className="flex justify-between gap-3 text-sm">
                      <span className="truncate"><span className="text-brand-muted">#{idx + 1}</span> {p.name}</span>
                      <span className="tabular-nums text-brand-red">{euro(p.revenue)}</span>
                    </div>
                  ))}
                  {(!stats.top_products || stats.top_products.length === 0) && <p className="text-sm text-brand-muted">Ainda sem dados.</p>}
                </div>
              </div>
            </div>

            {(stats.low_stock || []).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-5 flex gap-3 text-amber-900">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-serif text-xl">Stock baixo</p>
                  <p className="text-sm mt-1">{stats.low_stock.map((p) => `${p.name} (${p.stock_quantity}${p.unit === "kg" ? " kg" : ""})`).join(" · ")}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-brand-border mb-8 flex gap-5 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setTab("orders")}
            data-testid="admin-tab-orders"
            className={`pb-4 text-sm uppercase tracking-[0.18em] border-b-2 flex items-center gap-2 ${tab === "orders" ? "border-brand-red text-brand-red" : "border-transparent text-brand-muted hover:text-brand-espresso"}`}
          >
            <ClipboardList size={16} /> Encomendas ({filteredOrders.length})
          </button>
          <button
            onClick={() => setTab("products")}
            data-testid="admin-tab-products"
            className={`pb-4 text-sm uppercase tracking-[0.18em] border-b-2 flex items-center gap-2 ${tab === "products" ? "border-brand-red text-brand-red" : "border-transparent text-brand-muted hover:text-brand-espresso"}`}
          >
            <Package size={16} /> Produtos ({products.length})
          </button>
          <button
            onClick={() => setTab("content")}
            data-testid="admin-tab-content"
            className={`pb-4 text-sm uppercase tracking-[0.18em] border-b-2 flex items-center gap-2 ${tab === "content" ? "border-brand-red text-brand-red" : "border-transparent text-brand-muted hover:text-brand-espresso"}`}
          >
            <FileEdit size={16} /> Conteúdo do site
          </button>
          <button
            onClick={() => setTab("coupons")}
            data-testid="admin-tab-coupons"
            className={`pb-4 text-sm uppercase tracking-[0.18em] border-b-2 flex items-center gap-2 ${tab === "coupons" ? "border-brand-red text-brand-red" : "border-transparent text-brand-muted hover:text-brand-espresso"}`}
          >
            <Tag size={16} /> Códigos
          </button>
          <button
            onClick={() => setTab("reviews")}
            data-testid="admin-tab-reviews"
            className={`pb-4 text-sm uppercase tracking-[0.18em] border-b-2 flex items-center gap-2 ${tab === "reviews" ? "border-brand-red text-brand-red" : "border-transparent text-brand-muted hover:text-brand-espresso"}`}
          >
            <Star size={16} /> Reviews ({productReviews.filter((r) => !r.approved).length})
          </button>
          <button
            onClick={() => setTab("gallery")}
            data-testid="admin-tab-gallery"
            className={`pb-4 text-sm uppercase tracking-[0.18em] border-b-2 flex items-center gap-2 ${tab === "gallery" ? "border-brand-red text-brand-red" : "border-transparent text-brand-muted hover:text-brand-espresso"}`}
          >
            <Images size={16} /> Galeria
          </button>
        </div>

        {/* Orders */}
        {tab === "orders" && (
          <div className="space-y-4">
            <div className="bg-white border border-brand-border p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {[{v: "active", l: "Ativas"}, {v: "archive", l: "Arquivo"}, {v: "all", l: "Todas"}].map((item) => (
                  <button
                    key={item.v}
                    onClick={() => setArchiveView(item.v)}
                    className={`px-4 py-2 border text-xs uppercase tracking-[0.16em] ${archiveView === item.v ? "bg-brand-espresso text-white border-brand-espresso" : "border-brand-border text-brand-muted"}`}
                  >
                    {item.l}
                  </button>
                ))}
              </div>
              <div className="grid md:grid-cols-4 gap-3">
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Pesquisar cliente, telefone, email, produto..."
                  className="md:col-span-2 bg-white border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red"
                />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border border-brand-border px-4 py-3 text-sm">
                  <option value="all">Todos os estados</option>
                  {STATUS_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
                <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="bg-white border border-brand-border px-4 py-3 text-sm">
                  <option value="all">Todos os pagamentos</option>
                  <option value="pending">Pagamento pendente</option>
                  <option value="paid">Pago</option>
                  <option value="failed">Falhado</option>
                  <option value="refunded">Reembolsado</option>
                </select>
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-white border border-brand-border px-4 py-3 text-sm">
                  <option value="all">Todas as datas</option>
                  <option value="today">Hoje</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                </select>
              </div>
              {frequentCustomers.length > 0 && (
                <div className="pt-4 border-t border-brand-border">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mb-3">Clientes frequentes</p>
                  <div className="grid md:grid-cols-5 gap-2">
                    {frequentCustomers.map((c) => (
                      <div key={`${c.email}-${c.phone}-${c.name}`} className="bg-brand-cream/50 border border-brand-border p-3">
                        <p className="font-serif text-brand-espresso truncate">{c.name}</p>
                        <p className="text-xs text-brand-muted">{c.orders} enc. · €{c.total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {filteredOrders.length === 0 && <p className="text-brand-muted text-center py-16">Nenhuma encomenda encontrada.</p>}
            {filteredOrders.map((o) => {
              const status = STATUS_OPTIONS.find((s) => s.v === o.status);
              return (
                <div key={o.id} className="bg-white border border-brand-border p-6" data-testid={`admin-order-${o.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-brand-cream border border-brand-border grid place-items-center shrink-0">
                        {o.customer_avatar_url ? (
                          <img src={o.customer_avatar_url} alt={o.customer_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-serif text-2xl text-brand-muted">{(o.customer_name || "?").charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-sm text-brand-muted">#{o.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`text-[10px] uppercase tracking-[0.18em] px-2 py-1 ${status?.cls}`}>{status?.label}</span>
                          <span className="text-xs text-brand-muted">{new Date(o.created_at).toLocaleString("pt-PT")}</span>
                        </div>
                        <p className="font-serif text-2xl text-brand-espresso mt-2">{o.customer_name}</p>
                        <p className="text-sm text-brand-muted">{o.phone} {o.email && `· ${o.email}`}</p>
                      <p className="text-xs text-brand-muted mt-1">
                        {o.delivery_method === "delivery" ? `Entrega: ${o.address}` : "Levantamento na loja"} · Pagamento: "Instagram · combinado" · Estado pagamento: {o.payment_status === "paid" ? "Pago" : "Pendente"}
                      </p>
                        {o.notes && <p className="text-xs italic text-brand-muted mt-1">"{o.notes}"</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-3xl text-brand-red">€{o.total.toFixed(2)}</p>
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        data-testid={`admin-order-status-${o.id}`}
                        className="mt-2 bg-white border border-brand-border px-3 py-2 text-sm w-full"
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                      </select>
                      <select
                        value={o.payment_status || "pending"}
                        onChange={(e) => updatePaymentStatus(o.id, e.target.value)}
                        data-testid={`admin-order-payment-${o.id}`}
                        className="mt-2 bg-white border border-brand-border px-3 py-2 text-sm w-full"
                      >
                        <option value="pending">Pagamento pendente</option>
                        <option value="paid">Pagamento pago</option>
                        <option value="failed">Pagamento falhado</option>
                        <option value="refunded">Pagamento reembolsado</option>
                      </select>
                    </div>
                  </div>
                  <ul className="mt-4 pt-4 border-t border-brand-border text-sm space-y-1">
                    {o.items.map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{it.name} × {it.quantity}{it.unit === "kg" ? " kg" : ""}</span>
                        <span className="tabular-nums">€{(it.price * it.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-brand-border flex flex-wrap gap-2">
                    <button
                      onClick={() => notifyReady(o)}
                      disabled={!o.email}
                      data-testid={`admin-notify-email-${o.id}`}
                      className="px-4 py-2 bg-brand-red text-white text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:bg-brand-redDark disabled:opacity-40 disabled:cursor-not-allowed"
                      title={o.email ? "Enviar email a confirmar que está pronta" : "Sem email"}
                    >
                      <Mail size={14} /> Notificar pronta (email)
                    </button>
                    <a
                      href={whatsappLink(o)}
                      target="_blank"
                      rel="noreferrer"
                      data-testid={`admin-notify-whatsapp-${o.id}`}
                      className="px-4 py-2 bg-[#25D366] text-white text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:opacity-90"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                    {o.archived ? (
                      <button onClick={() => restoreOrder(o.id)} className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:border-brand-red hover:text-brand-red">
                        <RotateCcw size={14} /> Repor
                      </button>
                    ) : (
                      <button onClick={() => archiveOrder(o.id)} className="px-4 py-2 border border-brand-border text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:border-brand-red hover:text-brand-red">
                        <Archive size={14} /> Arquivar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Products */}
        {tab === "products" && (
          <div>
            <div className="mb-6 bg-white border border-brand-border p-4 grid md:grid-cols-[1fr_220px_auto] gap-3 items-center">
              <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Pesquisar produtos..." className="bg-white border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red" />
              <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="bg-white border border-brand-border px-4 py-3 text-sm">
                <option value="all">Todas as categorias</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="text-xs text-brand-muted">{visibleProducts.length} de {products.length} produtos</span>
            </div>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }
              data-testid="admin-add-product"
              className="mb-6 px-5 py-3 bg-brand-red text-white text-xs uppercase tracking-[0.18em] flex items-center gap-2 hover:bg-brand-redDark"
            >
              <Plus size={14} /> Novo produto
            </button>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleProducts.map((p) => (
                <div key={p.id} className="bg-white border border-brand-border p-4 flex gap-4" data-testid={`admin-product-${p.id}`}>
                  <div className="w-20 h-20 bg-brand-cream shrink-0 overflow-hidden">
                    {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-brand-espresso truncate">{p.name}</p>
                    <p className="text-xs text-brand-muted">{p.category} · €{p.price.toFixed(2)} / {p.unit}</p>
                    <p className={`text-xs mt-1 ${p.in_stock ? "text-green-700" : "text-brand-red"}`}>
                      {p.stock_quantity === null || p.stock_quantity === undefined ? (p.in_stock ? "Stock ilimitado" : "Esgotado") : `Stock: ${p.stock_quantity}${p.unit === "kg" ? " kg" : ""}`}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => { setEditing(p); setShowForm(true); }} className="text-xs text-brand-espresso hover:text-brand-red flex items-center gap-1" data-testid={`admin-edit-${p.id}`}>
                        <Edit size={12} /> Editar
                      </button>
                      <button onClick={() => deleteProduct(p.id)} className="text-xs text-brand-muted hover:text-brand-red flex items-center gap-1" data-testid={`admin-delete-${p.id}`}>
                        <Trash2 size={12} /> Apagar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Editor */}
        {tab === "content" && <ContentEditor />}

        {/* Coupons */}
        {tab === "coupons" && <CouponsManager />}

        {/* Reviews */}
        {tab === "reviews" && <ReviewsManager reviews={productReviews} products={products} onSaved={loadAll} />}

        {/* Gallery */}
        {tab === "gallery" && <GalleryManager />}
      </div>

      {showForm && (
        <ProductForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadAll(); }}
        />
      )}
    </div>
  );
}

function ProductForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    category: initial?.category || "clubes",
    price: initial?.price ?? "",
    unit: initial?.unit || "un",
    image: initial?.image || "",
    description: initial?.description || "",
    in_stock: initial?.in_stock ?? true,
    featured: initial?.featured ?? false,
    seasonal: initial?.seasonal ?? false,
    bestseller: initial?.bestseller ?? false,
    promotion: initial?.promotion ?? false,
    related_ids: Array.isArray(initial?.related_ids) ? initial.related_ids.join(",") : "",
    stock_quantity: initial?.stock_quantity ?? "",
    sizes: Array.isArray(initial?.sizes) ? initial.sizes.join(",") : "XS,S,M,L,XL,XXL",
    personalizable: initial?.personalizable ?? true,
    season: initial?.season || "2026",
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        stock_quantity: form.stock_quantity === "" || form.stock_quantity === null ? null : parseFloat(form.stock_quantity),
        related_ids: form.related_ids ? form.related_ids.split(",").map((v) => v.trim()).filter(Boolean) : [],
        sizes: form.sizes ? form.sizes.split(",").map((v) => v.trim()).filter(Boolean) : [],
        personalizable: Boolean(form.personalizable),
        season: form.season || "2026",
      };
      if (initial) await api.put(`/admin/products/${initial.id}`, payload);
      else await api.post("/admin/products", payload);
      toast.success("Guardado");
      onSaved();
    } catch (err) {
      toast.error("Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-espresso/60 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-brand-bone w-full max-w-xl p-8 my-8" onClick={(e) => e.stopPropagation()} data-testid="admin-product-form">
        <div className="flex justify-between items-start mb-6">
          <h2 className="font-serif text-3xl text-brand-espresso">{initial ? "Editar produto" : "Novo produto"}</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-red"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nome">
            <input required value={form.name} onChange={set("name")} data-testid="admin-form-name" className={inp} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Categoria">
              <select required value={form.category} onChange={set("category")} data-testid="admin-form-category" className={inp}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Unidade">
              <select required value={form.unit} onChange={set("unit")} data-testid="admin-form-unit" className={inp}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Preço (€)">
            <input required type="number" step="0.01" min="0" value={form.price} onChange={set("price")} data-testid="admin-form-price" className={inp} />
          </Field>
          <Field label="Stock disponível (deixar vazio = sem limite)">
            <input type="number" step="1" min="0" value={form.stock_quantity} onChange={set("stock_quantity")} placeholder="ex: 25" data-testid="admin-form-stock" className={inp} />
          </Field>
          <Field label="URL da imagem">
            <input value={form.image} onChange={set("image")} placeholder="https://..." data-testid="admin-form-image" className={inp} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tamanhos (separados por vírgulas)">
              <input value={form.sizes} onChange={set("sizes")} placeholder="XS,S,M,L,XL,XXL" data-testid="admin-form-sizes" className={inp} />
            </Field>
            <Field label="Época / coleção">
              <input value={form.season} onChange={set("season")} placeholder="2026" data-testid="admin-form-season" className={inp} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.personalizable} onChange={set("personalizable")} data-testid="admin-form-personalizable" /> Personalizável (nome + número)
          </label>
          <Field label="Descrição">
            <textarea value={form.description} onChange={set("description")} rows={3} data-testid="admin-form-desc" className={`${inp} resize-none`} />
          </Field>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.in_stock} onChange={set("in_stock")} /> Em stock
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured} onChange={set("featured")} /> Destaque
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.seasonal} onChange={set("seasonal")} /> Da época
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.bestseller} onChange={set("bestseller")} /> Mais vendido
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.promotion} onChange={set("promotion")} /> Promoção
            </label>
          </div>
          <Field label="Sugestões manuais — IDs de produtos separados por vírgula">
            <input value={form.related_ids} onChange={set("related_ids")} placeholder="id1,id2,id3" className={inp} />
          </Field>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-brand-border text-sm uppercase tracking-[0.18em]">Cancelar</button>
            <button type="submit" disabled={saving} data-testid="admin-form-submit" className="flex-1 py-3 bg-brand-red text-white text-sm uppercase tracking-[0.18em] disabled:opacity-60">
              {saving ? "A guardar..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function ReviewsManager({ reviews, products, onSaved }) {
  const productName = (id) => products.find((p) => p.id === id)?.name || id;

  const updateReview = async (id, payload) => {
    try {
      await api.patch(`/admin/product-reviews/${id}`, payload);
      toast.success("Review atualizada");
      onSaved();
    } catch {
      toast.error("Erro ao atualizar review");
    }
  };

  const deleteReview = async (id) => {
    if (!window.confirm("Apagar esta review?")) return;
    try {
      await api.delete(`/admin/product-reviews/${id}`);
      toast.success("Review apagada");
      onSaved();
    } catch {
      toast.error("Erro ao apagar review");
    }
  };

  if (!reviews.length) {
    return <div className="bg-white border border-brand-border p-8 text-brand-muted">Ainda não existem reviews de produtos.</div>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="bg-white border border-brand-border p-5">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-red">{productName(r.product_id)}</p>
              <p className="font-serif text-2xl text-brand-espresso mt-1">{r.name}</p>
              <div className="flex gap-1 text-brand-red mt-1">
                {Array(Number(r.stars || 5)).fill(0).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => updateReview(r.id, { approved: !r.approved })} className={`px-4 py-2 text-xs uppercase tracking-[0.16em] border ${r.approved ? "border-green-700 text-green-700" : "border-brand-red text-brand-red"}`}>
                {r.approved ? "Aprovada" : "Aprovar"}
              </button>
              <button onClick={() => updateReview(r.id, { featured: !r.featured })} className={`px-4 py-2 text-xs uppercase tracking-[0.16em] border ${r.featured ? "border-brand-red text-brand-red" : "border-brand-border"}`}>
                {r.featured ? "Destacada" : "Destacar"}
              </button>
              <button onClick={() => deleteReview(r.id)} className="px-4 py-2 text-xs uppercase tracking-[0.16em] border border-brand-border hover:border-brand-red hover:text-brand-red">
                Apagar
              </button>
            </div>
          </div>
          <p className="mt-4 text-brand-muted leading-relaxed">{r.text}</p>
        </div>
      ))}
    </div>
  );
}


const inp = "w-full bg-white text-brand-espresso placeholder:text-zinc-400 border border-brand-border px-3 py-2.5 text-sm focus:outline-none focus:border-brand-red";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function GalleryManager() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ url: "", caption: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/gallery")
      .then((r) => setPhotos(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.url.trim()) { toast.error("Insira o URL da imagem."); return; }
    setSaving(true);
    try {
      await api.post("/admin/gallery", form);
      setForm({ url: "", caption: "", category: "" });
      toast.success("Foto adicionada.");
      load();
    } catch { toast.error("Erro ao adicionar foto."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    setDeleting(id);
    try {
      await api.delete(`/admin/gallery/${id}`);
      toast.success("Foto removida.");
      load();
    } catch { toast.error("Erro ao remover foto."); }
    finally { setDeleting(null); }
  };

  const categories = [...new Set(photos.map((p) => p.category).filter(Boolean))];

  return (
    <div className="space-y-8">
      {/* Formulário adicionar */}
      <div className="bg-white border border-brand-border p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-brand-red mb-4">Adicionar foto</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <label className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">URL da imagem *</label>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
              className="mt-1 w-full border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Legenda</label>
            <input
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="Ex: Os nossos produtos frescos"
              className="mt-1 w-full border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">Categoria</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Ex: Loja, Camisolas, Equipa"
              list="gallery-cats"
              className="mt-1 w-full border border-brand-border px-4 py-3 text-sm focus:outline-none focus:border-brand-red"
            />
            <datalist id="gallery-cats">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="flex items-end">
            <button
              onClick={add}
              disabled={saving}
              className="w-full py-3 bg-brand-red text-white text-xs uppercase tracking-[0.18em] hover:bg-brand-redDark transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Adicionar
            </button>
          </div>
        </div>

        {/* Preview URL */}
        {form.url && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted mb-2">Pré-visualização</p>
            <img src={form.url} alt="preview" className="h-32 w-32 object-cover border border-brand-border" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </div>
        )}
      </div>

      {/* Grid de fotos */}
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-brand-muted mb-4">{photos.length} foto{photos.length !== 1 ? "s" : ""} na galeria</p>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="aspect-square bg-brand-cream animate-pulse" />)}
          </div>
        ) : photos.length === 0 ? (
          <div className="py-16 text-center text-brand-muted border border-brand-border bg-white">
            <Images size={36} className="mx-auto mb-3 opacity-30" />
            <p>Ainda não há fotos. Adiciona a primeira acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden border border-brand-border bg-brand-cream">
                <img src={photo.url} alt={photo.caption || ""} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-brand-espresso/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                  {photo.caption && <p className="text-brand-bone text-xs text-center leading-tight">{photo.caption}</p>}
                  {photo.category && <span className="text-brand-bone/60 text-[10px] uppercase">{photo.category}</span>}
                  <button
                    onClick={() => remove(photo.id)}
                    disabled={deleting === photo.id}
                    className="mt-2 px-3 py-1.5 bg-brand-red text-white text-xs uppercase tracking-[0.15em] hover:bg-red-700 transition-colors flex items-center gap-1 disabled:opacity-60"
                  >
                    {deleting === photo.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
