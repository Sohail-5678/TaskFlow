import axios from "axios";

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Attach the JWT on every request if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("taskflow_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the stale token and bounce to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("taskflow_token");
      if (!location.pathname.startsWith("/login") && !location.pathname.startsWith("/register")) {
        location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

/** Build the WebSocket URL for a board, carrying the JWT as a query param. */
export function boardSocketUrl(boardId: number): string {
  const token = localStorage.getItem("taskflow_token") ?? "";
  const wsBase = API_URL.replace(/^http/, "ws");
  return `${wsBase}/ws/boards/${boardId}?token=${encodeURIComponent(token)}`;
}
