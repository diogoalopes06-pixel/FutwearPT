import axios from "axios";

const RAW_BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const BACKEND_URL = (RAW_BACKEND_URL || "").replace(/\/+$/, "");
export const API = `${BACKEND_URL}/api`;

if (typeof window !== "undefined") {
  if (!BACKEND_URL) {
    console.error("[futwearpt] REACT_APP_BACKEND_URL is not defined at build time. Set it on Vercel and redeploy.");
  } else {
    console.info("[futwearpt] API base:", API);
  }
}

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const url = config?.url || "";
  const isCustomerEndpoint = url.startsWith("/customers/") || url === "/customers";
  const token = isCustomerEndpoint
    ? localStorage.getItem("dq_customer_token") || sessionStorage.getItem("dq_customer_token")
    : localStorage.getItem("dq_token") || sessionStorage.getItem("dq_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  async (response) => {
    // Older orders created before customer prefill was fixed can have no email.
    // Recover the latest order using its private tracking token so it still appears
    // in the logged-in customer's history.
    if (response.config?.url === "/customers/orders" && Array.isArray(response.data) && response.data.length === 0) {
      try {
        let orderId = localStorage.getItem("fw_last_order_id");
        let trackingToken = localStorage.getItem("fw_last_order_token");

        // Also recover when the customer navigated directly from the order page.
        if ((!orderId || !trackingToken) && typeof document !== "undefined" && document.referrer) {
          const match = document.referrer.match(/\/encomenda\/([^/?#]+)\?token=([^&#]+)/);
          if (match) {
            orderId = decodeURIComponent(match[1]);
            trackingToken = decodeURIComponent(match[2]);
          }
        }

        if (orderId && trackingToken) {
          const recovered = await axios.get(`${API}/orders/${encodeURIComponent(orderId)}`, {
            params: { token: trackingToken },
          });
          if (recovered.data?.id) response.data = [recovered.data];
        }
      } catch {
        // Keep the normal empty history response if recovery is not possible.
      }
    }
    return response;
  },
  (err) => {
    if (!BACKEND_URL && err?.message?.includes("Network")) {
      err.message = "REACT_APP_BACKEND_URL não está definida no build. Reimplante na Vercel após configurar a variável de ambiente.";
    }
    return Promise.reject(err);
  }
);

export default api;
