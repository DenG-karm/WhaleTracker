import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Radio, Activity, ArrowRight, Zap, Globe, Landmark, Target,
    TrendingUp, TrendingDown, Plus, X, Search,
    Bookmark, Star, ShieldAlert, Eye, EyeOff
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ToastContext } from '../contexts/AuthContext';
import { ZenValue } from '../contexts/ZenContext';
import { useMultiMarketPrices } from '../hooks/useMultiMarketPrices';
import { useTranslation } from 'react-i18next';
import { updateDashboardContext, clearDashboardContext } from '../utils/dashboardContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

// ─── Renk sabitleri ────────────────────────────────────────────────────────
const C = {
    sell:    '#ef4444',
    buy:     '#10b981',
    cash:    '#f97316',
    ins_buy: '#3b82f6',
    neutral: '#64748b',
    cyan:    '#22d3ee',
    purple:  '#8b5cf6',
};

// ─── Mock veri havuzu ──────────────────────────────────────────────────────
const EXCHANGES     = ['Binance', 'Coinbase', 'OKX', 'Kraken', 'Bybit', 'Huobi', 'NYSE', 'NASDAQ', 'CME', 'ICE'];
const COLD_WALLETS  = ['Unknown Wallet', 'Whale #4821', 'Whale #0x7f3a', 'Cold Storage', 'Whale #2209', 'Whale #0xab3c'];
const INSTITUTIONS  = ['BlackRock', 'Fidelity', 'Jump Trading', 'Grayscale', 'Galaxy Digital', 'Pantera Capital',
    'Goldman Sachs', 'Morgan Stanley', 'Citadel', 'JPMorgan', 'Vanguard', 'Point72'];

const MOCK_SCENARIOS = [
    { token: 'BTC',   amtMin: 50,       amtMax: 800,       intent: 'sell',    chain: 'Bitcoin',   from: 'cold',      to: 'exchange'    },
    { token: 'ETH',   amtMin: 500,      amtMax: 12000,     intent: 'buy',     chain: 'Ethereum',  from: 'exchange',  to: 'cold'        },
    { token: 'SOL',   amtMin: 5000,     amtMax: 150000,    intent: 'sell',    chain: 'Solana',    from: 'cold',      to: 'exchange'    },
    { token: 'BTC',   amtMin: 100,      amtMax: 500,       intent: 'ins_buy', chain: 'Bitcoin',   from: 'exchange',  to: 'institution' },
    { token: 'ETH',   amtMin: 1000,     amtMax: 30000,     intent: 'sell',    chain: 'Ethereum',  from: 'cold',      to: 'exchange'    },
    { token: 'USDT',  amtMin: 5000000,  amtMax: 80000000,  intent: 'cash',    chain: 'Tron',      from: 'exchange',  to: 'cold'        },
    { token: 'XRP',   amtMin: 500000,   amtMax: 8000000,   intent: 'sell',    chain: 'Ripple',    from: 'cold',      to: 'exchange'    },
    { token: 'BNB',   amtMin: 2000,     amtMax: 40000,     intent: 'buy',     chain: 'BNB Chain', from: 'exchange',  to: 'cold'        },
    { token: 'AVAX',  amtMin: 10000,    amtMax: 200000,    intent: 'buy',     chain: 'Avalanche', from: 'exchange',  to: 'cold'        },
    { token: 'BTC',   amtMin: 200,      amtMax: 1000,      intent: 'ins_buy', chain: 'Bitcoin',   from: 'exchange',  to: 'institution' },
    { token: 'DOGE',  amtMin: 1000000,  amtMax: 50000000,  intent: 'sell',    chain: 'Dogecoin',  from: 'cold',      to: 'exchange'    },
    { token: 'MATIC', amtMin: 500000,   amtMax: 10000000,  intent: 'buy',     chain: 'Polygon',   from: 'exchange',  to: 'cold'        },
    { token: 'LINK',  amtMin: 50000,    amtMax: 800000,    intent: 'sell',    chain: 'Ethereum',  from: 'cold',      to: 'exchange'    },
    { token: 'ETH',   amtMin: 2000,     amtMax: 8000,      intent: 'ins_buy', chain: 'Ethereum',  from: 'exchange',  to: 'institution' },
    { token: 'USDC',  amtMin: 10000000, amtMax: 100000000, intent: 'cash',    chain: 'Ethereum',  from: 'cold',      to: 'exchange'    },
    { token: 'SOL',   amtMin: 20000,    amtMax: 300000,    intent: 'buy',     chain: 'Solana',    from: 'exchange',  to: 'cold'        },
    { token: 'ADA',   amtMin: 1000000,  amtMax: 20000000,  intent: 'sell',    chain: 'Cardano',   from: 'cold',      to: 'exchange'    },
    { token: 'BTC',   amtMin: 30,       amtMax: 200,       intent: 'buy',     chain: 'Bitcoin',   from: 'exchange',  to: 'cold'        },
    // ── Geleneksel Piyasalar (Hisse / Emtia / FX) ────────────────────────────
    { token: 'XAUUSD', amtMin: 500,     amtMax: 8000,      intent: 'ins_buy', chain: 'CME Futures', from: 'institution', to: 'exchange'  },
    { token: 'XAUUSD', amtMin: 400,     amtMax: 6000,      intent: 'sell',    chain: 'CME Futures', from: 'exchange',    to: 'institution'},
    { token: 'NVDA',   amtMin: 5000,    amtMax: 200000,    intent: 'ins_buy', chain: 'NASDAQ',      from: 'exchange',    to: 'institution'},
    { token: 'NVDIA',  amtMin: 5000,    amtMax: 200000,    intent: 'ins_buy', chain: 'NASDAQ',      from: 'exchange',    to: 'institution'},
    { token: 'NVDA',   amtMin: 3000,    amtMax: 100000,    intent: 'sell',    chain: 'NASDAQ',      from: 'institution', to: 'exchange'  },
    { token: 'EURUSD', amtMin: 2000000, amtMax: 80000000,  intent: 'buy',     chain: 'FX / OTC',    from: 'institution', to: 'exchange'  },
    { token: 'EURUSD', amtMin: 5000000, amtMax: 100000000, intent: 'sell',    chain: 'FX / OTC',    from: 'exchange',    to: 'institution'},
    { token: 'SPY',    amtMin: 50000,   amtMax: 2000000,   intent: 'ins_buy', chain: 'NYSE',        from: 'exchange',    to: 'institution'},
    { token: 'SPY',    amtMin: 30000,   amtMax: 1000000,   intent: 'sell',    chain: 'NYSE',        from: 'institution', to: 'exchange'  },
];

