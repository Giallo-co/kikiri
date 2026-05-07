/** Base URL for API (production). Empty in dev → same-origin + Vite proxy to backend. */
const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const API_BASE_URL = (raw ?? "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE_URL) return `${API_BASE_URL}${p}`;
  return p;
}
