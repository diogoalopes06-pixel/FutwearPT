import axios from "axios";

const RAW_BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// Trim trailing slash to avoid double // in API path
const BACKEND_URL = (RAW_BACKEND_URL || "").replace(/\/+$/, "");
export const API = `${BACKEND_URL}/api`;

if (typeof window !== "undefined") {
  if (!BACKEND_URL) {
    // eslint-disable-next-line no-console
    console.error(
      "[delicias] REACT_APP_BACKEND_URL is not defined at build time. " +
        "API calls will fail. Set it on Vercel (Project → Settings → Environment Variables) " +
        "and redeploy."
    );
  } else {
    // eslint-disable-next-line no-console
    console.info("[delicias] API base:", API);
  }
}

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dq_token") || localStorage.getItem("dq_customer_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (!BACKEND_URL && err?.message?.includes("Network")) {
      err.message =
        "REACT_APP_BACKEND_URL não está definida no build. Reimplante na Vercel após configurar a variável de ambiente.";
    }
    return Promise.reject(err);
  }
);

export default api;