const PRICES = {
    BTC: 68000, ETH: 3200, SOL: 180, XRP: 0.55, BNB: 580,
    AVAX: 38,   DOGE: 0.17, MATIC: 0.9, LINK: 17, ADA: 0.47,
    USDT: 1,    USDC: 1,    DAI: 1,    BUSD: 1,
    // Hisse / Emtia / FX
    XAUUSD: 2350, NVDA: 870, NVDIA: 870, SPY: 520,
    EURUSD: 1.08, GBPUSD: 1.27, USDJPY: 156,
};

const INTENT_CFG = {
    sell:    { color: '#ef4444', emoji: '🚨' },
    buy:     { color: '#10b981', emoji: '🟢' },
    cash:    { color: '#f97316', emoji: '💰' },
    ins_buy: { color: '#3b82f6', emoji: '🏛️' },
    neutral: { color: '#64748b', emoji: '⚪' },
};

function generateMockAlert() {
    const sc  = MOCK_SCENARIOS[Math.floor(Math.random() * MOCK_SCENARIOS.length)];
    const amt = Math.floor(sc.amtMin + Math.random() * (sc.amtMax - sc.amtMin));
    const usd = Math.round(amt * (PRICES[sc.token] || 1) * (0.95 + Math.random() * 0.1));
    const ex  = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const resolveLabel = (src) =>
        src === 'exchange' ? ex :
        src === 'institution' ? pick(INSTITUTIONS) :
        pick(COLD_WALLETS);
    const cfg = INTENT_CFG[sc.intent];
    return {
        id:         Math.random().toString(36).slice(2, 10),
        token:      sc.token,
        amount:     amt,
        usd_value:  usd,
        from_label: resolveLabel(sc.from),
        to_label:   resolveLabel(sc.to),
        chain:      sc.chain,
        timestamp:  new Date().toISOString(),
        intent:     sc.intent,
        color:      cfg.color,
        emoji:      cfg.emoji,
    };
}

// ─── Sembol yardımcıları ───────────────────────────────────────────────────
const _CRYPTO_BASES = new Set(['BTC','ETH','BNB','SOL','ADA','DOT','AVAX','LINK',
    'DOGE','XRP','LTC','MATIC','UNI','ATOM','NEAR','FTM']);
const _CRYPTO_SFXS  = ['USDT','BTC','ETH','BNB','BUSD','USDC','DAI','SOL'];
const _BIST_SET     = new Set(['AKBNK','GARAN','HALKB','ISCTR','VAKBN','YKBNK','KCHOL',
    'SAHOL','SISE','TCELL','TOASO','THYAO','ARCLK','ASELS','BIMAS','EKGYO','ENKAI',
    'EREGL','FROTO','MGROS','PETKM','PGSUS','KOZAL','SASA']);

const detectExchange = (sym) => {
    const s = sym.toUpperCase().trim();
    if (s.endsWith('.IS')) return 'bist';
    if (_CRYPTO_SFXS.some(sfx => s.endsWith(sfx))) return 'crypto';
    if (_CRYPTO_BASES.has(s)) return 'crypto';
    if (_BIST_SET.has(s)) return 'bist';
    return 'us';
};
const detectAssetType  = (s) => detectExchange(s) === 'crypto' ? 'crypto' : 'stock';
const normalizeSymbol  = (s) => { const u = s.toUpperCase().trim(); return detectExchange(u) === 'bist' && !u.endsWith('.IS') ? u + '.IS' : u; };
const toDisplaySymbol  = (s) => s.endsWith('.IS') ? s.slice(0, -3) : s;
const toCurrencySymbol = (c) => ({ TRY: '₺', EUR: '€', GBP: '£' }[c] || '$');
const fmtUsd = (v) =>
    v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` :
    v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` :
    v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toLocaleString()}`;

// ─── UI parçaları ──────────────────────────────────────────────────────────
const GlassCard = ({ children, style = {}, glow }) => (
    <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 20,
        boxShadow: glow
            ? `0 0 32px ${glow}18, inset 0 1px 0 rgba(255,255,255,0.05)`
            : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        ...style,
    }}>
        {children}
    </div>
);

const MetricCard = ({ label, value, color, icon: Icon, sub }) => (
    <GlassCard glow={color} style={{ padding: '20px 22px', borderTop: `2px solid ${color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span data-wf-label style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>
                {label}
            </span>
            <div style={{ padding: 7, borderRadius: 10, background: color + '18', color }}>
                <Icon size={16} />
            </div>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {value}
        </div>
        {sub && <div data-wf-sub style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.28)', marginTop: 7 }}>{sub}</div>}
    </GlassCard>
);

const IntentBadge = ({ intent }) => {
    const { t } = useTranslation();
    const cfg = INTENT_CFG[intent] || INTENT_CFG.neutral;
    return (
        <span style={{
            padding: '3px 10px', borderRadius: 6, fontSize: '0.61rem', fontWeight: 900,
            letterSpacing: '0.08em', background: cfg.color + '18', color: cfg.color,
        }}>
            {t(`whaleFeed.intent.${intent}`, t('whaleFeed.intent.neutral'))}
        </span>
    );
};

