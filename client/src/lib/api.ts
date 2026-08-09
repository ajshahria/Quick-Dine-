import axios from "axios";

const productionApiUrl = "https://quick-dine-server-rust.vercel.app/api";
const defaultApiUrl = import.meta.env.DEV
  ? "http://localhost:5000/api"
  : productionApiUrl;
const apiUrl = (import.meta.env.VITE_API_URL?.trim() || defaultApiUrl).replace(
  /\/+$/,
  "",
);

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
export default api;
