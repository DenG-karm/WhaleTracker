import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { AuthContext } from './AuthContext';

const WalletAnalysisContext = createContext(null);

const SESSION_KEY_TASK       = 'wt_wallet_task';
const SESSION_KEY_PREDICTION = 'wt_wallet_prediction';
const POLL_INTERVAL_MS       = 3000;

// ── Dil tespiti: i18n.js'deki lookupLocalStorage anahtarı 'wt_language' ───────────
const getLang = () => {
    try {
        // i18n.js detection: lookupLocalStorage = 'wt_language'
        const stored = localStorage.getItem('wt_language') || localStorage.getItem('i18nextLng') || 'tr';
        return stored.toLowerCase().startsWith('en') ? 'EN' : 'TR';
    } catch { return 'TR'; }
};

export const WalletAnalysisProvider = ({ children }) => {
    const { user }   = useContext(AuthContext);

    // ── Kalıcı durum: sessionStorage'dan yükle ───────────────────────────────
    const [activeTask, setActiveTask] = useState(() => {
        try {
            const saved = sessionStorage.getItem(SESSION_KEY_TASK);
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    const [prediction, setPrediction] = useState(() => {
        try { return sessionStorage.getItem(SESSION_KEY_PREDICTION) || null; }
        catch { return null; }
    });

    const [predicting, setPredicting] = useState(false);

    // ── Kayıtlı Cüzdanlar ────────────────────────────────────────────────────
    const [savedWallets, setSavedWallets]     = useState([]);
    const [walletsLoading, setWalletsLoading] = useState(false);

    const intervalRef   = useRef(null);
    const pollErrCount  = useRef(0);   // Ardışık polling hatası sayacı

    // ── Kayıtlı cüzdan listesini yükle ──────────────────────────────────────
    const fetchSavedWallets = useCallback(async () => {
        if (!user) return;
        setWalletsLoading(true);
        try {
            const data = await apiClient('/analytics/saved-wallets');
            setSavedWallets(Array.isArray(data) ? data : []);
        } catch { /* sessiz */ }
        finally { setWalletsLoading(false); }
    }, [user]);

    useEffect(() => {
        if (user) fetchSavedWallets();
    }, [user, fetchSavedWallets]);

    // ── Cüzdanı kaydet (upsert) ──────────────────────────────────────────────
    const persistWallet = useCallback(async (walletAddress, walletName) => {
        try {
            await apiClient('/analytics/saved-wallets', {
                method: 'POST',
                body: { wallet_address: walletAddress, wallet_name: walletName },
            });
            fetchSavedWallets();
        } catch { /* sessiz */ }
    }, [fetchSavedWallets]);

    // ── Cüzdanı sil ─────────────────────────────────────────────────────────
    const deleteWallet = useCallback(async (walletAddress) => {
        try {
            await apiClient(`/analytics/saved-wallets/${encodeURIComponent(walletAddress)}`, {
                method: 'DELETE',
            });
            setSavedWallets(prev => prev.filter(w => w.wallet_address !== walletAddress));
        } catch { /* sessiz */ }
    }, []);

    // ── Tahmin çekme ─────────────────────────────────────────────────────────
    const fetchPrediction = useCallback(async (profileData, lang) => {
        setPredicting(true);
        // lang: task'tan gelir (tıklama anında yakalanan); fallback olarak localStorage
        const activeLang = lang || getLang();
        try {
            const res = await apiClient('/analytics/predict', {
                method: 'POST',
                body: { profile: profileData, lang: activeLang },
            });
            const text = res.prediction || '';
            setPrediction(text);
            try { sessionStorage.setItem(SESSION_KEY_PREDICTION, text); } catch (_) {}
        } catch {
            setPrediction('AI analizi şu an kullanılamıyor.');
        } finally {
            setPredicting(false);
        }
    }, []);

    // ── Global polling — sayfa değişiminden ETKİLENMEZ ───────────────────────
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        if (!activeTask || !user) return;
        const { status, taskId } = activeTask;
        if (status === 'completed' || status === 'failed') return;

        const poll = async () => {
            try {
                const res = await apiClient(`/analytics/task/${taskId}`);
                pollErrCount.current = 0;  // başarılı yanıtta sayacı sıfırla

                const isSuccess =
                    (res.status === 'success' && res.ready) ||
                    (res.ready && res.result?.data && res.status !== 'failed');

                if (isSuccess) {
                    clearInterval(intervalRef.current);
                    const updated = { ...activeTask, status: 'completed', result: res.result };
                    setActiveTask(updated);
                    try { sessionStorage.setItem(SESSION_KEY_TASK, JSON.stringify(updated)); } catch (_) {}
                    setPrediction(null);
                    try { sessionStorage.removeItem(SESSION_KEY_PREDICTION); } catch (_) {}
                    fetchPrediction(res.result.data);
                    // Akıllı adres defterine kaydet
                    if (res.result?.data?.label) {
                        persistWallet(activeTask.address, res.result.data.label);
                    }
                } else if (res.status === 'failed' && !res.ready) {
                    clearInterval(intervalRef.current);
                    const updated = { ...activeTask, status: 'failed' };
                    setActiveTask(updated);
                    try { sessionStorage.setItem(SESSION_KEY_TASK, JSON.stringify(updated)); } catch (_) {}
                } else if (res.status === 'processing' && activeTask.status !== 'processing') {
                    setActiveTask(prev =>
                        prev?.taskId === taskId ? { ...prev, status: 'processing' } : prev
                    );
                }
            } catch (err) {
                console.error('[WalletAnalysis] Polling hatası:', err);
            }
        };

        poll();
        intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTask?.taskId, user?.token]);

    // ── Analiz başlatma ──────────────────────────────────────────────────────
    const startAnalysis = useCallback((taskId, address, lang) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // lang: tıklama anında yakalandı, task ile birlikte sessionStorage'a kaydedilir
        const task = { taskId, address, lang: lang || getLang(), status: 'pending', result: null, startedAt: Date.now() };
        setActiveTask(task);
        setPrediction(null);
        try {
            sessionStorage.setItem(SESSION_KEY_TASK, JSON.stringify(task));
            sessionStorage.removeItem(SESSION_KEY_PREDICTION);
        } catch (_) {}
    }, []);

    // ── Görevi temizle ───────────────────────────────────────────────────────
    const clearTask = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setActiveTask(null);
        setPrediction(null);
        try {
            sessionStorage.removeItem(SESSION_KEY_TASK);
            sessionStorage.removeItem(SESSION_KEY_PREDICTION);
        } catch (_) {}
    }, []);

    return (
        <WalletAnalysisContext.Provider
            value={{
                activeTask, prediction, predicting,
                savedWallets, walletsLoading,
                startAnalysis, clearTask, deleteWallet, fetchSavedWallets,
            }}
        >
            {children}
        </WalletAnalysisContext.Provider>
    );
};

export const useWalletAnalysis = () => useContext(WalletAnalysisContext);
