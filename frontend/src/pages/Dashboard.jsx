import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    TrendingUp, TrendingDown, Activity, ShieldAlert, Brain, Zap,
    BarChart2, Target, Clock, AlertTriangle, Award, ChevronDown, ChevronUp,
    Flame, Wind, Anchor, Navigation, RefreshCw, CalendarDays
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, PieChart, Pie, ReferenceLine, ComposedChart, Line
} from 'recharts';
import { AuthContext, ToastContext } from '../contexts/AuthContext';
import { ZenValue } from '../contexts/ZenContext';
import { apiClient } from '../api/client';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useIsMobile';

/* ─── Renkler ──────────────────────────────────────────────── */
const C = {
    green:  '#10b981', red: '#ef4444', blue: '#3b82f6',
    purple: '#8b5cf6', orange: '#f97316', yellow: '#eab308',
    cyan:   '#22d3ee', pink: '#ec4899', muted: 'var(--text-muted)'
};

/* ─── Küçük yardımcı bileşenler ────────────────────────────── */
const MetricCard = ({ label, value, sub, color = C.blue, icon, glow }) => (
    <div className="aesthetic-card" style={{
        padding: '22px 24px', borderTop: `3px solid ${color}`,
        position: 'relative', overflow: 'hidden',
        boxShadow: glow ? `0 4px 20px ${color}22` : undefined,
    }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 70, height: 70, borderRadius: '50%', background: `${color}18`, transform: 'translate(20px,-20px)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: C.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
            {icon}
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
);

const SectionHeader = ({ icon, title, subtitle, color = C.blue }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid var(--border)` }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}33` }}>
            {React.cloneElement(icon, { size: 20, color })}
        </div>
        <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{title}</h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: C.muted }}>{subtitle}</p>
        </div>
    </div>
);

const ScoreBadge = ({ value, thresholds, labels }) => {
    const idx = thresholds.findIndex(t => value < t);
    const level = idx === -1 ? thresholds.length : idx;
    const colors  = [C.red, C.orange, C.yellow, C.green, C.cyan];
    const c = colors[Math.min(level, colors.length - 1)];
    return (
        <span style={{ padding: '3px 10px', borderRadius: 20, background: `${c}22`, color: c, fontWeight: 700, fontSize: '0.78rem' }}>
            {labels[Math.min(level, labels.length - 1)]}
        </span>
    );
};

