import { clearSession, getStoredSession } from "../hooks/useAuth";

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const productionApiUrl = "https://microsave-app.onrender.com";

// A Netlify build must never use a stale deployment variable (such as the old
// Koyeb URL) or a visitor's localhost. Production always calls Render.
export const API_BASE_URL = import.meta.env.PROD
  ? productionApiUrl
  : configuredApiUrl || "http://localhost:8000";

export async function apiFetch(path, options = {}) {
  const session = getStoredSession();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSession();
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.detail || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

