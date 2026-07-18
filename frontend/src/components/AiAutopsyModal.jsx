import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Brain, CheckCircle } from 'lucide-react';

// ─── CSS animation keyframes (singleton inject) ─────────────────────────────
const SPIN_STYLE_ID = 'wt-autopsy-spin';
if (!document.getElementById(SPIN_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = SPIN_STYLE_ID;
    style.textContent = `
        @keyframes wt-spin { to { transform: rotate(360deg); } }
        @keyframes wt-pulse-ring { 0%,100% { opacity:0.4; transform:scale(1); } 50% { opacity:1; transform:scale(1.06); } }
        @keyframes wt-scanline { 0% { top: 0%; } 100% { top: 100%; } }
        @keyframes wt-tag-pop { 0% { transform:scale(0.7); opacity:0; } 70% { transform:scale(1.07); } 100% { transform:scale(1); opacity:1; } }
    `;
    document.head.appendChild(style);
}

// ─── Mock AI Engine ──────────────────────────────────────────────────────────
// İşlem verilerine bakarak etiket + yorum üretir (yüzde tabanlı)
const runMockAutopsy = (trade, exitPrice) => {
    const entry = Number(trade.entry_price);
    const exit  = Number(exitPrice);
    if (!entry || !exit || entry === exit) {
        return { tag: 'STOP_HIT', color: '#eab308', pnlPct: '0.00', isWin: false, durationHrs: 0 };
    }

    // Yön tespiti — strategy_note veya title'dan
    const noteText = ((trade.strategy_note || '') + ' ' + (trade.title || '')).toUpperCase();
    const isShort  = noteText.includes('SHORT') || noteText.includes('SELL');
    const rawPct   = ((exit - entry) / entry) * 100;
    const pnlPct   = isShort ? -rawPct : rawPct;
    const isWin    = pnlPct > 0;

    const openedAt    = new Date(trade.date);
    const durationMs  = Date.now() - openedAt.getTime();
    const durationHrs = Math.max(durationMs / 3_600_000, 0);

    let tag;
    if (isWin) {
        if (durationHrs < 0.083)   tag = 'IMPULSE_WIN';       // < 5 dk
        else if (pnlPct > 5)       tag = 'PERFECT_PATIENCE';   // > %5 kâr
        else if (pnlPct < 1.5)     tag = 'EARLY_EXIT_WIN';     // < %1.5 kâr
        else                       tag = 'PLAN_FOLLOWED';
    } else {
        if (durationHrs < 0.083)            tag = 'IMPULSE_LOSS';     // < 5 dk
        else if (Math.abs(pnlPct) > 5)      tag = 'STREAK_BREAKER';   // > %5 zarar
        else if (Math.abs(pnlPct) < 1)      tag = 'FOMO_ENTRY';       // < %1 zarar
        else                                 tag = 'STOP_HIT';
    }

    const COLORS = {
        IMPULSE_WIN:      '#eab308',
        PERFECT_PATIENCE: '#10b981',
        EARLY_EXIT_WIN:   '#f59e0b',
        PLAN_FOLLOWED:    '#10b981',
        IMPULSE_LOSS:     '#ef4444',
        STREAK_BREAKER:   '#dc2626',
        FOMO_ENTRY:       '#f97316',
        STOP_HIT:         '#eab308',
    };

    return { tag, color: COLORS[tag], pnlPct: pnlPct.toFixed(2), isWin, durationHrs };
};

// ─── AiAutopsyModal ──────────────────────────────────────────────────────────
const AiAutopsyModal = ({ trade, exitPrice, onAccept, onClose }) => {
    const { t }  = useTranslation();
    const [phase, setPhase] = useState('scanning'); // 'scanning' | 'result'
    const [dots,  setDots]  = useState('');
    const autopsy = runMockAutopsy(trade, exitPrice);

    useEffect(() => {
        // Nokta animasyonu
        const dotInterval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 380);
        // 2.4 saniye sonra sonucu göster
        const timer = setTimeout(() => {
            clearInterval(dotInterval);
            setPhase('result');
        }, 2400);
        return () => { clearInterval(dotInterval); clearTimeout(timer); };
    }, []);

    // Klavye: Escape ile kapat
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleAccept = () => {
        const record = {
            tag:        autopsy.tag,
            label:      t(`autopsy.tags.${autopsy.tag}`),
            commentary: t(`autopsy.commentary.${autopsy.tag}`),
            color:      autopsy.color,
            pnlPct:     autopsy.pnlPct,
            isWin:      autopsy.isWin,
            entryPrice: trade.entry_price,
            exitPrice,
            symbol:     trade.symbol,
            timestamp:  new Date().toISOString(),
        };
        try {
            localStorage.setItem(`wt_autopsy_${trade.id}`, JSON.stringify(record));
        } catch (_) {}
        onAccept(record);
    };

    if (!trade) return null;

    const pnlColor = autopsy.isWin ? '#10b981' : '#ef4444';
    const pnlSign  = Number(autopsy.pnlPct) >= 0 ? '+' : '';
    const tagColor = autopsy.color;

    return (
        <div
            className="fade-in"
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 10001,
                background: 'rgba(4,8,20,0.90)',
                backdropFilter: 'blur(22px)',
                WebkitBackdropFilter: 'blur(22px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            {/* Modal kartı */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: 560, maxWidth: '95vw',
                    borderRadius: 24,
                    background: 'linear-gradient(145deg, rgba(15,22,42,0.97), rgba(10,14,30,0.99))',
                    border: '1px solid rgba(139,92,246,0.35)',
                    boxShadow: '0 0 80px rgba(139,92,246,0.12), 0 40px 100px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)',
                    padding: '36px 40px',
                    display: 'flex', flexDirection: 'column', gap: 26,
                    position: 'relative', overflow: 'hidden',
                }}
            >
                {/* Dekoratif arka ışık — tag rengine göre değişir */}
                <div style={{
                    position: 'absolute', top: -80, right: -80,
                    width: 280, height: 280, borderRadius: '50%',
                    background: `radial-gradient(circle, ${tagColor}15 0%, transparent 70%)`,
                    pointerEvents: 'none', transition: '1.5s',
                }} />
                <div style={{
                    position: 'absolute', bottom: -60, left: -60,
                    width: 200, height: 200, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* X kapat */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 18, right: 18,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '50%', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-muted)', transition: '0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                >
                    <X size={15} />
                </button>

                {/* ── HEADER ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        padding: 13, borderRadius: 16,
                        background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.35)',
                        color: '#8b5cf6', flexShrink: 0,
                        boxShadow: '0 0 20px rgba(139,92,246,0.2)',
                    }}>
                        <Brain size={22} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>
                            {t('autopsy.title')}
                        </h3>
                        <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <strong style={{ color: '#8b5cf6' }}>{trade.symbol}</strong>
                            {trade.title ? ` — ${trade.title}` : ''}
                        </p>
                    </div>
                </div>

                {/* ── İŞLEM ÖZETİ (entry → exit → sonuç) ── */}
                <div style={{
                    display: 'flex', gap: 0,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14, overflow: 'hidden',
                }}>
                    {[
                        { label: t('autopsy.entryLabel'), value: `$${Number(trade.entry_price).toLocaleString(undefined, { maximumFractionDigits: 6 })}`, color: 'white' },
                        { label: '→', value: null },
                        { label: t('autopsy.exitLabel'),  value: `$${Number(exitPrice).toLocaleString(undefined, { maximumFractionDigits: 6 })}`, color: 'white' },
                        { label: '→', value: null },
                        { label: t('autopsy.tradeResult'), value: `${pnlSign}${autopsy.pnlPct}%`, color: pnlColor },
                    ].map((item, i) =>
                        item.value === null ? (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'rgba(255,255,255,0.2)', fontSize: '1.1rem' }}>→</div>
                        ) : (
                            <div key={i} style={{ flex: 1, padding: '14px 16px', textAlign: 'center', borderRight: i < 4 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                                    {item.label}
                                </div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: item.color }}>
                                    {item.value}
                                </div>
                            </div>
                        )
                    )}
                </div>

                {/* ── TARAMA / SONUÇ FAZLARI ── */}
                {phase === 'scanning' ? (
                    <div className="fade-in" style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 22, padding: '20px 0',
                    }}>
                        {/* Dönen neon halka */}
                        <div style={{ position: 'relative', width: 88, height: 88 }}>
                            <div style={{
                                position: 'absolute', inset: 0, borderRadius: '50%',
                                border: '2px solid rgba(139,92,246,0.15)',
                                animation: 'wt-pulse-ring 2s ease-in-out infinite',
                            }} />
                            <div style={{
                                position: 'absolute', inset: 8, borderRadius: '50%',
                                background: 'rgba(139,92,246,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Brain size={30} color="#8b5cf6" />
                            </div>
                            {/* Dönen yay */}
                            <div style={{
                                position: 'absolute', inset: -3, borderRadius: '50%',
                                border: '3px solid transparent',
                                borderTopColor: '#8b5cf6',
                                borderRightColor: 'rgba(139,92,246,0.3)',
                                animation: 'wt-spin 0.9s linear infinite',
                            }} />
                            {/* Tarama çizgisi */}
                            <div style={{
                                position: 'absolute', left: 8, right: 8,
                                height: 1,
                                background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.8), transparent)',
                                animation: 'wt-scanline 1.5s ease-in-out infinite',
                                borderRadius: 1,
                            }} />
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#8b5cf6', letterSpacing: '0.02em' }}>
                                {t('autopsy.subtitle')}{dots}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 7, opacity: 0.8 }}>
                                {t('autopsy.scanning')}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* ── VERDICT KARTI ── */}
                        <div style={{
                            padding: '26px 28px', borderRadius: 18,
                            background: `linear-gradient(135deg, ${tagColor}14, rgba(0,0,0,0.35))`,
                            border: `1px solid ${tagColor}44`,
                            boxShadow: `0 0 32px ${tagColor}16, inset 0 1px 0 ${tagColor}20`,
                            position: 'relative', overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute', top: -25, right: -25,
                                width: 110, height: 110, borderRadius: '50%',
                                background: `radial-gradient(circle, ${tagColor}22, transparent 70%)`,
                                pointerEvents: 'none',
                            }} />

                            {/* Etiket rozeti */}
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 9,
                                padding: '6px 16px', borderRadius: 30,
                                background: `${tagColor}20`, border: `1px solid ${tagColor}55`,
                                marginBottom: 16,
                                animation: 'wt-tag-pop 0.45s cubic-bezier(.34,1.56,.64,1) both',
                            }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: tagColor,
                                    boxShadow: `0 0 10px ${tagColor}, 0 0 20px ${tagColor}66`,
                                }} />
                                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: tagColor, letterSpacing: '0.04em' }}>
                                    {t(`autopsy.tags.${autopsy.tag}`)}
                                </span>
                            </div>

                            {/* AI yorumu */}
                            <p style={{
                                margin: 0, fontSize: '0.93rem', lineHeight: 1.75,
                                color: 'rgba(255,255,255,0.88)', fontWeight: 500,
                            }}>
                                {t(`autopsy.commentary.${autopsy.tag}`)}
                            </p>
                        </div>

                        {/* ── AKSİYON BUTONLARI ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '14px 0', borderRadius: 12,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                    transition: '0.2s',
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                {t('autopsy.skipBtn')}
                            </button>
                            <button
                                onClick={handleAccept}
                                style={{
                                    padding: '14px 0', borderRadius: 12, border: 'none',
                                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                    color: 'white', fontWeight: 900, fontSize: '0.9rem',
                                    cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', gap: 10,
                                    boxShadow: '0 4px 28px rgba(139,92,246,0.45)',
                                    transition: '0.2s', letterSpacing: '0.01em',
                                }}
                                onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 36px rgba(139,92,246,0.6)'}
                                onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 28px rgba(139,92,246,0.45)'}
                            >
                                <CheckCircle size={17} />
                                {t('autopsy.acceptBtn')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiAutopsyModal;