const EmptyState = ({ message, icon: Icon = BarChart2 }) => (
    <div style={{ textAlign: 'center', padding: '50px 20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16, background: 'rgba(0,0,0,0.15)', color: C.muted, margin: '20px 0' }}>
        <Icon size={40} style={{ opacity: 0.2, marginBottom: 12, display: 'inline-block', color: 'white' }} />
        <p style={{ fontSize: '0.9rem', margin: 0 }}>{message}</p>
    </div>
);

/* ─── Win Rate Radial Progress Kartı ────────────────────────── */
const WinRateCard = ({ winRate = 0, wins = 0, losses = 0 }) => {
    const { t } = useTranslation();
    const wr = Math.min(100, Math.max(0, winRate || 0));
    const r    = 30;
    const circ = 2 * Math.PI * r;
    const offset = circ - (wr / 100) * circ;
    const c = wr >= 50 ? C.green : C.orange;
    return (
        <div className="aesthetic-card" style={{
            padding: '22px 24px', borderTop: `3px solid ${c}`,
            position: 'relative', overflow: 'hidden',
            boxShadow: `0 4px 24px ${c}22`,
        }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 70, height: 70, borderRadius: '50%', background: `${c}18`, transform: 'translate(20px,-20px)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                <div>
                    <span style={{ color: C.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{t('dashboard.winRateBadge')}</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: c, lineHeight: 1, textShadow: `0 0 18px ${c}70` }}>%{wr}</div>
                    <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: 6 }}>{wins}W / {losses}L</div>
                </div>
                <svg width={72} height={72} style={{ flexShrink: 0, marginTop: -2, marginRight: -4 }}>
                    <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
                    <circle
                        cx={36} cy={36} r={r} fill="none"
                        stroke={c} strokeWidth={5}
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        transform="rotate(-90 36 36)"
                        style={{ filter: `drop-shadow(0 0 5px ${c})`, transition: '1s ease' }}
                    />
                    <text x={36} y={41} textAnchor="middle" fill={c} fontSize={12} fontWeight={900} fontFamily="inherit">{wr}%</text>
                </svg>
            </div>
        </div>
    );
};

/* ─── Mobil Dashboard ───────────────────────────────────────── */
const MobileDashboard = () => {
    const { trades } = useOutletContext();
    const showToast  = useContext(ToastContext);
    const { t, i18n }      = useTranslation();

    const [stats, setStats]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [aiSummary, setAiSummary] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    const safeTrades = Array.isArray(trades) ? trades : [];
    const recentTrades = [...safeTrades]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 5);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try { const data = await apiClient('/stats'); setStats(data); }
        catch { /* sessiz hata */ }
        finally { setLoading(false); }
    }, []);

    const fetchAiSummary = useCallback(async () => {
        setAiLoading(true);
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
            const data = await apiClient(`/ai/daily-summary?language=${i18n.language}`, { method: 'GET' });
            clearTimeout(timeout);
            setAiSummary(data?.summary || data?.text || null);
        } catch (err) {
            console.warn('[AI] Özet alınamadı:', err.message);
            setAiSummary(null);
        }
        finally { setAiLoading(false); }
    }, [i18n.language]);

    // fetchStats tamamlandıktan sonra her zaman AI özetini çek
    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => {
        if (stats !== null) {
            fetchAiSummary();
        }
    }, [stats, fetchAiSummary]);

    // Dil değiştiğinde eski özeti sil ve yeniden çek
    useEffect(() => {
        if (stats !== null) {
            setAiSummary(null);
            fetchAiSummary();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [i18n.language]);

    const s         = stats?.summary || {};
    const ec        = stats?.equity_curve || [];
    const hasData   = (s.total_trades || 0) > 0;

    const SKELETON_STYLE = {
        background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(59,130,246,0.07) 50%,rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'mobile-skeleton 1.5s infinite',
        borderRadius: 12,
    };

    const metrics = hasData ? [
        { label: t('dashboard.metrics.totalPnl'),    value: `${s.total_pnl >= 0 ? '+' : ''}$${(s.total_pnl || 0).toFixed(0)}`, color: s.total_pnl >= 0 ? C.green : C.red },
        { label: t('dashboard.winRateBadge'),         value: `%${s.win_rate || 0}`,                                               color: (s.win_rate || 0) >= 50 ? C.green : C.orange },
        { label: t('dashboard.metrics.profitFactor'), value: s.profit_factor || '—',                                              color: (s.profit_factor || 0) >= 1.5 ? C.green : C.orange },
        { label: t('dashboard.metrics.totalTrades'),  value: s.total_trades || 0,                                                 color: C.cyan },
    ] : [];

    return (
        <div style={{ padding: '0 0 16px' }}>
            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'white', lineHeight: 1.2 }}>{t('dashboard.title')}</h1>
                    <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#546268' }}>
                        {hasData ? t('dashboard.closedTrades', { count: s.total_trades }) : t('dashboard.noTradesHeader')}
                    </p>
                </div>
                <button onClick={fetchStats} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <RefreshCw size={16} />
                </button>
            </div>

            <div style={{ padding: '0 12px 12px' }}>
                <div style={{ background: 'linear-gradient(135deg,rgba(0,219,231,0.07) 0%,rgba(123,47,255,0.06) 100%)', border: '1px solid rgba(0,219,231,0.15)', borderRadius: 16, padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Brain size={16} color="#00dbe7" />
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00dbe7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('dashboard.aiSummaryTitle')}</span>
                    </div>
                    {aiLoading ? (
                        <div style={{ ...SKELETON_STYLE, height: 48 }} />
                    ) : aiSummary ? (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(225,226,235,0.8)', lineHeight: 1.65 }}>{aiSummary}</p>
                    ) : (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#546268', lineHeight: 1.6 }}>{t('dashboard.aiNoTradesMsg')}</p>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 12px' }}>
                    {[1,2,3,4].map(i => <div key={i} style={{ ...SKELETON_STYLE, height: 80 }} />)}
                </div>
            ) : hasData && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 12px' }}>
                    {metrics.map((m, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)`, borderTop: `2px solid ${m.color}`, borderRadius: 14, padding: '14px 14px 12px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, width: 50, height: 50, borderRadius: '50%', background: `${m.color}10`, transform: 'translate(14px,-14px)' }} />
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#546268', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{m.label}</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && hasData && ec.length > 1 && (
                <div style={{ padding: '0 12px 12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <TrendingUp size={15} color={C.blue} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'white' }}>{t('dashboard.equityCurve')}</span>
                        </div>
                        <div style={{ width: '100%', height: 130 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={ec} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="mobileEqGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={C.blue} stopOpacity={0.35} />
                                            <stop offset="95%" stopColor={C.blue} stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="date" stroke={C.muted} fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => v ? v.slice(5,10) : ''} interval="preserveStartEnd" />
                                    <YAxis stroke={C.muted} fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `$${Math.round(v)}`} />
                                    <Tooltip contentStyle={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.75rem' }} labelStyle={{ color: 'white', fontWeight: 700 }} />
                                    <Area type="monotone" dataKey="balance" stroke={C.blue} strokeWidth={2} fill="url(#mobileEqGrad)" dot={false} activeDot={{ r: 4, fill: C.blue }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {!loading && hasData && (
                <div style={{ padding: '0 12px 12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <Activity size={15} color={C.cyan} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'white' }}>{t('dashboard.marketStructure')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {[
                                { label: t('dashboard.metrics.avgWin'),          value: `$${(s.average_win || 0).toFixed(0)}`,          color: C.green  },
                                { label: t('dashboard.metrics.avgLoss'),         value: `-$${Math.abs(s.average_loss || 0).toFixed(0)}`, color: C.red    },
                                { label: t('dashboard.metrics.sharpe'),          value: s.sharpe_ratio || '—',                           color: C.cyan   },
                                { label: t('dashboard.metrics.profitFactor'),    value: s.profit_factor || '—',                          color: C.purple },
                            ].map((item, i) => (
                                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
                                    <div style={{ fontSize: '0.58rem', color: '#546268', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{item.label}</div>
                                </div>
                            ))}
                        </div>
                        {s.win_rate != null && (
                            <div style={{ marginTop: 14 }}>
                                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
                                    <div style={{ width: `${s.win_rate}%`, background: `linear-gradient(90deg,${C.green},${C.cyan})`, transition: '1s ease' }} />
                                    <div style={{ flex: 1, background: `${C.red}60` }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                                    <span style={{ fontSize: '0.62rem', color: C.green, fontWeight: 700 }}>Win %{s.win_rate}</span>
                                    <span style={{ fontSize: '0.62rem', color: C.red, fontWeight: 700 }}>Loss %{100 - s.win_rate}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {recentTrades.length > 0 && (
                <div style={{ padding: '0 12px 16px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <Zap size={15} color={C.yellow} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'white' }}>Son İşlemler</span>
                        </div>
                        {recentTrades.map((trade, i) => {
                            const pnl = trade.pnl || 0;
                            const isWin = pnl > 0;
                            const isPending = trade.status !== 'CLOSED';
                            return (
                                <div key={trade.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < recentTrades.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: isPending ? 'rgba(234,179,8,0.1)' : isWin ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {isPending ? <Clock size={14} color={C.yellow} /> : isWin ? <TrendingUp size={14} color={C.green} /> : <TrendingDown size={14} color={C.red} />}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                                                {trade.symbol || 'N/A'}
                                                <span style={{ marginLeft: 6, fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: trade.direction === 'LONG' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: trade.direction === 'LONG' ? C.green : C.red }}>{trade.direction}</span>
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: '#546268', marginTop: 2 }}>{trade.created_at ? new Date(trade.created_at).toLocaleDateString('tr-TR') : '—'}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {isPending ? (
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.yellow, background: 'rgba(234,179,8,0.1)', padding: '3px 8px', borderRadius: 6 }}>Açık</span>
                                        ) : (
                                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isWin ? C.green : C.red }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!loading && !hasData && recentTrades.length === 0 && (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <BarChart2 size={36} color="#546268" style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.85rem', color: '#546268', margin: 0 }}>{t('dashboard.emptyMsg')}</p>
                </div>
            )}

            <style>{`
                @keyframes mobile-skeleton {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
};

/* ─── Desktop Dashboard ─────────────────────────────────────── */
const DesktopDashboard = () => {

    const { trades } = useOutletContext();
    const { user } = useContext(AuthContext);
    const showToast = useContext(ToastContext);
    const { t, i18n } = useTranslation();

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('all');
    const [dateFilter, setDateFilter] = useState(t('dashboard.filterAll'));
    const [hoveredDay, setHoveredDay] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiClient('/stats');
            setStats(data);
        } catch (e) {
            showToast(t('common.error'), 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const [aiSummary, setAiSummary] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const fetchAiSummary = useCallback(async () => {
        setAiLoading(true);
        try {
            const data = await apiClient(`/ai/daily-summary?language=${i18n.language}`, { method: 'GET' });
            setAiSummary(data?.summary || null);
        } catch { setAiSummary(null); }
        finally { setAiLoading(false); }
    }, [i18n.language]);
    useEffect(() => { if (stats !== null) fetchAiSummary(); }, [stats, fetchAiSummary]);

    // Dil değiştiğinde eski özeti sil ve yeniden çek
    useEffect(() => {
        if (stats !== null) {
            setAiSummary(null);
            fetchAiSummary();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [i18n.language]);

    /* ── Hesaplamalar ─────────────────────────────────── */
    const safeTrades = Array.isArray(trades) ? trades : [];
    const histTrades = safeTrades.filter(t => t.status === 'CLOSED');
    const pnls = histTrades.map(t => t.pnl || 0);

    /* Psikoloji skorları */
    let discipline = 100, riskScore = 100, patience = 100, focus = 100;
    if (histTrades.length > 0) {
        const avgNoteLen = histTrades.reduce((a, t) => a + (t.strategy_note?.length || 0) + (t.psychology_note?.length || 0), 0) / histTrades.length;
        const wins = histTrades.filter(t => (t.pnl || 0) > 0);
        const wr = wins.length / histTrades.length;
        focus      = Math.min(100, 50 + (avgNoteLen > 20 ? 30 : 0) + (wr * 20));
        const highR = histTrades.filter(t => t.risk_percentage > 2).length;
        riskScore  = Math.max(0, 100 - (highR / histTrades.length) * 50);
        discipline = Math.min(100, 40 + wr * 40 + (histTrades.length > 5 ? 20 : 0));
        patience   = Math.min(100, 50 + wins.length * 5 + (avgNoteLen > 10 ? 10 : 0));
    }
    const psychData = [
        { subject: t('dashboard.psychSubjects.discipline'), A: Math.round(discipline), fullMark: 100 },
        { subject: t('dashboard.psychSubjects.riskMgmt'),   A: Math.round(riskScore),  fullMark: 100 },
        { subject: t('dashboard.psychSubjects.patience'),   A: Math.round(patience),   fullMark: 100 },
        { subject: t('dashboard.psychSubjects.focus'),      A: Math.round(focus),      fullMark: 100 },
    ];
    const overallScore = Math.round((discipline + riskScore + patience + focus) / 4);

    /* Portföy dağılımı */
    const assetAllocation = () => {
        let crypto = 0, stocks = 0, forex = 0, commodities = 0;
        safeTrades.forEach(t => {
            const s = (t.symbol || '').toUpperCase();
            if (['AAPL','TSLA','MSFT','NVDA','SPX','NDX'].some(x => s.includes(x))) stocks++;
            else if (['XAU','XAG','OIL','GOLD'].some(x => s.includes(x))) commodities++;
            else if (['EUR','GBP','JPY','CHF'].some(x => s.includes(x))) forex++;
            else crypto++;
        });
        const d = [];
        if (crypto > 0) d.push({ name: t('dashboard.assetTypes.crypto'), value: crypto, color: C.blue });
        if (stocks > 0) d.push({ name: t('dashboard.assetTypes.stocks'), value: stocks, color: C.purple });
        if (commodities > 0) d.push({ name: t('dashboard.assetTypes.commodities'), value: commodities, color: C.yellow });
        if (forex > 0) d.push({ name: t('dashboard.assetTypes.forex'), value: forex, color: C.green });
        if (d.length === 0) d.push({ name: t('dashboard.assetTypes.cash'), value: 1, color: 'var(--border)' });
        return d;
    };
    const assetData = assetAllocation();

    /* ── Tooltip'ler ─────────────────────────────── */
    const StdTooltip = ({ active, payload, label }) => {
        if (active && payload?.length) {
            return (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
                    <p style={{ margin: 0, fontWeight: 700, marginBottom: 4 }}>{label}</p>
                    {payload.map((p, i) => <p key={i} style={{ margin: 0, color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>)}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton-line" style={{ height: 120, borderRadius: 16, width: '100%' }} />
                ))}
            </div>
        );
    }

    const s  = stats?.summary  || {};
    const ec = stats?.equity_curve || [];
    const sp = stats?.symbol_performance || [];
    const rd = stats?.r_distribution || [];
    const sa = stats?.session_analysis || [];
    const wa = stats?.weekday_analysis || [];
    const ha = stats?.holding_analysis || [];
    const ml = stats?.mental_leakage   || {};
    const hasData = (s.total_trades || 0) > 0;

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32, height: '100%', overflowY: 'auto', paddingRight: 8 }}>

            {/* ── Başlık (Glassmorphism & Sticky) ────────────────────────────────── */}
            <div style={{ 
                position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
                background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                padding: '24px 16px', marginBottom: '8px', marginLeft: '-8px', marginRight: '-8px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{ background: `${C.blue}1a`, padding: '12px', borderRadius: '12px', display: 'flex', border: `1px solid ${C.blue}33` }}>
                        <BarChart2 size={28} color={C.blue} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 12, lineHeight: 1.2 }}>
                            {t('dashboard.title')}
                            <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: `${C.blue}22`, color: C.cyan, borderRadius: 20, fontWeight: 700, border: `1px solid ${C.blue}44` }}>{t('dashboard.subtitle')}</span>
                        </h1>
                        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 400 }}>
                            {hasData ? t('dashboard.closedTrades', { count: s.total_trades }) : t('dashboard.noTradesHeader')}
                        </p>
                    </div>
                </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            style={{
                                padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                                borderRadius: 10, color: 'white', fontWeight: 700, fontSize: '0.85rem', outline: 'none',
                                cursor: 'pointer', appearance: 'none', paddingRight: 30, position: 'relative',
                                backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`,
                                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '10px auto'
                            }}
                        >
                            <option value={t('dashboard.filterAll')}>{t('dashboard.filterAll')}</option>
                            <option value={t('dashboard.filterLast30')}>{t('dashboard.filterLast30')}</option>
                            <option value={t('dashboard.filterThisWeek')}>{t('dashboard.filterThisWeek')}</option>
                        </select>
                        <button onClick={fetchStats} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: `${C.blue}18`, border: `1px solid ${C.blue}44`, borderRadius: 10, color: C.blue, fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                            <RefreshCw size={15} /> {t('dashboard.refresh')}
                        </button>
                    </div>
                </div>

                {/* Hızlı metrikler */}
                {hasData && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginTop: 24 }}>
                        {[
                            { label: t('dashboard.metrics.totalPnl'),    value: <ZenValue value={`${s.total_pnl >= 0 ? '+' : ''}$${s.total_pnl?.toFixed(0)}`} />, color: s.total_pnl >= 0 ? C.green : C.red },
                            { label: t('dashboard.winRateBadge'),         value: `%${s.win_rate}`,         color: s.win_rate >= 50 ? C.green : C.red },
                            { label: t('dashboard.metrics.profitFactor'),  value: s.profit_factor,           color: s.profit_factor >= 1.5 ? C.green : C.orange },
                            { label: t('dashboard.metrics.sharpe'),       value: s.sharpe_ratio,            color: s.sharpe_ratio >= 1 ? C.cyan : C.muted },
                            { label: t('dashboard.metrics.expectedVal'),  value: <ZenValue value={`$${s.expected_value}`} />, color: s.expected_value >= 0 ? C.green : C.red },
                            { label: t('dashboard.metrics.recoveryF'),    value: s.recovery_factor || '—',  color: C.purple },
                        ].map((m, i) => (
                            <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-app)', borderRadius: 12, border: `1px solid var(--border)` }}>
                                <div style={{ fontSize: '0.68rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{m.label}</div>
                                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: m.color }}>{m.value}</div>
                            </div>
                        ))}
                    </div>
                )}

            {/* ── AI Günün Özeti — Desktop Banner ─────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg,rgba(0,219,231,0.07) 0%,rgba(123,47,255,0.06) 100%)',
                border: '1px solid rgba(0,219,231,0.15)', borderRadius: 16,
                padding: '18px 24px', display: 'flex', alignItems: 'flex-start', gap: 16,
            }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,219,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,219,231,0.2)', flexShrink: 0 }}>
                    <Brain size={18} color="#00dbe7" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#00dbe7', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>{t('dashboard.aiSummaryTitle')}</span>
                    {aiLoading ? (
                        <div style={{ height: 20, borderRadius: 6, width: '60%', background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(0,219,231,0.07) 50%,rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'mobile-skeleton 1.5s infinite' }} />
                    ) : aiSummary ? (
                        <p style={{ margin: 0, fontSize: '0.92rem', color: 'rgba(225,226,235,0.85)', lineHeight: 1.7 }}>{aiSummary}</p>
                    ) : (
                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#546268', lineHeight: 1.6 }}>{t('dashboard.aiNoTradesMsg')}</p>
                    )}
                </div>
            </div>

            {!hasData && <EmptyState message={t('dashboard.emptyMsg')} />}

            {hasData && (<>

            {/* ════════════════════════════════════════════════════════════
                TEPE: EQUITY CURVE (SERMAYE BÜYÜME EĞRİSİ)
            ════════════════════════════════════════════════════════════ */}
            <div className="aesthetic-card" style={{ padding: 28 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={22} color={C.blue}/> {t('dashboard.equityCurve')}
                </h3>
                {ec && ec.length > 1 ? (
                    <div style={{ width: '100%', height: 320, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={ec} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor={C.blue} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={C.blue} stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke={C.muted} fontSize={11} tickLine={false} axisLine={false}
                                    tickFormatter={v => v ? v.slice(5, 10) : ''} interval="preserveStartEnd" minTickGap={20} />
                                <YAxis stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${Math.round(v)}`} />
                                <Tooltip content={({ active, payload }) => {
                                    if (active && payload?.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem' }}>
                                                <p style={{ margin: 0, fontWeight: 800 }}>{d.symbol}</p>
                                                <p style={{ margin: '6px 0 0', color: C.blue }}>{t('dashboard.equityBalance')}: <ZenValue value={`$${d.balance?.toFixed(2)}`} /></p>
                                                <p style={{ margin: '4px 0 0', color: d.pnl >= 0 ? C.green : C.red }}>PnL: <ZenValue value={`${d.pnl >= 0 ? '+' : ''}$${d.pnl?.toFixed(2)}`} /></p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }} />
                                <Area type="monotone" dataKey="balance" stroke={C.blue} strokeWidth={3} fill="url(#eqGrad)" dot={false} activeDot={{ r: 6, fill: C.blue, strokeWidth: 0 }} />
                                <ReferenceLine y={0} stroke={C.red} strokeDasharray="4 4" opacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : <EmptyState message={t('dashboard.equityEmpty')} icon={TrendingUp} />}
            </div>

            {/* ════════════════════════════════════════════════════════════
                PNL ISI HARİTASI (TRADE CALENDAR)
            ════════════════════════════════════════════════════════════ */}
            {(() => {
                // İşlem günlerini date→pnl eşlemesine dönüştür
                const pnlByDay = {};
                histTrades.forEach(tr => {
                    const raw = tr.created_at || tr.closed_at || tr.date;
                    if (!raw) return;
                    const day = raw.slice(0, 10);
                    pnlByDay[day] = (pnlByDay[day] || 0) + (tr.pnl || 0);
                });

                // Gösterilecek yılı hesapla (en son işlemin yılı, yoksa şimdiki yıl)
                const allDays = Object.keys(pnlByDay);
                const displayYear = allDays.length > 0
                    ? parseInt(allDays.sort().at(-1).slice(0, 4), 10)
                    : new Date().getFullYear();

                // O yılın tüm günlerini oluştur
                const startDate = new Date(displayYear, 0, 1);
                const endDate   = new Date(displayYear, 11, 31);
                const days = [];
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const iso = d.toISOString().slice(0, 10);
                    const pnl = pnlByDay[iso];
                    days.push({ iso, pnl: pnl ?? null, dayOfWeek: d.getDay(), month: d.getMonth(), date: d.getDate() });
                }

                // Haftalara böl (Pazar=0 ... Cumartesi=6 olarak Pazartesi başlasın)
                const CELL = 13; // px
                const GAP  = 3;  // px
                const DAY_LABELS = t('dashboard.dayLabels', { returnObjects: true });
                const MONTH_NAMES = t('dashboard.monthNames', { returnObjects: true });

                // İlk hücrenin başladığı gün offset (Pazartesi=0 bazlı)
                const firstDow = (startDate.getDay() + 6) % 7; // 0=Pzt
                const paddedDays = [
                    ...Array(firstDow).fill(null),
                    ...days,
                ];
                // Haftalara böl
                const weeks = [];
                for (let i = 0; i < paddedDays.length; i += 7) weeks.push(paddedDays.slice(i, i + 7));

                // Maksimum |pnl| (renk yoğunluğu için normalleştirme)
                const maxAbs = Math.max(1, ...Object.values(pnlByDay).map(Math.abs));

                const cellColor = (pnl) => {
                    if (pnl === null || pnl === undefined) return 'rgba(255,255,255,0.05)';
                    if (pnl === 0) return 'rgba(255,255,255,0.07)';
                    const intensity = Math.min(1, Math.abs(pnl) / (maxAbs * 0.5));
                    if (pnl > 0) return `rgba(16,${Math.round(185 + 60 * intensity)},129,${0.25 + 0.65 * intensity})`;
                    return `rgba(239,${Math.round(68 - 20 * intensity)},68,${0.25 + 0.65 * intensity})`;
                };
                const cellGlow = (pnl) => {
                    if (!pnl || pnl === 0) return 'none';
                    const intensity = Math.min(1, Math.abs(pnl) / maxAbs);
                    if (pnl > 0) return `0 0 ${4 + 6 * intensity}px rgba(16,185,129,${0.5 * intensity})`;
                    return `0 0 ${4 + 6 * intensity}px rgba(239,68,68,${0.5 * intensity})`;
                };

                // Ay etiketleri için hafta indekslerini bul
                const monthLabelPositions = {};
                weeks.forEach((week, wi) => {
                    week.forEach(d => {
                        if (d && d.date === 1 && !(d.month in monthLabelPositions)) {
                            monthLabelPositions[d.month] = wi;
                        }
                    });
                });

                return (
                    <div className="aesthetic-card" style={{ padding: 28 }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '1.2rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CalendarDays size={22} color={C.cyan} />
                            {t('dashboard.pnlHeatmap.title')} — {displayYear}
                            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.68rem', fontWeight: 700, color: C.muted }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(16,185,129,0.8)', display: 'inline-block', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} /> {t('dashboard.pnlHeatmap.profitable')}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(239,68,68,0.8)', display: 'inline-block', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }} /> {t('dashboard.pnlHeatmap.unprofitable')}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.07)', display: 'inline-block' }} /> {t('dashboard.pnlHeatmap.noTrade')}
                                </span>
                            </span>
                        </h3>

                        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                            <div style={{ display: 'flex', gap: 0 }}>
                                {/* Gün etiketi sütunu */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, marginRight: GAP + 2, paddingTop: 18, flexShrink: 0 }}>
                                    {DAY_LABELS.map((lbl, i) => (
                                        <div key={i} style={{ height: CELL, fontSize: '0.6rem', color: C.muted, fontWeight: 600, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                                            {lbl}
                                        </div>
                                    ))}
                                </div>

                                {/* Hafta sütunları */}
                                <div style={{ position: 'relative' }}>
                                    {/* Ay etiketleri */}
                                    <div style={{ display: 'flex', height: 18, marginBottom: 2 }}>
                                        {weeks.map((_, wi) => (
                                            <div key={wi} style={{ width: CELL + GAP, flexShrink: 0, fontSize: '0.6rem', color: C.muted, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {Object.entries(monthLabelPositions).find(([, v]) => v === wi)
                                                    ? MONTH_NAMES[parseInt(Object.entries(monthLabelPositions).find(([, v]) => v === wi)[0], 10)]
                                                    : ''}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Hücreler */}
                                    <div style={{ display: 'flex', gap: GAP }}>
                                        {weeks.map((week, wi) => (
                                            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                                                {week.map((d, di) => (
                                                    <div
                                                        key={di}
                                                        onMouseEnter={d ? (e) => { setHoveredDay(d); setTooltipPos({ x: e.clientX, y: e.clientY }); } : undefined}
                                                        onMouseMove={d ? (e) => setTooltipPos({ x: e.clientX, y: e.clientY }) : undefined}
                                                        onMouseLeave={() => setHoveredDay(null)}
                                                        style={{
                                                            width: CELL, height: CELL,
                                                            borderRadius: 3,
                                                            background: d ? cellColor(d.pnl) : 'transparent',
                                                            boxShadow: d ? cellGlow(d.pnl) : 'none',
                                                            cursor: d?.pnl != null ? 'pointer' : 'default',
                                                            transition: 'transform 0.1s, box-shadow 0.1s',
                                                            transform: hoveredDay?.iso === d?.iso ? 'scale(1.35)' : 'scale(1)',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tooltip */}
                        {hoveredDay && hoveredDay.pnl !== null && (
                            <div style={{
                                position: 'fixed',
                                left: tooltipPos.x + 12,
                                top: tooltipPos.y - 40,
                                zIndex: 9999,
                                background: 'rgba(5,8,18,0.97)',
                                border: `1px solid ${hoveredDay.pnl >= 0 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                                borderRadius: 8,
                                padding: '8px 14px',
                                pointerEvents: 'none',
                                boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 12px ${hoveredDay.pnl >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            }}>
                                <div style={{ fontSize: '0.68rem', color: C.muted, marginBottom: 3 }}>{hoveredDay.iso}</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: hoveredDay.pnl >= 0 ? '#4edea3' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                                    {hoveredDay.pnl >= 0 ? '+' : ''}${hoveredDay.pnl.toFixed(2)}
                                </div>
                            </div>
                        )}

                        {/* Özet bar */}
                        <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                            {[{
                                label: t('dashboard.pnlHeatmap.profitDays'),
                                value: Object.values(pnlByDay).filter(p => p > 0).length,
                                color: C.green,
                            }, {
                                label: t('dashboard.pnlHeatmap.lossDays'),
                                value: Object.values(pnlByDay).filter(p => p < 0).length,
                                color: C.red,
                            }, {
                                label: t('dashboard.pnlHeatmap.totalDays'),
                                value: Object.keys(pnlByDay).filter(k => k.startsWith(String(displayYear))).length,
                                color: C.cyan,
                            }, {
                                label: t('dashboard.pnlHeatmap.bestDay'),
                                value: allDays.length > 0 ? `+$${Math.max(...Object.values(pnlByDay)).toFixed(0)}` : '—',
                                color: C.green,
                            }, {
                                label: t('dashboard.pnlHeatmap.worstDay'),
                                value: allDays.length > 0 ? `-$${Math.abs(Math.min(...Object.values(pnlByDay))).toFixed(0)}` : '—',
                                color: C.red,
                            }].map((item, i) => (
                                <div key={i}>
                                    <div style={{ fontSize: '0.6rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{item.label}</div>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* ════════════════════════════════════════════════════════════
                BÖLÜM 1 — RİSK & SERMAYE KORUMA
            ════════════════════════════════════════════════════════════ */}
            <div className="aesthetic-card" style={{ padding: 28 }}>
                <SectionHeader icon={<ShieldAlert />} title={t('dashboard.risk')} subtitle={t('dashboard.riskSubtitle')} color={C.red} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                    <MetricCard label={t('dashboard.metrics.maxDrawdown')} value={<ZenValue value={`-$${s.max_drawdown?.toFixed(0)}`} />} sub={t('dashboard.metrics.drawdownPeak')} color={C.red} icon={<TrendingDown size={18} color={C.red} />} />
                    <MetricCard label={t('dashboard.metrics.drawdownDuration')} value={`${s.max_drawdown_duration_days || 0}`} sub={t('dashboard.metrics.drawdownDurationSub')} color={C.orange} icon={<Clock size={18} color={C.orange} />} />
                    <MetricCard label={t('dashboard.metrics.sharpe')} value={s.sharpe_ratio} sub={t('dashboard.metrics.sharpeSubtitle')} color={s.sharpe_ratio >= 1 ? C.green : C.orange} icon={<Activity size={18} color={C.cyan} />}
                        glow={s.sharpe_ratio >= 2} />
                    <MetricCard label={t('dashboard.metrics.sortinoRatio')} value={s.sortino_ratio} sub={t('dashboard.metrics.sortinoSubtitle')} color={s.sortino_ratio >= 1 ? C.cyan : C.orange} icon={<Navigation size={18} color={C.cyan} />} />
                </div>

                {/* R-Çarpanı Dağılımı */}
                <div className="dash-glass-chart" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <Target size={18} color={C.purple} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{t('dashboard.sections.rMultiple')}</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: C.muted }}>{t('dashboard.sections.rMultipleSub')}</p>
                        </div>
                    </div>
                    {rd.length > 0 ? (
                        <div style={{ height: 240, minWidth: 0, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={rd} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <defs>
                                        {/* Pozitif: altta cyan → üstte mavi (alttan yukarı parlama) */}
                                        <linearGradient id="colorPos" x1="0" y1="1" x2="0" y2="0">
                                            <stop offset="0%"  stopColor={C.cyan}   stopOpacity={1}/>
                                            <stop offset="100%" stopColor={C.blue}  stopOpacity={0.55}/>
                                        </linearGradient>
                                        {/* Negatif: altta kırmızı → üstte turuncu */}
                                        <linearGradient id="colorNeg" x1="0" y1="1" x2="0" y2="0">
                                            <stop offset="0%"  stopColor={C.red}    stopOpacity={1}/>
                                            <stop offset="100%" stopColor={C.orange} stopOpacity={0.55}/>
                                        </linearGradient>
                                        {/* Nötr: altta sarı → üstte turuncu */}
                                        <linearGradient id="colorNeut" x1="0" y1="1" x2="0" y2="0">
                                            <stop offset="0%"  stopColor={C.yellow}  stopOpacity={0.9}/>
                                            <stop offset="100%" stopColor={C.orange} stopOpacity={0.4}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="range" stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke={C.muted} fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip content={<StdTooltip />} />
                                    <Bar dataKey="count" name={t('dashboard.sections.rMultipleBarName')} radius={[6, 6, 0, 0]} maxBarSize={44}>
                                        {rd.map((entry, i) => {
                                            const r = entry.range;
                                            const isPos = r.includes('1R') || r.includes('2R') || r.includes('3R') || r.includes('5R+');
                                            const isBad = r.includes('-3R') || r.includes('≤-3R') || r.includes('-2R');
                                            return <Cell key={i} fill={isPos ? 'url(#colorPos)' : (isBad ? 'url(#colorNeg)' : 'url(#colorNeut)')} opacity={1} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message={t('dashboard.sections.rMultipleEmpty')} />}
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════
                BÖLÜM 2 — KÂRLILIK & VERİMLİLİK
            ════════════════════════════════════════════════════════════ */}
            <div className="aesthetic-card" style={{ padding: 28 }}>
                <SectionHeader icon={<TrendingUp />} title={t('dashboard.sections.profitability')} subtitle={t('dashboard.sections.profitabilitySub')} color={C.green} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                    <MetricCard label={t('dashboard.metrics.profitFactor')} value={s.profit_factor}
                        sub={s.profit_factor >= 2 ? t('dashboard.sections.pfExcellent') : (s.profit_factor >= 1.5 ? t('dashboard.sections.pfGood') : t('dashboard.sections.pfImprove'))}
                        color={s.profit_factor >= 1.5 ? C.green : C.orange} icon={<Award size={18} color={C.green} />} glow={s.profit_factor >= 2} />
                    <WinRateCard
                        winRate={s.win_rate}
                        wins={histTrades.filter(t => (t.pnl||0) > 0).length}
                        losses={histTrades.filter(t => (t.pnl||0) < 0).length}
                    />
                    <MetricCard label={t('dashboard.metrics.expectedVal')} value={<ZenValue value={`$${s.expected_value >= 0 ? '+' : ''}${s.expected_value}`} />}
                        sub=""
                        color={s.expected_value >= 0 ? C.cyan : C.red} icon={<Zap size={18} color={C.cyan} />} glow={s.expected_value > 50} />
                    <MetricCard label={t('dashboard.metrics.recoveryF')} value={s.recovery_factor || '—'}
                        sub=""
                        color={C.purple} icon={<RefreshCw size={18} color={C.purple} />} />
                </div>

                {/* Profit Factor + Win Rate çapraz tablo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Ort. Kazanç vs Ort. Kayıp */}
                    <div style={{ background: 'var(--bg-app)', borderRadius: 16, padding: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800 }}>{t('dashboard.sections.avgWinVsLoss')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: t('dashboard.metrics.avgWin') || 'Avg. Win', val: s.average_win, color: C.green, icon: <TrendingUp size={16} color={C.green} /> },
                                { label: t('dashboard.metrics.avgLoss') || 'Avg. Loss', val: s.average_loss, color: C.red,   icon: <TrendingDown size={16} color={C.red} /> },
                                { label: t('dashboard.metrics.bestTrade') || 'Best Trade', val: s.best_trade, color: C.cyan, icon: <Flame size={16} color={C.cyan} /> },
                                { label: t('dashboard.metrics.worstTrade') || 'Worst Trade', val: s.worst_trade, color: C.orange, icon: <Wind size={16} color={C.orange} /> },
                            ].map((row, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {row.icon}
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>{row.label}</span>
                                    </div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: row.color }}><ZenValue value={`$${Math.abs(row.val || 0).toFixed(2)}`} /></span>
                                </div>
                            ))}
                            {/* Risk/Ödül oranı */}
                            {s.average_win > 0 && s.average_loss > 0 && (
                                <div style={{ marginTop: 8, padding: '12px 16px', background: `${C.blue}0f`, borderRadius: 10, border: `1px solid ${C.blue}33` }}>
                                    <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: 4 }}>{t('dashboard.sections.rrRatioLabel')}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: C.blue }}>
                                        1:{(s.average_win / s.average_loss).toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: C.muted }}>
                                        {s.average_win / s.average_loss >= 1.5 ? t('dashboard.sections.rrIdeal') : t('dashboard.sections.rrTarget')}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sembol Performans Tablosu */}
                    <div style={{ background: 'var(--bg-app)', borderRadius: 16, padding: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800 }}>{t('dashboard.sections.assetPerformance')}</h3>
                        {sp.length === 0 ? <EmptyState message={t('dashboard.sections.noData')} /> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                                {sp.map((sym, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'center', padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{sym.symbol}</span>
                                        <span style={{ fontSize: '0.75rem', color: C.muted }}>{sym.trades} işlem</span>
                                        <span style={{ fontSize: '0.75rem', color: C.muted }}>%{sym.win_rate} WR</span>
                                        <span style={{ fontWeight: 800, color: sym.total_pnl >= 0 ? C.green : C.red, fontSize: '0.9rem' }}>
                                            <ZenValue value={`${sym.total_pnl >= 0 ? '+' : ''}$${sym.total_pnl}`} />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════
                BÖLÜM 3 — ZAMAN & VARLIK BAZLI ANALİZ
            ════════════════════════════════════════════════════════════ */}
            <div className="aesthetic-card" style={{ padding: 28 }}>
                <SectionHeader icon={<Clock />} title={t('dashboard.sections.timeAnalysis')} subtitle={t('dashboard.sections.timeAnalysisSub')} color={C.yellow} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                    {/* Seans Analizi */}
                    <div style={{ background: 'var(--bg-app)', borderRadius: 16, padding: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800 }}>{t('dashboard.sections.sessionAnalysis')}</h3>
                        {sa.length === 0 ? <EmptyState message={t('dashboard.sections.noData')} /> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {sa.map((sess, i) => {
                                    const sessionColors = { 'Asya': C.cyan, 'Londra': C.blue, 'New York': C.green, 'Geç Seans': C.purple };
                                    const c = sessionColors[sess.session] || C.muted;
                                    return (
                                        <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 12, border: `1px solid var(--border)` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <span style={{ fontWeight: 700, color: c, fontSize: '0.85rem' }}>{sess.session}{t('dashboard.sections.sessionSuffix')}</span>
                                                <span style={{ fontSize: '0.75rem', color: C.muted }}>{t('dashboard.sections.tradesCount', { count: sess.trades })}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 16 }}>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', color: C.muted }}>{t('dashboard.sections.winRate')}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', color: C.muted }}>{t('dashboard.sections.avgPnl')}</div>
                                                    <div style={{ fontWeight: 800, color: sess.avg_pnl >= 0 ? C.green : C.red }}><ZenValue value={`${sess.avg_pnl >= 0 ? '+' : ''}$${sess.avg_pnl}`} /></div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.65rem', color: C.muted }}>{t('dashboard.sections.total')}</div>
                                                    <div style={{ fontWeight: 800, color: sess.total_pnl >= 0 ? C.green : C.red }}><ZenValue value={`${sess.total_pnl >= 0 ? '+' : ''}$${sess.total_pnl?.toFixed(0)}`} /></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Günlük Analiz */}
                    <div className="dash-glass-chart" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800 }}>{t('dashboard.sections.weekdayPerf')}</h3>
                        {wa.filter(d => d.trades > 0).length === 0 ? <EmptyState message="Veri yok" /> : (
                            <div style={{ height: 240, minWidth: 0, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={wa.filter(d => d.trades > 0)} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                        <defs>
                                            {/* Kazançlı günler: cyan → mavi (alttan yukarı) */}
                                            <linearGradient id="colorWPos" x1="0" y1="1" x2="0" y2="0">
                                                <stop offset="0%"  stopColor={C.cyan}   stopOpacity={1}/>
                                                <stop offset="100%" stopColor={C.blue}  stopOpacity={0.5}/>
                                            </linearGradient>
                                            {/* Zararlı günler: kırmızı → turuncu (alttan yukarı) */}
                                            <linearGradient id="colorWNeg" x1="0" y1="1" x2="0" y2="0">
                                                <stop offset="0%"  stopColor={C.red}    stopOpacity={1}/>
                                                <stop offset="100%" stopColor={C.orange} stopOpacity={0.5}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="day" stroke={C.muted} fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => v.slice(0, 3)} />
                                        <YAxis stroke={C.muted} fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                                        <Tooltip content={({ active, payload }) => {
                                            if (active && payload?.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
                                                        <p style={{ margin: 0, fontWeight: 700 }}>{d.day}</p>
                                                        <p style={{ margin: '4px 0 0', color: C.muted }}>{d.trades} işlem • %{d.win_rate} WR</p>
                                                        <p style={{ margin: '2px 0 0', color: d.total_pnl >= 0 ? C.green : C.red }}>
                                                            <ZenValue value={`${d.total_pnl >= 0 ? '+' : ''}$${d.total_pnl?.toFixed(2)}`} />
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Bar dataKey="total_pnl" name={t('dashboard.sections.weekdayPnlName')} radius={[6, 6, 0, 0]} maxBarSize={40}>
                                            {wa.filter(d => d.trades > 0).map((d, i) => (
                                                <Cell key={i} fill={d.total_pnl >= 0 ? 'url(#colorWPos)' : 'url(#colorWNeg)'} opacity={1} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* Holding Time Analizi */}
                <div style={{ background: 'var(--bg-app)', borderRadius: 16, padding: 24 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800 }}>
                        {t('dashboard.sections.tradeStyleAnalysis')}
                        <span style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 400, marginLeft: 10 }}>{t('dashboard.sections.tradeStyleSub')}</span>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {ha.map((h, i) => {
                            const styleColors = [C.orange, C.blue, C.purple, C.cyan];
                            const c = styleColors[i] || C.muted;
                            return (
                                <div key={i} style={{ padding: '16px 20px', background: 'var(--bg-card)', borderRadius: 14, border: `1px solid ${c}33`, borderTop: `3px solid ${c}` }}>
                                    <div style={{ fontWeight: 800, color: c, fontSize: '0.82rem', marginBottom: 10 }}>{h.label}</div>
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ fontSize: '0.65rem', color: C.muted }}>{t('dashboard.sections.tradeCount')}</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{h.trades}</div>
                                    </div>
                                    <div style={{ marginBottom: 6 }}>
                                                    <div style={{ fontSize: '0.65rem', color: C.muted }}>{t('dashboard.sections.winRate')}</div>
                                                    <div style={{ fontWeight: 800, color: h.win_rate >= 50 ? C.green : C.red }}>%{h.win_rate}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: C.muted }}>{t('dashboard.sections.avgPnlLabel')}</div>
                                        <div style={{ fontWeight: 800, color: h.avg_pnl >= 0 ? C.green : C.red }}><ZenValue value={`${h.avg_pnl >= 0 ? '+' : ''}$${h.avg_pnl}`} /></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Portföy Dağılımı + Psikoloji Radar */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                    <div className="dash-glass-chart" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 800 }}>{t('dashboard.assetAlloc')}</h3>
                        {/* Fütürist Donut — ortada toplam PnL */}
                        <div style={{ height: 240, position: 'relative', minWidth: 0, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <defs>
                                        {assetData.map((e, i) => (
                                            <filter key={i} id={`pie-glow-${i}`} x="-30%" y="-30%" width="160%" height="160%">
                                                <feGaussianBlur stdDeviation="4" result="blur" />
                                                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                            </filter>
                                        ))}
                                    </defs>
                                    {/* Dış neon halka */}
                                    <Pie
                                        data={assetData} innerRadius={94} outerRadius={98}
                                        paddingAngle={3} dataKey="value" stroke="transparent"
                                        isAnimationActive={false}
                                    >
                                        {assetData.map((e, i) => (
                                            <Cell key={i} fill={e.color} opacity={0.45} />
                                        ))}
                                    </Pie>
                                    {/* Ana halka */}
                                    <Pie
                                        data={assetData} innerRadius={68} outerRadius={90}
                                        paddingAngle={4} dataKey="value" stroke="transparent"
                                    >
                                        {assetData.map((e, i) => (
                                            <Cell
                                                key={i} fill={e.color}
                                                style={{ filter: `drop-shadow(0 0 6px ${e.color}90)` }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'rgba(5,8,18,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: '0.82rem' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Merkez: Toplam PnL */}
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center', pointerEvents: 'none',
                            }}>
                                <div style={{ fontSize: '0.58rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{t('dashboard.totalPnlLabel')}</div>
                                <div style={{
                                    fontSize: '1.25rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums',
                                    color: (s.total_pnl || 0) >= 0 ? C.green : C.red,
                                    textShadow: `0 0 16px ${(s.total_pnl || 0) >= 0 ? C.green : C.red}80`,
                                }}>
                                    {(s.total_pnl || 0) >= 0 ? '+' : ''}${(s.total_pnl || 0).toFixed(0)}
                                </div>
                                <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: 1 }}>{assetData.length} {t('dashboard.assetClasses')}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'center', marginTop: 6 }}>
                            {assetData.map(d => (
                                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: C.muted }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, boxShadow: `0 0 6px ${d.color}` }} />{d.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Siber-Punk Radar */}
                    <div className="dash-glass-chart" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>{t('dashboard.psychology')}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: C.muted }}>{t('dashboard.psychScore')}: <span style={{ fontWeight: 900, color: C.cyan, textShadow: `0 0 10px ${C.cyan}` }}>{overallScore}/100</span></p>
                            </div>
                            {/* Skor rozeti */}
                            <div style={{
                                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                border: `2px solid ${C.cyan}`,
                                boxShadow: `0 0 14px ${C.cyan}60, inset 0 0 10px ${C.cyan}20`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column',
                            }}>
                                <span style={{ fontSize: '1rem', fontWeight: 900, color: C.cyan, lineHeight: 1 }}>{overallScore}</span>
                                <span style={{ fontSize: '0.45rem', color: C.muted, letterSpacing: '0.06em' }}>SKOR</span>
                            </div>
                        </div>
                        <div style={{ height: 230, position: 'relative', minWidth: 0, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="62%" data={psychData}>
                                    <defs>
                                        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%"   stopColor={C.cyan}  stopOpacity={0.35}/>
                                            <stop offset="100%" stopColor={C.blue}  stopOpacity={0.08}/>
                                        </radialGradient>
                                        <filter id="radarGlow">
                                            <feGaussianBlur stdDeviation="2" result="blur"/>
                                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                        </filter>
                                    </defs>
                                    {/* İç grid halkaları — noktalı siber çizgiler */}
                                    <PolarGrid
                                        stroke={`${C.cyan}30`}
                                        strokeDasharray="3 4"
                                        gridType="circle"
                                    />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={({ x, y, payload }) => (
                                            <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                                                fill={C.cyan} fontSize={10} fontWeight={800}
                                                style={{ fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                            >
                                                {payload.value}
                                            </text>
                                        )}
                                    />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false}/>
                                    {/* Glow katmanı (daha parlak, şeffaf) */}
                                    <Radar name="Glow" dataKey="A" stroke={C.cyan} strokeWidth={6}
                                        fill="transparent" strokeOpacity={0.18} dot={false}
                                    />
                                    {/* Ana radar alanı */}
                                    <Radar name="Skor" dataKey="A"
                                        stroke={C.cyan} strokeWidth={2}
                                        fill="url(#radarFill)" fillOpacity={1}
                                        dot={(props) => {
                                            const { cx, cy } = props;
                                            return (
                                                <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5}
                                                    fill={C.cyan} stroke="rgba(0,0,0,0.6)" strokeWidth={1.5}
                                                    style={{ filter: `drop-shadow(0 0 5px ${C.cyan})` }}
                                                />
                                            );
                                        }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(5,8,18,0.96)', border: `1px solid ${C.cyan}40`,
                                            borderRadius: 10, fontSize: '0.8rem',
                                            boxShadow: `0 0 20px ${C.cyan}20`,
                                        }}
                                        formatter={(v) => [<span style={{ color: C.cyan, fontWeight: 800 }}>{v}</span>, t('dashboard.radarTooltipScore')]}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════
                BÖLÜM 4 — AI & PSİKOLOJİK ANALİZ
            ════════════════════════════════════════════════════════════ */}
            <div className="aesthetic-card" style={{ padding: 28, borderBottom: `3px solid ${C.purple}` }}>
                <SectionHeader icon={<Brain />} title={t('dashboard.ml.title')} subtitle={t('dashboard.ml.subtitle')} color={C.purple} />

                {/* Mental Leakage Haritası */}
                <div style={{ background: `linear-gradient(135deg, ${C.purple}0a, transparent)`, border: `1px solid ${C.purple}33`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{t('dashboard.ml.mapTitle')}</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: C.muted }}>{t('dashboard.ml.mapSubtitle')}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: C.muted }}>{t('dashboard.ml.totalLeakage')}</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: C.red }}><ZenValue value={`$${ml.total_leakage || 0}`} /></div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                        {[
                            {
                                key: 'revenge_trading',
                                label: t('dashboard.ml.revenge.label'),
                                desc: t('dashboard.ml.revenge.desc'),
                                color: C.red,
                                glowColor: 'rgba(239,68,68,0.55)',
                                tip: 'intikam/revenge/telafi içeren notlar'
                            },
                            {
                                key: 'fomo_trading',
                                label: t('dashboard.ml.fomo.label'),
                                desc: t('dashboard.ml.fomo.desc'),
                                color: C.orange,
                                glowColor: 'rgba(249,115,22,0.55)',
                                tip: 'fomo/kaçırma/hızlı içeren notlar'
                            },
                            {
                                key: 'overconfidence',
                                label: t('dashboard.ml.overconf.label'),
                                desc: t('dashboard.ml.overconf.desc'),
                                color: C.yellow,
                                glowColor: 'rgba(234,179,8,0.45)',
                                tip: 'kesin/garantili/all in içeren notlar'
                            },
                            {
                                key: 'high_risk_violations',
                                label: t('dashboard.ml.ruleBreak.label'),
                                desc: t('dashboard.ml.ruleBreak.desc'),
                                color: C.yellow,
                                glowColor: 'rgba(234,179,8,0.45)',
                                tip: 'Risk yüzdesi > %2 olan işlemler'
                            },
                        ].map((item, i) => {
                            const data = ml[item.key] || { count: 0, total_loss: 0 };
                            const hasData = data.count > 0;
                            return (
                                <div key={i} style={{
                                    padding: '20px 20px 16px',
                                    background: hasData
                                        ? `linear-gradient(145deg, ${item.color}12, rgba(5,8,18,0.7))`
                                        : 'rgba(255,255,255,0.03)',
                                    borderRadius: 14,
                                    borderTop: '1px solid rgba(255,255,255,0.07)',
                                    borderRight: '1px solid rgba(255,255,255,0.04)',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    borderLeft: `4px solid ${hasData ? item.color : 'rgba(255,255,255,0.10)'}`,
                                    boxShadow: hasData
                                        ? `-4px 0 18px ${item.glowColor}, 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)`
                                        : '0 4px 16px rgba(0,0,0,0.25)',
                                    transition: 'box-shadow 0.3s',
                                    backdropFilter: 'blur(12px)',
                                }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.87rem', marginBottom: 3, color: hasData ? item.color : 'rgba(255,255,255,0.7)' }}>{item.label}</div>
                                    <div style={{ fontSize: '0.68rem', color: C.muted, marginBottom: 14 }}>{item.desc}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                                        <div>
                                            <div style={{ fontSize: '0.6rem', color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{t('dashboard.ml.count')}</div>
                                            <div style={{
                                                fontSize: '2.2rem', fontWeight: 900, lineHeight: 1,
                                                color: hasData ? item.color : 'rgba(255,255,255,0.25)',
                                                textShadow: hasData ? `0 0 20px ${item.glowColor}` : 'none',
                                            }}>{data.count}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.6rem', color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{t('dashboard.ml.totalLoss')}</div>
                                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: hasData ? C.red : 'rgba(255,255,255,0.2)' }}>
                                                <ZenValue value={`-$${data.total_loss}`} />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Aktivite bar */}
                                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(100, data.count * 15)}%`,
                                            background: `linear-gradient(90deg, ${item.color}88, ${item.color})`,
                                            borderRadius: 2,
                                            boxShadow: `0 0 6px ${item.glowColor}`,
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Disiplin Skoru */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={{ background: 'var(--bg-app)', borderRadius: 16, padding: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 800 }}>Disiplin Karnesi</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'Disiplin', val: Math.round(discipline), color: C.blue },
                                { label: 'Risk Yönetimi', val: Math.round(riskScore), color: C.green },
                                { label: 'Sabır', val: Math.round(patience), color: C.purple },
                                { label: 'Odak/Analiz', val: Math.round(focus), color: C.cyan },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.label}</span>
                                        <span style={{ fontWeight: 800, color: item.color }}>{item.val}</span>
                                    </div>
                                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${item.val}%`, background: `linear-gradient(90deg, ${item.color}88, ${item.color})`, borderRadius: 10, transition: 'width 0.8s ease' }} />
                                    </div>
                                </div>
                            ))}
                            <div style={{ marginTop: 8, padding: '12px 16px', background: `${C.purple}0f`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${C.purple}33` }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Genel AI Skor</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: C.purple }}>{overallScore}<span style={{ fontSize: '0.85rem', color: C.muted }}>/100</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Balina Korelasyonu — Gauge */}
                    {(() => {
                        const same    = s.whale_correlation_same     ?? null;
                        const opp     = s.whale_correlation_opposite ?? null;
                        const neutral = s.whale_correlation_neutral  ?? null;
                        const hasCorr = same !== null;

                        // Gauge: 0=tam ters, 50=nötr, 100=tam aynı
                        // same - opposite → [-100, 100], normalize to [0,100]
                        const rawScore = hasCorr ? Math.round(50 + ((same - opp) / 2)) : 50;
                        const gaugeScore = Math.max(0, Math.min(100, rawScore));

                        // SVG semi-circle gauge parametreleri
                        const W = 220, H = 120;
                        const cx = W / 2, cy = H - 10;
                        const R = 90;
                        // Açı: -180° (sol = ters) → 0° (sağ = aynı), merkez aşağı
                        const startAngle = Math.PI;   // sol
                        const endAngle   = 0;         // sağ
                        const toRad = (pct) => startAngle - (startAngle - endAngle) * (pct / 100);

                        const arcPath = (r, sA, eA) => {
                            const x1 = cx + r * Math.cos(sA), y1 = cy - r * Math.sin(sA);
                            const x2 = cx + r * Math.cos(eA), y2 = cy - r * Math.sin(eA);
                            return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
                        };

                        // İbre açısı
                        const needleAngle = toRad(gaugeScore);
                        const nLen = R - 14;
                        const nx = cx + nLen * Math.cos(needleAngle);
                        const ny = cy - nLen * Math.sin(needleAngle);

                        const gaugeColor = gaugeScore >= 60 ? C.green : gaugeScore >= 40 ? C.cyan : C.red;

                        return (
                            <div className="dash-glass-chart" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 800 }}>Balina Akışı Korelasyonu</h3>
                                <p style={{ margin: '0 0 16px', fontSize: '0.73rem', color: C.muted }}>İşlemleriniz büyük cüzdan hareketleriyle ne kadar korele?</p>

                                {/* Gauge SVG */}
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                                    <svg width={W} height={H + 10} viewBox={`0 0 ${W} ${H + 10}`}>
                                        <defs>
                                            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%"   stopColor={C.red}   stopOpacity={0.9}/>
                                                <stop offset="40%"  stopColor={C.cyan}  stopOpacity={0.8}/>
                                                <stop offset="100%" stopColor={C.green} stopOpacity={0.9}/>
                                            </linearGradient>
                                            <filter id="needleGlow">
                                                <feGaussianBlur stdDeviation="2.5" result="blur"/>
                                                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                            </filter>
                                        </defs>

                                        {/* Arka plan yay */}
                                        <path d={arcPath(R, startAngle, endAngle)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={14} strokeLinecap="round"/>
                                        {/* Renkli gradient yay */}
                                        <path d={arcPath(R, startAngle, endAngle)} fill="none" stroke="url(#gaugeGrad)" strokeWidth={14} strokeLinecap="round" opacity={hasCorr ? 1 : 0.25}/>
                                        {/* Bölme çizgileri */}
                                        {[0, 25, 50, 75, 100].map(pct => {
                                            const a = toRad(pct);
                                            const r1 = R + 10, r2 = R + 18;
                                            return (
                                                <line key={pct}
                                                    x1={cx + r1 * Math.cos(a)} y1={cy - r1 * Math.sin(a)}
                                                    x2={cx + r2 * Math.cos(a)} y2={cy - r2 * Math.sin(a)}
                                                    stroke="rgba(255,255,255,0.2)" strokeWidth={1.5}
                                                />
                                            );
                                        })}
                                        {/* Etiketler */}
                                        <text x={cx - R - 8} y={cy + 18} textAnchor="middle" fill={C.red}   fontSize={9} fontWeight={800}>TERS</text>
                                        <text x={cx}         y={cy - R - 12} textAnchor="middle" fill={C.cyan}  fontSize={9} fontWeight={800}>NÖTR</text>
                                        <text x={cx + R + 8} y={cy + 18} textAnchor="middle" fill={C.green} fontSize={9} fontWeight={800}>AYNI</text>

                                        {/* İbre */}
                                        {hasCorr && (
                                            <>
                                                <line x1={cx} y1={cy} x2={nx} y2={ny}
                                                    stroke={gaugeColor} strokeWidth={3} strokeLinecap="round"
                                                    filter="url(#needleGlow)"
                                                />
                                                <circle cx={cx} cy={cy} r={7} fill={gaugeColor} opacity={0.9}
                                                    style={{ filter: `drop-shadow(0 0 6px ${gaugeColor})` }}
                                                />
                                            </>
                                        )}

                                        {/* Merkez skor */}
                                        {hasCorr && (
                                            <text x={cx} y={cy - 22} textAnchor="middle" fill={gaugeColor}
                                                fontSize={18} fontWeight={900}
                                                style={{ filter: `drop-shadow(0 0 8px ${gaugeColor})` }}
                                            >
                                                {gaugeScore}
                                            </text>
                                        )}
                                        {!hasCorr && (
                                            <text x={cx} y={cy - 18} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={12} fontWeight={700}>Veri Bekleniyor</text>
                                        )}
                                    </svg>
                                </div>

                                {/* Detay satırları */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    {[
                                        { label: '🐋 Aynı Yön',  val: same,    color: C.green },
                                        { label: '🔄 Ters Yön',  val: opp,     color: C.red   },
                                        { label: '⚪ Nötr',      val: neutral, color: C.muted },
                                    ].map((row, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', width: 110, flexShrink: 0 }}>{row.label}</span>
                                            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: row.val !== null ? `${row.val}%` : '0%', background: row.color, borderRadius: 3, opacity: 0.85, transition: 'width 1s ease', boxShadow: `0 0 6px ${row.color}80` }} />
                                            </div>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: row.val !== null ? row.color : 'rgba(255,255,255,0.25)', width: 36, textAlign: 'right', flexShrink: 0 }}>
                                                {row.val !== null ? `%${row.val}` : '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 12, padding: '8px 12px', background: `${C.cyan}0a`, border: `1px solid ${C.cyan}25`, borderRadius: 8, fontSize: '0.68rem', color: C.muted, lineHeight: 1.5 }}>
                                    {!hasCorr
                                        ? `💡 Korelasyon için Canlı Balina Akışı sayfasında veri biriktirilmesi gerekiyor.`
                                        : `💡 Veriler gerçek Etherscan transferleri ile hesaplanmıştır.`
                                    }
                                </div>
                            </div>
                        );
                    })()}

                </div>
            </div>
            </>)}
        </div>
    );
};

/* ─── Ana Sayfa (Router) ─────────────────────────────────────── */
const Dashboard = () => {
    const isMobile = useIsMobile();
    return isMobile ? <MobileDashboard /> : <DesktopDashboard />;
};

export default Dashboard;