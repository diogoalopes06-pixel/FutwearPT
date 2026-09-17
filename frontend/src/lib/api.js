import axios from "axios";

const RAW_BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// Trim trailing slash to avoid double // in API path
const BACKEND_URL = (RAW_BACKEND_URL || "").replace(/\/+$/, "");
export const API = `${BACKEND_URL}/api`;

if (typeof window !== "undefined") {
  if (!BACKEND_URL) {
    // eslint-disable-next-line no-console
    console.error(
      "[futwearpt] REACT_APP_BACKEND_URL is not defined at build time. " +
        "API calls will fail. Set it on Vercel (Project → Settings → Environment Variables) " +
        "and redeploy."
    );
  } else {
    // eslint-disable-next-line no-console
    console.info("[futwearpt] API base:", API);
  }
}

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const url = config?.url || "";
  const isCustomerEndpoint = url.startsWith("/customers/") || url === "/customers";

  // Keep admin and customer sessions completely separate.
  const token = isCustomerEndpoint
    ? localStorage.getItem("dq_customer_token") || sessionStorage.getItem("dq_customer_token")
    : localStorage.getItem("dq_token") || sessionStorage.getItem("dq_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  async (response) => {
    // If an older order was created before the account-email prefill fix, it may
    // not be linked to the customer account. Recover the most recent order from
    // the secure tracking token saved by the order confirmation page.
    if (response.config?.url === "/customers/orders" && Array.isArray(response.data) && response.data.length === 0) {
      try {
        const orderId = localStorage.getItem("fw_last_order_id");
        const trackingToken = localStorage.getItem("fw_last_order_token");
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
      err.message =
        "REACT_APP_BACKEND_URL não está definida no build. Reimplante na Vercel após configurar a variável de ambiente.";
    }
    return Promise.reject(err);
  }
);

export default api;
