import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:3000",
  withCredentials: true,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle Unauthorized
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const path = window.location.pathname;

    // ❗ Only redirect to login if NOT already on login page
    if (status === 401 && !path.includes("/login")) {
      console.warn("🔐 Token expired — redirecting to login");

      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");

      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default api;