const WatchlistChip = ({ symbol, assetType, price, onRemove, isActive }) => {
    const displaySym   = toDisplaySymbol(symbol);
    const isBist       = symbol.endsWith('.IS');
    const exColor      = assetType === 'crypto' ? '#3b82f6' : isBist ? '#E30A17' : '#10b981';
    const exLabel      = assetType === 'crypto' ? 'BINANCE' : isBist ? 'BIST' : 'US';
    const hasPrice     = price && !price.error;
    const clr          = price?.isUp ? '#10b981' : '#ef4444';
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            background: isActive ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.05)',
            borderTop: `1px solid ${isActive ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRight: `1px solid ${isActive ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderBottom: `1px solid ${isActive ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderLeft: `2px solid ${exColor}`, borderRadius: 20,
            fontSize: '0.78rem', fontWeight: 800,
            color: isActive ? '#22d3ee' : 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(8px)', transition: '0.15s',
        }}>
            <span style={{ fontSize: '0.56rem', fontWeight: 900, padding: '1px 5px', borderRadius: 4, background: exColor + '22', color: exColor }}>
                {exLabel}
            </span>
            <Star size={9} fill={isActive ? '#22d3ee' : 'transparent'} color={isActive ? '#22d3ee' : 'rgba(255,255,255,0.3)'} />
            {displaySym}
            {hasPrice && (
                <span style={{ fontSize: '0.67rem', fontWeight: 700, color: clr }}>
                    {price.isUp ? '▲' : '▼'}{Math.abs(parseFloat(price.change)).toFixed(2)}%
                </span>
            )}
            <button
                onClick={() => onRemove(symbol)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.3)', transition: '0.15s' }}
                onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; }}
                onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
            >
                <X size={11} />
            </button>
        </div>
    );
};

// ─── Mobil WhaleFeed ──────────────────────────────────────────────────────
const MobileWhaleFeed = () => {
    const { t }     = useTranslation();
    const navigate  = useNavigate();
    const isMounted = useRef(true);

    const [alerts, setAlerts]         = useState([]);
    const [newIds, setNewIds]         = useState(new Set());
    const [totalIn, setTotalIn]       = useState(0);
    const [totalOut, setTotalOut]     = useState(0);
    const [txCount, setTxCount]       = useState(0);
    const [sentiment, setSentiment]   = useState(65);
    const [filterIntent, setFilterIntent] = useState('all');
    const mockRef = useRef(null);
    const wsRef   = useRef(null);

    const pushAlert = useCallback((alert) => {
        if (!isMounted.current) return;
        setAlerts(prev => [alert, ...prev].slice(0, 80));
        setNewIds(prev => new Set([...prev, alert.id]));
        setTimeout(() => {
            if (isMounted.current) setNewIds(p => { const s = new Set(p); s.delete(alert.id); return s; });
        }, 1200);
        if (alert.intent === 'sell' || alert.intent === 'cash') setTotalIn(p => p + alert.usd_value);
        else setTotalOut(p => p + alert.usd_value);
        setTxCount(p => p + 1);
        setSentiment(prev => {
            const d = (alert.intent === 'buy' || alert.intent === 'ins_buy') ? 2 : -2;
            return Math.max(10, Math.min(90, prev + d));
        });
    }, []);

    const refreshAlerts = useCallback(() => {
        const newAlerts = Array.from({ length: 5 }, generateMockAlert);
        newAlerts.forEach(a => pushAlert(a));
    }, [pushAlert]);

    const { isPulling, pullY, isRefreshing } = usePullToRefresh(refreshAlerts, 65);

    useEffect(() => {
        isMounted.current = true;
        const init = Array.from({ length: 10 }, generateMockAlert);
        let initIn = 0, initOut = 0;
        init.forEach(a => {
            if (a.intent === 'sell' || a.intent === 'cash') initIn += a.usd_value;
            else initOut += a.usd_value;
        });
        setAlerts(init);
        setTotalIn(initIn); setTotalOut(initOut); setTxCount(10);
        const schedule = () => {
            const delay = 3500 + Math.random() * 2500;
            mockRef.current = setTimeout(() => {
                if (!isMounted.current) return;
                pushAlert(generateMockAlert());
                schedule();
            }, delay);
        };
        schedule();
        return () => { isMounted.current = false; clearTimeout(mockRef.current); };
    }, [pushAlert]);

    /* Gerçek WebSocket */
    useEffect(() => {
        const WS_URL = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
            + '//' + window.location.hostname + ':8000/ws/whale-alerts';
        let reconnectTimer;
        const connect = () => {
            if (!isMounted.current) return;
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;
            ws.onmessage = (e) => {
                try {
                    const tr = JSON.parse(e.data);
                    const from = tr.from_label || ''; const to = tr.to_label || '';
                    const EXS = ['Binance','Coinbase','Kraken','OKX'];
                    let intent = 'neutral';
                    if (['USDT','USDC','DAI','BUSD'].includes(tr.token)) intent = 'cash';
                    else if (EXS.some(x => to.includes(x))) intent = 'sell';
                    else if (EXS.some(x => from.includes(x))) intent = 'buy';
                    else if (to.includes('BlackRock') || to.includes('Grayscale')) intent = 'ins_buy';
                    const cfg = INTENT_CFG[intent];
                    pushAlert({ id: tr.id || Math.random().toString(36).slice(2), token: tr.token, amount: tr.amount, usd_value: tr.usd_value || 0, from_label: from, to_label: to, chain: tr.chain || 'Ethereum', timestamp: tr.timestamp || new Date().toISOString(), intent, color: cfg.color, emoji: cfg.emoji });
                } catch {}
            };
            ws.onclose = () => { reconnectTimer = setTimeout(connect, 8000); };
        };
        connect();
        return () => { clearTimeout(reconnectTimer); if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); } };
    }, [pushAlert]);

    const filtered = useMemo(() => {
        if (filterIntent === 'all') return alerts;
        return alerts.filter(a => a.intent === filterIntent);
    }, [alerts, filterIntent]);

    const netPct = totalIn + totalOut === 0 ? 50 : Math.round((totalOut / (totalIn + totalOut)) * 100);
    const sentColor = sentiment > 60 ? C.buy : sentiment < 40 ? C.sell : C.cash;

    const INTENT_FILTERS = [
        { id: 'all',     label: t('whaleFeed.filterAll', 'Tümü') },
        { id: 'buy',     label: '🟢 Buy'  },
        { id: 'sell',    label: '🔴 Sell' },
        { id: 'ins_buy', label: '🏛️ Kurumsal' },
        { id: 'cash',    label: '💰 Stablecoin' },
    ];

    return (
        <div style={{ paddingBottom: 16 }}>
            {/* Pull-to-refresh indicator */}
            {(isPulling || isRefreshing) && (
                <div style={{
                    height: Math.min(pullY * 0.6, 40),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#00dbe7', fontSize: '0.75rem', fontWeight: 700,
                    overflow: 'hidden', transition: isRefreshing ? 'none' : '0.1s',
                }}>
                    {isRefreshing ? '🔄 Yenileniyor...' : '↓ Çekerek yenile'}
                </div>
            )}

            {/* Header */}
            <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Radio size={18} color="#22d3ee" />
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>{t('nav.whaleFeed')}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: '0.6rem', fontWeight: 900, color: C.buy }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.buy, display: 'inline-block', animation: 'mwfPulse 1.8s infinite' }} />
                        LIVE
                    </span>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#22d3ee' }}>{txCount} tx</span>
            </div>

            {/* Mini metrikler */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 10px' }}>
                <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.58rem', color: '#546268', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Exchange Girişi</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: C.sell }}>{fmtUsd(totalIn)}</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.58rem', color: '#546268', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Cold Wallet Çıkışı</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: C.buy }}>{fmtUsd(totalOut)}</div>
                </div>
            </div>

            {/* Sentiment bar */}
            <div style={{ padding: '0 12px 12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#546268', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Market Sentiment</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: sentColor }}>{sentiment}/100</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'flex' }}>
                        <div style={{ width: `${100 - netPct}%`, background: 'linear-gradient(90deg,#ef4444,#f97316)', transition: '0.8s ease' }} />
                        <div style={{ flex: 1, background: 'linear-gradient(90deg,#059669,#10b981)', transition: '0.8s ease' }} />
                    </div>
                </div>
            </div>

            {/* Intent filtreler */}
            <div style={{
                display: 'flex', gap: 6, padding: '0 12px 10px',
                overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
            }}>
                {INTENT_FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilterIntent(f.id)}
                        style={{
                            flexShrink: 0, padding: '6px 12px', borderRadius: 20, border: 'none',
                            background: filterIntent === f.id ? 'rgba(0,219,231,0.15)' : 'rgba(255,255,255,0.05)',
                            color: filterIntent === f.id ? '#00dbe7' : '#546268',
                            fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                            border: filterIntent === f.id ? '1px solid rgba(0,219,231,0.3)' : '1px solid rgba(255,255,255,0.07)',
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Feed listesi */}
            <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map((alert, i) => {
                    const isNew = newIds.has(alert.id);
                    const cfg = INTENT_CFG[alert.intent] || INTENT_CFG.neutral;
                    const ago = (() => {
                        const m = Math.floor((Date.now() - new Date(alert.timestamp)) / 60000);
                        if (m < 1) return 'Şimdi';
                        if (m < 60) return `${m}dk`;
                        return `${Math.floor(m / 60)}s`;
                    })();
                    return (
                        <div
                            key={alert.id}
                            style={{
                                background: isNew ? `${cfg.color}0c` : 'rgba(255,255,255,0.025)',
                                border: `1px solid ${isNew ? cfg.color + '30' : 'rgba(255,255,255,0.06)'}`,
                                borderLeft: `3px solid ${cfg.color}`,
                                borderRadius: 14, padding: '12px 14px',
                                transition: 'all 0.4s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <span style={{ fontSize: '1rem' }}>{alert.emoji}</span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 900, color: 'white' }}>{alert.token}</span>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, padding: '2px 7px', borderRadius: 6, background: cfg.color + '18', color: cfg.color }}>
                                        {t(`whaleFeed.intent.${alert.intent}`, alert.intent.toUpperCase())}
                                    </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'white' }}>{fmtUsd(alert.usd_value)}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#546268' }}>{ago}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#546268' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '42%' }}>{alert.from_label}</span>
                                <span style={{ color: cfg.color, flexShrink: 0 }}>→</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '42%' }}>{alert.to_label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                <span style={{ fontSize: '0.65rem', color: '#546268' }}>{alert.chain} · {Number(alert.amount).toLocaleString()} {alert.token}</span>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#546268' }}>
                        <Radio size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Sinyal bekleniyor...</p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes mwfPulse {
                    0%,100% { opacity:1; transform:scale(1); }
                    50%      { opacity:.4; transform:scale(1.4); }
                }
            `}</style>
        </div>
    );
};

