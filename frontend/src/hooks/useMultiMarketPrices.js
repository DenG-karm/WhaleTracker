/**
 * useMultiMarketPrices — Akıllı İstek Yönlendirici
 * ==================================================
 * Watchlist'teki sembolleri tiplerine göre ayrıştırır:
 *   • type === 'crypto'  → Binance WebSocket (ws_router /ws/live-prices)
 *   • type === 'stock'   → Backend Yahoo Finance proxy (/market/prices)
 *
 * Dönen prices nesnesi:
 *   { "BTCUSDT": { price, change, isUp, source:"binance" },
 *     "AAPL":    { price, change, isUp, source:"yahoo" } }
 *
 * Kullanım:
 *   const { prices, wsConnected } = useMultiMarketPrices(watchlist);
 *   // watchlist: [{ symbol: 'BTCUSDT', asset_type: 'crypto' }, ...]
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const STOCK_POLL_INTERVAL_MS = 30_000; // Hisse senetleri 30 saniyede bir güncellenir

export const useMultiMarketPrices = (watchlist = []) => {
    const [prices, setPrices] = useState({});
    const [wsConnected, setWsConnected] = useState(false);

    // Stabilizan ref'ler
    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const reconnectCountRef = useRef(0);
    const stockPollTimerRef = useRef(null);

    // Watchlist'i tipe göre ayır
    const cryptoSymbols = watchlist
        .filter(w => w.asset_type === 'crypto')
        .map(w => w.symbol);
    const stockSymbols = watchlist
        .filter(w => w.asset_type === 'stock')
        .map(w => w.symbol);

    // Kararlı dizi karşılaştırması için anahtar string'leri
    const cryptoKey = cryptoSymbols.slice().sort().join('|');
    const stockKey = stockSymbols.slice().sort().join('|');

    // ── Kripto: Binance WebSocket ────────────────────────────────────────────
    useEffect(() => {
        // Önceki bağlantıyı ve timer'ı temizle
        clearTimeout(reconnectTimerRef.current);
        if (wsRef.current) {
            wsRef.current.onclose = null; // otomatik yeniden bağlanmayı engelle
            wsRef.current.close();
            wsRef.current = null;
        }

        if (cryptoSymbols.length === 0) {
            setWsConnected(false);
            return;
        }

        reconnectCountRef.current = 0;

        const connect = () => {
            const ws = new WebSocket(
                `${BASE_URL.replace('http', 'ws')}/ws/live-prices`
            );
            wsRef.current = ws;

            ws.onopen = () => {
                reconnectCountRef.current = 0;
                setWsConnected(true);
                ws.send(JSON.stringify({ symbols: cryptoSymbols }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.symbol) {
                        setPrices(prev => ({
                            ...prev,
                            [data.symbol]: { ...data, source: 'binance' },
                        }));
                    }
                } catch (_) {}
            };

            ws.onclose = () => {
                setWsConnected(false);
                if (reconnectCountRef.current < 5) {
                    const delay = Math.min(1000 * 2 ** reconnectCountRef.current, 16000);
                    reconnectCountRef.current++;
                    reconnectTimerRef.current = setTimeout(connect, delay);
                }
            };

            ws.onerror = () => {
                // Tarayıcı onerror sonrası WebSocket'i otomatik CLOSING/CLOSED yapar.
                // Manuel ws.close() CONNECTING durumunda "closed before established" uyarısına
                // neden olur; onclose zaten reconnect döngüsünü yönetir.
            };
        };

        connect();

        return () => {
            clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
            setWsConnected(false);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cryptoKey]);

    // ── Hisse Senedi: Yahoo Finance proxy polling ────────────────────────────
    const fetchStockPrices = useCallback(async () => {
        if (stockSymbols.length === 0) return;

        let token = null;
        try {
            const userData = JSON.parse(localStorage.getItem('user'));
            if (userData?.token) token = userData.token;
        } catch (_) {}

        if (!token) return;

        try {
            const resp = await fetch(
                `${BASE_URL}/market/prices?symbols=${stockSymbols.join(',')}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!resp.ok) return;
            const data = await resp.json();
            setPrices(prev => {
                const next = { ...prev };
                for (const [sym, info] of Object.entries(data)) {
                    if (!info.error) {
                        next[sym] = { ...info, source: 'yahoo' };
                    }
                }
                return next;
            });
        } catch (_) {}
    }, [stockKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        clearInterval(stockPollTimerRef.current);

        if (stockSymbols.length === 0) return;

        // İlk çekimi hemen yap
        fetchStockPrices();

        // Ardından periyodik polling başlat
        stockPollTimerRef.current = setInterval(fetchStockPrices, STOCK_POLL_INTERVAL_MS);

        return () => clearInterval(stockPollTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stockKey]);

    // Watchlist boşaldıysa fiyatları temizle
    useEffect(() => {
        if (watchlist.length === 0) {
            setPrices({});
        }
    }, [watchlist.length]);

    return { prices, wsConnected };
};
