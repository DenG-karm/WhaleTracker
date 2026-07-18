/**
 * BacktestResult — Simülasyon Tam Ekran Sonuç Raporu
 * Gösterilen yer: BacktestLab step === 'ANALYSIS'
 */
import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import {
    Trophy, RefreshCw, ArrowLeft, Download,
    TrendingUp, TrendingDown, BarChart2, Zap, Target,
} from 'lucide-react';
import { motion } from 'framer-motion';

// ── Tema (BacktestLab paleti ile birebir uyumlu) ──────────────────────────
const T = {
    bg:        '#050810',
    bgCard:    'rgba(8, 12, 22, 0.82)',
    border:    'rgba(255, 255, 255, 0.07)',
    borderGlow:'rgba(34, 211, 238, 0.18)',
    neonUp:    '#00E676',
    neonDown:  '#FF3B30',
    neonCyan:  '#22d3ee',
    neonGold:  '#fbbf24',
    textMain:  '#e2e8f0',
    textMuted: 'rgba(255,255,255,0.35)',
};

// ── Recharts özel tooltip ─────────────────────────────────────────────────
const EqTooltip = ({ active, payload, label, startBalance }) => {
    if (!active || !payload?.length) return null;
    const bal = payload[0]?.value;
    const pnl = bal != null ? bal - startBalance : 0;
    return (
        <div style={{
            background: 'rgba(13,18,30,0.97)',
            border: '1px solid rgba(34,211,238,0.2)',
            borderRadius: 8, padding: '8px 12px', fontSize: 12,
            fontFamily: 'inherit',
        }}>
            <div style={{ color: T.textMuted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
            <div style={{ color: T.textMain, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                Bakiye: ${bal?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div style={{ color: pnl >= 0 ? T.neonUp : T.neonDown, fontWeight: 800, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                Net PnL: {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
            </div>
        </div>
    );
};

// ── Metrik Kart ───────────────────────────────────────────────────────────
const MetCard = ({ label, value, sub, color, Icon }) => (
    <div style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: 12, padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 8,
        backdropFilter: 'blur(12px)',
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon size={14} color={color} />
            <span style={{
                fontSize: '0.58rem', fontWeight: 700, color: T.textMuted,
                textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>{label}</span>
        </div>
        <div style={{
            fontSize: '1.65rem', fontWeight: 900, color,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            textShadow: `0 0 18px ${color}33`,
        }}>{value}</div>
        <div style={{ fontSize: '0.62rem', color: T.textMuted, fontWeight: 600 }}>{sub}</div>
    </div>
);

// ── Ana Bileşen ───────────────────────────────────────────────────────────
const BacktestResult = ({
    symbol = '',
    tf = '',
    tradeLog = [],
    virtualBalance = 10000,
    onNewSim,
    onBackToLobby,
}) => {

    // ── İstatistikler ──────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = tradeLog.length;
        if (total === 0) return {
            total: 0, winners: 0, losers: 0, winRate: 0,
            netPnl: 0, profitFactor: 0, maxDrawdown: 0,
        };
        const winners   = tradeLog.filter(t => t.pnl > 0);
        const losers    = tradeLog.filter(t => t.pnl < 0);
        const grossWin  = winners.reduce((s, t) => s + t.pnl, 0);
        const grossLoss = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));
        const pf        = grossLoss > 0
            ? grossWin / grossLoss
            : winners.length > 0 ? 99 : 0;
        let bal  = virtualBalance;
        let peak = virtualBalance;
        let maxDD = 0;
        for (const t of tradeLog) {
            bal += t.pnl;
            if (bal > peak) peak = bal;
            const dd = peak - bal;
            if (dd > maxDD) maxDD = dd;
        }
        return {
            total,
            winners:      winners.length,
            losers:       losers.length,
            winRate:      (winners.length / total) * 100,
            netPnl:       tradeLog.reduce((s, t) => s + t.pnl, 0),
            profitFactor: Math.min(pf, 99),
            maxDrawdown:  maxDD,
        };
    }, [tradeLog, virtualBalance]);

    const finalBalance = virtualBalance + stats.netPnl;
    const isProfit     = stats.netPnl >= 0;
    const resultColor  = isProfit ? T.neonUp : T.neonDown;

    // ── Equity Curve verisi ────────────────────────────────────────────
    const equityData = useMemo(() => {
        const pts = [{ label: 'S', balance: virtualBalance }];
        let bal = virtualBalance;
        tradeLog.forEach(tr => {
            bal += tr.pnl;
            pts.push({ label: `#${tr.id}`, balance: parseFloat(bal.toFixed(2)) });
        });
        return pts;
    }, [tradeLog, virtualBalance]);

    // Drawdown referans alanları (balance < peak olduğu bölgeler)
    const ddAreas = useMemo(() => {
        const areas = [];
        let inDD = false;
        let x1 = null;
        let peak = virtualBalance;
        equityData.forEach((pt, i) => {
            if (i === 0) return;
            if (pt.balance > peak) peak = pt.balance;
            const isDD = pt.balance < peak;
            if (isDD && !inDD) {
                inDD = true;
                x1   = equityData[i - 1].label;
            } else if (!isDD && inDD) {
                areas.push({ x1, x2: pt.label });
                inDD = false;
            }
        });
        if (inDD && equityData.length > 0) {
            areas.push({ x1, x2: equityData[equityData.length - 1].label });
        }
        return areas;
    }, [equityData, virtualBalance]);

    // ── CSV İndirme ────────────────────────────────────────────────────
    const handleCSV = () => {
        const headers = ['#', 'Yön', 'Giriş Fiyatı', 'Çıkış Fiyatı', 'Miktar', 'PnL', 'Çıkış Sebebi'];
        const rows = tradeLog.map(tr => [
            tr.id,
            tr.direction,
            tr.entry.toFixed(4),
            tr.exit.toFixed(4),
            tr.size.toFixed(2),
            tr.pnl.toFixed(2),
            tr.type === 'TP' ? 'TP' : tr.type === 'SL' ? 'SL' : 'Manuel',
        ]);
        const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `backtest-${symbol}-${tf}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── YAxis formatlayıcı ─────────────────────────────────────────────
    const yFmt = v =>
        Math.abs(v) >= 1000
            ? `$${(v / 1000).toFixed(1)}k`
            : `$${Number(v).toFixed(0)}`;

    // ── Metrik kart konfigürasyonu ─────────────────────────────────────
    const metCards = [
        {
            label: 'Win Rate',
            value: `${stats.winRate.toFixed(1)}%`,
            sub:   `${stats.winners}W  /  ${stats.losers}L`,
            color: stats.winRate >= 50 ? '#2dd4bf' : '#f59e0b',
            Icon:  TrendingUp,
        },
        {
            label: 'Profit Factor',
            value: stats.profitFactor >= 99 ? '∞' : stats.profitFactor.toFixed(2),
            sub:   stats.profitFactor >= 1.5 ? 'Güçlü' : stats.profitFactor >= 1 ? 'Zayıf' : 'Negatif',
            color: stats.profitFactor >= 1.5 ? '#22c55e' : stats.profitFactor < 1 ? '#ef4444' : T.textMain,
            Icon:  Zap,
        },
        {
            label: 'Max Drawdown',
            value: `$${stats.maxDrawdown.toFixed(2)}`,
            sub:   stats.maxDrawdown > 0
                ? `${((stats.maxDrawdown / virtualBalance) * 100).toFixed(1)}% bakiye`
                : '—',
            color: '#f97316',
            Icon:  TrendingDown,
        },
        {
            label: 'Toplam İşlem',
            value: String(stats.total),
            sub:   `${stats.winners} kazanan · ${stats.losers} kaybeden`,
            color: T.textMain,
            Icon:  Target,
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(5,8,16,0.97)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                overflowY: 'auto',
                display: 'flex', flexDirection: 'column',
                fontFamily: "'Inter', system-ui, sans-serif",
            }}
        >
            {/* Dekoratif arkaplan glowları */}
            <div style={{ position: 'fixed', top: '8%',    left: '5%',  width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', bottom: '8%', right: '5%', width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle, ${resultColor}08 0%, transparent 70%)`, pointerEvents: 'none' }} />

            <div style={{
                maxWidth: 1100, margin: '0 auto', width: '100%',
                padding: '24px 24px 48px', boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column', gap: 22,
            }}>

                {/* ─────────────── HEADER ─────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                        {/* Başlık */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 11,
                                background: 'rgba(251,191,36,0.12)',
                                border: '1px solid rgba(251,191,36,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <Trophy size={20} color={T.neonGold} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', letterSpacing: '0.02em' }}>
                                    Simülasyon Sonucu
                                </div>
                                <div style={{ fontSize: '0.65rem', color: T.textMuted, marginTop: 3, fontWeight: 600 }}>
                                    {symbol}  ·  {tf}  ·  {tradeLog.length} kapalı işlem
                                </div>
                            </div>
                        </div>

                        {/* Bakiye özeti */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            {/* Başlangıç */}
                            <div>
                                <div style={{ fontSize: '0.52rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Başlangıç Bakiye</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: T.textMain, fontVariantNumeric: 'tabular-nums' }}>
                                    ${virtualBalance.toLocaleString()}
                                </div>
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1.4rem', fontWeight: 300 }}>→</div>
                            {/* Bitiş */}
                            <div>
                                <div style={{ fontSize: '0.52rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Bitiş Bakiye</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: isProfit ? T.neonUp : T.neonDown, fontVariantNumeric: 'tabular-nums' }}>
                                    ${finalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.08)' }} />
                            {/* Net PnL (büyük) */}
                            <div>
                                <div style={{ fontSize: '0.52rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>
                                    Net PnL  ({isProfit ? 'KAR' : 'ZARAR'})
                                </div>
                                <div style={{
                                    fontSize: '1.65rem', fontWeight: 900, color: resultColor,
                                    fontVariantNumeric: 'tabular-nums',
                                    textShadow: `0 0 24px ${resultColor}44`,
                                }}>
                                    {isProfit ? '+' : ''}${stats.netPnl.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sağ: CSV butonu */}
                    <div style={{ alignSelf: 'flex-start', marginTop: 6 }}>
                        <button onClick={handleCSV} style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '8px 15px', borderRadius: 8, cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: T.textMuted, fontSize: '0.72rem', fontWeight: 700,
                            transition: '0.15s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)'; e.currentTarget.style.color = T.neonCyan; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = T.textMuted; }}
                        >
                            <Download size={13} /> CSV İndir
                        </button>
                    </div>
                </div>

                {/* ─────────────── METRİK KARTLAR (4'lü grid) ─────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                }}>
                    {metCards.map(card => <MetCard key={card.label} {...card} />)}
                </div>

                {/* ─────────────── EQUİTY CURVE ────────────────────────────── */}
                <div style={{
                    background: T.bgCard, border: `1px solid ${T.border}`,
                    borderRadius: 14, padding: '18px 20px',
                    backdropFilter: 'blur(12px)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                        <BarChart2 size={15} color={T.neonCyan} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Equity Curve
                        </span>
                        <span style={{ fontSize: '0.6rem', color: T.textMuted, fontWeight: 600, marginLeft: 4 }}>
                            Kümülatif bakiye seyri
                        </span>
                        <div style={{ flex: 1 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.58rem', color: T.textMuted, fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 20, height: 2, background: T.neonCyan, display: 'inline-block', borderRadius: 1 }} />
                                Bakiye
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 12, height: 12, background: 'rgba(255,59,48,0.18)', border: '1px solid rgba(255,59,48,0.3)', display: 'inline-block', borderRadius: 2 }} />
                                Drawdown
                            </span>
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart
                            data={equityData}
                            margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="btEqGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.28} />
                                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.04)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="label"
                                stroke="rgba(255,255,255,0.08)"
                                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.28)', fontFamily: 'inherit' }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                stroke="rgba(255,255,255,0.08)"
                                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.28)', fontFamily: 'inherit' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={yFmt}
                                width={54}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                content={<EqTooltip startBalance={virtualBalance} />}
                                cursor={{ stroke: 'rgba(34,211,238,0.2)', strokeWidth: 1, strokeDasharray: '4 3' }}
                            />
                            {/* Başlangıç bakiyesi referans çizgisi */}
                            <ReferenceLine
                                y={virtualBalance}
                                stroke="rgba(255,255,255,0.15)"
                                strokeDasharray="5 4"
                                label={{
                                    value: 'Başlangıç',
                                    position: 'insideTopRight',
                                    fill: 'rgba(255,255,255,0.22)',
                                    fontSize: 10,
                                    fontFamily: 'inherit',
                                }}
                            />
                            {/* Drawdown bölgeleri – hafif kırmızı dolgu */}
                            {ddAreas.map((a, i) => (
                                <ReferenceArea
                                    key={i}
                                    x1={a.x1}
                                    x2={a.x2}
                                    fill="rgba(255,59,48,0.09)"
                                    strokeOpacity={0}
                                />
                            ))}
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#22d3ee"
                                strokeWidth={2.2}
                                fill="url(#btEqGrad)"
                                dot={tradeLog.length <= 40 ? { r: 3, fill: '#22d3ee', stroke: '#050810', strokeWidth: 1.5 } : false}
                                activeDot={{ r: 5, fill: '#22d3ee', stroke: '#050810', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* ─────────────── İŞLEM TABLOSU ───────────────────────────── */}
                <div style={{
                    background: T.bgCard, border: `1px solid ${T.border}`,
                    borderRadius: 14, overflow: 'hidden',
                    backdropFilter: 'blur(12px)',
                }}>
                    {/* Tablo başlığı */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '13px 18px', borderBottom: `1px solid ${T.border}`,
                    }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            İşlem Geçmişi
                        </span>
                        <span style={{
                            padding: '2px 8px', borderRadius: 5,
                            background: 'rgba(34,211,238,0.1)',
                            border: '1px solid rgba(34,211,238,0.2)',
                            fontSize: '0.6rem', fontWeight: 700, color: T.neonCyan,
                        }}>
                            {tradeLog.length} işlem
                        </span>
                        <div style={{ flex: 1 }} />
                        <button onClick={handleCSV} style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                            color: T.textMuted, fontSize: '0.65rem', fontWeight: 700,
                            transition: '0.15s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.color = T.neonCyan; e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                        >
                            <Download size={11} /> CSV
                        </button>
                    </div>

                    {/* Scrollable tablo */}
                    <div style={{ overflowY: 'auto', maxHeight: 300 }}>
                        {tradeLog.length === 0 ? (
                            <div style={{ padding: 28, textAlign: 'center', color: T.textMuted, fontSize: '0.72rem', fontWeight: 600 }}>
                                Kapalı işlem yok
                            </div>
                        ) : (
                            <table style={{
                                width: '100%', borderCollapse: 'collapse',
                                fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums',
                            }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'rgba(8,12,22,0.98)', zIndex: 2 }}>
                                    <tr>
                                        {['#', 'Yön', 'Giriş Fiyatı', 'Çıkış Fiyatı', 'Miktar', 'PnL', 'Çıkış Sebebi'].map((h, i) => (
                                            <th key={i} style={{
                                                padding: '9px 16px',
                                                textAlign: i < 2 ? 'left' : 'right',
                                                borderBottom: `1px solid ${T.border}`,
                                                fontSize: '0.56rem', fontWeight: 800,
                                                color: T.textMuted,
                                                textTransform: 'uppercase', letterSpacing: '0.07em',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...tradeLog].reverse().map(tr => {
                                        const isWin    = tr.pnl > 0;
                                        const exitType = tr.type === 'TP' ? 'TP' : tr.type === 'SL' ? 'SL' : 'Manuel';
                                        const typeColor = tr.type === 'TP' ? T.neonUp : tr.type === 'SL' ? T.neonDown : T.neonCyan;
                                        return (
                                            <tr
                                                key={tr.id}
                                                style={{
                                                    borderBottom: `1px solid rgba(255,255,255,0.03)`,
                                                    background: isWin
                                                        ? 'rgba(0,230,118,0.03)'
                                                        : 'rgba(255,59,48,0.03)',
                                                    transition: 'background 0.12s',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.05)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = isWin ? 'rgba(0,230,118,0.03)' : 'rgba(255,59,48,0.03)'; }}
                                            >
                                                <td style={{ padding: '9px 16px', color: T.textMuted }}>{tr.id}</td>
                                                <td style={{ padding: '9px 16px', color: tr.direction === 'LONG' ? T.neonUp : T.neonDown, fontWeight: 800 }}>
                                                    {tr.direction === 'LONG' ? '▲' : '▼'} {tr.direction}
                                                </td>
                                                <td style={{ padding: '9px 16px', textAlign: 'right', color: T.textMain }}>
                                                    {tr.entry.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                                </td>
                                                <td style={{ padding: '9px 16px', textAlign: 'right', color: T.textMain }}>
                                                    {tr.exit.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                                </td>
                                                <td style={{ padding: '9px 16px', textAlign: 'right', color: T.textMuted }}>
                                                    ${tr.size.toFixed(2)}
                                                </td>
                                                <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 800, color: isWin ? T.neonUp : T.neonDown }}>
                                                    {isWin ? '+' : ''}${tr.pnl.toFixed(2)}
                                                </td>
                                                <td style={{ padding: '9px 16px', textAlign: 'right' }}>
                                                    <span style={{
                                                        padding: '3px 8px', borderRadius: 5,
                                                        background: `${typeColor}18`,
                                                        color: typeColor,
                                                        fontWeight: 800, fontSize: '0.62rem',
                                                        letterSpacing: '0.04em',
                                                    }}>
                                                        {exitType}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* ─────────────── FOOTER BUTONLARI ────────────────────────── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 12, paddingTop: 8, flexWrap: 'wrap',
                }}>
                    <button onClick={onNewSim} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 26px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${T.neonCyan}44`,
                        background: 'rgba(34,211,238,0.1)',
                        color: T.neonCyan, fontSize: '0.82rem', fontWeight: 800,
                        letterSpacing: '0.04em', transition: '0.15s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.18)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(34,211,238,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <RefreshCw size={15} /> Yeni Simülasyon Başlat
                    </button>
                    <button onClick={onBackToLobby} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 26px', borderRadius: 10, cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        color: T.textMuted, fontSize: '0.82rem', fontWeight: 700,
                        transition: '0.15s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = T.textMain; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = T.textMuted; }}
                    >
                        <ArrowLeft size={15} /> Lobi'ye Dön
                    </button>
                    <button onClick={handleCSV} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 26px', borderRadius: 10, cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)',
                        color: T.textMuted, fontSize: '0.82rem', fontWeight: 700,
                        transition: '0.15s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = T.textMain; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = T.textMuted; }}
                    >
                        <Download size={15} /> CSV İndir
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default BacktestResult;
