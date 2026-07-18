/**
 * TiltContext — Tilt Kalkanı Global State
 * =========================================
 * Tetikleyici mantığı:
 *   1. Üst üste 3 kapalı işlemden zarar → kilit
 *   2. Günlük drawdown ≥ %3 (ayarlanabilir) → kilit
 *
 * Kilit süresi: TEST_LOCK_SECS (60 saniye) — üretimde PROD_LOCK_SECS (43200 = 12 saat)
 *
 * Kullanım:
 *   const { isTiltLocked, countdown, triggerReason, unlockNow, checkTrades } = useTilt();
 *   // checkTrades(trades): AppLayout veya her fetchTrades sonrası çağrılır
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const TiltContext = createContext(null);

// ── Sabitler ─────────────────────────────────────────────────────────────────
const TEST_LOCK_SECS      = 60;         // Test modu — 60 saniye
const PROD_LOCK_SECS      = 43_200;     // Üretim modu — 12 saat (etkinleştirmek için bu sabiti kullan)
const LOCK_DURATION_SECS  = TEST_LOCK_SECS;

const CONSEC_LOSS_LIMIT   = 3;          // Üst üste kaç zarar → kilit
const DAILY_DD_PCT_LIMIT  = 3.0;        // Günlük drawdown % eşiği

const LS_KEY = 'wt_tilt_lock';         // localStorage anahtarı (sayfa yenileme persistence)

// ── Persistence yardımcıları ─────────────────────────────────────────────────
const saveLock = (unlocksAt) => {
    try { localStorage.setItem(LS_KEY, String(unlocksAt)); } catch (_) {}
};
const clearLock = () => {
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
};
const loadLock = () => {
    try {
        const val = localStorage.getItem(LS_KEY);
        if (!val) return null;
        const ts = Number(val);
        return isNaN(ts) ? null : ts;
    } catch (_) { return null; }
};

// ── Provider ─────────────────────────────────────────────────────────────────
export const TiltProvider = ({ children }) => {
    const [isTiltLocked,  setIsTiltLocked]  = useState(false);
    const [triggerReason, setTriggerReason] = useState(null); // 'consecutive_loss' | 'daily_drawdown'
    const [countdown,     setCountdown]     = useState(0);    // kalan saniye

    const timerRef    = useRef(null);
    const unlocksAtRef = useRef(null); // Unix ms

    // ── Kilidi aç ──────────────────────────────────────────────────────────
    const unlockNow = useCallback(() => {
        clearInterval(timerRef.current);
        clearLock();
        unlocksAtRef.current = null;
        setIsTiltLocked(false);
        setTriggerReason(null);
        setCountdown(0);
    }, []);

    // ── Geri sayım başlat ──────────────────────────────────────────────────
    const startCountdown = useCallback((unlocksAt) => {
        clearInterval(timerRef.current);
        unlocksAtRef.current = unlocksAt;
        saveLock(unlocksAt);

        const tick = () => {
            const remaining = Math.max(0, Math.ceil((unlocksAt - Date.now()) / 1000));
            setCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(timerRef.current);
                unlockNow();
            }
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
    }, [unlockNow]);

    // ── Kilidi tetikle ─────────────────────────────────────────────────────
    const triggerLock = useCallback((reason) => {
        const unlocksAt = Date.now() + LOCK_DURATION_SECS * 1000;
        setIsTiltLocked(true);
        setTriggerReason(reason);
        startCountdown(unlocksAt);
    }, [startCountdown]);

    // ── Sayfa yenilendiğinde devam eden kilidi geri yükle ──────────────────
    useEffect(() => {
        const savedUnlocksAt = loadLock();
        if (savedUnlocksAt && savedUnlocksAt > Date.now()) {
            setIsTiltLocked(true);
            setTriggerReason('persisted'); // Önceki tetikleyici bilinmiyor
            startCountdown(savedUnlocksAt);
        }
        return () => clearInterval(timerRef.current);
    }, [startCountdown]);

    // ── Ana analiz fonksiyonu — her fetchTrades sonrası çağrılır ──────────
    const checkTrades = useCallback((trades) => {
        if (isTiltLocked) return; // Zaten kilitli
        if (!Array.isArray(trades) || trades.length === 0) return;

        // Sadece kapalı işlemler
        const closed = trades
            .filter(t => t.status === 'CLOSED' && t.pnl !== undefined && t.pnl !== null)
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); // En yeni önce

        if (closed.length === 0) return;

        // ── Kural 1: Üst üste 3 zarar ────────────────────────────────────
        let consecLosses = 0;
        for (const t of closed) {
            if (Number(t.pnl) < 0) consecLosses++;
            else break;
        }
        if (consecLosses >= CONSEC_LOSS_LIMIT) {
            triggerLock('consecutive_loss');
            return;
        }

        // ── Kural 2: Günlük drawdown ≥ %3 ────────────────────────────────
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayTrades = closed.filter(t => (t.date || '').startsWith(todayStr));
        if (todayTrades.length > 0) {
            // İlk işlemin giriş bakiyesini referans al; yoksa en yüksek bakiye varsayımı
            const refBalance = Number(todayTrades[todayTrades.length - 1]?.account_balance || 0);
            const todayPnl   = todayTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
            if (refBalance > 0) {
                const ddPct = Math.abs(Math.min(0, todayPnl) / refBalance) * 100;
                if (ddPct >= DAILY_DD_PCT_LIMIT) {
                    triggerLock('daily_drawdown');
                    return;
                }
            }
        }
    }, [isTiltLocked, triggerLock]);

    return (
        <TiltContext.Provider value={{
            isTiltLocked,
            triggerReason,
            countdown,
            checkTrades,
            triggerLock,   // Manuel test için de açık
            unlockNow,
            LOCK_DURATION_SECS,
            CONSEC_LOSS_LIMIT,
            DAILY_DD_PCT_LIMIT,
        }}>
            {children}
        </TiltContext.Provider>
    );
};

export const useTilt = () => {
    const ctx = useContext(TiltContext);
    if (!ctx) throw new Error('useTilt must be used within TiltProvider');
    return ctx;
};

export default TiltContext;