// ─── Ana Bileşen ───────────────────────────────────────────────────────────
const WhaleFeed = () => {
    const isMobile = useIsMobile();
    const { t } = useTranslation();
    const navigate  = useNavigate();
    const showToast = useContext(ToastContext);

    // Feed state
    const [allAlerts, setAllAlerts] = useState([]);
    const [newIds,    setNewIds]    = useState(new Set());
    const [filterByWl, setFilterByWl] = useState(false);

    // Sayaçlar
    const [totalIn,   setTotalIn]   = useState(0);
    const [totalOut,  setTotalOut]  = useState(0);
    const [txCount,   setTxCount]   = useState(0);
    const [sentiment, setSentiment] = useState(65);

    const [activeSymbol, setActiveSymbol] = useState(null);

    // Sembol değiştiğinde dashboard context'i güncelle
    useEffect(() => {
        if (!activeSymbol) { clearDashboardContext(); return; }
        const isForex = /^[A-Z]{6}$/.test(activeSymbol.symbol);
        const isStock = activeSymbol.assetType === 'stock';
        const type    = isForex ? 'FOREX' : isStock ? 'STOCK' : 'CRYPTO';
        updateDashboardContext(type, {
            symbol:  activeSymbol.symbol,
            inflow:  null,
            outflow: null,
        });
    }, [activeSymbol]);

    const feedRef      = useRef(null);
    const wsRef        = useRef(null);
    const mockRef      = useRef(null);
    const isMounted    = useRef(true);

    // Watchlist
    const LS_KEY = 'wt_watchlist_v1';
    const [watchlist, setWatchlist] = useState(() => {
        try { const s = localStorage.getItem(LS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
    });
    const [wlInput,   setWlInput]   = useState('');
    const [wlLoading, setWlLoading] = useState(false);

    useEffect(() => {
        try { localStorage.setItem(LS_KEY, JSON.stringify(watchlist)); } catch {}
    }, [watchlist]);

    useEffect(() => {
        apiClient('/watchlist', { method: 'GET' })
            .then(d => { if (Array.isArray(d) && isMounted.current) setWatchlist(d); })
            .catch(() => {});
    }, []);

    const { prices: livePrices } = useMultiMarketPrices(watchlist);

    const addToWatchlist = async () => {
        const sym = wlInput.trim().toUpperCase();
        if (!sym) return;
        const norm = normalizeSymbol(sym);
        if (watchlist.some(w => w.symbol === norm)) { showToast(t('whaleFeed.alreadyWatching', { sym }), 'warning'); setWlInput(''); return; }
        setWlLoading(true);
        try {
            const item = await apiClient('/watchlist', { method: 'POST', body: { symbol: sym, asset_type: detectAssetType(sym) } });
            if (isMounted.current) setWatchlist(prev => [...prev, item]);
            setWlInput('');
        } catch (err) { showToast(err.message || t('whaleFeed.addFailed'), 'error'); }
        setWlLoading(false);
    };

    const removeFromWatchlist = async (symbol) => {
        // Optimistic: hemen UI'dan kaldır
        if (isMounted.current) setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
        try {
            await apiClient(`/watchlist/${symbol}`, { method: 'DELETE' });
        } catch (err) {
            // 404 = zaten DB'de yok, sessizce geç
            if (!err.message?.toLowerCase().includes('not found')) {
                showToast(err.message || t('whaleFeed.removeFailed'), 'error');
            }
        }
    };

    // Alert ekle (mock + WS paylaşır)
    const pushAlert = useCallback((alert) => {
        if (!isMounted.current) return;
        setAllAlerts(prev => [alert, ...prev].slice(0, 120));
        setNewIds(prev => new Set([...prev, alert.id]));
        setTimeout(() => {
            if (isMounted.current) setNewIds(p => { const s = new Set(p); s.delete(alert.id); return s; });
        }, 1400);
        if (alert.intent === 'sell' || alert.intent === 'cash') setTotalIn(p => p + alert.usd_value);
        else if (alert.intent === 'buy' || alert.intent === 'ins_buy') setTotalOut(p => p + alert.usd_value);
        setTxCount(p => p + 1);
        setSentiment(prev => {
            const d = (alert.intent === 'buy' || alert.intent === 'ins_buy') ? 2 : -2;
            return Math.max(10, Math.min(90, prev + d));
        });
    }, []);

    // Mock simülasyon motoru
    useEffect(() => {
        isMounted.current = true;
        // İlk 7 kaydı anında doldur
        const init = Array.from({ length: 7 }, generateMockAlert);
        let initIn = 0, initOut = 0;
        init.forEach(a => {
            if (a.intent === 'sell' || a.intent === 'cash') initIn  += a.usd_value;
            else if (a.intent === 'buy' || a.intent === 'ins_buy') initOut += a.usd_value;
        });
        setAllAlerts(init);
        setTotalIn(initIn);
        setTotalOut(initOut);
        setTxCount(7);

        const schedule = () => {
            const delay = 3000 + Math.random() * 2000;
            mockRef.current = setTimeout(() => {
                if (!isMounted.current) return;
                pushAlert(generateMockAlert());
                schedule();
            }, delay);
        };
        schedule();

        return () => {
            isMounted.current = false;
            clearTimeout(mockRef.current);
        };
    }, [pushAlert]);

    // Gerçek WebSocket (opsiyonel)
    useEffect(() => {
        const WS_URL = (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
            + '//' + window.location.hostname + ':8000/ws/whale-alerts';
        let reconnectTimer;
        const connect = () => {
            if (!isMounted.current) return;
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;
            ws.onmessage = (event) => {
                try {
                    const tr = JSON.parse(event.data);
                    const fromL = tr.from_label || '';
                    const toL   = tr.to_label   || '';
                    const EXS   = ['Binance','Coinbase','Kraken','OKX','NYSE','NASDAQ','CME','ICE'];
                    const INS   = ['BlackRock','Grayscale','Goldman','Fidelity','Citadel','JPMorgan','Morgan Stanley','Vanguard','Point72'];
                    // Backend intent'i varsa kullan, yoksa heuristik uygula
                    let intent = tr.intent || 'neutral';
                    if (!tr.intent) {
                        if (['USDT','USDC','DAI','BUSD'].includes(tr.token)) intent = 'cash';
                        else if (EXS.some(e => toL.includes(e)))             intent = 'sell';
                        else if (EXS.some(e => fromL.includes(e)))           intent = 'buy';
                        else if (INS.some(i => toL.includes(i)))             intent = 'ins_buy';
                    }
                    const cfg = INTENT_CFG[intent];
                    pushAlert({
                        id: tr.id || Math.random().toString(36).slice(2),
                        token: tr.token, amount: tr.amount, usd_value: tr.usd_value || 0,
                        from_label: fromL, to_label: toL,
                        chain: tr.chain || 'Ethereum',
                        timestamp: tr.timestamp || new Date().toISOString(),
                        intent, color: cfg.color, emoji: cfg.emoji,
                    });
                } catch {}
            };
            ws.onclose = () => { reconnectTimer = setTimeout(connect, 8000); };
            ws.onerror = () => {
                // Tarayıcı hatadan sonra otomatik kapatır; onclose reconnect'i tetikler.
            };
        };
        connect();
        return () => {
            clearTimeout(reconnectTimer);
            if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
        };
    }, [pushAlert]);

    // ─── Sembol alias kümeleri (filtre için) ──────────────────────────────────
    const SP500_ALIASES = useMemo(() => new Set(['SPY','SPX','SP500','SPX500','S&P500','S&P 500','^GSPC','ES=F']), []);
    const NVDA_ALIASES  = useMemo(() => new Set(['NVDA','NVDIA','NVIDIA']), []);

    // Filtreleme
    const displayAlerts = useMemo(() => {
        if (!filterByWl || watchlist.length === 0) return allAlerts;
        return allAlerts.filter(a => {
            const aTok = a.token;
            return watchlist.some(w => {
                const wSym = w.symbol.replace('.IS', '');
                if (wSym === aTok) return true;
                if (SP500_ALIASES.has(wSym) && SP500_ALIASES.has(aTok)) return true;
                if (NVDA_ALIASES.has(wSym)  && NVDA_ALIASES.has(aTok))  return true;
                return false;
            });
        });
    }, [allAlerts, watchlist, filterByWl, SP500_ALIASES, NVDA_ALIASES]);

    const netPct = totalIn + totalOut === 0 ? 50 : Math.round((totalOut / (totalIn + totalOut)) * 100);
    const sentColor = sentiment > 60 ? C.buy : sentiment < 40 ? C.sell : C.cash;
    const sentLabel = sentiment > 60 ? t('whaleFeed.sentimBullish') : sentiment < 40 ? t('whaleFeed.sentimPanic') : t('whaleFeed.sentimNeutral');

    const handleTradeNow = (token, intent) => {
        const dir = (intent === 'sell' || intent === 'cash') ? 'SELL' : 'BUY';
        navigate('/entry', { state: { symbol: `${token}USDT`, defaultSide: dir } });
    };

    // ── Render ─────────────────────────────────────────────────────────────
    if (isMobile) return <MobileWhaleFeed />;
    return (
        <div className="wf-root fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

            {/* ══ HEADER ══════════════════════════════════════════════════ */}
            <GlassCard style={{ padding: '28px 32px', borderBottom: `2px solid ${C.cyan}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -120, top: -120, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                            <Radio size={28} color={C.cyan} />
                            <h1 id="wf-page-title" style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
                                {t('nav.whaleFeed')}
                            </h1>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.7rem', fontWeight: 900, color: C.buy, letterSpacing: '0.1em' }}>
                                <span className="wf-pulse-dot" />
                                <span id="wf-status-badge">LIVE ON-CHAIN</span>
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.86rem', color: 'rgba(255,255,255,0.3)' }}>
                            {t('whaleFeed.pageHeaderSub')}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: C.cyan, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                            {txCount.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', marginTop: 2, fontWeight: 700, letterSpacing: '0.08em' }}>{t('whaleFeed.txPerSession')}</div>
                    </div>
                </div>

                {/* Metrik kartlar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 24 }}>
                    <div data-wf-metric="inflow">
                        <MetricCard
                            label={t('whaleFeed.inFlowMetric')}
                            value={<ZenValue value={fmtUsd(totalIn)} />}
                            color={C.sell} icon={TrendingDown}
                            sub={t('whaleFeed.inFlowSub')}
                        />
                    </div>
                    <div data-wf-metric="outflow">
                        <MetricCard
                            label={t('whaleFeed.outFlowMetric')}
                            value={<ZenValue value={fmtUsd(totalOut)} />}
                            color={C.buy} icon={TrendingUp}
                            sub={t('whaleFeed.outFlowSub')}
                        />
                    </div>
                    <div data-wf-metric="pressure">
                    <GlassCard style={{ padding: '20px 22px' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
                            <span data-wf-label>{t('whaleFeed.netPressure')}</span>
                        </div>
                        <div style={{ height: 10, borderRadius: 10, overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{ width: (100 - netPct) + '%', background: 'linear-gradient(90deg,#ef4444,#f97316)', transition: 'width 1s ease', borderRadius: '10px 0 0 10px' }} />
                            <div style={{ width: netPct + '%', background: 'linear-gradient(90deg,#059669,#10b981)', transition: 'width 1s ease', borderRadius: '0 10px 10px 0' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.71rem', fontWeight: 800 }}>
                            <span style={{ color: C.sell }}>🔴 {t('whaleFeed.bearPct', { pct: 100 - netPct })}</span>
                            <span style={{ color: C.buy }}>🟢 {t('whaleFeed.bullPct', { pct: netPct })}</span>
                        </div>
                    </GlassCard>
                    </div>
                    <div data-wf-metric="intel">
                        <MetricCard
                            label={t('whaleFeed.intelScore')}
                            value={sentiment + '/100'}
                            color={sentColor} icon={ShieldAlert}
                            sub={sentLabel}
                        />
                    </div>
                </div>
            </GlassCard>

            {/* ══ İZLEME LİSTESİ ══════════════════════════════════════════ */}
            <GlassCard style={{ padding: '18px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ padding: 8, borderRadius: 10, background: C.cyan + '12', color: C.cyan }}>
                            <Bookmark size={15} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{t('whaleFeed.radarWatchlist')}</div>
                            <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>
                                {watchlist.length > 0 ? t('whaleFeed.assetsWatching', { count: watchlist.length }) : t('whaleFeed.noAssetsAdded')}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setFilterByWl(f => !f)}
                        disabled={watchlist.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 20, border: `1px solid ${filterByWl ? C.cyan : 'rgba(255,255,255,0.1)'}`, background: filterByWl ? C.cyan + '12' : 'transparent', color: filterByWl ? C.cyan : 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '0.72rem', cursor: watchlist.length === 0 ? 'default' : 'pointer', opacity: watchlist.length === 0 ? 0.4 : 1, transition: '0.2s' }}
                    >
                        {filterByWl ? <Eye size={13} /> : <EyeOff size={13} />}
                        {filterByWl ? t('whaleFeed.filterActiveBtn') : t('whaleFeed.filterBtn')}
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {watchlist.map(w => (
                        <span
                            key={w.id || w.symbol}
                            onClick={() => setActiveSymbol(prev =>
                                prev?.symbol === w.symbol ? null : { symbol: w.symbol, assetType: w.asset_type || 'crypto' }
                            )}
                            style={{ cursor: 'pointer' }}
                        >
                            <WatchlistChip symbol={w.symbol} assetType={w.asset_type || 'crypto'}
                                price={livePrices[w.symbol]} onRemove={removeFromWatchlist} isActive={filterByWl} />
                        </span>
                    ))}
                    {watchlist.length === 0 && (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
                            {t('whaleFeed.addSymbolHint')}
                        </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>
                        <Search size={13} color="rgba(255,255,255,0.25)" style={{ marginLeft: 12 }} />
                        <input
                            placeholder={t('whaleFeed.addPlaceholder')}
                            value={wlInput}
                            onChange={e => setWlInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addToWatchlist()}
                            style={{ background: 'none', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.78rem', padding: '8px 10px', outline: 'none', width: 140 }}
                        />
                        <button
                            onClick={addToWatchlist}
                            disabled={wlLoading || !wlInput.trim()}
                            style={{ background: wlInput.trim() ? C.cyan : C.cyan + '20', border: 'none', color: wlInput.trim() ? '#050810' : C.cyan + '60', padding: '8px 14px', fontWeight: 900, fontSize: '0.72rem', cursor: wlInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 5, transition: '0.15s' }}
                        >
                            <Plus size={13} /> {t('whaleFeed.add')}
                        </button>
                    </div>
                    {wlInput.trim().length >= 2 && (() => {
                        const ex = detectExchange(wlInput.trim().toUpperCase());
                        const color = ex === 'crypto' ? '#3b82f6' : ex === 'bist' ? '#E30A17' : C.buy;
                        const label = ex === 'crypto' ? t('whaleFeed.detectCrypto') : ex === 'bist' ? t('whaleFeed.detectBist') : t('whaleFeed.detectUs');
                        return <span key="hint" style={{ fontSize: '0.65rem', fontWeight: 700, color, marginLeft: 4 }}>{label}</span>;
                    })()}
                </div>

                {/* Canlı fiyat şeridi */}
                {watchlist.length > 0 && Object.keys(livePrices).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {watchlist.map(w => {
                            const p = livePrices[w.symbol];
                            if (!p || p.error) return null;
                            const clr      = p.isUp ? C.buy : C.sell;
                            const dec      = p.price < 10 ? 4 : 2;
                            const curr     = toCurrencySymbol(p.currency);
                            const isBist   = w.symbol.endsWith('.IS');
                            const srcColor = w.asset_type === 'crypto' ? '#3b82f6' : isBist ? '#E30A17' : C.buy;
                            const srcLabel = w.asset_type === 'crypto' ? 'BINANCE' : isBist ? 'BIST' : 'US';
                            return (
                                <div key={w.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.25)', borderTop: `1px solid ${clr}25`, borderRight: `1px solid ${clr}25`, borderBottom: `1px solid ${clr}25`, borderLeft: `2px solid ${clr}`, fontSize: '0.78rem' }}>
                                    <span style={{ fontWeight: 900 }}>{toDisplaySymbol(w.symbol)}</span>
                                    <ZenValue value={`${curr}${parseFloat(p.price).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })}`} style={{ fontWeight: 800, color: clr }} />
                                    <span style={{ fontWeight: 700, color: clr }}>{parseFloat(p.change) >= 0 ? '+' : ''}{parseFloat(p.change).toFixed(2)}%</span>
                                    <span style={{ fontSize: '0.56rem', fontWeight: 900, padding: '1px 5px', borderRadius: 4, background: srcColor + '20', color: srcColor }}>{srcLabel}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </GlassCard>

            {/* ══ ANA SPLIT ════════════════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: '58% 1fr', gap: 20, alignItems: 'start' }}>

                {/* ─ Canlı Feed ─────────────────────────────────────────── */}
                <GlassCard style={{ display: 'flex', flexDirection: 'column', maxHeight: 780, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Activity size={18} color={C.cyan} />
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {t('whaleFeed.feedTitle')}
                                    {filterByWl && watchlist.length > 0 && (
                                        <span style={{ fontSize: '0.58rem', padding: '2px 8px', background: C.cyan + '15', color: C.cyan, borderRadius: 8, fontWeight: 900 }}>{t('whaleFeed.filteredBadge')}</span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
                                    {t('whaleFeed.feedSignalCount', { count: displayAlerts.length })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                        {displayAlerts.length === 0 ? (
                            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>📡</div>
                                <div style={{ fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{t('whaleFeed.radarStarting')}</div>
                            </div>
                        ) : (
                            displayAlerts.map((alert) => {
                                const isNew = newIds.has(alert.id);
                                return (
                                    <div key={alert.id} className={isNew ? 'wf-flash' : 'wf-item'} style={{
                                        marginBottom: 10, padding: '14px 18px',
                                        background: isNew
                                            ? `linear-gradient(90deg, ${alert.color}18, rgba(255,255,255,0.03))`
                                            : `linear-gradient(90deg, ${alert.color}08, transparent)`,
                                        borderTop: `1px solid ${alert.color}${isNew ? '55' : '22'}`,
                                        borderRight: `1px solid ${alert.color}${isNew ? '55' : '22'}`,
                                        borderBottom: `1px solid ${alert.color}${isNew ? '55' : '22'}`,
                                        borderLeft: `4px solid ${alert.color}`,
                                        borderRadius: 14,
                                        boxShadow: isNew ? `0 0 20px ${alert.color}1a` : 'none',
                                        transition: 'background 0.8s, border-color 0.8s, box-shadow 0.8s',
                                    }}>
                                        {/* Üst satır */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '1rem' }}>{alert.emoji || '⚪'}</span>
                                                <IntentBadge intent={alert.intent} />
                                                <span style={{ fontSize: '0.61rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
                                                    {new Date(alert.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleTradeNow(alert.token, alert.intent)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.28)', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', transition: '0.15s' }}
                                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.28)'; }}
                                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; }}
                                            >
                                                <Zap size={12} /> {t('whaleFeed.tradeBtn')}
                                            </button>
                                        </div>
                                        {/* Miktar */}
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                                            <span style={{ fontSize: '1.55rem', fontWeight: 900, color: 'white', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                                                {alert.amount.toLocaleString()}
                                            </span>
                                            <span style={{ fontSize: '1rem', fontWeight: 900, color: alert.color }}>{alert.token}</span>
                                            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>
                                                ≈ <ZenValue value={fmtUsd(alert.usd_value)} />
                                            </span>
                                        </div>
                                        {/* Akış */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', flexWrap: 'wrap' }}>
                                            <span style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{alert.from_label}</span>
                                            <ArrowRight size={14} color={alert.color} />
                                            <span style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{alert.to_label}</span>
                                            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.64rem', color: 'rgba(255,255,255,0.25)', padding: '3px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                                                <Globe size={10} /> {alert.chain}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </GlassCard>

                {/* ─ Sağ Panel ──────────────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Son Büyük Transferler */}
                    <GlassCard style={{ padding: 22 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                            <div style={{ padding: 8, borderRadius: 10, background: C.purple + '15', color: C.purple }}>
                                <Landmark size={16} />
                            </div>
                            <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{t('whaleFeed.largeTransfersTitle')}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{t('whaleFeed.largeTransfersSub')}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {allAlerts.filter(a => a.usd_value > 1_000_000).slice(0, 5).map((a, i) => (
                                <div key={a.id || i} className={newIds.has(a.id) ? 'wf-flash' : ''} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 16px',
                                    background: a.color + '0a',
                                    borderTop: `1px solid ${a.color}20`, borderRight: `1px solid ${a.color}20`,
                                    borderBottom: `1px solid ${a.color}20`, borderLeft: `3px solid ${a.color}`,
                                    borderRadius: 12, gap: 8,
                                    boxShadow: newIds.has(a.id) ? `0 0 14px ${a.color}22` : 'none',
                                    transition: 'all 0.8s ease',
                                }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {a.emoji} {a.from_label}
                                        </div>
                                        <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>→ {a.to_label} · {a.chain}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontWeight: 900, fontSize: '0.85rem', color: a.color, fontVariantNumeric: 'tabular-nums' }}>
                                            <ZenValue value={fmtUsd(a.usd_value)} />
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{a.token}</div>
                                    </div>
                                </div>
                            ))}
                            {allAlerts.filter(a => a.usd_value > 1_000_000).length === 0 && (
                                <div style={{ padding: '22px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem' }}>
                                    {t('whaleFeed.largeTransfersEmpty')}
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Akıllı Para Özeti */}
                    <GlassCard style={{ padding: 22 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                            <div style={{ padding: 8, borderRadius: 10, background: C.cyan + '10', color: C.cyan }}>
                                <Target size={16} />
                            </div>
                            <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{t('whaleFeed.smartMoneySummary')}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{t('whaleFeed.sessionStats')}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            {[
                                { labelKey: 'whaleFeed.sellTx',          value: allAlerts.filter(a => a.intent === 'sell').length,    color: C.sell    },
                                { labelKey: 'whaleFeed.buyTx',           value: allAlerts.filter(a => a.intent === 'buy').length,     color: C.buy     },
                                { labelKey: 'whaleFeed.institutionalLabel', value: allAlerts.filter(a => a.intent === 'ins_buy').length, color: C.ins_buy },
                                { labelKey: 'whaleFeed.stablecoinLabel', value: allAlerts.filter(a => a.intent === 'cash').length,    color: C.cash    },
                            ].map(({ labelKey, value, color }) => (
                                <div key={labelKey} style={{ padding: '10px 14px', background: color + '0a', border: `1px solid ${color}20`, borderRadius: 10, textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                                    <div style={{ fontSize: '0.61rem', color: 'rgba(255,255,255,0.32)', marginTop: 2, fontWeight: 700 }}>{t(labelKey)}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {allAlerts.slice(0, 4).map((a, i) => (
                                <div key={a.id || i} style={{ fontSize: '0.74rem', padding: '9px 12px', background: a.color + '08', borderRadius: 8, borderLeft: `2px solid ${a.color}`, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                                    <span style={{ fontWeight: 900, color: a.color }}>{a.emoji} </span>
                                    <span style={{ fontWeight: 800 }}>{a.amount.toLocaleString()} {a.token}</span>
                                    {' '}{a.intent === 'sell' ? t('whaleFeed.intentSellAction') : a.intent === 'buy' ? t('whaleFeed.intentBuyAction') : a.intent === 'ins_buy' ? t('whaleFeed.intentInsBuyAction') : t('whaleFeed.intentDefaultAction')}
                                    <span style={{ color: 'rgba(255,255,255,0.3)' }}> — {a.from_label}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* ── CSS ─────────────────────────────────────────────────── */}
            <style>{`
                .wf-pulse-dot {
                    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
                    background: #10b981; box-shadow: 0 0 6px #10b981;
                    animation: wfPulse 1.8s ease-in-out infinite;
                }
                @keyframes wfPulse {
                    0%,100% { opacity:1; transform:scale(1); box-shadow:0 0 6px #10b981; }
                    50%      { opacity:.5; transform:scale(1.35); box-shadow:0 0 14px #10b981; }
                }
                .wf-flash { animation: wfFlashIn 1.2s ease forwards; }
                @keyframes wfFlashIn {
                    0%  { transform:translateY(-10px); opacity:0; }
                    20% { transform:translateY(0); opacity:1; }
                    100%{ transform:translateY(0); opacity:1; }
                }
                .wf-item { animation: wfSlide .3s ease forwards; }
                @keyframes wfSlide {
                    from { opacity:.6; transform:translateX(-4px); }
                    to   { opacity:1; transform:translateX(0); }
                }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.16); }
            `}</style>
        </div>
    );
};

export default WhaleFeed;