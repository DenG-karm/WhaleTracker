/**
 * src/services/storage.js
 * JWT tokenı güvenli depola / oku / sil
 * Native: Expo SecureStore (iOS Keychain, Android Keystore)
 * Web: localStorage fallback
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'wt_access_token';
const USER_KEY  = 'wt_user_cache';

const isWeb = Platform.OS === 'web';

const set = async (key, value) => {
  if (isWeb) { localStorage.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
};

const get = async (key) => {
  if (isWeb) return localStorage.getItem(key);
  return await SecureStore.getItemAsync(key);
};

const remove = async (key) => {
  if (isWeb) { localStorage.removeItem(key); return; }
  await SecureStore.deleteItemAsync(key);
};

export const Storage = {
  async saveToken(token) { await set(TOKEN_KEY, token); },
  async getToken()       { return await get(TOKEN_KEY); },
  async removeToken()    { await remove(TOKEN_KEY); },

  async saveUser(userObj) { await set(USER_KEY, JSON.stringify(userObj)); },
  async getUser() {
    const raw = await get(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async removeUser() { await remove(USER_KEY); },

  async clearAll() {
    await remove(TOKEN_KEY);
    await remove(USER_KEY);
  },
};
