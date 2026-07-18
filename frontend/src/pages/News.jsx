import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Globe, Zap, Radio, Clock, Flame, ShieldCheck,
    ChevronDown,
    TrendingUp, BarChart3, DollarSign, Coins,
    Filter, Star, TrendingDown, Minus, Activity,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { EconomicCalendar } from "react-ts-tradingview-widgets";
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

// ─── Sabitler ────────────────────────────────────────────────────────────────

const SENTIMENT_CFG = {
    Bullish: { color: '#4edea3', bg: 'rgba(78,222,163,0.1)',  border: 'rgba(78,222,163,0.25)', label: '▲ YÜKSELİŞ' },
    Bearish: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  label: '▼ DÜŞÜŞ' },
    Neutral: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', label: 'NÖTR' },
};

const CAT_COLOR = {
    Makro: '#00dbe7', Kripto: '#00dbe7', Hisse: '#eab308', Emtia: '#f97316',
};

const scoreColor = (s) => s >= 90 ? '#10b981' : s >= 50 ? '#eab308' : '#ef4444';

const relTime = (iso, t) => {
    const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (m < 1)  return t('news.justNow');
    if (m < 60) return `${m}${t('news.minutesAgoSuffix')}`;
    return `${Math.floor(m / 60)}${t('news.hoursAgoSuffix')}`;
};

// ─── Breaking News Banner ─────────────────────────────────────────────────────
const BreakingBanner = ({ items }) => {
    const { t } = useTranslation();
    if (!items?.length) return null;
    const text = items.map(i => `📌 ${i.title}`).join('        ·        ');
    return (
        <div style={{
            background: 'linear-gradient(90deg, #991b1b, #ef4444, #991b1b)',
            borderRadius: 12,
            padding: '0 0',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            height: 44,
            boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
            flexShrink: 0,
        }}>
            {/* Etiket */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0 18px', height: '100%',
                background: 'rgba(0,0,0,0.3)',
                borderRight: '1px solid rgba(255,255,255,0.15)',
                fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.1em',
                color: 'white', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
                <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: 'white',
                    display: 'inline-block', animation: 'nb-blink 1.1s infinite'
                }} />
                ⚠️ {t('news.breaking')}
            </div>
            {/* Scrolling text */}
            <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{
                    display: 'inline-block', whiteSpace: 'nowrap',
                    animation: 'nb-scroll 30s linear infinite',
                    fontSize: '0.82rem', fontWeight: 700,
                    color: 'rgba(255,255,255,0.95)',
                    paddingLeft: '100%',
                }}>
                    {text}&nbsp;&nbsp;&nbsp;&nbsp;{text}
                </div>
            </div>
        </div>
    );
};

