/**
 * src/services/api.js
 * WhaleTracker API istemcisi — tüm endpoint'ler
 * Tüm istekler buradan geçer; token otomatik eklenir.
 */

import { Platform } from 'react-native';
import { Storage } from './storage';

// Web → localhost, Android emülatör → 10.0.2.2, Gerçek cihaz → LAN IP
const _default = Platform.OS === 'web'
  ? 'http://localhost:8000'
  : 'http://10.0.2.2:8000';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || _default;
const WS_BASE  = process.env.EXPO_PUBLIC_WS_BASE  || _default.replace('http', 'ws');

export { WS_BASE };

// ── Temel istek fonksiyonu ─────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = await Storage.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.detail || data?.msg || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const AuthAPI = {
  /** E-posta doğrulama kodu gönder (kayıt için) */
  sendCode: (email) =>
    request('/api/v1/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /** Kodu doğrula (kayıt adım 2) */
  verifyCode: (email, code) =>
    request('/api/v1/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  /** Kayıt ol (OTP + şifre + ad) */
  register: ({ email, full_name, password, code }) =>
    request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, full_name, password, code }),
    }),

  /** E-posta + şifre ile giriş */
  login: (email, password) =>
    request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /** Google OAuth token ile giriş/kayıt */
  googleAuth: (access_token) =>
    request('/api/v1/auth/google-auth', {
      method: 'POST',
      body: JSON.stringify({ access_token }),
    }),

  /** Şifre sıfırlama kodu gönder */
  forgotPassword: (email) =>
    request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /** Kodu ve yeni şifreyle sıfırla */
  resetPassword: ({ email, code, new_password }) =>
    request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, new_password }),
    }),

  /** Token yenile */
  refresh: () =>
    request('/api/v1/auth/refresh', { method: 'POST' }),
};

// ── Mobil Dashboard ───────────────────────────────────────────────────────────
export const MobileAPI = {
  /** Ana dashboard — tek çağrı */
  dashboard: () => request('/api/v1/mobile/dashboard'),

  /** Trade journal — sayfalı */
  journal: (page = 1, limit = 20, status = null, symbol = null) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.set('status', status);
    if (symbol) params.set('symbol', symbol);
    return request(`/api/v1/mobile/journal?${params}`);
  },

  /** İstatistik (7d | 30d | 90d | all) */
  stats: (period = '30d') =>
    request(`/api/v1/mobile/stats?period=${period}`),
};

// ── AI Chat ───────────────────────────────────────────────────────────────────
export const AIAPI = {
  /** Sohbet mesajı gönder */
  chat: (message, conversation_id = null) =>
    request('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_id }),
    }),
};

// ── Haberler ──────────────────────────────────────────────────────────────────
export const NewsAPI = {
  /** Son haberler */
  latest: (limit = 30) =>
    request(`/api/v1/news?limit=${limit}`),

  /** Kritik haberler */
  critical: (limit = 10) =>
    request(`/api/v1/news/critical?limit=${limit}`),
};

// ── Kullanıcı ─────────────────────────────────────────────────────────────────
export const UserAPI = {
  me: () => request('/api/v1/users/me'),
};
