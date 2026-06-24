export let authToken = localStorage.getItem('e70_token');
export let onUnauthorized = null;

export const API_BASE = import.meta.env.VITE_API_URL || '';

export function setOnUnauthorized(fn) { onUnauthorized = fn; }
export function setAuthToken(t) { authToken = t; }
export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('e70_token');
  localStorage.removeItem('e70_user');
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}/api${path}`, { headers, ...options });
  if (res.status === 401) {
    clearAuthToken();
    if (onUnauthorized) onUnauthorized();
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Network error' })); throw new Error(e.error || `HTTP ${res.status}`); }
  if (res.status === 204) return null;
  return res.json();
}

