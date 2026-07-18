/**
 * src/context/AuthContext.js
 * Global auth state — login / logout / register / google auth / token persist
 * BUG FIX: Backend "token" key döner, "access_token" değil
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Storage } from '../services/storage';
import { AuthAPI, UserAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Uygulama açılışında kayıtlı token varsa kullanıcıyı yükle
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await Storage.getToken();
        if (savedToken) {
          setToken(savedToken);
          const me = await UserAPI.me();
          setUser(me);
        }
      } catch {
        await Storage.clearAll();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * E-posta + şifre ile giriş
   * BUG FIX: Backend { token, user_name, user_id, email } döner — "access_token" değil "token"
   */
  const login = async (email, password) => {
    const data = await AuthAPI.login(email, password);

    if (data?.status === 'beta_full') return { betaFull: true };
    if (data?.status === 'error') throw new Error(data.msg || 'Giriş hatası');

    // Backend "token" key'ini kullanır
    const jwt = data.token || data.access_token;
    if (!jwt) throw new Error('Token alınamadı');

    await Storage.saveToken(jwt);
    setToken(jwt);
    setUser({
      id:        data.user_id,
      full_name: data.user_name,
      email:     data.email,
      avatar:    data.avatar,
    });
    return { success: true };
  };

  /**
   * Google OAuth ile giriş
   * access_token: Google'dan alınan OAuth token
   */
  const loginWithGoogle = async (access_token) => {
    const data = await AuthAPI.googleAuth(access_token);

    if (data?.status === 'error') throw new Error(data.msg || 'Google giriş hatası');

    const jwt = data.token || data.access_token;
    if (!jwt) throw new Error('Token alınamadı');

    await Storage.saveToken(jwt);
    setToken(jwt);
    setUser({
      id:        data.user_id,
      full_name: data.user_name,
      email:     data.email,
      avatar:    data.avatar,
    });
    return { success: true };
  };

  /**
   * OTP doğrulamalı kayıt
   * Kayıt başarılıysa otomatik login yapar
   */
  const register = async ({ email, full_name, password, code }) => {
    const data = await AuthAPI.register({ email, full_name, password, code });

    if (data?.status === 'beta_full') return { betaFull: true };
    if (data?.status === 'error') throw new Error(data.msg || 'Kayıt hatası');

    // Kayıt başarılı → otomatik login
    return await login(email, password);
  };

  const logout = async () => {
    await Storage.clearAll();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