// ─── Haber Kartı ─────────────────────────────────────────────────────────────
const NewsCard = ({ item }) => {
    const { t } = useTranslation();
    const sc = { ...(SENTIMENT_CFG[item.sentiment] || SENTIMENT_CFG.Neutral) };
    if (item.sentiment === 'Neutral') sc.label = t('news.sentiment.Neutral');
    const cc = CAT_COLOR[item.category] || '#64748b';
    const sC = scoreColor(item.ai_impact_score);

    return (
        <div style={{
            padding: '22px 24px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderLeft: `3px solid ${item.is_breaking ? '#ef4444' : cc}`,
            borderRadius: 14,
            display: 'flex', flexDirection: 'column', gap: 14,
            boxShadow: item.is_breaking
                ? '0 4px 20px rgba(239,68,68,0.1)'
                : '0 2px 12px rgba(0,0,0,0.15)',
        }}>
            {/* Meta + Etki Skoru */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {item.is_breaking && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 7,
                            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                            fontSize: '0.6rem', fontWeight: 900, color: '#ef4444', letterSpacing: '0.07em'
                        }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'nb-blink 1.1s infinite' }} />
                            {t('news.live')}
                        </span>
                    )}
                    <span style={{ padding: '3px 10px', background: `${cc}18`, border: `1px solid ${cc}30`, borderRadius: 7, fontSize: '0.63rem', fontWeight: 700, color: cc }}>
                        {t(`news.cat.${item.category}`, { defaultValue: item.category })}
                    </span>
                    <span style={{ fontSize: '0.69rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {relTime(item.published_at, t)}
                    </span>
                    <span style={{ fontSize: '0.69rem', color: 'var(--text-muted)' }}>· {item.source}</span>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px', borderRadius: 9, flexShrink: 0,
                    background: `${sC}14`, border: `1px solid ${sC}30`,
                }}>
                    <Flame size={13} color={sC} />
                    <span style={{ fontWeight: 900, fontSize: '0.88rem', color: sC }}>{item.ai_impact_score}</span>
                    <span style={{ fontSize: '0.6rem', color: sC, opacity: 0.6 }}>/100</span>
                </div>
            </div>

            {/* Başlık */}
            <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.5, color: 'white' }}>
                {item.title}
            </div>

            {/* AI Özet */}
            <div style={{
                padding: '12px 15px', borderRadius: 10,
                background: sc.bg, border: `1px solid ${sc.border}`,
                display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
                <ShieldCheck size={15} color={sc.color} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: sc.color, marginBottom: 4, letterSpacing: '0.06em' }}>
                        {t('news.aiAnalysisLabel')} {sc.label}
                    </div>
                    <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
                        {item.ai_summary}
                    </div>
                </div>
            </div>

            {/* Semboller */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {item.symbols.slice(0, 4).map(s => (
                    <span key={s} style={{
                        fontSize: '0.62rem', padding: '2px 7px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: 5, color: 'var(--text-muted)', fontWeight: 700,
                    }}>{s}</span>
                ))}
            </div>
        </div>
    );
};

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────
const FILTER_TABS = [
    { val: 'ALL',    labelKey: 'news.filterAll',    color: '#94a3b8', icon: <Globe size={12} /> },
    { val: 'CRYPTO', labelKey: 'news.filterCrypto', color: '#f59e0b', icon: <Coins size={12} /> },
    { val: 'STOCKS', labelKey: 'news.filterStocks', color: '#4edea3', icon: <TrendingUp size={12} /> },
    { val: 'MACRO',  labelKey: 'news.filterMacro',  color: '#00dbe7', icon: <BarChart3 size={12} /> },
    { val: 'FX',     labelKey: 'news.filterFX',     color: '#00dbe7', icon: <DollarSign size={12} /> },
];
// ─── Mobil News ──────────────────────────────────────────────────────────────
const MobileNews = () => {
    const { t, i18n } = useTranslation();
    const [feed, setFeed]               = useState(null);
    const [feedLoading, setFeedLoading] = useState(true);
    const [filterType, setFilterType]   = useState('ALL');
    const [filterSentiment, setFilterSentiment] = useState('ALL');
    const [showFilters, setShowFilters] = useState(false);

    const loadFeed = useCallback(async () => {
        setFeedLoading(true);
        try {
            const lang = i18n.language.startsWith('en') ? 'en' : 'tr';
            const qs   = filterType !== 'ALL' ? `?filter_type=${filterType}&lang=${lang}` : `?lang=${lang}`;
            const data = await apiClient(`/news/feed${qs}`, { method: 'GET' });
            setFeed(data);
        } catch {
            setFeed({ has_breaking: false, items: [] });
        }
        setFeedLoading(false);
    }, [filterType, i18n.language]);

    useEffect(() => { loadFeed(); }, [loadFeed]);

    const { isPulling, pullY, isRefreshing } = usePullToRefresh(loadFeed, 65);

    const displayItems  = feed?.items || [];
    const breakingItems = displayItems.filter(i => i.is_breaking);
    const filteredItems = displayItems.filter(item => {
        if (filterSentiment !== 'ALL' && item.sentiment !== filterSentiment) return false;
        return true;
    });

    const CAT_FILTERS = [
        { id: 'ALL',    label: t('news.filterAll', 'Tümü') },
        { id: 'Makro',  label: '🌍 Makro'  },
        { id: 'Kripto', label: '₿ Kripto'  },
        { id: 'Hisse',  label: '📈 Hisse'  },
        { id: 'Emtia',  label: '🛢️ Emtia'  },
    ];

    const SENT_FILTERS = [
        { id: 'ALL',     label: 'Tümü'   },
        { id: 'Bullish', label: '▲ Yükseliş' },
        { id: 'Neutral', label: '⏸ Nötr'    },
        { id: 'Bearish', label: '▼ Düşüş'   },
    ];

    return (
        <div style={{ paddingBottom: 16 }}>
            {/* Pull-to-refresh */}
            {(isPulling || isRefreshing) && (
                <div style={{
                    height: Math.min(pullY * 0.6, 40),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#00dbe7', fontSize: '0.75rem', fontWeight: 700,
                    overflow: 'hidden',
                }}>
                    {isRefreshing ? '🔄 Yenileniyor...' : '↓ Çekerek yenile'}
                </div>
            )}

            {/* Header */}
            <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe size={18} color="#22d3ee" />
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>{t('nav.news', 'Haberler')}</span>
                </div>
                <button
                    onClick={() => setShowFilters(v => !v)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 20, border: 'none',
                        background: showFilters ? 'rgba(0,219,231,0.15)' : 'rgba(255,255,255,0.06)',
                        color: showFilters ? '#00dbe7' : '#546268',
                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    <Filter size={13} /> Filtre
                </button>
            </div>

            {/* Breaking banner */}
            {breakingItems.length > 0 && (
                <div style={{ margin: '0 12px 10px', borderRadius: 10, overflow: 'hidden' }}>
                    <BreakingBanner items={breakingItems} />
                </div>
            )}

            {/* Filtre paneli */}
            {showFilters && (
                <div style={{ padding: '0 12px 10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#546268', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Kategori</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {CAT_FILTERS.map(f => (
                                <button key={f.id} onClick={() => setFilterType(f.id)} style={{
                                    padding: '5px 11px', borderRadius: 16, border: 'none', cursor: 'pointer',
                                    background: filterType === f.id ? 'rgba(0,219,231,0.15)' : 'rgba(255,255,255,0.05)',
                                    color: filterType === f.id ? '#00dbe7' : '#546268',
                                    fontSize: '0.72rem', fontWeight: 700,
                                    border: filterType === f.id ? '1px solid rgba(0,219,231,0.3)' : '1px solid rgba(255,255,255,0.07)',
                                }}>{f.label}</button>
                            ))}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#546268', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Sentiment</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {SENT_FILTERS.map(f => (
                                <button key={f.id} onClick={() => setFilterSentiment(f.id)} style={{
                                    padding: '5px 11px', borderRadius: 16, border: 'none', cursor: 'pointer',
                                    background: filterSentiment === f.id ? 'rgba(0,219,231,0.15)' : 'rgba(255,255,255,0.05)',
                                    color: filterSentiment === f.id ? '#00dbe7' : '#546268',
                                    fontSize: '0.72rem', fontWeight: 700,
                                    border: filterSentiment === f.id ? '1px solid rgba(0,219,231,0.3)' : '1px solid rgba(255,255,255,0.07)',
                                }}>{f.label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Kategori chip satırı */}
            <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                {CAT_FILTERS.map(f => (
                    <button key={f.id} onClick={() => setFilterType(f.id)} style={{
                        flexShrink: 0, padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                        background: filterType === f.id ? 'rgba(0,219,231,0.15)' : 'rgba(255,255,255,0.05)',
                        color: filterType === f.id ? '#00dbe7' : '#546268',
                        fontSize: '0.72rem', fontWeight: 700,
                        border: filterType === f.id ? '1px solid rgba(0,219,231,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    }}>{f.label}</button>
                ))}
            </div>

            {/* Haber listesi */}
            <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {feedLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{
                            height: 120, borderRadius: 12,
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'mnSkeleton 1.5s infinite',
                        }} />
                    ))
                ) : filteredItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#546268' }}>
                        <Globe size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Haber bulunamadı</p>
                    </div>
                ) : (
                    filteredItems.map((item, i) => {
                        const sc = SENTIMENT_CFG[item.sentiment] || SENTIMENT_CFG.Neutral;
                        const cc = CAT_COLOR[item.category] || '#64748b';
                        const sC = scoreColor(item.ai_impact_score);
                        const ago = relTime(item.published_at, t);
                        return (
                            <div key={item.id || i} style={{
                                background: item.is_breaking ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.025)',
                                border: `1px solid ${item.is_breaking ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
                                borderLeft: `3px solid ${item.is_breaking ? '#ef4444' : cc}`,
                                borderRadius: 14, padding: '14px',
                            }}>
                                {/* Meta satırı */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {item.is_breaking && (
                                            <span style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.58rem', fontWeight: 900, color: '#ef4444' }}>
                                                ● CANLI
                                            </span>
                                        )}
                                        <span style={{ padding: '2px 8px', background: `${cc}18`, border: `1px solid ${cc}30`, borderRadius: 6, fontSize: '0.62rem', fontWeight: 700, color: cc }}>
                                            {t(`news.cat.${item.category}`, { defaultValue: item.category })}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', color: '#546268' }}>{ago}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 8, background: `${sC}14`, border: `1px solid ${sC}28` }}>
                                        <Flame size={11} color={sC} />
                                        <span style={{ fontWeight: 900, fontSize: '0.8rem', color: sC }}>{item.ai_impact_score}</span>
                                    </div>
                                </div>
                                {/* Başlık */}
                                <div style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.5, color: 'white', marginBottom: 8 }}>
                                    {item.title}
                                </div>
                                {/* AI Özet */}
                                <div style={{ padding: '10px 12px', borderRadius: 9, background: sc.bg, border: `1px solid ${sc.border}`, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <ShieldCheck size={13} color={sc.color} style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div>
                                        <div style={{ fontSize: '0.58rem', fontWeight: 900, color: sc.color, marginBottom: 3, letterSpacing: '0.06em' }}>
                                            AI · {sc.label}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                                            {item.ai_summary}
                                        </div>
                                    </div>
                                </div>
                                {/* Semboller */}
                                {item.symbols?.length > 0 && (
                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                                        {item.symbols.slice(0, 4).map(s => (
                                            <span key={s} style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 5, color: '#546268', fontWeight: 700 }}>{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <style>{`
                @keyframes mnSkeleton {
                    0%,100% { background-position: 0% 50%; }
                    50%      { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
};

const News = () => {
    const isMobile = useIsMobile();
    const { t, i18n } = useTranslation();
    const [feed, setFeed]               = useState(null);
    const [feedLoading, setFeedLoading] = useState(true);
    const [filterType, setFilterType]   = useState('ALL');
    // ── Gelişmiş Filtreler ──────────────────────────────────────────
    const [filterSentiment, setFilterSentiment] = useState('ALL');
    const [filterImpact, setFilterImpact]       = useState('ALL');
    const [portfolioOnly, setPortfolioOnly]     = useState(false);
    const [watchlistSymbols, setWatchlistSymbols] = useState([]);

    // Watchlist sembollerini localStorage'dan yükle
    useEffect(() => {
        try {
            const raw = localStorage.getItem('wt_watchlist_v1');
            if (raw) {
                const parsed = JSON.parse(raw);
                const syms = Array.isArray(parsed)
                    ? parsed
                        .map(item => (typeof item === 'string' ? item : (item.symbol || item.pair || ''))
                            .replace(/USDT$/i, '').toUpperCase())
                        .filter(Boolean)
                    : [];
                setWatchlistSymbols(syms);
            }
        } catch { /* ignore */ }
    }, [portfolioOnly]);

    const skeletonStyle = {
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.8s infinite',
    };

    useEffect(() => {
        const load = async () => {
            setFeedLoading(true);
            try {
                const langParam = i18n.language.startsWith('en') ? 'en' : 'tr';
                const qs = filterType !== 'ALL'
                    ? `?filter_type=${filterType}&lang=${langParam}`
                    : `?lang=${langParam}`;
                const data = await apiClient(`/news/feed${qs}`, { method: 'GET' });
                setFeed(data);
            } catch {
                setFeed({ has_breaking: false, items: [] });
            }
            setFeedLoading(false);
        };
        load();
    }, [filterType, i18n.language]);

    const displayItems  = feed?.items || [];
    const breakingItems = displayItems.filter(i => i.is_breaking);

    // ── İstemci Taraflı Filtre Motoru ──────────────────────────────
    const filteredItems = displayItems.filter(item => {
        // Sentiment filtresi
        if (filterSentiment !== 'ALL' && item.sentiment !== filterSentiment) return false;
        // Etki skoru filtresi
        if (filterImpact === 'HIGH' && item.ai_impact_score < 70) return false;
        if (filterImpact === 'MED'  && (item.ai_impact_score < 40 || item.ai_impact_score >= 70)) return false;
        if (filterImpact === 'LOW'  && item.ai_impact_score >= 40) return false;
        // Portföy filtresi
        if (portfolioOnly && watchlistSymbols.length > 0) {
            const itemSyms = (item.symbols || []).map(s => s.replace(/USDT$/i, '').toUpperCase());
            const hasMatch = itemSyms.some(s => watchlistSymbols.includes(s));
            if (!hasMatch) return false;
        }
        return true;
    });

    // Aktif filtre sayısı (badge için)
    const activeFilterCount = [
        filterSentiment !== 'ALL',
        filterImpact !== 'ALL',
        portfolioOnly,
    ].filter(Boolean).length;

    if (isMobile) return <MobileNews />;
    return (
        <>
            {/* ── ANA LAYOUT: 2 sütun, tam ekran ── */}
            <div style={{
                display: 'flex',
                height: '100%',
                overflow: 'hidden',
                gap: 0,
            }}>
                {/* SOL SÜTUN: Ekonomik Takvim (sabit genişlik) */}
                <div style={{
                    width: 430, flexShrink: 0,
                    borderRight: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', flexDirection: 'column',
                    background: 'rgba(5,8,18,0.88)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    overflowY: 'auto',
                    padding: '28px 24px',
                }}>
                    <h2 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', paddingLeft: '4px' }}>
                        <Globe size={18} color="var(--primary)" /> {t('news.calendarTitle')}
                    </h2>
                    
                    {/* Glassmorphism Wrapper */}
                    <div style={{
                        flex: 1,
                        background: 'rgba(10, 13, 26, 0.75)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 16,
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <EconomicCalendar
                            colorTheme="dark"
                            height="100%"
                            width="100%"
                            locale={i18n.language.startsWith('en') ? 'en' : 'tr'}
                            importanceFilter="-1,0,1"
                            currencyFilter="USD,EUR,GBP,JPY,TRY"
                        />
                    </div>
                </div>

                {/* SAĞ SÜTUN: İstihbarat Akışı */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Sayfa Başlığı */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Radio size={24} color="#00dbe7" /> {t('news.pageTitle')}
                                <span style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(0,219,231,0.12)', color: '#00dbe7', borderRadius: 20, fontWeight: 700 }}>
                                    LİVE FEED
                                </span>
                            </h1>
                            <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {feed?.watchlist?.length > 0
                                    ? t('news.watchlistFiltered', { assets: feed.watchlist.join(' · ') })
                                    : t('news.pageSubtitle')}
                            </p>
                        </div>
                        {feedLoading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <Zap size={14} /> {t('news.loading')}
                            </div>
                        )}
                    </div>

                    {/* Breaking Banner */}
                    {feed?.has_breaking && breakingItems.length > 0 && (
                        <BreakingBanner items={breakingItems} />
                    )}

                    {/* ══ İSTİHBARAT FİLTRE BARI ══ */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, flexWrap: 'wrap',
                        padding: '12px 18px',
                        background: 'rgba(255,255,255,0.04)',
                        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 16,
                        boxShadow: '0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}>

                        {/* ── Sol: Category Dropdown ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                            <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('news.filterCategoryLabel')}</span>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={filterType}
                                    onChange={e => setFilterType(e.target.value)}
                                    style={{
                                        appearance: 'none', WebkitAppearance: 'none',
                                        padding: '6px 32px 6px 12px',
                                        background: `${FILTER_TABS.find(f => f.val === filterType)?.color || '#94a3b8'}14`,
                                        border: `1px solid ${FILTER_TABS.find(f => f.val === filterType)?.color || '#94a3b8'}40`,
                                        borderRadius: 10,
                                        color: FILTER_TABS.find(f => f.val === filterType)?.color || '#94a3b8',
                                        fontSize: '0.78rem', fontWeight: 700,
                                        cursor: 'pointer', outline: 'none', minWidth: 108,
                                        boxShadow: `0 0 10px ${FILTER_TABS.find(f => f.val === filterType)?.color || '#94a3b8'}18`,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {FILTER_TABS.map(({ val, labelKey }) => (
                                        <option key={val} value={val} style={{ background: '#0a0d1a', color: 'white' }}>
                                            {t(labelKey)}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={11} style={{
                                    position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
                                    color: FILTER_TABS.find(f => f.val === filterType)?.color || '#94a3b8',
                                    pointerEvents: 'none',
                                }} />
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ width: 1, height: 38, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

                        {/* ── Orta: Sentiment ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('news.filterSentimentLabel')}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {[
                                    { val: 'ALL',     labelKey: 'news.sentimentAll',     color: '#94a3b8' },
                                    { val: 'Bullish', labelKey: 'news.sentimentBull',    color: '#4edea3' },
                                    { val: 'Bearish', labelKey: 'news.sentimentBear',    color: '#ef4444' },
                                    { val: 'Neutral', labelKey: 'news.sentimentNeutral', color: '#64748b' },
                                ].map(({ val, labelKey, color }) => {
                                    const label = t(labelKey);
                                    const a = filterSentiment === val;
                                    return (
                                        <button key={val} onClick={() => setFilterSentiment(val)} style={{
                                            display: 'flex', alignItems: 'center', gap: 5,
                                            padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                                            border: `1px solid ${a ? color + '55' : 'rgba(255,255,255,0.06)'}`,
                                            background: a ? `${color}18` : 'transparent',
                                            color: a ? color : 'rgba(255,255,255,0.3)',
                                            fontSize: '0.7rem', fontWeight: a ? 800 : 500,
                                            transition: 'all 0.15s',
                                            boxShadow: a ? `0 0 10px ${color}30` : 'none',
                                        }}>
                                            <span style={{
                                                width: 6, height: 6, borderRadius: '50%',
                                                background: a ? color : 'rgba(255,255,255,0.18)',
                                                display: 'inline-block',
                                                boxShadow: a ? `0 0 6px ${color}` : 'none',
                                                transition: 'all 0.15s',
                                            }} />
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ width: 1, height: 38, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

                        {/* ── Orta: Etki Seviyesi ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('news.filterImpactLabel')}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {[
                                    { val: 'ALL',  labelKey: 'news.impactAll',  color: '#94a3b8', bars: 3 },
                                    { val: 'HIGH', labelKey: 'news.impactHigh', color: '#ef4444', bars: 3 },
                                    { val: 'MED',  labelKey: 'news.impactMed',  color: '#eab308', bars: 2 },
                                    { val: 'LOW',  labelKey: 'news.impactLow',  color: '#64748b', bars: 1 },
                                ].map(({ val, labelKey, color, bars }) => {
                                    const label = t(labelKey);
                                    const a = filterImpact === val;
                                    return (
                                        <button key={val} onClick={() => setFilterImpact(val)} style={{
                                            display: 'flex', alignItems: 'center', gap: 5,
                                            padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                                            border: `1px solid ${a ? color + '55' : 'rgba(255,255,255,0.06)'}`,
                                            background: a ? `${color}18` : 'transparent',
                                            color: a ? color : 'rgba(255,255,255,0.3)',
                                            fontSize: '0.7rem', fontWeight: a ? 800 : 500,
                                            transition: 'all 0.15s',
                                            boxShadow: a ? `0 0 10px ${color}30` : 'none',
                                        }}>
                                            {/* Mini bar göstergesi */}
                                            <span style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 10, flexShrink: 0 }}>
                                                {[4, 7, 10].map((h, i) => (
                                                    <span key={i} style={{
                                                        width: 3, height: h, borderRadius: 1.5,
                                                        background: (a && i < bars) ? color : 'rgba(255,255,255,0.15)',
                                                        transition: 'background 0.15s',
                                                    }} />
                                                ))}
                                            </span>
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Esnek boşluk */}
                        <div style={{ flex: 1, minWidth: 8 }} />

                        {/* Aktif Filtre Temizle */}
                        {activeFilterCount > 0 && (
                            <button
                                onClick={() => { setFilterSentiment('ALL'); setFilterImpact('ALL'); setPortfolioOnly(false); setFilterType('ALL'); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '5px 11px', borderRadius: 8, flexShrink: 0,
                                    background: 'rgba(0,219,231,0.08)', border: '1px solid rgba(0,219,231,0.25)',
                                    color: '#00dbe7', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <Filter size={10} /> {t('news.clearFilters', { count: activeFilterCount })}
                            </button>
                        )}

                        {/* Divider */}
                        <div style={{ width: 1, height: 38, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

                        {/* ── Sağ: Portfolio Only Neon Toggle ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                            <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('news.filterPortfolioLabel')}</span>
                            <button
                                onClick={() => setPortfolioOnly(v => !v)}
                                disabled={watchlistSymbols.length === 0}
                                title={watchlistSymbols.length === 0 ? t('news.emptyWatchlist') : watchlistSymbols.join(', ')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    background: 'none', border: 'none', padding: 0,
                                    cursor: watchlistSymbols.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: watchlistSymbols.length === 0 ? 0.4 : 1,
                                }}
                            >
                                {/* Toggle track */}
                                <div style={{
                                    width: 40, height: 22, borderRadius: 11, position: 'relative', flexShrink: 0,
                                    background: portfolioOnly ? 'rgba(0,219,231,0.2)' : 'rgba(255,255,255,0.07)',
                                    border: `1px solid ${portfolioOnly ? 'rgba(0,219,231,0.7)' : 'rgba(255,255,255,0.14)'}`,
                                    boxShadow: portfolioOnly ? '0 0 16px rgba(0,219,231,0.45), inset 0 0 8px rgba(0,219,231,0.15)' : 'none',
                                    transition: 'all 0.25s ease',
                                }}>
                                    {/* Toggle thumb */}
                                    <div style={{
                                        position: 'absolute', top: 2,
                                        left: portfolioOnly ? 20 : 2,
                                        width: 16, height: 16, borderRadius: '50%',
                                        background: portfolioOnly ? '#00dbe7' : 'rgba(255,255,255,0.35)',
                                        boxShadow: portfolioOnly ? '0 0 10px rgba(0,219,231,0.9), 0 0 20px rgba(0,219,231,0.4)' : 'none',
                                        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    }} />
                                </div>
                                <span style={{
                                    fontSize: '0.72rem', fontWeight: portfolioOnly ? 800 : 500,
                                    color: portfolioOnly ? '#00dbe7' : 'rgba(255,255,255,0.35)',
                                    transition: 'color 0.2s', whiteSpace: 'nowrap',
                                }}>
                                >{t('news.portfolioOnly')}
                                    {watchlistSymbols.length > 0 && (
                                        <span style={{
                                            marginLeft: 6, fontSize: '0.6rem', padding: '1px 6px', borderRadius: 8, fontWeight: 900,
                                            background: portfolioOnly ? 'rgba(0,219,231,0.2)' : 'rgba(255,255,255,0.07)',
                                            color: portfolioOnly ? '#00dbe7' : 'rgba(255,255,255,0.35)',
                                        }}>{watchlistSymbols.length}</span>
                                    )}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* ── Kart Listesi (Animasyonlu) ── */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${filterType}-${filterSentiment}-${filterImpact}-${portfolioOnly}`}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                        >
                        {feedLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} style={{
                                    padding: '22px 24px',
                                    background: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderLeft: '3px solid rgba(255,255,255,0.06)',
                                    borderRadius: 14,
                                    display: 'flex', flexDirection: 'column', gap: 14,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div style={{ width: 54, height: 22, borderRadius: 7, ...skeletonStyle }} />
                                            <div style={{ width: 90, height: 22, borderRadius: 7, ...skeletonStyle }} />
                                        </div>
                                        <div style={{ width: 52, height: 28, borderRadius: 9, ...skeletonStyle }} />
                                    </div>
                                    <div style={{ width: '88%', height: 16, borderRadius: 6, ...skeletonStyle }} />
                                    <div style={{ width: '64%', height: 16, borderRadius: 6, ...skeletonStyle }} />
                                    <div style={{ width: '100%', height: 66, borderRadius: 10, ...skeletonStyle }} />
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {[48, 56, 40].map(w => <div key={w} style={{ width: w, height: 20, borderRadius: 5, ...skeletonStyle }} />)}
                                    </div>
                                </div>
                            ))
                        ) : displayItems.length === 0 ? (
                            <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t('news.noResults')}</div>
                                <div style={{ fontSize: '0.8rem', marginTop: 6, opacity: 0.6 }}>{t('news.tryOtherFilter')}</div>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2.2rem', marginBottom: 12 }}>🔍</div>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Filtreyle eşleşen haber yok</div>
                                <div style={{ fontSize: '0.78rem', marginTop: 6, opacity: 0.6 }}>
                                    {portfolioOnly && watchlistSymbols.length === 0
                                        ? 'İzleme listesi boş — önce portföyünüze sembol ekleyin.'
                                        : 'Farklı bir filtre kombinasyonu deneyin.'}
                                </div>
                                <button onClick={() => { setFilterSentiment('ALL'); setFilterImpact('ALL'); setPortfolioOnly(false); }}
                                    style={{ marginTop: 14, padding: '8px 18px', borderRadius: 10, background: 'rgba(0,219,231,0.1)', border: '1px solid rgba(0,219,231,0.25)', color: '#00dbe7', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                                    Filtreleri Sıfırla
                                </button>
                            </div>
                        ) : (
                            filteredItems.map(item => <NewsCard key={item.id} item={item} />)
                        )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Alt padding (FAB düğmesinin üstünde yer bırak) */}
                    <div style={{ height: 80, flexShrink: 0 }} />
                </div>
            </div>

            <style>{`
                @keyframes nb-blink       { 0%,100%{opacity:1}        50%{opacity:0.1}  }
                @keyframes nb-scroll      { from{transform:translateX(0)} to{transform:translateX(-50%)} }
                @keyframes nb-pulse       { 0%,100%{opacity:1}        50%{opacity:0.3}  }
                @keyframes skeleton-shimmer {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </>
    );
};

export default News;
