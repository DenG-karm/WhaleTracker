/**
 * BacktestLab � Sim�lasyon Kokpiti  �  Ad�m 4: Ger�ek Veri Entegrasyonu
 * ============================================================
 * - Ad�m 1+2+3 grafik, replay & trade motoru korundu (dokunulmad�)
 * - Ad�m 4: AssetPicker, �oklu veri provider, normalizeCandles(),
 *   loading skeleton, demo banner, pozisyon uyar� modal�
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { useTranslation } from 'react-i18next';
import SimulationLobby from '../components/SimulationLobby';
import ReplayRoom from '../components/ReplayRoom';
import BacktestResult from './BacktestResult';
import {
    FlaskConical, ChevronDown, Activity,
    Play, Pause, RotateCcw, TrendingUp, TrendingDown,
    X, CheckCircle, AlertTriangle, Zap, Search, AlertCircle,
    Brain, Trophy, Target, Star, Download, Share2, RefreshCw,
    ChevronRight, MousePointer2, Minus, Square, Trash2, ScanLine,
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { useAISentinel } from '../hooks/useAISentinel';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// �� Tema sabitleri ���������������������������������������������������������
const THEME = {
    bg:         '#050810',
    bgCard:     'rgba(8, 12, 22, 0.82)',
    border:     'rgba(255, 255, 255, 0.07)',
    borderGlow: 'rgba(34, 211, 238, 0.18)',
    neonUp:     '#00E676',
    neonDown:   '#FF3B30',
    neonCyan:   '#22d3ee',
    neonGold:   '#fbbf24',
    textMain:   '#e2e8f0',
    textMuted:  'rgba(255,255,255,0.35)',
    gridLine:   'rgba(255, 255, 255, 0.04)',
    crosshair:  'rgba(255, 255, 255, 0.22)',
};

// �� Mock veri �reteci ������������������������������������������������������

const INIT_COUNT = 20;
const SPEED_MS   = { 0.5: 2000, 1: 1000, 2: 500, 5: 200, 10: 100 };
const SPEEDS     = [0.5, 1, 2, 5, 10];

// �� Varl�k tan�mlar� ������������������������������������������������������
const ASSET_TYPE = {
    BTCUSDT: 'crypto', ETHUSDT: 'crypto', SOLUSDT: 'crypto', BNBUSDT: 'crypto',
    AAPL: 'stock', TSLA: 'stock', NVDA: 'stock', SPY: 'stock',
    'EUR/USD': 'forex', 'GBP/USD': 'forex',
    GOLD: 'commodity', OIL: 'commodity',
};
const QUICK_ASSETS = [
    { symbol: 'BTCUSDT', label: 'BTC/USD' },
    { symbol: 'ETHUSDT', label: 'ETH/USD' },
    { symbol: 'AAPL',    label: 'AAPL'    },
    { symbol: 'GOLD',    label: 'GOLD'    },
    { symbol: 'EUR/USD', label: 'EUR/USD' },
    { symbol: 'SPY',     label: 'SPY'     },
];
const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'];

const TF_BINANCE_MAP = { '1m': '1m', '5m': '5m', '15m': '15m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w' };
const TF_YAHOO_MAP   = { '1m': '1m', '5m': '5m', '15m': '15m', '1H': '1h', '4H': '1h', '1D': '1d', '1W': '1wk' };
const TF_YAHOO_RANGE = { '1m': '7d', '5m': '7d', '15m': '60d', '1H': '6mo', '4H': '6mo', '1D': '2y', '1W': '5y' };

// �� veri normalizer ��������������������������������������������������������
function normalizeCandles(raw, provider) {
    if (provider === 'binance') {
        // [[openTime, open, high, low, close, volume, ...], ...]
        return raw.map(k => ({
            time:   Math.floor(k[0] / 1000),
            open:   parseFloat(k[1]),
            high:   parseFloat(k[2]),
            low:    parseFloat(k[3]),
            close:  parseFloat(k[4]),
            volume: parseFloat(k[5]),
        })).filter(c => c.time && c.close > 0);
    }
    if (provider === 'yahoo') {
        // { timestamp[], indicators: { quote: [{ open[], high[], low[], close[], volume[] }] } }
        const ts  = raw.timestamp    || [];
        const q   = raw.indicators?.quote?.[0] || {};
        const out = [];
        for (let i = 0; i < ts.length; i++) {
            if (ts[i] == null || q.close?.[i] == null) continue;
            out.push({
                time:   ts[i],
                open:   parseFloat((q.open?.[i]   ?? q.close[i]).toFixed(4)),
                high:   parseFloat((q.high?.[i]   ?? q.close[i]).toFixed(4)),
                low:    parseFloat((q.low?.[i]    ?? q.close[i]).toFixed(4)),
                close:  parseFloat(q.close[i].toFixed(4)),
                volume: q.volume?.[i] ?? 0,
            });
        }
        return out.filter(c => c.close > 0);
    }
    return [];
}

// �� Veri �ekme katman� ����������������������������������������������������
const FETCH_TIMEOUT  = 8000;
const BACKEND_ORIGIN = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function fetchWithTimeout(url) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(tid);
    }
}

async function fetchCryptoCandles(symbol, tf, endTime = null) {
    const interval = TF_BINANCE_MAP[tf] || '1h';
    const params   = new URLSearchParams({ symbol, interval, limit: '1000' });
    if (endTime) params.set('endTime', String(endTime));
    const url = `${BACKEND_ORIGIN}/api/proxy/binance/klines?${params}`;
    const raw = await fetchWithTimeout(url);
    return normalizeCandles(raw, 'binance');
}

async function fetchStockCandles(symbol, tf) {
    const interval = TF_YAHOO_MAP[tf]   || '1h';
    const range    = TF_YAHOO_RANGE[tf] || '6mo';
    // → Backend proxy üzerinden çek (CORS sorunu yoktur)
    const params = new URLSearchParams({ interval, range, includePrePost: 'false' });
    const url = `${BACKEND_ORIGIN}/api/proxy/yahoo/chart/${encodeURIComponent(symbol)}?${params}`;
    const data = await fetchWithTimeout(url);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data');
    return normalizeCandles(result, 'yahoo');
}

async function fetchForexCandles(symbol, tf) {
    // Public free APIs do not provide OHLC forex history — use a premium feed
    throw new Error('forex-unsupported');
}
async function loadAssetData(symbol, tf) {
    const type = ASSET_TYPE[symbol] || 'stock';
    let candles = null;

    if (type === 'crypto') {
        candles = await fetchCryptoCandles(symbol, tf);
    } else if (type === 'stock') {
        candles = await fetchStockCandles(symbol, tf);
    } else if (type === 'forex') {
        candles = await fetchForexCandles(symbol, tf);
    } else {
        throw new Error('asset-type-unsupported');
    }

    if (!candles || candles.length < 5) throw new Error('insufficient-data');

    candles = candles
        .slice()
        .sort((a, b) => a.time - b.time)
        .filter((c, i, arr) => i === 0 || c.time !== arr[i - 1].time);

    return { candles, isDemo: false };
}

async function searchSymbols(query) {
    if (!query || query.length < 1) return [];
    const results = [];
    try {
        // Yahoo Finance arama → Backend proxy üzerinden (CORS-safe)
        const params = new URLSearchParams({ q: query, newsCount: '0', quotesCount: '8' });
        const url = `${BACKEND_ORIGIN}/api/proxy/yahoo/search?${params}`;
        const data = await fetchWithTimeout(url);
        (data?.quotes ?? []).slice(0, 6).forEach(q => {
            if (!q.symbol) return;
            results.push({
                symbol:   q.symbol,
                name:     q.longname || q.shortname || q.symbol,
                type:     q.typeDisp === 'Equity' ? 'stock' : q.quoteType?.toLowerCase() || 'stock',
                exchange: q.exchange || '',
            });
        });
    } catch (_) {}
    // Binance kripto �n-filtre (basit: sembol ba�l�yorsa)
    const cryptoPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT'];
    const q = query.toUpperCase();
    cryptoPairs.filter(p => p.includes(q)).slice(0, 4).forEach(p => {
        if (results.find(r => r.symbol === p)) return;
        results.push({ symbol: p, name: p.replace('USDT', ' / USDT'), type: 'crypto', exchange: 'Binance' });
    });
    return results.slice(0, 8);
}

// �� CSS inject ������������������������������������������������������������
let _cssInjected = false;
function injectCSS() {
    if (_cssInjected) return;
    _cssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
        @keyframes wt-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        @keyframes wt-pnl{0%,100%{opacity:1}50%{opacity:0.72}}
        @keyframes wt-pulse{0%,100%{opacity:0.4}50%{opacity:0.9}}
        @keyframes wt-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes wt-fadeIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes wt-scaleIn{0%{opacity:0;transform:scale(0.85)}100%{opacity:1;transform:scale(1)}}
        @keyframes wt-glow{0%,100%{text-shadow:0 0 20px currentColor}50%{text-shadow:0 0 40px currentColor,0 0 80px currentColor}}
        @keyframes wt-wave{0%,100%{transform:scaleY(0.4)}50%{transform:scaleY(1)}}
        @keyframes wt-countup{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
        .wt-range{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;outline:none;cursor:pointer;background:#1a1f2e;}
        .wt-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#00D4FF;cursor:pointer;border:2px solid #0d1117;box-shadow:0 0 6px rgba(0,212,255,0.5);}
        .wt-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#00D4FF;cursor:pointer;border:2px solid #0d1117;box-shadow:0 0 6px rgba(0,212,255,0.5);}
        .wt-range::-webkit-slider-runnable-track{height:4px;border-radius:2px;}
        .wt-range::-moz-range-track{height:4px;border-radius:2px;background:#1a1f2e;}
    `;
    document.head.appendChild(style);
}

// �� Replay buton stili yard�mc�s� �����������������������������������������
const replayBtn = (disabled, accent) => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 7,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : accent + '55'}`,
    background: disabled ? 'rgba(255,255,255,0.03)' : `${accent}18`,
    color: disabled ? 'rgba(255,255,255,0.2)' : accent,
    fontSize: '0.72rem', fontWeight: 800,
    opacity: disabled ? 0.45 : 1,
    transition: 'opacity 0.15s', outline: 'none',
    letterSpacing: '0.04em',
});

// �� R:R yard�mc�lar� �����������������������������������������������������
function calcRR(direction, entry, sl, tp) {
    const e = parseFloat(entry), s = parseFloat(sl), p = parseFloat(tp);
    if (!e || !s || !p || Math.abs(e - s) < 0.001) return null;
    return Math.abs(p - e) / Math.abs(e - s);
}
function rrColor(rr) {
    if (rr === null) return THEME.textMuted;
    if (rr >= 2)    return THEME.neonUp;
    if (rr >= 1)    return THEME.neonGold;
    return THEME.neonDown;
}

// �� LWChart (forwardRef + price lines API) ��������������������������������
const LWChart = React.forwardRef(({ initialCandles, onLoadMore }, ref) => {
    const containerRef    = useRef(null);
    const chartInstanceRef = useRef(null);
    const candleSeriesRef = useRef(null);
    const volSeriesRef    = useRef(null);
    const priceLinesRef   = useRef([]);
    const initDataRef     = useRef(initialCandles);
    const loadingMoreRef  = useRef(false);
    const lastLoadTimeRef = useRef(0);       // debounce: son yükleme zamanı (ms)
    const [currentBar, setCurrentBar] = useState(null);

    useImperativeHandle(ref, () => ({
        appendCandle(candle) {
            if (!candleSeriesRef.current) return;
            candleSeriesRef.current.update(candle);
            volSeriesRef.current.update({
                time:  candle.time,
                value: candle.volume,
                color: candle.close >= candle.open
                    ? 'rgba(0,230,118,0.2)' : 'rgba(255,59,48,0.2)',
            });
            setCurrentBar(candle);
        },
        resetCandles(candles) {
            if (!candleSeriesRef.current) return;
            candleSeriesRef.current.setData(candles);
            volSeriesRef.current.setData(candles.map(c => ({
                time: c.time, value: c.volume,
                color: c.close >= c.open ? 'rgba(0,230,118,0.2)' : 'rgba(255,59,48,0.2)',
            })));
            setCurrentBar(null);
        },
        prependCandles(merged) {
            // merged = önceki blok + mevcut data (parent tarafından birleştirilmiş)
            if (!candleSeriesRef.current || !merged.length) return;
            candleSeriesRef.current.setData(merged);
            volSeriesRef.current.setData(merged.map(c => ({
                time: c.time, value: c.volume,
                color: c.close >= c.open ? 'rgba(0,230,118,0.2)' : 'rgba(255,59,48,0.2)',
            })));
        },
        addPriceLine({ price, color, title }) {
            if (!candleSeriesRef.current) return;
            const line = candleSeriesRef.current.createPriceLine({
                price, color, lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title,
            });
            priceLinesRef.current.push(line);
        },
        removePriceLines() {
            if (!candleSeriesRef.current) return;
            priceLinesRef.current.forEach(l => {
                try { candleSeriesRef.current.removePriceLine(l); } catch (_) {}
            });
            priceLinesRef.current = [];
        },
        getChart()        { return chartInstanceRef.current; },
        getCandleSeries() { return candleSeriesRef.current;  },
    }), []);

    useEffect(() => {
        if (!containerRef.current) return;
        const data = initDataRef.current;

        const chart = createChart(containerRef.current, {
            width:  containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor:  THEME.textMain,
                fontSize:   11,
                fontFamily: "'Inter', system-ui, sans-serif",
            },
            grid: {
                vertLines: { color: THEME.gridLine },
                horzLines: { color: THEME.gridLine },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: THEME.crosshair, width: 1, labelBackgroundColor: '#1e2d40' },
                horzLine: { color: THEME.crosshair, width: 1, labelBackgroundColor: '#1e2d40' },
            },
            rightPriceScale: {
                borderColor:  THEME.border,
                scaleMargins: { top: 0.08, bottom: 0.28 },
                textColor:    THEME.textMuted,
            },
            timeScale: {
                borderColor: THEME.border, timeVisible: true,
                secondsVisible: false, textColor: THEME.textMuted,
            },
            handleScroll: { mouseWheel: true, pressedMouseMove: true },
            handleScale:  { mouseWheel: true, pinch: true },
        });

        const candleSeries = chart.addCandlestickSeries({
            upColor: THEME.neonUp,   downColor: THEME.neonDown,
            borderUpColor: THEME.neonUp, borderDownColor: THEME.neonDown,
            wickUpColor:   THEME.neonUp, wickDownColor:   THEME.neonDown,
        });
        candleSeries.setData(data);
        candleSeriesRef.current = candleSeries;

        const volSeries = chart.addHistogramSeries({
            color: 'rgba(34,211,238,0.15)',
            priceFormat: { type: 'volume' },
            priceScaleId: 'vol',
        });
        chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        volSeries.setData(data.map(c => ({
            time: c.time, value: c.volume,
            color: c.close >= c.open ? 'rgba(0,230,118,0.2)' : 'rgba(255,59,48,0.2)',
        })));
        volSeriesRef.current = volSeries;

        chart.subscribeCrosshairMove(param => {
            if (!param.time || !param.seriesData) { setCurrentBar(null); return; }
            const bar = param.seriesData.get(candleSeries);
            if (bar) setCurrentBar(bar);
        });

        // ── Lazy Load: kullanıcı sola kaydırınca önceki bloğu çek ───────────
        chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
            if (!range || loadingMoreRef.current) return;
            // from < 0 demek: kullanıcı verinin BAŞININ sol tarafına scroll yaptı
            // (fitContent sırasında from = 0 olur, bu yanlış tetiklemez)
            if (range.from >= 0) return;
            // Debounce: son yüklemeden en az 1 saniye geçmeli
            const now = Date.now();
            if (now - lastLoadTimeRef.current < 1000) return;
            lastLoadTimeRef.current = now;
            if (typeof onLoadMore === 'function') {
                loadingMoreRef.current = true;
                onLoadMore(() => { loadingMoreRef.current = false; });
            }
        });

        chartInstanceRef.current = chart;
        chart.timeScale().fitContent();

        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                chart.applyOptions({ width, height });
            }
        });
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
            chartInstanceRef.current = null;
            candleSeriesRef.current  = null;
            volSeriesRef.current     = null;
        };
    }, []);

    const bar      = currentBar || initDataRef.current[initDataRef.current.length - 1];
    const isBarUp  = bar ? bar.close >= bar.open : true;
    const barColor = isBarUp ? THEME.neonUp : THEME.neonDown;
    const pctDelta = bar && bar.open > 0
        ? ((bar.close - bar.open) / bar.open * 100).toFixed(2) : '�';
    const priceDelta = bar ? (bar.close - bar.open).toFixed(2) : '�';

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'none', userSelect: 'none' }}>
                {bar && [
                    { lbl: 'O', val: bar.open?.toFixed(2)  },
                    { lbl: 'H', val: bar.high?.toFixed(2)  },
                    { lbl: 'L', val: bar.low?.toFixed(2)   },
                    { lbl: 'C', val: bar.close?.toFixed(2) },
                ].map(({ lbl, val }) => (
                    <div key={lbl} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: '0.6rem', color: THEME.textMuted, fontWeight: 700 }}>{lbl}</span>
                        <span style={{ fontSize: '0.78rem', color: THEME.textMain, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                    </div>
                ))}
                {bar && (
                    <div style={{ padding: '2px 8px', borderRadius: 5, background: isBarUp ? 'rgba(0,255,157,0.12)' : 'rgba(255,51,102,0.12)', color: barColor, fontSize: '0.72rem', fontWeight: 700 }}>
                        {isBarUp ? '^' : '�'} {pctDelta}% ({Number(priceDelta) > 0 ? '+' : ''}{priceDelta})
                    </div>
                )}
            </div>
            <div ref={containerRef} style={{ flex: 1, width: '100%' }} />
        </div>
    );
});

// �� Loading Skeleton ������������������������������������������������������
const LoadingSkeleton = React.memo(({ t }) => (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,14,23,0.88)', backdropFilter: 'blur(10px)', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: `3px solid rgba(34,211,238,0.12)`, borderTop: `3px solid ${THEME.neonCyan}`, borderRadius: '50%', animation: 'wt-spin 0.9s linear infinite' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '70%' }}>
            {[1, 0.7, 0.85, 0.5, 0.9].map((w, i) => (
                <div key={i} style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.07)', width: `${w * 100}%`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.12), transparent)', animation: 'wt-shimmer 1.4s infinite' }} />
                </div>
            ))}
        </div>
        <span style={{ fontSize: '0.7rem', color: THEME.neonCyan, fontWeight: 700, letterSpacing: '0.08em', animation: 'wt-pulse 1.5s ease-in-out infinite' }}>{t('backtest.lab.loadingData')}</span>
    </div>
));

// �� Demo Banner ����������������������������������������������������������
const DemoBanner = React.memo(({ onDismiss, t }) => (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: 'rgba(251,191,36,0.1)', borderBottom: `1px solid rgba(251,191,36,0.3)`, backdropFilter: 'blur(8px)' }}>
        <AlertCircle size={13} color={THEME.neonGold} />
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: THEME.neonGold, flex: 1 }}>{t('backtest.lab.demoWarning')}</span>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.textMuted, display: 'flex', padding: 2 }}>
            <X size={12} />
        </button>
    </div>
));

// �� Sembol Arama Dropdown �������������������������������������������������
const TYPE_COLOR = { crypto: THEME.neonCyan, stock: THEME.neonUp, forex: THEME.neonGold, commodity: '#a78bfa' };
const SearchDropdown = React.memo(function SearchDropdown({ results, loading, onSelect }) {
    const { t } = useTranslation();
    if (!results && !loading) return null;
    return (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 4, background: 'rgba(13,18,30,0.97)', border: `1px solid ${THEME.borderGlow}`, borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.7)', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
            {loading ? (
                <div style={{ padding: '12px 14px', fontSize: '0.68rem', color: THEME.textMuted, fontWeight: 600 }}>Aran�yor...</div>
            ) : results.length === 0 ? (
                <div style={{ padding: '12px 14px', fontSize: '0.68rem', color: THEME.textMuted, fontWeight: 600 }}>Sonu� bulunamad�</div>
            ) : results.map((r, i) => (
                <button key={r.symbol + i} onClick={() => onSelect(r)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < results.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,211,238,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLOR[r.type] || THEME.neonCyan, flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: THEME.textMain, fontVariantNumeric: 'tabular-nums' }}>{r.symbol}</div>
                        <div style={{ fontSize: '0.6rem', color: THEME.textMuted, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    </div>
                    <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${TYPE_COLOR[r.type] || THEME.neonCyan}18`, color: TYPE_COLOR[r.type] || THEME.neonCyan, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{r.type}</span>
                </button>
            ))}
        </div>
    );
});

// �� Asset Picker Header ���������������������������������������������������
const AssetPicker = React.memo(function AssetPicker({ symbol, tf, setTf, onAssetSelect, livePrice, priceChange, t }) {
    const [query,         setQuery]       = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [searching,     setSearching]   = useState(false);
    const debounceRef = useRef(null);
    const wrapperRef  = useRef(null);

    const handleQueryChange = useCallback((e) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!val.trim()) { setSearchResults(null); return; }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            const res = await searchSymbols(val.trim());
            setSearchResults(res);
            setSearching(false);
        }, 300);
    }, [onAssetSelect]);

    const handleSelect = (item) => {
        setQuery('');
        setSearchResults(null);
        onAssetSelect(item.symbol);
    };

    // D��ar� t�klan�nca kapat
    useEffect(() => {
        const handleClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setSearchResults(null);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const isUp = priceChange >= 0;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: `1px solid ${THEME.border}`, background: 'rgba(10,14,23,0.7)', backdropFilter: 'blur(12px)', flexShrink: 0, flexWrap: 'wrap', rowGap: 6 }}>

            {/* Aktif varl�k g�stergesi */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: 'white', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>{symbol}</span>
                {livePrice != null && (
                    <>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isUp ? THEME.neonUp : THEME.neonDown, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 10px ${isUp ? THEME.neonUp : THEME.neonDown}44` }}>
                            {livePrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: isUp ? 'rgba(0,255,157,0.12)' : 'rgba(255,51,102,0.12)', color: isUp ? THEME.neonUp : THEME.neonDown }}>
                            {isUp ? '+' : ''}{priceChange.toFixed(2)}%
                        </span>
                    </>
                )}
            </div>

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.09)', flexShrink: 0 }} />

            {/* H�zl� varl�k butonlar� */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {QUICK_ASSETS.map(a => (
                    <button key={a.symbol} onClick={() => onAssetSelect(a.symbol)}
                        style={{ padding: '4px 9px', borderRadius: 6, cursor: 'pointer', border: symbol === a.symbol ? `1px solid ${THEME.neonCyan}44` : `1px solid rgba(255,255,255,0.06)`, background: symbol === a.symbol ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.03)', color: symbol === a.symbol ? THEME.neonCyan : THEME.textMuted, fontSize: '0.68rem', fontWeight: 800, transition: '0.15s', letterSpacing: '0.03em' }}>
                        {a.label}
                    </button>
                ))}
            </div>

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.09)', flexShrink: 0 }} />

            {/* Zaman dilimi */}
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 4, flexShrink: 0, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.35)' }}>
                {TIMEFRAMES.map(f => (
                    <button key={f} onClick={() => setTf(f)} style={{ padding: '5px 10px', borderRadius: 7, cursor: 'pointer', border: f === tf ? `1px solid ${THEME.neonCyan}44` : '1px solid transparent', fontSize: '0.68rem', fontWeight: 700, transition: 'all 0.18s ease', background: f === tf ? `linear-gradient(135deg, rgba(34,211,238,0.22) 0%, rgba(34,211,238,0.1) 100%)` : 'transparent', color: f === tf ? THEME.neonCyan : THEME.textMuted, boxShadow: f === tf ? `0 2px 8px rgba(34,211,238,0.18), inset 0 1px 0 rgba(255,255,255,0.07)` : 'none', letterSpacing: '0.03em' }}>
                        {f}
                    </button>
                ))}
            </div>

            {/* Arama kutusu */}
            <div ref={wrapperRef} style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.06)', border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '6px 12px' }}>
                    <Search size={12} color={THEME.textMuted} />
                    <input value={query} onChange={handleQueryChange}
                        placeholder={t('backtest.lab.searchPlaceholder')}
                        style={{ background: 'none', border: 'none', outline: 'none', color: THEME.textMain, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'inherit', width: 130 }} />
                </div>
                <SearchDropdown results={searchResults} loading={searching} onSelect={handleSelect} />
            </div>
        </div>
    );
});

// �� Pozisyon De�i�tirme Uyar� Modal� �������������������������������������
const AssetChangeWarningModal = React.memo(({ onConfirm, onCancel, t }) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(14px)' }}>
        <div style={{ width: 340, background: 'rgba(13,18,30,0.97)', border: `1px solid ${THEME.neonGold}44`, borderRadius: 16, padding: '24px', boxShadow: `0 0 60px ${THEME.neonGold}1a, 0 24px 80px rgba(0,0,0,0.8)`, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={22} color={THEME.neonGold} />
                <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: THEME.neonGold }}>{t('backtest.lab.assetChangeTitle')}</div>
                    <div style={{ fontSize: '0.65rem', color: THEME.textMuted, marginTop: 3 }}>{t('backtest.lab.assetChangeDesc')}</div>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer', border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.04)', color: THEME.textMuted, fontSize: '0.76rem', fontWeight: 700 }}>
                    {t('backtest.lab.assetChangeCancel')}
                </button>
                <button onClick={onConfirm} style={{ flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer', border: `1px solid ${THEME.neonDown}44`, background: 'rgba(255,51,102,0.12)', color: THEME.neonDown, fontSize: '0.76rem', fontWeight: 800 }}>
                    {t('backtest.lab.assetChangeConfirm')}
                </button>
            </div>
        </div>
    </div>
));

// �� Replay Kontrol �ubu�u (Ad�m 2'den, de�i�tirilmedi) �������������������
const ReplayBar = React.memo(function ReplayBar({ status, currentIndex, total, speed, onPlay, onPause, onReset, onSpeedChange, onStepBack, onStepForward, onSeek, masterData, t }) {
    const isPlaying  = status === 'playing';
    const isDone     = status === 'done';
    const canBack    = currentIndex > INIT_COUNT;
    const pct        = total > 0 ? (currentIndex / total) * 100 : 0;
    const [tooltip, setTooltip] = useState(null); // { x, text }

    const handleRangeHover = (e) => {
        const rect  = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const idx   = Math.round(ratio * (total - 1));
        const candle = masterData?.[idx];
        let dateStr = '';
        if (candle?.time) {
            const d = new Date(candle.time * 1000);
            dateStr = d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        setTooltip({ x: e.clientX - rect.left, text: `Mum ${idx + 1} / ${total}${dateStr ? ' — ' + dateStr : ''}` });
    };

    return (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, background: 'rgba(10,14,23,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: `1px solid rgba(255,255,255,0.07)` }}>
            {/* Progress bar row */}
            <div style={{ position: 'relative', padding: '6px 14px 2px' }}>
                {tooltip && (
                    <div style={{ position: 'absolute', bottom: '100%', left: Math.min(tooltip.x, 400), transform: 'translateX(-50%)', background: '#0d1117', border: '1px solid #2a3040', borderRadius: 5, padding: '3px 8px', fontSize: 11, color: '#e2e8f0', whiteSpace: 'nowrap', zIndex: 30, pointerEvents: 'none', marginBottom: 4 }}>
                        {tooltip.text}
                    </div>
                )}
                <input
                    type="range"
                    className="wt-range"
                    min={INIT_COUNT}
                    max={total || 1}
                    value={currentIndex}
                    style={{ width: '100%', background: `linear-gradient(to right, #00D4FF ${pct}%, #1a1f2e ${pct}%)` }}
                    onChange={e => onSeek(Number(e.target.value))}
                    onMouseMove={handleRangeHover}
                    onMouseLeave={() => setTooltip(null)}
                />
            </div>
            {/* Controls row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px 9px' }}>
                <button onClick={onPlay}  disabled={isPlaying || isDone} style={replayBtn(isPlaying || isDone, THEME.neonUp)}>
                    <Play size={12} />{t('backtest.lab.play')}
                </button>
                <button onClick={onPause} disabled={!isPlaying} style={replayBtn(!isPlaying, THEME.neonCyan)}>
                    <Pause size={12} />{t('backtest.lab.pause')}
                </button>
                <button onClick={() => onStepBack(1)} disabled={!canBack} title="1 mum geri (←)" style={replayBtn(!canBack, THEME.textMuted)}>
                    <ChevronRight size={11} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button onClick={() => onStepForward(1)} disabled={isDone} title="1 mum ileri (→)" style={replayBtn(isDone, THEME.textMuted)}>
                    <ChevronRight size={11} />
                </button>
                <button onClick={onReset} style={replayBtn(false, THEME.neonDown)}>
                    <RotateCcw size={11} />{t('backtest.lab.reset')}
                </button>
                <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.09)', margin: '0 4px', flexShrink: 0 }} />
                <span style={{ fontSize: '0.6rem', color: THEME.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>{t('backtest.lab.speed')}</span>
                {SPEEDS.map(s => (
                    <button key={s} onClick={() => onSpeedChange(s)} style={{ padding: '4px 9px', borderRadius: 5, cursor: 'pointer', border: 'none', fontSize: '0.7rem', fontWeight: 800, transition: '0.15s', background: speed === s ? 'rgba(34,211,238,0.18)' : 'transparent', color: speed === s ? THEME.neonCyan : THEME.textMuted, outline: speed === s ? '1px solid rgba(34,211,238,0.3)' : 'none' }}>
                        {s}x
                    </button>
                ))}
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.62rem', color: THEME.textMuted, fontWeight: 700 }}>{t('backtest.lab.candle')}:</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: isDone ? THEME.neonUp : THEME.textMain, textShadow: isDone ? `0 0 10px ${THEME.neonUp}55` : 'none' }}>
                        {isDone ? t('backtest.lab.finished') : `${currentIndex} / ${total}`}
                    </span>
                </div>
            </div>
        </div>
    );
});

// ⚡ Oturum İstatistikleri Paneli ─────────────────────────────────────────
const SessionStatsPanel = React.memo(function SessionStatsPanel({ tradeLog }) {
    const [expanded, setExpanded] = useState(true);

    const stats = useMemo(() => {
        if (!tradeLog || tradeLog.length === 0) return null;
        const winners  = tradeLog.filter(tr => tr.pnl > 0);
        const losers   = tradeLog.filter(tr => tr.pnl < 0);
        const total    = tradeLog.length;
        const winRate  = (winners.length / total) * 100;
        const avgWin   = winners.length > 0
            ? winners.reduce((s, tr) => s + tr.pnl, 0) / winners.length : 0;
        const avgLoss  = losers.length > 0
            ? Math.abs(losers.reduce((s, tr) => s + tr.pnl, 0) / losers.length) : 0;
        const grossWin  = winners.reduce((s, tr) => s + tr.pnl, 0);
        const grossLoss = Math.abs(losers.reduce((s, tr) => s + tr.pnl, 0));
        const pf        = grossLoss > 0 ? grossWin / grossLoss : winners.length > 0 ? 99 : 0;
        let equity = 0, peak = 0, maxDD = 0;
        for (const tr of tradeLog) {
            equity += tr.pnl;
            if (equity > peak) peak = equity;
            const dd = peak - equity;
            if (dd > maxDD) maxDD = dd;
        }
        return {
            total,
            winners:      winners.length,
            losers:       losers.length,
            winRate,
            avgWin,
            avgLoss,
            profitFactor: Math.min(pf, 99),
            maxDrawdown:  maxDD,
            totalPnl:     tradeLog.reduce((s, tr) => s + tr.pnl, 0),
        };
    }, [tradeLog]);

    const winRateColor = !stats ? THEME.textMuted : stats.winRate >= 50 ? '#2dd4bf' : '#f59e0b';
    const pfColor      = !stats ? THEME.textMuted
        : stats.profitFactor >= 1.5 ? '#22c55e'
        : stats.profitFactor < 1    ? '#ef4444'
        : THEME.textMain;

    const rows = stats ? [
        { label: 'Toplam İşlem',  value: String(stats.total),                                                   color: THEME.textMain                                         },
        { label: 'Kazanan',       value: `${stats.winners} (${((stats.winners / stats.total) * 100).toFixed(0)}%)`, color: '#22c55e'                                          },
        { label: 'Kaybeden',      value: `${stats.losers} (${((stats.losers / stats.total) * 100).toFixed(0)}%)`,   color: '#ef4444'                                          },
        { label: 'Win Rate',      value: `${stats.winRate.toFixed(1)}%`,                                         color: winRateColor                                           },
        { label: 'Ort. Kazanç',   value: `+$${stats.avgWin.toFixed(2)}`,                                        color: '#22c55e'                                              },
        { label: 'Ort. Kayıp',    value: `$${stats.avgLoss.toFixed(2)}`,                                        color: '#ef4444'                                              },
        { label: 'Profit Factor', value: stats.profitFactor >= 99 ? '∞' : stats.profitFactor.toFixed(2),        color: pfColor                                                },
        { label: 'Max Drawdown',  value: `$${stats.maxDrawdown.toFixed(2)}`,                                    color: '#f97316'                                              },
        { label: 'Toplam PnL',    value: `${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}`,     color: stats.totalPnl >= 0 ? THEME.neonUp : THEME.neonDown    },
    ] : [];

    return (
        <div style={{ borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
            {/* Başlık / toggle */}
            <button
                onClick={() => setExpanded(v => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
                <Zap size={11} color={THEME.neonCyan} />
                <span style={{ fontSize: '0.55rem', fontWeight: 800, color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
                    ⚡ Oturum İstatistikleri
                </span>
                {stats && (
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: stats.totalPnl >= 0 ? THEME.neonUp : THEME.neonDown, fontVariantNumeric: 'tabular-nums', marginRight: 4 }}>
                        {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)}
                    </span>
                )}
                <ChevronDown
                    size={11}
                    color={THEME.textMuted}
                    style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }}
                />
            </button>

            {expanded && (
                <div style={{ padding: '0 13px 8px' }}>
                    {!stats ? (
                        <div style={{ padding: '3px 0 2px', fontSize: '0.58rem', color: THEME.textMuted, textAlign: 'center', fontWeight: 600 }}>
                            Henüz kapalı işlem yok
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {rows.map(({ label, value, color }) => (
                                <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', columnGap: 8, padding: '1px 0' }}>
                                    <span style={{ fontSize: 12, color: THEME.textMuted, fontWeight: 600 }}>{label}</span>
                                    <span style={{ fontSize: 13, fontWeight: 500, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

// �� ��lem Paneli (Ad�m 3'ten, masterDataRef ile g�ncellendi) �������������
const TradePanel = React.memo(function TradePanel({
    status, openPositions, tradeLog,
    direction, size, entryPrice, sl, tp,
    setDirection, setSize, setEntryPrice, setSl, setTp,
    onOpen, onClosePosition,
    accountBalance, freeMargin, equity,
    currentPrice,
    symbol,
    t,
}) {
    const isPlaying      = status === 'playing';
    const rr             = useMemo(() => calcRR(direction, entryPrice, sl, tp), [direction, entryPrice, sl, tp]);
    const totalOpenPnl   = useMemo(() => openPositions.reduce((s, p) => s + (p.pnl || 0), 0), [openPositions]);
    const totalClosedPnl = useMemo(() => tradeLog.reduce((s, tr) => s + tr.pnl, 0), [tradeLog]);

    const eVal   = parseFloat(entryPrice);
    const slVal   = sl !== '' ? parseFloat(sl) : NaN;
    const tpVal   = tp !== '' ? parseFloat(tp) : NaN;
    const slValid = sl === '' || (!isNaN(slVal) && !isNaN(eVal) && (direction === 'LONG' ? slVal < eVal : slVal > eVal));
    const tpValid = tp === '' || (!isNaN(tpVal) && !isNaN(eVal) && (direction === 'LONG' ? tpVal > eVal : tpVal < eVal));
    const isFormValid = (() => {
        const sz = parseFloat(size);
        if (isNaN(eVal) || isNaN(sz) || sz <= 0 || sz > accountBalance) return false;
        if (!slValid || !tpValid) return false;
        return true;
    })();

    const inp = {
        width: '100%', background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${THEME.border}`, borderRadius: 7,
        color: THEME.textMain, padding: '6px 9px',
        fontSize: '0.74rem', fontWeight: 700, outline: 'none',
        fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
        boxSizing: 'border-box',
    };
    const lbl = {
        fontSize: '0.54rem', fontWeight: 700, color: THEME.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2,
        display: 'block',
    };

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: THEME.bgCard, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderLeft: `1px solid ${THEME.borderGlow}`, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -80, right: -80, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px 8px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
                <Activity size={14} color={THEME.neonCyan} />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {t('backtest.lab.tradePanel')}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.57rem', fontWeight: 700, color: openPositions.length > 0 ? THEME.neonCyan : THEME.textMuted, padding: '2px 6px', borderRadius: 4, background: openPositions.length > 0 ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${openPositions.length > 0 ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                    {openPositions.length} {t('backtest.lab.openBadge')}
                </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                {/* Order Form */}
                <div style={{ padding: '9px 13px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {['LONG', 'SHORT'].map(d => (
                                <button key={d} onClick={() => setDirection(d)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, cursor: 'pointer', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.04em', border: direction === d ? `1px solid ${d === 'LONG' ? THEME.neonUp : THEME.neonDown}55` : `1px solid ${THEME.border}`, background: direction === d ? (d === 'LONG' ? 'rgba(0,255,157,0.13)' : 'rgba(255,51,102,0.13)') : 'rgba(255,255,255,0.03)', color: direction === d ? (d === 'LONG' ? THEME.neonUp : THEME.neonDown) : THEME.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: '0.15s' }}>
                                    {d === 'LONG' ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {d}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                            <div style={{ flex: 1 }}>
                                {t('backtest.lab.positionSize')}
                                <input type="number" min="1" step="1" value={size} onChange={e => setSize(e.target.value)} style={inp} placeholder="100" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <span style={lbl}>{t('backtest.lab.entryPrice')}</span>
                                <input type="number" step="0.01" value={entryPrice} readOnly style={{ ...inp, color: THEME.textMuted, cursor: 'default' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ ...lbl, color: '#ef4444aa' }}>{t('backtest.lab.stopLoss')}</span>
                                <input
                                    type="number" step="0.01" value={sl} placeholder="0.00"
                                    onChange={e => setSl(e.target.value)}
                                    title={!slValid && sl !== '' ? (direction === 'LONG' ? 'SL entry fiyatının altında olmalı' : 'SL entry fiyatının üstünde olmalı') : ''}
                                    style={{ ...inp, background: '#1a1f2e', border: `1px solid ${!slValid && sl !== '' ? '#ef4444' : '#2a3040'}`, borderLeft: '3px solid #ef4444', paddingLeft: 10 }}
                                />
                                {sl !== '' && !isNaN(parseFloat(sl)) && !isNaN(eVal) && (
                                    <span style={{ fontSize: 12, color: '#6b7280', display: 'block', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                                        {Math.abs(eVal - parseFloat(sl)).toFixed(2)} pts
                                    </span>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <span style={{ ...lbl, color: '#22c55eaa' }}>{t('backtest.lab.takeProfit')}</span>
                                <input
                                    type="number" step="0.01" value={tp} placeholder="0.00"
                                    onChange={e => setTp(e.target.value)}
                                    title={!tpValid && tp !== '' ? (direction === 'LONG' ? 'TP entry fiyatının üstünde olmalı' : 'TP entry fiyatının altında olmalı') : ''}
                                    style={{ ...inp, background: '#1a1f2e', border: `1px solid ${!tpValid && tp !== '' ? '#ef4444' : '#2a3040'}`, borderLeft: '3px solid #22c55e', paddingLeft: 10 }}
                                />
                                {tp !== '' && !isNaN(parseFloat(tp)) && !isNaN(eVal) && (
                                    <span style={{ fontSize: 12, color: '#6b7280', display: 'block', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                                        {Math.abs(parseFloat(tp) - eVal).toFixed(2)} pts
                                    </span>
                                )}
                            </div>
                        </div>
                        {rr !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: `1px solid ${rrColor(rr)}33` }}>
                                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('backtest.lab.rr')}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: rrColor(rr), fontVariantNumeric: 'tabular-nums' }}>1 : {rr.toFixed(2)}</span>
                            </div>
                        )}
                        <button onClick={onOpen} disabled={!isFormValid || isPlaying}
                            style={{ width: '100%', padding: '9px 0', borderRadius: 8, cursor: (!isFormValid || isPlaying) ? 'not-allowed' : 'pointer', border: `1px solid ${(!isFormValid || isPlaying) ? 'rgba(255,255,255,0.05)' : (direction === 'LONG' ? THEME.neonUp : THEME.neonDown) + '44'}`, background: (!isFormValid || isPlaying) ? 'rgba(255,255,255,0.03)' : direction === 'LONG' ? 'rgba(0,255,157,0.12)' : 'rgba(255,51,102,0.12)', color: (!isFormValid || isPlaying) ? 'rgba(255,255,255,0.2)' : direction === 'LONG' ? THEME.neonUp : THEME.neonDown, fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: isPlaying ? 0.4 : 1, transition: '0.15s' }}>
                            <Zap size={11} />
                            {isPlaying ? t('backtest.lab.pauseToTrade') : direction + ' ' + t('backtest.lab.openTrade')}
                        </button>
                    </div>
                </div>

                {/* Account Summary */}
                <div style={{ padding: '7px 13px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {[
                        { id: 'balance',   lbl: t('backtest.lab.accountBalance'), val: accountBalance, color: THEME.textMain },
                        { id: 'margin',    lbl: t('backtest.lab.freeMargin'),     val: freeMargin,     color: freeMargin < 0 ? THEME.neonDown : THEME.textMuted },
                        { id: 'equity',    lbl: t('backtest.lab.equity'),         val: equity,         color: equity >= (accountBalance + openPositions.reduce((s,p)=>s+p.size,0)) ? '#00E676' : '#FF3B30' },
                        { id: 'openPnl',   lbl: t('backtest.lab.openPnl'),        val: totalOpenPnl,   color: totalOpenPnl >= 0 ? '#00E676' : '#FF3B30', sign: true },
                    ].map(row => (
                        <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.lbl}</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: row.color, fontVariantNumeric: 'tabular-nums' }}>
                                {row.sign && row.val > 0 ? '+' : ''}{(row.val ?? 0).toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* ACIK POZISYONLAR */}
                <div style={{ flexShrink: 0, borderBottom: `1px solid ${THEME.border}` }}>
                    <div style={{ padding: '5px 13px 4px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
                            {t('backtest.lab.openPositions')}
                        </span>
                        {openPositions.length > 0 && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: totalOpenPnl >= 0 ? THEME.neonUp : THEME.neonDown, fontVariantNumeric: 'tabular-nums' }}>
                                {totalOpenPnl >= 0 ? '+' : ''}{totalOpenPnl.toFixed(2)}
                            </span>
                        )}
                    </div>
                    {openPositions.length === 0 ? (
                        <div style={{ padding: '7px 13px 8px', textAlign: 'center', fontSize: '0.58rem', color: THEME.textMuted, fontWeight: 600 }}>
                            {t('backtest.lab.noOpenPositions')}
                        </div>
                    ) : openPositions.map(pos => {
                        const pnl      = pos.pnl || 0;
                        const isPnlPos = pnl >= 0;
                        const pnlColor = isPnlPos ? '#22c55e' : '#ef4444';
                        const pnlPct   = pos.size > 0
                            ? ((isPnlPos ? '+' : '') + (pnl / pos.size * 100).toFixed(2) + '%')
                            : '';
                        const isLong   = pos.direction === 'LONG';
                        return (
                            <div key={pos.id} style={{ margin: '6px 10px', background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, overflow: 'hidden' }}>
                                {/* Row 1: symbol + badge + size */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 4px' }}>
                                    {symbol && (
                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: THEME.textMain, letterSpacing: '0.04em' }}>{symbol}</span>
                                    )}
                                    <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: isLong ? '#052010' : '#200505', color: isLong ? '#22c55e' : '#ef4444', letterSpacing: '0.04em' }}>
                                        {isLong ? '▲ LONG' : '▼ SHORT'}
                                    </span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700, color: THEME.textMuted, background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>
                                        ${pos.size.toFixed(2)}
                                    </span>
                                </div>
                                {/* Row 2: entry → current */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px 3px' }}>
                                    <span style={{ fontSize: '0.56rem', color: THEME.textMuted, fontVariantNumeric: 'tabular-nums' }}>Giriş:</span>
                                    <span style={{ fontSize: '0.6rem', color: THEME.textMain, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>${pos.entry.toFixed(2)}</span>
                                    <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>→</span>
                                    <span style={{ fontSize: '0.56rem', color: THEME.textMuted, fontVariantNumeric: 'tabular-nums' }}>Şu an:</span>
                                    <span style={{ fontSize: '0.6rem', color: currentPrice ? pnlColor : THEME.textMuted, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                                        {currentPrice ? `$${currentPrice.toFixed(2)}` : '–'}
                                    </span>
                                </div>
                                {/* Row 3: PnL + SL + TP */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px 5px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: pnlColor, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 8px ${pnlColor}44` }}>
                                        {isPnlPos ? '+' : ''}${pnl.toFixed(2)}
                                    </span>
                                    <span style={{ fontSize: '0.55rem', color: pnlColor, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{pnlPct}</span>
                                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                                        {pos.sl !== null && pos.sl !== undefined && (
                                            <span style={{ fontSize: '0.52rem', color: '#ef4444', fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>SL: {pos.sl.toFixed(2)}</span>
                                        )}
                                        {pos.tp !== null && pos.tp !== undefined && (
                                            <span style={{ fontSize: '0.52rem', color: '#22c55e', fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>TP: {pos.tp.toFixed(2)}</span>
                                        )}
                                    </span>
                                </div>
                                {/* Row 4: Close button */}
                                <div style={{ borderTop: '1px solid #2a3040', padding: '4px 10px' }}>
                                    <button
                                        onClick={() => onClosePosition(pos.id)}
                                        style={{ width: '100%', padding: '4px 0', borderRadius: 5, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: THEME.textMuted, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: '0.12s', outline: 'none' }}
                                        onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(239,68,68,0.5)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.color = THEME.textMuted; e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <X size={9} /> {t('backtest.lab.closePosition')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Oturum İstatistikleri */}
                <SessionStatsPanel tradeLog={tradeLog} />

                {/* Trade Log */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 100 }}>
                    <div style={{ padding: '5px 13px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('backtest.lab.tradeLog')}</span>
                        {tradeLog.length > 0 && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 900, color: totalClosedPnl >= 0 ? THEME.neonUp : THEME.neonDown, fontVariantNumeric: 'tabular-nums' }}>
                                {totalClosedPnl >= 0 ? '+' : ''}{totalClosedPnl.toFixed(2)}
                            </span>
                        )}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0' }}>
                        {tradeLog.length === 0 ? (
                            <div style={{ padding: '14px', textAlign: 'center', fontSize: '0.6rem', color: THEME.textMuted, fontWeight: 600 }}>
                                {t('backtest.lab.noTrades')}
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem', fontVariantNumeric: 'tabular-nums' }}>
                                <thead>
                                    <tr style={{ color: THEME.textMuted, fontSize: '0.54rem', fontWeight: 700 }}>
                                        {['#', t('backtest.lab.colDir'), t('backtest.lab.colEntry'), t('backtest.lab.colExit'), 'PnL', t('backtest.lab.colResult')].map((h, i) => (
                                            <th key={i} style={{ padding: '3px 5px', textAlign: i === 0 ? 'center' : 'right', textTransform: 'uppercase', borderBottom: `1px solid ${THEME.border}` }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...tradeLog].reverse().map(tr => (
                                        <tr key={tr.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)`, background: tr.pnl >= 0 ? 'rgba(0,255,157,0.04)' : 'rgba(255,51,102,0.04)' }}>
                                            <td style={{ padding: '3px 5px', textAlign: 'center', color: THEME.textMuted }}>{tr.id}</td>
                                            <td style={{ padding: '3px 5px', textAlign: 'right', color: tr.direction === 'LONG' ? THEME.neonUp : THEME.neonDown, fontWeight: 800 }}>{tr.direction[0]}</td>
                                            <td style={{ padding: '3px 5px', textAlign: 'right', color: THEME.textMain }}>{tr.entry.toFixed(0)}</td>
                                            <td style={{ padding: '3px 5px', textAlign: 'right', color: THEME.textMain }}>{tr.exit.toFixed(0)}</td>
                                            <td style={{ padding: '3px 5px', textAlign: 'right', fontWeight: 800, color: tr.pnl >= 0 ? THEME.neonUp : THEME.neonDown }}>
                                                {tr.pnl >= 0 ? '+' : ''}{tr.pnl.toFixed(1)}
                                            </td>
                                            <td style={{ padding: '3px 5px', textAlign: 'right', fontSize: '0.54rem', fontWeight: 700, color: tr.type === 'TP' ? THEME.neonUp : tr.type === 'SL' ? THEME.neonDown : THEME.neonCyan }}>
                                                {tr.type === 'TP' ? t('backtest.lab.resultTp') : tr.type === 'SL' ? t('backtest.lab.resultSl') : t('backtest.lab.resultManual')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

// �� AI Otopsi � Metrik Hesaplamalar ��������������������������������������
function calcAutopsyMetrics(tradeLog) {
    if (!tradeLog || tradeLog.length === 0) return null;
    const wins   = tradeLog.filter(t => t.pnl > 0);
    const losses = tradeLog.filter(t => t.pnl <= 0);
    const netPnl = tradeLog.reduce((s, t) => s + t.pnl, 0);
    const grossWin  = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const pf = grossLoss > 0 ? grossWin / grossLoss : wins.length > 0 ? Infinity : 0;

    // Max drawdown (equity curve)
    let equity = 0, peak = 0, maxDD = 0;
    for (const t of tradeLog) {
        equity += t.pnl;
        if (equity > peak) peak = equity;
        const dd = peak - equity;
        if (dd > maxDD) maxDD = dd;
    }

    // Ortalama R:R � her trade i�in realized R:R
    const rrList = tradeLog.map(t => {
        if (!t.lot || t.lot <= 0) return null;
        return Math.abs(t.pnl) / (t.lot * 100); // basit normalize
    }).filter(Boolean);
    const avgRR = rrList.length > 0 ? rrList.reduce((s, v) => s + v, 0) / rrList.length : 0;

    return {
        total:     tradeLog.length,
        wins:      wins.length,
        losses:    losses.length,
        winRate:   tradeLog.length > 0 ? (wins.length / tradeLog.length) * 100 : 0,
        netPnl,
        maxDD:     -maxDD,
        bestTrade: wins.length   > 0 ? Math.max(...wins.map(t => t.pnl))    : 0,
        worstTrade:losses.length > 0 ? Math.min(...losses.map(t => t.pnl))  : 0,
        avgRR,
        pf:        isFinite(pf) ? pf : 99,
    };
}

// �� AI Otopsi � API �a�r�s� �����������������������������������������������
async function fetchAIAutopsy(symbol, tf, metrics, tradeLog) {
    const apiKey = process.env.REACT_APP_ANTHROPIC_KEY;
    if (!apiKey) throw new Error('no-key');

    const systemPrompt = `Sen bir profesyonel trading ko�usun ve risk y�netimi uzman�s�n. 
Kullan�c�n�n backtest sim�lasyon sonu�lar�n� analiz edip:
1. G��l� y�nlerini tespit et
2. Zay�f y�nlerini ve tekrarlayan hatalar� bul
3. Somut ve uygulanabilir 3 �neri ver
4. Genel bir performans notu ver (A/B/C/D/F)
Yan�t�n� T�rk�e ver. Samimi, motive edici ama d�r�st ol.
Yan�t�n� �u JSON format�nda ver:
{
  "grade": "B+",
  "summary": "...",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "suggestions": ["...", "...", "..."],
  "motivational_quote": "..."
}`;

    const userMessage = `
Sim�lasyon Sonu�lar�:
- Varl�k: ${symbol} (${tf})
- Toplam ��lem: ${metrics.total}
- Win Rate: ${metrics.winRate.toFixed(1)}%
- Net PnL: ${metrics.netPnl.toFixed(2)}
- Max Drawdown: ${metrics.maxDD.toFixed(2)}
- Profit Factor: ${metrics.pf.toFixed(2)}
- Ortalama R:R: ${metrics.avgRR.toFixed(2)}
- ��lem Detaylar�: ${JSON.stringify(tradeLog.map(t => ({ dir: t.direction, pnl: t.pnl.toFixed(2), type: t.type })))}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type':      'application/json',
            'x-api-key':         apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model:      'claude-3-5-haiku-20241022',
            max_tokens: 1024,
            system:     systemPrompt,
            messages:   [{ role: 'user', content: userMessage }],
        }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const text = data?.content?.[0]?.text ?? '';
    // JSON blo�unu ��kar
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('parse-error');
    return JSON.parse(match[0]);
}

// �� Typewriter Hook �������������������������������������������������������
function useTypewriter(text, speed = 18) {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        if (!text) { setDisplayed(''); return; }
        setDisplayed('');
        let i = 0;
        const id = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) clearInterval(id);
        }, speed);
        return () => clearInterval(id);
    }, [text, speed]);
    return displayed;
}

// �� Count-up Hook ���������������������������������������������������������
function useCountUp(target, duration = 900) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (target === 0) { setVal(0); return; }
        const start = Date.now();
        const id = setInterval(() => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setVal(target * eased);
            if (progress >= 1) clearInterval(id);
        }, 16);
        return () => clearInterval(id);
    }, [target, duration]);
    return val;
}

// �� Metrik Kart �����������������������������������������������������������
const MetricCard = React.memo(function MetricCard({ label, value, color, prefix = '', suffix = '', decimals = 0 }) {
    const animated = useCountUp(typeof value === 'number' ? Math.abs(value) : 0);
    const display  = typeof value === 'number'
        ? `${value < 0 ? '-' : ''}${prefix}${animated.toFixed(decimals)}${suffix}`
        : value;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)`, animation: 'wt-countup 0.4s ease-out forwards' }}>
            <span style={{ fontSize: '0.65rem', color: THEME.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 900, color: color || THEME.textMain, fontVariantNumeric: 'tabular-nums', textShadow: color ? `0 0 10px ${color}44` : 'none' }}>
                {display}
            </span>
        </div>
    );
});

// �� Not Rengi �������������������������������������������������������������
function gradeColor(grade) {
    if (!grade) return THEME.textMuted;
    const g = grade[0].toUpperCase();
    if (g === 'A') return THEME.neonGold;
    if (g === 'B') return THEME.neonUp;
    if (g === 'C') return '#facc15';
    if (g === 'D') return '#fb923c';
    return THEME.neonDown;
}

// �� AI Otopsi Overlay �����������������������������������������������������
const AutopsyOverlay = React.memo(function AutopsyOverlay({ symbol, tf, tradeLog, metrics, onNewSim, t }) {
    const [aiResult,   setAiResult]   = useState(null);
    const [aiLoading,  setAiLoading]  = useState(true);
    const [aiError,    setAiError]    = useState(false);
    const summaryTyped = useTypewriter(aiResult?.summary ?? '', 14);

    useEffect(() => {
        let cancelled = false;
        setAiLoading(true);
        setAiError(false);
        setAiResult(null);
        fetchAIAutopsy(symbol, tf, metrics, tradeLog)
            .then(res => { if (!cancelled) { setAiResult(res); setAiLoading(false); } })
            .catch(() => { if (!cancelled) { setAiError(true); setAiLoading(false); } });
        return () => { cancelled = true; };
    }, []); // eslint-disable-line

    // �� Raporu indir (JSON) ��
    const handleDownload = () => {
        const data = { symbol, tf, metrics, tradeLog, aiResult, timestamp: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `backtest-${symbol}-${tf}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // �� Payla� ��
    const handleShare = () => {
        const text = `?? WhaleTracker Backtest Sonucu\n` +
            `?? ${symbol} | ${tf}\n` +
            `? Win Rate: ${metrics.winRate.toFixed(1)}%\n` +
            `?? Net PnL: ${metrics.netPnl >= 0 ? '+' : ''}${metrics.netPnl.toFixed(2)}\n` +
            `?? Profit Factor: ${metrics.pf.toFixed(2)}\n` +
            (aiResult ? `?? AI Notu: ${aiResult.grade}` : '');
        navigator.clipboard.writeText(text).catch(() => {});
    };

    const gc = gradeColor(aiResult?.grade);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', flexDirection: 'column', background: 'rgba(4, 8, 16, 0.96)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', overflowY: 'auto' }}
        >

            {/* Dekoratif arka plan */}
            <div style={{ position: 'fixed', top: '15%', left: '10%',  width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', bottom: '10%', right: '8%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 70%)`, pointerEvents: 'none' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 28px 14px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0, background: 'rgba(10,14,23,0.7)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy size={17} color={THEME.neonGold} />
                </div>
                <div>
                    <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'white' }}>{t('backtest.lab.autopsyTitle')}</div>
                    <div style={{ fontSize: '0.62rem', color: THEME.textMuted, marginTop: 2 }}>{symbol} � {tf} � {tradeLog.length} {t('backtest.lab.autopsyTrades')}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.04)', color: THEME.textMuted, fontSize: '0.7rem', fontWeight: 700 }}>
                        <Download size={12} />{t('backtest.lab.autopsyDownload')}
                    </button>
                    <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.04)', color: THEME.textMuted, fontSize: '0.7rem', fontWeight: 700 }}>
                        <Share2 size={12} />{t('backtest.lab.autopsyShare')}
                    </button>
                </div>
            </div>

            {/* �ki kolon g�vde */}
            <div style={{ flex: 1, display: 'flex', gap: 0, padding: '24px 28px', maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

                {/* ��� SOL KOLON ��� */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 20, borderRight: `1px solid ${THEME.border}` }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('backtest.lab.autopsyPerfReport')}</div>

                    {/* Metrikler */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, animation: 'wt-fadeIn 0.5s ease-out' }}>
                        <MetricCard label={t('backtest.lab.metricTotal')}     value={metrics.total}    color={THEME.textMain} />
                        <MetricCard label={t('backtest.lab.metricWins')}      value={metrics.wins}     color={THEME.neonUp}   suffix={` (${metrics.winRate.toFixed(0)}%)`} />
                        <MetricCard label={t('backtest.lab.metricLosses')}    value={metrics.losses}   color={THEME.neonDown} />
                        <MetricCard label={t('backtest.lab.metricNetPnl')}    value={metrics.netPnl}   color={metrics.netPnl >= 0 ? THEME.neonUp : THEME.neonDown} prefix='$' decimals={2} />
                        <MetricCard label={t('backtest.lab.metricMaxDD')}     value={metrics.maxDD}    color={THEME.neonDown} prefix='$' decimals={2} />
                        <MetricCard label={t('backtest.lab.metricBest')}      value={metrics.bestTrade}  color={THEME.neonUp}  prefix='+$' decimals={2} />
                        <MetricCard label={t('backtest.lab.metricWorst')}     value={metrics.worstTrade} color={THEME.neonDown} prefix='$' decimals={2} />
                        <MetricCard label={t('backtest.lab.metricAvgRR')}     value={metrics.avgRR}    color={THEME.neonCyan} prefix='1 : ' decimals={2} />
                        <MetricCard label={t('backtest.lab.metricPF')}        value={metrics.pf}       color={THEME.neonGold} decimals={2} />
                    </div>

                    {/* ��lem ge�mi�i */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: THEME.bgCard, border: `1px solid ${THEME.border}`, borderRadius: 10, overflow: 'hidden', maxHeight: 280 }}>
                        <div style={{ padding: '9px 14px', borderBottom: `1px solid ${THEME.border}`, fontSize: '0.6rem', fontWeight: 800, color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {t('backtest.lab.tradeLog')}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {tradeLog.length === 0 ? (
                                <div style={{ padding: 18, textAlign: 'center', fontSize: '0.65rem', color: THEME.textMuted }}>{t('backtest.lab.noTrades')}</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.63rem', fontVariantNumeric: 'tabular-nums' }}>
                                    <thead>
                                        <tr style={{ color: THEME.textMuted, fontSize: '0.56rem', fontWeight: 700 }}>
                                            {['#', t('backtest.lab.colDir'), t('backtest.lab.colEntry'), t('backtest.lab.colExit'), 'PnL', t('backtest.lab.colResult')].map((h, i) => (
                                                <th key={i} style={{ padding: '4px 8px', textAlign: i === 0 ? 'center' : 'right', textTransform: 'uppercase', borderBottom: `1px solid ${THEME.border}` }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tradeLog.map(tr => (
                                            <tr key={tr.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)`, background: tr.pnl >= 0 ? 'rgba(0,255,157,0.04)' : 'rgba(255,51,102,0.04)' }}>
                                                <td style={{ padding: '4px 8px', textAlign: 'center', color: THEME.textMuted }}>{tr.id}</td>
                                                <td style={{ padding: '4px 8px', textAlign: 'right', color: tr.direction === 'LONG' ? THEME.neonUp : THEME.neonDown, fontWeight: 800 }}>{tr.direction}</td>
                                                <td style={{ padding: '4px 8px', textAlign: 'right', color: THEME.textMain }}>{tr.entry.toFixed(0)}</td>
                                                <td style={{ padding: '4px 8px', textAlign: 'right', color: THEME.textMain }}>{tr.exit.toFixed(0)}</td>
                                                <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800, color: tr.pnl >= 0 ? THEME.neonUp : THEME.neonDown }}>{tr.pnl >= 0 ? '+' : ''}{tr.pnl.toFixed(1)}</td>
                                                <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.58rem', fontWeight: 700, color: tr.type === 'TP' ? THEME.neonUp : tr.type === 'SL' ? THEME.neonDown : THEME.neonCyan }}>
                                                    {tr.type === 'TP' ? t('backtest.lab.resultTp') : tr.type === 'SL' ? t('backtest.lab.resultSl') : t('backtest.lab.resultManual')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* ��� SA� KOLON ��� */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 20 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('backtest.lab.autopsyAIPanel')}</div>

                    {aiLoading ? (
                        /* Loading durumu */
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                            {/* Beyin + dalga */}
                            <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid rgba(251,191,36,0.15)`, borderTop: `2px solid ${THEME.neonGold}`, animation: 'wt-spin 1.2s linear infinite' }} />
                                <Brain size={26} color={THEME.neonGold} />
                            </div>
                            {/* Ses dalgalar� */}
                            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 32 }}>
                                {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7].map((h, i) => (
                                    <div key={i} style={{ width: 4, height: `${h * 100}%`, borderRadius: 3, background: THEME.neonGold, animation: `wt-wave 1.1s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }} />
                                ))}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: THEME.neonGold, fontWeight: 700, letterSpacing: '0.04em', animation: 'wt-pulse 1.5s ease-in-out infinite' }}>
                                {t('backtest.lab.autopsyAnalyzing')}
                            </div>
                            {/* Skeleton kartlar */}
                            {[1, 0.8, 0.9].map((w, i) => (
                                <div key={i} style={{ width: `${w * 100}%`, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden', alignSelf: 'flex-start' }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.06), transparent)', animation: 'wt-shimmer 1.6s infinite' }} />
                                </div>
                            ))}
                        </div>
                    ) : aiError ? (
                        /* Hata durumu */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 28, background: 'rgba(255,51,102,0.06)', borderRadius: 12, border: `1px solid rgba(255,59,48,0.2)` }}>
                            <AlertTriangle size={28} color={THEME.neonDown} />
                            <div style={{ fontSize: '0.78rem', color: THEME.neonDown, fontWeight: 700, textAlign: 'center' }}>{t('backtest.lab.autopsyError')}</div>
                            <div style={{ fontSize: '0.64rem', color: THEME.textMuted, textAlign: 'center' }}>{t('backtest.lab.autopsyErrorHint')}</div>
                        </div>
                    ) : aiResult ? (
                        /* AI sonucu */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'wt-fadeIn 0.6s ease-out' }}>

                            {/* Not kart� */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: `${gc}0d`, border: `1px solid ${gc}33`, borderRadius: 12 }}>
                                <div style={{ fontSize: '3rem', fontWeight: 900, color: gc, lineHeight: 1, fontFamily: 'monospace', animation: 'wt-glow 2.5s ease-in-out infinite', minWidth: 72, textAlign: 'center' }}>
                                    {aiResult.grade}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.58rem', color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{t('backtest.lab.autopsyGradeLabel')}</div>
                                    <div style={{ fontSize: '0.78rem', color: THEME.textMain, lineHeight: 1.5, fontWeight: 600 }}>
                                        {summaryTyped}<span style={{ opacity: 0.4, animation: 'wt-pulse 0.7s infinite' }}>|</span>
                                    </div>
                                </div>
                            </div>

                            {/* G��l� y�nler */}
                            {aiResult.strengths?.length > 0 && (
                                <div style={{ background: 'rgba(0,255,157,0.04)', border: `1px solid rgba(0,255,157,0.12)`, borderRadius: 10, padding: '12px 14px' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: THEME.neonUp, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('backtest.lab.autopsyStrengths')}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {aiResult.strengths.map((s, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                <CheckCircle size={12} color={THEME.neonUp} style={{ marginTop: 2, flexShrink: 0 }} />
                                                <span style={{ fontSize: '0.74rem', color: THEME.textMain, lineHeight: 1.45 }}>{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Zay�f y�nler */}
                            {aiResult.weaknesses?.length > 0 && (
                                <div style={{ background: 'rgba(251,191,36,0.04)', border: `1px solid rgba(251,191,36,0.12)`, borderRadius: 10, padding: '12px 14px' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: THEME.neonGold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('backtest.lab.autopsyWeaknesses')}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {aiResult.weaknesses.map((w, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                <AlertTriangle size={12} color={THEME.neonGold} style={{ marginTop: 2, flexShrink: 0 }} />
                                                <span style={{ fontSize: '0.74rem', color: THEME.textMain, lineHeight: 1.45 }}>{w}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* �neriler */}
                            {aiResult.suggestions?.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: THEME.neonCyan, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('backtest.lab.autopsySuggestions')}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {aiResult.suggestions.map((s, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, background: 'rgba(34,211,238,0.04)', border: `1px solid rgba(34,211,238,0.1)`, cursor: 'default', transition: '0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,211,238,0.08)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,211,238,0.04)'}>
                                                <Target size={13} color={THEME.neonCyan} style={{ marginTop: 1, flexShrink: 0 }} />
                                                <span style={{ fontSize: '0.74rem', color: THEME.textMain, lineHeight: 1.45, flex: 1 }}>{s}</span>
                                                <ChevronRight size={12} color={THEME.textMuted} style={{ marginTop: 2, flexShrink: 0 }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Motivasyon s�z� */}
                            {aiResult.motivational_quote && (
                                <div style={{ padding: '14px 18px', borderRadius: 10, background: `${THEME.neonGold}0a`, border: `1px solid ${THEME.neonGold}22`, textAlign: 'center', marginTop: 4 }}>
                                    <Star size={14} color={THEME.neonGold} style={{ marginBottom: 8 }} />
                                    <div style={{ fontSize: '0.78rem', color: THEME.neonGold, fontStyle: 'italic', lineHeight: 1.55, fontWeight: 600 }}>
                                        "{aiResult.motivational_quote}"
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Alt aksiyon �ubu�u */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 28px', borderTop: `1px solid ${THEME.border}`, background: 'rgba(10,14,23,0.7)' }}>
                <button onClick={onNewSim}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${THEME.neonCyan}44`, background: 'rgba(34,211,238,0.1)', color: THEME.neonCyan, fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                    <RefreshCw size={14} />{t('backtest.lab.autopsyNewSim')}
                </button>
                <button onClick={handleDownload}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.04)', color: THEME.textMuted, fontSize: '0.8rem', fontWeight: 700 }}>
                    <Download size={14} />{t('backtest.lab.autopsyDownload')}
                </button>
                <button onClick={handleShare}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.04)', color: THEME.textMuted, fontSize: '0.8rem', fontWeight: 700 }}>
                    <Share2 size={14} />{t('backtest.lab.autopsyShare')}
                </button>
            </div>
        </motion.div>
    );
});

// �� ��lem Sonu� Modal� (Ad�m 3'ten, de�i�tirilmedi) ����������������������
const TradeResultModal = React.memo(function TradeResultModal({ result, onContinue, t }) {
    const shouldReduceMotion = useReducedMotion();
    if (!result) return null;
    const isTP  = result.type === 'TP';
    const color = isTP ? THEME.neonUp : THEME.neonDown;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(14px)' }}
        >
            <motion.div
                initial={shouldReduceMotion ? {} : { scale: 0.88, opacity: 0, y: 14 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                style={{ width: 340, background: 'rgba(13,18,30,0.97)', border: `1px solid ${color}44`, borderRadius: 16, padding: '26px 26px 20px', boxShadow: `0 0 60px ${color}1a, 0 24px 80px rgba(0,0,0,0.8)`, display: 'flex', flexDirection: 'column', gap: 18 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isTP ? <CheckCircle size={24} color={color} /> : <AlertTriangle size={24} color={color} />}
                    <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color, letterSpacing: '0.03em' }}>
                            {isTP ? t('backtest.lab.tpTriggered') : t('backtest.lab.slTriggered')}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: THEME.textMuted, marginTop: 2 }}>
                            {result.direction} � {t('backtest.lab.autoClose')}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '13px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${THEME.border}` }}>
                    {[
                        [t('backtest.lab.entryPrice'), `$${result.entry.toFixed(2)}`],
                        [isTP ? t('backtest.lab.takeProfit') : t('backtest.lab.stopLoss'), `$${result.exit.toFixed(2)}`],
                        ['PnL', `${result.pnl >= 0 ? '+' : ''}${result.pnl.toFixed(2)}`],
                    ].map(([label, val], i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.62rem', color: THEME.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: i === 2 ? (result.pnl >= 0 ? THEME.neonUp : THEME.neonDown) : THEME.textMain }}>{val}</span>
                        </div>
                    ))}
                </div>
                <button onClick={onContinue} style={{ width: '100%', padding: '11px 0', borderRadius: 9, cursor: 'pointer', border: `1px solid ${color}44`, background: `${color}18`, color, fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <Play size={12} />{t('backtest.lab.continue')}
                </button>
            </motion.div>
        </motion.div>
    );
});

// �� Kurulum Formu (State Machine � A�ama 1) ��������������������������������
const SETUP_TF_OPTIONS = [
    { val: '15m', label: '15m' },
    { val: '1H',  label: '1H'  },
    { val: '4H',  label: '4H'  },
    { val: '1D',  label: '1D'  },
];

const SetupForm = React.memo(function SetupForm({ onStart, t }) {
    const [symbol,        setSymbol]       = useState('BTCUSDT');
    const [symbolName,    setSymbolName]   = useState('BTC / USDT');
    const [startDate,     setStartDate]    = useState('2024-01-01');
    const [endDate,       setEndDate]      = useState('2024-06-30');
    const [tf,            setTf]           = useState('1H');
    const [balance,       setBalance]      = useState('10000');
    const [query,         setQuery]        = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [searching,     setSearching]    = useState(false);
    const debounceRef = useRef(null);
    const wrapperRef  = useRef(null);

    const handleQueryChange = useCallback((e) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!val.trim()) { setSearchResults(null); return; }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            const res = await searchSymbols(val.trim());
            setSearchResults(res);
            setSearching(false);
        }, 300);
    }, []);

    const handleSelectSymbol = useCallback((item) => {
        setSymbol(item.symbol);
        setSymbolName(item.name || item.symbol);
        setQuery('');
        setSearchResults(null);
    }, []);

    useEffect(() => {
        const handleClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setSearchResults(null);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const isValid = Boolean(symbol && startDate && endDate && balance && parseFloat(balance) > 0 && startDate < endDate);

    const handleSubmit = useCallback(() => {
        if (!isValid) return;
        onStart({ symbol, symbolName, startDate, endDate, tf, balance });
    }, [isValid, onStart, symbol, symbolName, startDate, endDate, tf, balance]);

    const fieldLbl = {
        fontSize: '0.62rem', fontWeight: 700, color: THEME.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 6, display: 'block',
    };
    const fieldInp = {
        width: '100%', background: 'rgba(255,255,255,0.05)',
        border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 9,
        color: THEME.textMain, padding: '11px 14px',
        fontSize: '0.82rem', fontWeight: 600, outline: 'none',
        fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s',
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: THEME.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {/* Dekoratif glows */}
            <div style={{ position: 'absolute', top: '8%', left: '12%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.055) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '12%', right: '8%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,157,0.045) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '55%', left: '55%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,219,231,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                    width: '100%', maxWidth: 520, margin: 16,
                    background: 'rgba(13,18,30,0.82)',
                    backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 20,
                    boxShadow: '0 0 0 1px rgba(34,211,238,0.07), 0 32px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)',
                    position: 'relative', zIndex: 1,
                }}
            >
                {/* Kart ba�l��� */}
                <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FlaskConical size={19} color={THEME.neonCyan} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'white', letterSpacing: '0.02em' }}>{t('backtest.lab.setupTitle')}</div>
                            <div style={{ fontSize: '0.66rem', color: THEME.textMuted, marginTop: 2, fontWeight: 600 }}>{t('backtest.lab.setupSubtitle')}</div>
                        </div>
                    </div>
                </div>

                {/* Form alanlar� */}
                <div style={{ padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Varl�k Ara */}
                    <div ref={wrapperRef} style={{ position: 'relative' }}>
                        <span style={fieldLbl}>{t('backtest.lab.setupSymbol')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'rgba(34,211,238,0.06)', border: `1px solid rgba(34,211,238,0.2)`, borderRadius: 9, marginBottom: 8 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: THEME.neonCyan, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: THEME.neonCyan, fontVariantNumeric: 'tabular-nums' }}>{symbol}</span>
                            <span style={{ fontSize: '0.7rem', color: THEME.textMuted, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{symbolName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.09)`, borderRadius: 9, padding: '9px 14px', marginBottom: 8 }}>
                            <Search size={13} color={THEME.textMuted} />
                            <input value={query} onChange={handleQueryChange}
                                placeholder={t('backtest.lab.searchPlaceholder')}
                                style={{ background: 'none', border: 'none', outline: 'none', color: THEME.textMain, fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit', flex: 1 }} />
                        </div>
                        <SearchDropdown results={searchResults} loading={searching} onSelect={handleSelectSymbol} />
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {QUICK_ASSETS.map(a => (
                                <button key={a.symbol} onClick={() => { setSymbol(a.symbol); setSymbolName(a.label); }}
                                    style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer', border: symbol === a.symbol ? `1px solid ${THEME.neonCyan}55` : `1px solid rgba(255,255,255,0.07)`, background: symbol === a.symbol ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)', color: symbol === a.symbol ? THEME.neonCyan : THEME.textMuted, fontSize: '0.68rem', fontWeight: 800, transition: '0.15s' }}>
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tarih Aral��� */}
                    <div>
                        <span style={fieldLbl}>{t('backtest.lab.setupDateRange')}</span>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ ...fieldLbl, textTransform: 'none', letterSpacing: 0, fontSize: '0.58rem', marginBottom: 4 }}>{t('backtest.lab.setupStartDate')}</span>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    style={{ ...fieldInp, colorScheme: 'dark' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <span style={{ ...fieldLbl, textTransform: 'none', letterSpacing: 0, fontSize: '0.58rem', marginBottom: 4 }}>{t('backtest.lab.setupEndDate')}</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    style={{ ...fieldInp, colorScheme: 'dark' }} />
                            </div>
                        </div>
                        {startDate && endDate && startDate >= endDate && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '5px 10px', borderRadius: 7, background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,59,48,0.2)' }}>
                                <AlertTriangle size={11} color={THEME.neonDown} />
                                <span style={{ fontSize: '0.62rem', color: THEME.neonDown, fontWeight: 700 }}>{t('backtest.lab.setupDateError')}</span>
                            </div>
                        )}
                    </div>

                    {/* Zaman Dilimi */}
                    <div>
                        <span style={fieldLbl}>{t('backtest.lab.setupTimeframe')}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {SETUP_TF_OPTIONS.map(({ val, label }) => (
                                <button key={val} onClick={() => setTf(val)}
                                    style={{ flex: 1, padding: '10px 0', borderRadius: 9, cursor: 'pointer', fontWeight: tf === val ? 800 : 600, fontSize: '0.8rem', border: tf === val ? `1px solid ${THEME.neonCyan}55` : `1px solid rgba(255,255,255,0.08)`, background: tf === val ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.03)', color: tf === val ? THEME.neonCyan : THEME.textMuted, transition: '0.15s', boxShadow: tf === val ? `0 0 10px rgba(34,211,238,0.12)` : 'none' }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sanal Bakiye */}
                    <div>
                        <span style={fieldLbl}>{t('backtest.lab.setupBalance')}</span>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: THEME.neonGold, fontSize: '0.82rem', fontWeight: 800, pointerEvents: 'none' }}>$</span>
                            <input type="number" min="100" step="100" value={balance}
                                onChange={e => setBalance(e.target.value)}
                                placeholder="10000"
                                style={{ ...fieldInp, paddingLeft: 30 }} />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div style={{ padding: '20px 28px 24px' }}>
                    <button onClick={handleSubmit} disabled={!isValid}
                        style={{
                            width: '100%', padding: '14px 0', borderRadius: 12,
                            cursor: isValid ? 'pointer' : 'not-allowed',
                            border: `1px solid ${isValid ? THEME.neonCyan + '55' : 'rgba(255,255,255,0.06)'}`,
                            background: isValid
                                ? 'linear-gradient(135deg, rgba(34,211,238,0.16) 0%, rgba(0,255,157,0.1) 100%)'
                                : 'rgba(255,255,255,0.03)',
                            color: isValid ? THEME.neonCyan : THEME.textMuted,
                            fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.06em',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                            opacity: isValid ? 1 : 0.5, transition: 'all 0.2s ease',
                            boxShadow: isValid ? `0 0 24px rgba(34,211,238,0.1), inset 0 1px 0 rgba(255,255,255,0.08)` : 'none',
                        }}>
                        <Play size={15} />
                        {t('backtest.lab.setupStart')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
});

// �� ANA B�LE�EN �����������������������������������������������������������
// ── Drawing Toolbar ──────────────────────────────────────────────────────
const DrawingToolbar = React.memo(function DrawingToolbar({ activeTool, onToolChange, onClearAll }) {
    const { t } = useTranslation();
    const tools = [
        { id: 'cursor', icon: MousePointer2, title: t('backtest.lab.toolCursor') },
        { id: 'line',   icon: Minus,         title: t('backtest.lab.toolLine') },
        { id: 'rect',   icon: Square,        title: t('backtest.lab.toolRect') },
    ];
    return (
        <div style={{
            position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)',
            zIndex: 20, display: 'flex', flexDirection: 'column', gap: 4,
            background: 'rgba(5,8,22,0.9)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '8px 6px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)',
        }}>
            {tools.map(({ id, icon: Icon, title }) => {
                const active = activeTool === id;
                return (
                    <button key={id} title={title} onClick={() => onToolChange(id)}
                        style={{
                            width: 32, height: 32, borderRadius: 8, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', outline: 'none', padding: 0,
                            border:  active ? '1px solid rgba(0,230,118,0.55)' : '1px solid transparent',
                            background: active ? 'rgba(0,230,118,0.11)' : 'rgba(255,255,255,0.03)',
                            color: active ? '#00E676' : 'rgba(255,255,255,0.38)',
                            boxShadow: active ? '0 0 10px rgba(0,230,118,0.28), inset 0 0 6px rgba(0,230,118,0.06)' : 'none',
                            transition: 'all 0.14s ease',
                        }}
                        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; } }}
                        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; } }}
                    >
                        <Icon size={14} strokeWidth={2} />
                    </button>
                );
            })}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '3px 0' }} />
            <button title={t('backtest.lab.toolClearAll')} onClick={onClearAll}
                style={{
                    width: 32, height: 32, borderRadius: 8, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', outline: 'none', padding: 0,
                    border: '1px solid transparent', background: 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,80,80,0.5)', transition: 'all 0.14s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.14)'; e.currentTarget.style.color = '#FF3B30'; e.currentTarget.style.border = '1px solid rgba(255,59,48,0.28)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,80,80,0.5)'; e.currentTarget.style.border = '1px solid transparent'; }}
            >
                <Trash2 size={13} strokeWidth={2} />
            </button>
        </div>
    );
});

// ── Chart Drawing Overlay ─────────────────────────────────────────────
// Canvas-based, price/time-sticky drawings (survive zoom & pan)
const ChartDrawingOverlay = React.memo(function ChartDrawingOverlay({ activeTool, registerClear, lwChartRef }) {
    const canvasRef   = useRef(null);
    const drawingsRef = useRef([]); // { id, type, x1:logical, y1:price, x2:logical, y2:price }
    const tempRef     = useRef(null);
    const dragRef     = useRef({ active: false, startPx: null });
    const rafRef      = useRef(null);

    // ── coordinate helpers ──────────────────────────────────────────────
    const toChartCoords = useCallback((px, py) => {
        const chart  = lwChartRef?.current?.getChart?.();
        const series = lwChartRef?.current?.getCandleSeries?.();
        if (!chart || !series) return null;
        const logical = chart.timeScale().coordinateToLogical(px);
        const price   = series.coordinateToPrice(py);
        if (logical == null || price == null) return null;
        return { logical, price };
    }, [lwChartRef]);

    const toPixel = useCallback((logical, price) => {
        const chart  = lwChartRef?.current?.getChart?.();
        const series = lwChartRef?.current?.getCandleSeries?.();
        if (!chart || !series) return null;
        const x = chart.timeScale().logicalToCoordinate(logical);
        const y = series.priceToCoordinate(price);
        if (x == null || y == null) return null;
        return { x, y };
    }, [lwChartRef]);

    // ── canvas draw ─────────────────────────────────────────────────────
    const paintShape = useCallback((ctx, type, x1, y1, x2, y2, isTemp) => {
        ctx.save();
        if (type === 'line') {
            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.strokeStyle = isTemp ? 'rgba(0,230,118,0.55)' : 'rgba(0,230,118,0.9)';
            ctx.lineWidth   = isTemp ? 1.5 : 1.8;
            ctx.setLineDash(isTemp ? [6, 4] : []);
            ctx.shadowColor = 'rgba(0,230,118,0.35)';
            ctx.shadowBlur  = isTemp ? 0 : 5;
            ctx.stroke();
        } else {
            const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
            const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
            ctx.fillStyle   = isTemp ? 'rgba(0,230,118,0.04)' : 'rgba(0,230,118,0.07)';
            ctx.strokeStyle = isTemp ? 'rgba(0,230,118,0.45)' : 'rgba(0,230,118,0.8)';
            ctx.lineWidth   = 1.2;
            ctx.setLineDash(isTemp ? [6, 4] : [4, 3]);
            ctx.shadowColor = 'rgba(0,230,118,0.25)';
            ctx.shadowBlur  = isTemp ? 0 : 4;
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeRect(rx, ry, rw, rh);
        }
        ctx.restore();
    }, []);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);

        for (const d of drawingsRef.current) {
            const p1 = toPixel(d.x1, d.y1);
            const p2 = toPixel(d.x2, d.y2);
            if (p1 && p2) paintShape(ctx, d.type, p1.x, p1.y, p2.x, p2.y, false);
        }
        if (tempRef.current) {
            const t = tempRef.current;
            paintShape(ctx, t.type, t.x1, t.y1, t.x2, t.y2, true);
        }
        ctx.restore();
    }, [toPixel, paintShape]);

    const scheduleRender = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(render);
    }, [render]);

    // ── register clear ──────────────────────────────────────────────────
    useEffect(() => {
        if (registerClear) registerClear(() => {
            drawingsRef.current = [];
            tempRef.current = null;
            scheduleRender();
        });
    }, [registerClear, scheduleRender]);

    // ── subscribe to chart zoom/pan → redraw ────────────────────────────
    useEffect(() => {
        let unsub = null;
        const trySubscribe = () => {
            const chart = lwChartRef?.current?.getChart?.();
            if (!chart) { setTimeout(trySubscribe, 60); return; }
            const handler = () => scheduleRender();
            chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
            unsub = () => { try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler); } catch(_){} };
        };
        trySubscribe();
        return () => { if (unsub) unsub(); };
    }, [lwChartRef, scheduleRender]);

    // ── DPR-aware canvas resize ─────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ro = new ResizeObserver(() => {
            const dpr = window.devicePixelRatio || 1;
            const w   = canvas.offsetWidth;
            const h   = canvas.offsetHeight;
            canvas.width  = w * dpr;
            canvas.height = h * dpr;
            scheduleRender();
        });
        ro.observe(canvas);
        return () => ro.disconnect();
    }, [scheduleRender]);

    // ── mouse handlers ──────────────────────────────────────────────────
    const getPos = e => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseDown = e => {
        if (activeTool === 'cursor') return;
        const pos = getPos(e);
        dragRef.current = { active: true, startPx: pos };
        tempRef.current = { type: activeTool, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
        scheduleRender();
    };

    const onMouseMove = e => {
        if (!dragRef.current.active) return;
        const pos = getPos(e);
        if (tempRef.current) tempRef.current = { ...tempRef.current, x2: pos.x, y2: pos.y };
        scheduleRender();
    };

    const commitDraw = e => {
        if (!dragRef.current.active) return;
        dragRef.current.active = false;
        const pos  = getPos(e);
        const sp   = dragRef.current.startPx;
        const dist = sp ? Math.hypot(pos.x - sp.x, pos.y - sp.y) : 0;
        if (dist > 5 && sp) {
            const c1 = toChartCoords(sp.x, sp.y);
            const c2 = toChartCoords(pos.x, pos.y);
            if (c1 && c2) {
                drawingsRef.current = [...drawingsRef.current, {
                    id: Date.now(), type: activeTool,
                    x1: c1.logical, y1: c1.price,
                    x2: c2.logical, y2: c2.price,
                }];
            }
        }
        tempRef.current = null;
        scheduleRender();
    };

    return (
        <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={commitDraw}
            onMouseLeave={commitDraw}
            style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', zIndex: 10,
                cursor: activeTool === 'cursor' ? 'default' : 'crosshair',
                pointerEvents: activeTool === 'cursor' ? 'none' : 'all',
            }}
        />
    );
});

const BacktestLab = () => {
    const { t } = useTranslation();

    // �� State Machine ��������������������������������
    const [step,           setStep]           = useState('SETUP'); // 'SETUP' | 'REPLAY' | 'ANALYSIS'
    const [symbol,         setSymbol]         = useState('BTCUSDT');
    const [tf,             setTf]             = useState('1H');
    const [virtualBalance, setVirtualBalance] = useState(10000);

    // �� Veri katman� ��
    const masterDataRef    = useRef([]);
    const [dataLoading,    setDataLoading]    = useState(false);
    const [dataError,      setDataError]      = useState(null);
    const [isDemo,         setIsDemo]         = useState(false);
    const [showDemoBanner, setShowDemoBanner] = useState(false);
    const [livePrice,      setLivePrice]      = useState(null);
    const [priceChange,    setPriceChange]    = useState(0);

    // �� AI Otopsi state ��
    const [autopsyMetrics, setAutopsyMetrics] = useState(null);

    // �� Asset de�i�im uyar�s� ��
    const [pendingAsset, setPendingAsset]       = useState(null); // { symbol, tf }
    const [showAssetWarn, setShowAssetWarn]     = useState(false);
    const [showShortcuts,  setShowShortcuts]     = useState(false);

    // 🎬 Replay state (Adım 2 – değiştirilmedi) ――
    const [currentIndex, setCurrentIndex] = useState(INIT_COUNT);
    const [status,       setStatus]       = useState('idle');
    const [speed,        setSpeed]        = useState(1);
    const chartRef     = useRef(null);
    const intervalRef  = useRef(null);
    const nextIndexRef = useRef(INIT_COUNT);

    // �� Trade state (Ad�m 3 � de�i�tirilmedi) ��
    const [openPositions,  setOpenPositions]  = useState([]);
    const [tradeLog,       setTradeLog]       = useState([]);
    const [accountBalance, setAccountBalance] = useState(10000);
    const [screenFlash,    setScreenFlash]    = useState(null); // null | 'sl' | 'tp'
    const openPositionsRef = useRef([]);
    const tradeIdRef       = useRef(0);
    const flashTimerRef    = useRef(null);
    const shouldReduceMotion = useReducedMotion();

    // ⚡ Perf refs: keep latest state values without stale-closure re-creation
    const statusRef          = useRef('idle');
    const speedRef           = useRef(1);
    const tradeLogRef        = useRef([]);
    const virtualBalanceRef  = useRef(10000);
    const livePriceRef       = useRef(null);
    const entryPriceRef      = useRef('');
    const slRef              = useRef('');
    const tpRef              = useRef('');
    const sizeRef            = useRef('100');
    const directionRef       = useRef('LONG');
    const accountBalanceRef  = useRef(10000);

    // ── Drawing state ──────────────────────────────────
    const [activeTool,     setActiveTool]     = useState('cursor');
    const clearDrawingsRef = useRef(null);

    // Sync state → refs (O(1) reads inside interval/callbacks — zero stale closures)
    useEffect(() => { statusRef.current         = status;         }, [status]);
    useEffect(() => { speedRef.current          = speed;          }, [speed]);
    useEffect(() => { tradeLogRef.current       = tradeLog;       }, [tradeLog]);
    useEffect(() => { virtualBalanceRef.current = virtualBalance; }, [virtualBalance]);
    useEffect(() => { accountBalanceRef.current = accountBalance; }, [accountBalance]);
    useEffect(() => { livePriceRef.current      = livePrice;      }, [livePrice]);
    useEffect(() => { directionRef.current      = direction;      }, [direction]);
    useEffect(() => { sizeRef.current           = size;           }, [size]);
    useEffect(() => { slRef.current             = sl;             }, [sl]);
    useEffect(() => { tpRef.current             = tp;             }, [tp]);
    useEffect(() => { entryPriceRef.current     = entryPrice;     }, [entryPrice]);

    // ── AI Sentinel ───────────────────────────────────
    const { triggerManualScan } = useAISentinel(openPositions, livePrice);

    const [direction,  setDirection]  = useState('LONG');
    const [size,       setSize]       = useState('100');
    const [entryPrice, setEntryPrice] = useState('');
    const [sl,         setSl]         = useState('');
    const [tp,         setTp]         = useState('');

    // ── Lazy Load ─────────────────────────────────────
    const oldestTimeRef  = useRef(null);  // ilk yüklenen bloğun en eski timestamp'i (unix sn)
    const symbolRef      = useRef(symbol);
    const tfRef          = useRef(tf);
    useEffect(() => { symbolRef.current = symbol; }, [symbol]);
    useEffect(() => { tfRef.current     = tf;     }, [tf]);

    // �� Veri uygulama ��
    const applyNewData = useCallback((candles, demoFlag) => {
        masterDataRef.current = candles;
        // En eski timestamp'i lazy-load için sakla
        oldestTimeRef.current = candles.length > 0 ? candles[0].time : null;
        const initSlice = candles.slice(0, INIT_COUNT);
        nextIndexRef.current = INIT_COUNT;
        setCurrentIndex(INIT_COUNT);
        setStatus('idle');
        chartRef.current?.resetCandles(initSlice);
        chartRef.current?.removePriceLines();
        openPositionsRef.current = [];
        setOpenPositions([]);
        setSl(''); setTp('');

        setIsDemo(demoFlag);
        setShowDemoBanner(demoFlag);
        // Canl� fiyat ve de�i�im
        if (candles.length >= 2) {
            const last  = candles[candles.length - 1];
            const prev  = candles[candles.length - 2];
            setLivePrice(last.close);
            setPriceChange(prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0);
        }
    }, []);

    const loadData = useCallback(async (sym, timeframe) => {
        clearReplayIntervalFn();
        setDataLoading(true);
        setDataError(null);
        try {
            const { candles, isDemo: demo } = await loadAssetData(sym, timeframe);
            applyNewData(candles, demo);
        } catch (err) {
            setDataError(err?.message || 'fetch-failed');
        } finally {
            setDataLoading(false);
        }
    }, [applyNewData]); // eslint-disable-line

    // ── Lazy Load: grafik sola kaydırılınca önceki bloğu çek ────────────────
    const handleLoadMore = useCallback((done) => {
        const sym      = symbolRef.current;
        const timeframe = tfRef.current;
        const assetType = ASSET_TYPE[sym] || 'stock';
        if (assetType !== 'crypto' || !oldestTimeRef.current) { done(); return; }

        const endTime = oldestTimeRef.current * 1000; // unix ms
        fetchCryptoCandles(sym, timeframe, endTime)
            .then(older => {
                if (!older.length) { done(); return; }
                // Yeni en eski zamanı kaydet
                oldestTimeRef.current = older[0].time;
                // masterDataRef'i güncelle
                const merged = [...older, ...masterDataRef.current]
                    .sort((a, b) => a.time - b.time)
                    .filter((c, i, arr) => i === 0 || c.time !== arr[i - 1].time);
                masterDataRef.current = merged;
                // Grafiğe tam birleşik veriyi ver (series.data() Lightweight'ta yok)
                chartRef.current?.prependCandles(merged);
            })
            .catch(() => {/* sessizce geç */})
            .finally(done);
    }, []); // eslint-disable-line

    // �� Setup a�amas� tamamland� � REPLAY'e ge� ��
    const handleSetupStart = useCallback(({ symbol: sym, tf: timeframe, balance }) => {
        setSymbol(sym);
        setTf(timeframe);
        setVirtualBalance(parseFloat(balance));
        setAccountBalance(parseFloat(balance));
        loadData(sym, timeframe);
        setStep('REPLAY');
    }, [loadData]); // eslint-disable-line

    // �� Asset/TF de�i�tirme ak��� ��
    const requestAssetChange = useCallback((newSymbol, newTf) => {
        if (openPositionsRef.current.length > 0) {
            setPendingAsset({ symbol: newSymbol, tf: newTf });
            setShowAssetWarn(true);
        } else {
            clearReplayIntervalFn();
            setSymbol(newSymbol);
            setTf(newTf);
            loadData(newSymbol, newTf);
        }
    }, [loadData]); // eslint-disable-line

    const handleAssetSelect = useCallback((sym) => {
        if (sym === symbol) return;
        requestAssetChange(sym, tf);
    }, [symbol, tf, requestAssetChange]);

    const handleTfChange = useCallback((newTf) => {
        if (newTf === tf) return;
        requestAssetChange(symbol, newTf);
    }, [symbol, tf, requestAssetChange]);

    const confirmAssetChange = useCallback(() => {
        if (!pendingAsset) return;
        clearReplayIntervalFn();
        setSymbol(pendingAsset.symbol);
        setTf(pendingAsset.tf);
        loadData(pendingAsset.symbol, pendingAsset.tf);
        setPendingAsset(null);
        setShowAssetWarn(false);
    }, [pendingAsset, loadData]); // eslint-disable-line
    const cancelAssetChange = useCallback(() => { setPendingAsset(null); setShowAssetWarn(false); }, []);

    // �� Replay interval helpers ��
    const clearReplayIntervalFn = () => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
    // eslint-disable-next-line no-unused-vars
    const clearReplayInterval = clearReplayIntervalFn;

    const startInterval = (spd) => {
        intervalRef.current = setInterval(() => {
            const master = masterDataRef.current;
            const idx    = nextIndexRef.current;
            if (idx >= master.length) { clearReplayIntervalFn(); setStatus('done'); return; }

            const candle = master[idx];
            chartRef.current?.appendCandle(candle);
            const next = idx + 1;
            nextIndexRef.current = next;
            setCurrentIndex(next);
            // Canl� fiyat g�ncelle
            setLivePrice(candle.close);

            // ── Multi-position TP/SL check + floating PnL update ──
            const positions = openPositionsRef.current;
            if (positions.length > 0) {
                const closedRecs = [];
                const remaining  = [];
                for (const pos of positions) {
                    let triggered = null;
                    if (pos.direction === 'LONG') {
                        if      (pos.tp !== null && candle.high >= pos.tp) triggered = { type: 'TP', exit: pos.tp };
                        else if (pos.sl !== null && candle.low  <= pos.sl) triggered = { type: 'SL', exit: pos.sl };
                    } else {
                        if      (pos.tp !== null && candle.low  <= pos.tp) triggered = { type: 'TP', exit: pos.tp };
                        else if (pos.sl !== null && candle.high >= pos.sl) triggered = { type: 'SL', exit: pos.sl };
                    }
                    if (triggered) {
                        const pnl = pos.direction === 'LONG'
                            ? (triggered.exit - pos.entry) / pos.entry * pos.size
                            : (pos.entry - triggered.exit) / pos.entry * pos.size;
                        closedRecs.push({ id: pos.id, type: triggered.type, direction: pos.direction, entry: pos.entry, exit: triggered.exit, pnl, size: pos.size });
                    } else {
                        const pnl = pos.direction === 'LONG'
                            ? (candle.close - pos.entry) / pos.entry * pos.size
                            : (pos.entry - candle.close) / pos.entry * pos.size;
                        remaining.push({ ...pos, pnl });
                    }
                }
                if (closedRecs.length > 0) {
                    openPositionsRef.current = remaining;
                    setOpenPositions(remaining);
                    setTradeLog(prev => [...prev, ...closedRecs]);
                    const totalRealized = closedRecs.reduce((s, r) => s + r.pnl, 0);
                    const totalSize     = closedRecs.reduce((s, r) => s + r.size, 0);
                    setAccountBalance(prev => prev + totalSize + totalRealized);
                    chartRef.current?.removePriceLines();
                    remaining.forEach(p => {
                        chartRef.current?.addPriceLine({ price: p.entry, color: THEME.neonUp, title: 'E#' + p.id });
                        if (p.sl !== null) chartRef.current?.addPriceLine({ price: p.sl, color: THEME.neonDown, title: 'SL#' + p.id });
                        if (p.tp !== null) chartRef.current?.addPriceLine({ price: p.tp, color: THEME.neonGold, title: 'TP#' + p.id });
                    });
                    const lastClosed = closedRecs[closedRecs.length - 1];
                    if (!shouldReduceMotion) {
                        setScreenFlash(lastClosed.type === 'TP' ? 'tp' : 'sl');
                        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                        flashTimerRef.current = setTimeout(() => setScreenFlash(null), 700);
                    }
                    closedRecs.forEach(rec => {
                        const pnlStr = (rec.pnl >= 0 ? '+' : '') + '$' + Math.abs(rec.pnl).toFixed(2);
                        if (rec.type === 'TP') {
                            toast.success(`✓ TP Hit ${pnlStr}`, { duration: 3000, style: { background: '#0a1628', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', fontSize: '0.8rem', fontWeight: 700 } });
                        } else {
                            toast.error(`✗ SL Hit ${pnlStr}`, { duration: 3000, style: { background: '#0a1628', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.8rem', fontWeight: 700 } });
                        }
                    });
                } else {
                    openPositionsRef.current = remaining;
                    setOpenPositions(remaining);
                }
            }

            if (next >= master.length) {
                clearReplayIntervalFn();
                setStatus('done');
                // Replay bitti � ANALYSIS ad�m�na ge�
                setTradeLog(prev => {
                    const m = calcAutopsyMetrics(prev);
                    setTimeout(() => { setAutopsyMetrics(m); setStep('ANALYSIS'); }, 400);
                    return prev;
                });
            }
        }, SPEED_MS[spd]);
    };

    // All replay + trade handlers wrapped in useCallback with refs for zero-dep stability
    const handlePlay  = useCallback(() => {
        if (statusRef.current === 'done' || nextIndexRef.current >= masterDataRef.current.length) return;
        clearReplayIntervalFn();
        setStatus('playing');
        startInterval(speedRef.current);
    }, []); // eslint-disable-line

    const handlePause = useCallback(() => { clearReplayIntervalFn(); setStatus('paused'); }, []);

    const handleReset = useCallback(() => {
        clearReplayIntervalFn();
        nextIndexRef.current = INIT_COUNT;
        setCurrentIndex(INIT_COUNT);
        setStatus('idle');
        chartRef.current?.resetCandles(masterDataRef.current.slice(0, INIT_COUNT));
        chartRef.current?.removePriceLines();
        openPositionsRef.current = [];
        setOpenPositions([]);
        setSl(''); setTp('');
    }, []);

    const handleFinish = useCallback(() => {
        clearReplayIntervalFn();
        setStatus('paused');
        const m = calcAutopsyMetrics(tradeLogRef.current);
        setAutopsyMetrics(m);
        setStep('ANALYSIS');
    }, []);

    const handleNewSim = useCallback(() => {
        setAutopsyMetrics(null);
        clearReplayIntervalFn();
        nextIndexRef.current = INIT_COUNT;
        setCurrentIndex(INIT_COUNT);
        setStatus('idle');
        chartRef.current?.resetCandles(masterDataRef.current.slice(0, INIT_COUNT));
        chartRef.current?.removePriceLines();
        openPositionsRef.current = [];
        setOpenPositions([]);
        setSl(''); setTp('');
        setTradeLog([]);
        tradeIdRef.current = 0;
        setAccountBalance(virtualBalanceRef.current);
        setStep('SETUP');
    }, []);

    const handleSpeedChange = useCallback((newSpeed) => {
        setSpeed(newSpeed);
        if (statusRef.current === 'playing') { clearReplayIntervalFn(); startInterval(newSpeed); }
    }, []); // eslint-disable-line

    // Progress bar seek — belirli bir muma atla (handleStepBack ile aynı mantık)
    const handleSeek = useCallback((targetIndex) => {
        clearReplayIntervalFn();
        const master  = masterDataRef.current;
        const target  = Math.max(INIT_COUNT, Math.min(targetIndex, master.length));
        openPositionsRef.current = [];
        setOpenPositions([]);
        chartRef.current?.resetCandles(master.slice(0, INIT_COUNT));
        chartRef.current?.removePriceLines();
        for (let i = INIT_COUNT; i < target; i++) {
            chartRef.current?.appendCandle(master[i]);
        }
        nextIndexRef.current = target;
        setCurrentIndex(target);
        const lastCandle = master[target - 1];
        if (lastCandle) {
            setLivePrice(lastCandle.close);
            setEntryPrice(String(lastCandle.close));
        }
        setStatus('paused');
    }, []); // eslint-disable-line

    const handleOpenTrade = useCallback(() => {
        const entry = livePriceRef.current || parseFloat(entryPriceRef.current);
        const s  = slRef.current  !== '' ? parseFloat(slRef.current)  : null;
        const p  = tpRef.current  !== '' ? parseFloat(tpRef.current)  : null;
        const sz = parseFloat(sizeRef.current);
        if (!entry || isNaN(entry) || isNaN(sz) || sz <= 0) return;
        if (s !== null && isNaN(s)) return;
        if (p !== null && isNaN(p)) return;
        if (sz > accountBalanceRef.current) return;
        const id  = ++tradeIdRef.current;
        const pos = { id, direction: directionRef.current, entry, sl: s, tp: p, size: sz, pnl: 0 };
        openPositionsRef.current = [...openPositionsRef.current, pos];
        setOpenPositions(prev => [...prev, pos]);
        setAccountBalance(prev => { accountBalanceRef.current = prev - sz; return prev - sz; });
        chartRef.current?.addPriceLine({ price: entry, color: THEME.neonUp, title: 'E#' + id });
        if (s !== null) chartRef.current?.addPriceLine({ price: s, color: THEME.neonDown, title: 'SL#' + id });
        if (p !== null) chartRef.current?.addPriceLine({ price: p, color: THEME.neonGold, title: 'TP#' + id });
    }, []);

    const handleClosePosition = useCallback((posId) => {
        const pos = openPositionsRef.current.find(p => p.id === posId);
        if (!pos) return;
        const idx    = nextIndexRef.current - 1;
        const master = masterDataRef.current;
        const exit   = (idx >= 0 && master[idx]) ? master[idx].close : pos.entry;
        const pnl    = pos.direction === 'LONG'
            ? (exit - pos.entry) / pos.entry * pos.size
            : (pos.entry - exit) / pos.entry * pos.size;
        const rec      = { id: pos.id, type: 'MANUAL', direction: pos.direction, entry: pos.entry, exit, pnl, size: pos.size };
        const remaining = openPositionsRef.current.filter(p => p.id !== posId);
        openPositionsRef.current = remaining;
        setOpenPositions(remaining);
        setTradeLog(prev => [...prev, rec]);
        setAccountBalance(prev => { accountBalanceRef.current = prev + pos.size + pnl; return prev + pos.size + pnl; });
        chartRef.current?.removePriceLines();
        remaining.forEach(p => {
            chartRef.current?.addPriceLine({ price: p.entry, color: THEME.neonUp, title: 'E#' + p.id });
            if (p.sl !== null) chartRef.current?.addPriceLine({ price: p.sl, color: THEME.neonDown, title: 'SL#' + p.id });
            if (p.tp !== null) chartRef.current?.addPriceLine({ price: p.tp, color: THEME.neonGold, title: 'TP#' + p.id });
        });
    }, []);

    // Tüm açık pozisyonları market fiyatından kapat
    const handleCloseAll = useCallback(() => {
        const positions = openPositionsRef.current;
        if (positions.length === 0) return;
        const idx  = nextIndexRef.current - 1;
        const exit = (idx >= 0 && masterDataRef.current[idx]) ? masterDataRef.current[idx].close : null;
        if (!exit) return;
        const recs = positions.map(pos => {
            const pnl = pos.direction === 'LONG'
                ? (exit - pos.entry) / pos.entry * pos.size
                : (pos.entry - exit) / pos.entry * pos.size;
            return { id: pos.id, type: 'MANUAL', direction: pos.direction, entry: pos.entry, exit, pnl, size: pos.size };
        });
        openPositionsRef.current = [];
        setOpenPositions([]);
        setTradeLog(prev => [...prev, ...recs]);
        const totalSize = recs.reduce((s, r) => s + r.size, 0);
        const totalPnl  = recs.reduce((s, r) => s + r.pnl, 0);
        setAccountBalance(prev => { accountBalanceRef.current = prev + totalSize + totalPnl; return prev + totalSize + totalPnl; });
        chartRef.current?.removePriceLines();
    }, []);

    // Manuel: N mum ileri (interval başlatmadan)
    const handleStepForward = useCallback((n = 1) => {
        if (statusRef.current === 'playing') return;
        clearReplayIntervalFn();
        const master = masterDataRef.current;
        for (let i = 0; i < n; i++) {
            const idx = nextIndexRef.current;
            if (idx >= master.length) { setStatus('done'); return; }
            const candle = master[idx];
            chartRef.current?.appendCandle(candle);
            nextIndexRef.current = idx + 1;
            setLivePrice(candle.close);
            const positions = openPositionsRef.current;
            if (positions.length > 0) {
                const closedRecs = [];
                const remaining  = [];
                for (const pos of positions) {
                    let triggered = null;
                    if (pos.direction === 'LONG') {
                        if      (pos.tp !== null && candle.high >= pos.tp) triggered = { type: 'TP', exit: pos.tp };
                        else if (pos.sl !== null && candle.low  <= pos.sl) triggered = { type: 'SL', exit: pos.sl };
                    } else {
                        if      (pos.tp !== null && candle.low  <= pos.tp) triggered = { type: 'TP', exit: pos.tp };
                        else if (pos.sl !== null && candle.high >= pos.sl) triggered = { type: 'SL', exit: pos.sl };
                    }
                    if (triggered) {
                        const pnl = pos.direction === 'LONG'
                            ? (triggered.exit - pos.entry) / pos.entry * pos.size
                            : (pos.entry - triggered.exit) / pos.entry * pos.size;
                        closedRecs.push({ id: pos.id, type: triggered.type, direction: pos.direction, entry: pos.entry, exit: triggered.exit, pnl, size: pos.size });
                    } else {
                        const pnl = pos.direction === 'LONG'
                            ? (candle.close - pos.entry) / pos.entry * pos.size
                            : (pos.entry - candle.close) / pos.entry * pos.size;
                        remaining.push({ ...pos, pnl });
                    }
                }
                if (closedRecs.length > 0) {
                    openPositionsRef.current = remaining;
                    setOpenPositions(remaining);
                    setTradeLog(prev => [...prev, ...closedRecs]);
                    const totalRealized = closedRecs.reduce((s, r) => s + r.pnl, 0);
                    const totalSize     = closedRecs.reduce((s, r) => s + r.size, 0);
                    setAccountBalance(prev => prev + totalSize + totalRealized);
                    chartRef.current?.removePriceLines();
                    remaining.forEach(p => {
                        chartRef.current?.addPriceLine({ price: p.entry, color: THEME.neonUp, title: 'E#' + p.id });
                        if (p.sl !== null) chartRef.current?.addPriceLine({ price: p.sl, color: THEME.neonDown, title: 'SL#' + p.id });
                        if (p.tp !== null) chartRef.current?.addPriceLine({ price: p.tp, color: THEME.neonGold, title: 'TP#' + p.id });
                    });
                    closedRecs.forEach(rec => {
                        const pnlStr = (rec.pnl >= 0 ? '+' : '') + '$' + Math.abs(rec.pnl).toFixed(2);
                        if (rec.type === 'TP') toast.success(`✓ TP Hit ${pnlStr}`, { duration: 3000, style: { background: '#0a1628', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', fontSize: '0.8rem', fontWeight: 700 } });
                        else                   toast.error(`✗ SL Hit ${pnlStr}`,  { duration: 3000, style: { background: '#0a1628', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.8rem', fontWeight: 700 } });
                    });
                } else {
                    openPositionsRef.current = remaining;
                    setOpenPositions(remaining);
                }
            }
        }
        setCurrentIndex(nextIndexRef.current);
        setStatus('paused');
    }, []); // eslint-disable-line

    // Manuel: N mum geri (chart sıfırla + sessizce replay)
    const handleStepBack = useCallback((n = 1) => {
        if (statusRef.current === 'playing') return;
        clearReplayIntervalFn();
        const master = masterDataRef.current;
        const target = Math.max(INIT_COUNT, nextIndexRef.current - n);
        openPositionsRef.current = [];
        setOpenPositions([]);
        chartRef.current?.resetCandles(master.slice(0, INIT_COUNT));
        chartRef.current?.removePriceLines();
        for (let i = INIT_COUNT; i < target; i++) {
            chartRef.current?.appendCandle(master[i]);
        }
        nextIndexRef.current = target;
        setCurrentIndex(target);
        const lastCandle = master[target - 1];
        if (lastCandle) {
            setLivePrice(lastCandle.close);
            setEntryPrice(String(lastCandle.close));
        }
        setStatus('paused');
    }, []); // eslint-disable-line

    // Entry otomatik doldur
    useEffect(() => {
        if (status === 'paused' || status === 'idle') {
            const lastClose = masterDataRef.current[currentIndex - 1]?.close;
            if (lastClose) setEntryPrice(String(lastClose));
        }
    }, [status, currentIndex]);

    useEffect(() => () => clearReplayIntervalFn(), []);

    // ⌨️  Global klavye kısayolları
    useEffect(() => {
        const handler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === '?') { setShowShortcuts(v => !v); return; }
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    statusRef.current === 'playing' ? handlePause() : handlePlay();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleStepForward(e.shiftKey ? 10 : 1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handleStepBack(e.shiftKey ? 10 : 1);
                    break;
                case 'l': case 'L':
                    directionRef.current = 'LONG';
                    setDirection('LONG');
                    handleOpenTrade();
                    break;
                case 's': case 'S':
                    directionRef.current = 'SHORT';
                    setDirection('SHORT');
                    handleOpenTrade();
                    break;
                case 'c': case 'C':
                    handleCloseAll();
                    break;
                case 'Escape':
                    handlePause();
                    break;
                default: break;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handlePlay, handlePause, handleStepForward, handleStepBack, handleOpenTrade, handleCloseAll]); // eslint-disable-line

    injectCSS();

    // useMemo: heavy derived values — recompute only when dependencies change
    const equityMemo = useMemo(
        () => accountBalance + openPositions.reduce((s, p) => s + p.size + (p.pnl || 0), 0),
        [accountBalance, openPositions]
    );

    // �� STATE MACHINE RENDER ����������������������������������������������
    if (step === 'SETUP') {
        return <SetupForm onStart={handleSetupStart} t={t} />;
    }

    if (step === 'ANALYSIS') {
        return (
            <BacktestResult
                symbol={symbol}
                tf={tf}
                tradeLog={tradeLog}
                virtualBalance={virtualBalance}
                onNewSim={handleNewSim}
                onBackToLobby={handleNewSim}
            />
        );
    }

    // �� REPLAY VIEW �������������������������������������������������������
    return (
        <>
            <Toaster
                position="top-right"
                toastOptions={{ style: { background: 'transparent', boxShadow: 'none', padding: 0 } }}
            />
            {showAssetWarn && <AssetChangeWarningModal onConfirm={confirmAssetChange} onCancel={cancelAssetChange} t={t} />}

            {/* ⌨️  Kısayol overlay */}
            <button
                onClick={() => setShowShortcuts(v => !v)}
                title="Klavye kısayolları (?)"
                style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9998, width: 32, height: 32, borderRadius: 8, border: `1px solid ${showShortcuts ? 'rgba(34,211,238,0.5)' : '#2a3040'}`, background: showShortcuts ? 'rgba(34,211,238,0.12)' : '#0d1117', color: showShortcuts ? '#22d3ee' : '#94a3b8', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.15s', outline: 'none' }}
            >
                ?
            </button>
            {showShortcuts && (
                <div style={{ position: 'fixed', bottom: 60, right: 20, zIndex: 9997, background: '#0d1117', border: '1px solid #2a3040', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#94a3b8', minWidth: 230, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                    <div style={{ fontWeight: 800, color: '#e2e8f0', marginBottom: 10, fontSize: 13 }}>Klavye Kısayolları</div>
                    {[
                        ['Space',    'Play / Pause'],
                        ['→',        '1 Mum İleri'],
                        ['←',        '1 Mum Geri'],
                        ['Shift+→', '10 Mum İleri'],
                        ['Shift+←', '10 Mum Geri'],
                        ['L',        'Long Aç'],
                        ['S',        'Short Aç'],
                        ['C',        'Tümünü Kapat'],
                        ['Escape',   'Durdur (Pause)'],
                        ['?',        'Bu Paneli Aç/Kapat'],
                    ].map(([key, desc]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '3px 0' }}>
                            <kbd style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid #2a3040', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontFamily: 'monospace', color: '#e2e8f0', whiteSpace: 'nowrap', flexShrink: 0 }}>{key}</kbd>
                            <span>{desc}</span>
                        </div>
                    ))}
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: THEME.bg, borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 24px 80px rgba(0,0,0,0.6)' }}>

                {/* BA�LIK */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', flexShrink: 0, borderBottom: `1px solid ${THEME.border}`, background: 'rgba(10,14,23,0.85)', backdropFilter: 'blur(20px)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FlaskConical size={16} color={THEME.neonCyan} />
                    </div>
                    <span style={{ fontWeight: 900, fontSize: '0.9rem', color: 'white', letterSpacing: '0.04em' }}>{t('backtest.lab.title')}</span>
                    <span style={{ padding: '2px 9px', borderRadius: 5, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', fontSize: '0.6rem', fontWeight: 700, color: THEME.neonCyan, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {t('backtest.lab.replayBadge')}
                    </span>
                    {/* Sanal bakiye */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, background: 'rgba(0,255,157,0.07)', border: '1px solid rgba(0,255,157,0.15)' }}>
                        <span style={{ fontSize: '0.58rem', color: THEME.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('backtest.lab.balanceLabel')}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: accountBalance >= virtualBalance ? THEME.neonUp : THEME.neonDown, fontVariantNumeric: 'tabular-nums' }}>${accountBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    {(status === 'paused' || status === 'done' || (status === 'idle' && tradeLog.length > 0)) && (
                        <button onClick={handleFinish} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '7px 15px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${THEME.neonGold}44`, background: 'rgba(251,191,36,0.1)', color: THEME.neonGold, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                            <Trophy size={13} />{t('backtest.lab.autopsyFinish')}
                        </button>
                    )}
                    <button onClick={() => setStep('SETUP')}
                        style={{ marginLeft: (status === 'paused' || status === 'done' || (status === 'idle' && tradeLog.length > 0)) ? 8 : 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid rgba(255,255,255,0.07)`, background: 'rgba(255,255,255,0.03)', color: THEME.textMuted, fontSize: '0.68rem', fontWeight: 700, transition: '0.15s' }}>
                        � {t('backtest.lab.backToSetup')}
                    </button>
                </div>

                {/* ASSET PICKER */}
                <AssetPicker
                    symbol={symbol} tf={tf}
                    setTf={handleTfChange}
                    onAssetSelect={handleAssetSelect}
                    livePrice={livePrice}
                    priceChange={priceChange}
                    t={t}
                />

                {/* G�VDE */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

                    {/* Sol: Grafik %75 */}
                    <div style={{ flex: 3, position: 'relative', background: 'linear-gradient(160deg, rgba(5,10,18,0.98) 0%, rgba(5,8,16,0.99) 100%)', borderRight: `1px solid ${THEME.border}`, overflow: 'hidden', paddingBottom: 46 }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(0,255,157,0.25),rgba(34,211,238,0.15),transparent)', pointerEvents: 'none', zIndex: 1 }} />
                        {/* ── Drawing Overlay ── */}
                        <ChartDrawingOverlay
                            activeTool={activeTool}
                            registerClear={fn => { clearDrawingsRef.current = fn; }}
                            lwChartRef={chartRef}
                        />
                        {/* ── Drawing Toolbar ── */}
                        <DrawingToolbar
                            activeTool={activeTool}
                            onToolChange={setActiveTool}
                            onClearAll={() => clearDrawingsRef.current?.()}
                        />
                        {/* �� SL/TP ekran flash (Ad�m 6 � animasyon) �� */}
                        <AnimatePresence>
                            {screenFlash && (
                                <motion.div
                                    key={screenFlash}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 1, 1, 0] }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.7, times: [0, 0.15, 0.6, 1] }}
                                    style={{
                                        position: 'absolute', inset: 0, zIndex: 22,
                                        pointerEvents: 'none',
                                        background: screenFlash === 'tp'
                                            ? 'radial-gradient(circle at 50% 50%, rgba(0,255,157,0.18) 0%, transparent 75%)'
                                            : 'radial-gradient(circle at 50% 50%, rgba(255,51,102,0.18) 0%, transparent 75%)',
                                    }}
                                />
                            )}
                        </AnimatePresence>
                        {showDemoBanner && (
                            <DemoBanner onDismiss={() => setShowDemoBanner(false)} t={t} />
                        )}
                        {dataLoading && <LoadingSkeleton t={t} />}
                        {dataError && !dataLoading && (
                            <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,8,16,0.94)', backdropFilter: 'blur(12px)', gap: 14 }}>
                                <AlertTriangle size={32} color={THEME.neonDown} style={{ filter: `drop-shadow(0 0 12px ${THEME.neonDown}66)` }} />
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: THEME.neonDown }}>
                                    {{
                                        'forex-unsupported': t('backtest.lab.errorForex'),
                                        'asset-type-unsupported': t('backtest.lab.errorAssetType'),
                                        'insufficient-data': t('backtest.lab.errorInsufficientData'),
                                    }[dataError] || t('backtest.lab.errorGeneric')}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: THEME.textMuted, fontWeight: 600, maxWidth: 280, textAlign: 'center' }}>
                                    {'forex-unsupported' === dataError
                                        ? t('backtest.lab.errorForexHint')
                                        : t('backtest.lab.errorGenericHint')}
                                </div>
                                <button onClick={() => loadData(symbol, tf)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${THEME.neonCyan}44`, background: 'rgba(34,211,238,0.1)', color: THEME.neonCyan, fontSize: '0.76rem', fontWeight: 800 }}>
                                    <RefreshCw size={13} /> {t('backtest.lab.retry')}
                                </button>
                            </div>
                        )}
                        <LWChart ref={chartRef} initialCandles={masterDataRef.current.slice(0, INIT_COUNT)} onLoadMore={handleLoadMore} />

                        {/* ── AI Sentinel Trigger ── */}
                        <button
                            onClick={() => triggerManualScan()}
                            title={t('backtest.lab.aiScanTitle')}
                            style={{
                                position: 'absolute', bottom: 56, right: 14,
                                zIndex: 30,
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '7px 12px',
                                borderRadius: 10,
                                border: '1px solid rgba(34,211,238,0.22)',
                                background: 'rgba(5,8,16,0.82)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                color: '#22d3ee',
                                fontSize: '0.64rem', fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                cursor: 'pointer',
                                boxShadow: '0 0 14px rgba(34,211,238,0.12)',
                                transition: 'box-shadow 0.2s, border-color 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 22px rgba(34,211,238,0.3)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 14px rgba(34,211,238,0.12)'; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.22)'; }}
                        >
                            <ScanLine size={13} />
                            {t('backtest.lab.aiScan')}
                        </button>

                        <ReplayBar
                            status={status} currentIndex={currentIndex}
                            total={masterDataRef.current.length} speed={speed}
                            onPlay={handlePlay} onPause={handlePause}
                            onReset={handleReset} onSpeedChange={handleSpeedChange}
                            onStepBack={handleStepBack} onStepForward={handleStepForward}
                            onSeek={handleSeek}
                            masterData={masterDataRef.current}
                            t={t}
                        />
                    </div>

                    {/* Sa�: ��lem Paneli %25 */}
                    <div style={{ flex: 1, minWidth: 220, maxWidth: 280, overflow: 'hidden' }}>
                        <TradePanel
                            status={status}
                            openPositions={openPositions}
                            tradeLog={tradeLog}
                            direction={direction} size={size}
                            entryPrice={entryPrice} sl={sl} tp={tp}
                            setDirection={setDirection} setSize={setSize}
                            setEntryPrice={setEntryPrice} setSl={setSl} setTp={setTp}
                            onOpen={handleOpenTrade}
                            onClosePosition={handleClosePosition}
                            accountBalance={accountBalance}
                            freeMargin={accountBalance}
                            equity={equityMemo}
                            currentPrice={livePrice}
                            symbol={symbol}
                            t={t}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};


// ── Coming Soon Overlay ───────────────────────────────────────────────────
// Backtest modülü askıya alındı. Kod korundu; overlay gizliyor.
const BacktestComingSoon = ({ children }) => (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100vh' }}>
        {/* Gerçek içerik — blur ile gizlendi, kod sağlam */}
        <div style={{ filter: 'blur(7px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.6 }}>
            {children}
        </div>

        {/* Overlay */}
        <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5,8,16,0.72)',
            backdropFilter: 'blur(2px)',
        }}>
            {/* Badge */}
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#22d3ee',
                background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)',
                padding: '5px 14px', borderRadius: 20, marginBottom: 24,
            }}>
                🔬 Advanced Simulation
            </div>

            {/* Rocket + title */}
            <div style={{ fontSize: '3.2rem', marginBottom: 16, lineHeight: 1 }}>🚀</div>
            <h2 style={{
                fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em',
                color: '#f1f5f9', textAlign: 'center', marginBottom: 10, lineHeight: 1.15,
            }}>
                ADVANCED SIMULATION
            </h2>
            <div style={{
                fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.22em',
                textTransform: 'uppercase',
                background: 'linear-gradient(90deg, #22d3ee 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 20,
            }}>
                COMING SOON
            </div>
            <p style={{
                fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)',
                textAlign: 'center', maxWidth: 360, lineHeight: 1.6, marginBottom: 28,
            }}>
                Continuous buffering replay motoru, AI otopsi ve kurumsal strateji testi Pro katmana
                dahil olarak hazırlanıyor.
            </p>

            {/* Neon divider */}
            <div style={{ width: 64, height: 2, borderRadius: 2, marginBottom: 22,
                background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)' }} />

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {['Infinite Replay', 'AI Otopsi', 'Stres Testi', 'Strateji Skoru'].map((f) => (
                    <span key={f} style={{
                        fontSize: '0.68rem', fontWeight: 600, padding: '4px 11px',
                        borderRadius: 12, color: 'rgba(255,255,255,0.5)',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    }}>{f}</span>
                ))}
            </div>
        </div>
    </div>
);

// ── Simülasyon Router ─────────────────────────────────────────────────────
// activeSession === null → SimulationLobby
// activeSession !== null → ReplayRoom
const BacktestLabRouter = () => {
    const [activeSession, setActiveSession] = useState(null);
    const inner = !activeSession
        ? <SimulationLobby onStart={setActiveSession} />
        : <ReplayRoom session={activeSession} onEnd={() => setActiveSession(null)} />;
    return <BacktestComingSoon>{inner}</BacktestComingSoon>;
};

export default BacktestLabRouter;
