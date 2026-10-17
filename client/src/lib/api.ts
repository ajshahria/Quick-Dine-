import axios from "axios";
// Same-origin /api uses Vite locally and a deployment reverse proxy in production.
const api = axios.create({
  baseURL:(import.meta.env.VITE_PUBLIC_API_URL?.trim() || import.meta.env.VITE_API_URL?.trim() || "/api").replace(/\/+$/, ""),
  withCredentials:true,
});
let csrfRequest: Promise<string> | null = null;
api.interceptors.request.use(async config => {
  if (!["get", "head", "options"].includes(config.method || "get")) {
    // Fetch for each mutation so expiry, another tab, and session changes cannot
    // leave a stale cached token. Share simultaneous bootstrap requests.
    csrfRequest ??= api.get("/auth/csrf").then(res => res.data.csrfToken as string).finally(() => { csrfRequest = null; });
    config.headers.set("X-CSRF-Token", await csrfRequest);
  }
  return config;
});
export default api;
