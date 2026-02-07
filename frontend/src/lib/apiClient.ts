import axios from "axios";

/**
 * Pre-configured Axios instance.
 * - In development, Next.js rewrites /api/backend/* → localhost:4000/api/*
 * - JWT token is attached automatically from localStorage.
 */
const baseURL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "/api/backend";

const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("dispatch_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally — clear token and redirect to login
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("dispatch_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
