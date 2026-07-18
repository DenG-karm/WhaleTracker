import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Save, TrendingUp, BarChart2, Bitcoin, Globe,
    ShieldCheck, Target, Zap, CheckCircle2, RefreshCw,
    Brain, Bell, MessageSquare, Smartphone, Info,
} from 'lucide-react';

/* ── Constants ───────────────────────────────────────────────────────────── */
const LS_KEY = 'wt_user_profile';

const CHARACTER_OPTS = [
    { key: 'trader',   icon: TrendingUp, label: 'Active Trader',       accent: '#00dbe7' },
    { key: 'investor', icon: BarChart2,  label: 'Long-Term Investor',   accent: '#818cf8' },
];
const MARKET_OPTS = [
    { key: 'crypto',  icon: Bitcoin,   label: 'Crypto',    accent: '#f59e0b' },
    { key: 'stocks',  icon: TrendingUp, label: 'Stocks',   accent: '#10b981' },
    { key: 'forex',   icon: Globe,     label: 'Forex',     accent: '#6366f1' },
];
const RISK_OPTS = [
    { key: 'conservative', icon: ShieldCheck, label: 'Conservative', sublabel: '≤1% risk',           accent: '#10b981' },
    { key: 'balanced',     icon: Target,      label: 'Balanced',     sublabel: '1–3% risk',          accent: '#00dbe7' },
    { key: 'degen',        icon: Zap,         label: 'High Risk',    sublabel: '3–10%+',             accent: '#ef4444' },
];

/* ── Micro chip toggle ───────────────────────────────────────────────────── */
const Chip = ({ icon: Icon, label, selected, onClick, accent }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 13px', borderRadius: 8, cursor: 'pointer',
            border: `1px solid ${selected ? accent : 'rgba(255,255,255,0.08)'}`,
            background: selected ? `${accent}14` : 'rgba(255,255,255,0.03)',
            color: selected ? accent : 'rgba(255,255,255,0.4)',
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.03em',
            transition: 'all 0.16s ease', outline: 'none',
            boxShadow: selected ? `0 0 16px ${accent}22` : 'none',
        }}
        onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = `${accent}55`; e.currentTarget.style.color = accent; } }}
        onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
    >
        <Icon size={13} />
        {label}
        {selected && <CheckCircle2 size={11} style={{ marginLeft: 2 }} />}
    </button>
);

/* ── Section wrapper ─────────────────────────────────────────────────────── */
const Section = ({ title, tag, children }) => (
    <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#00dbe7', letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.75 }}>
                {title}
            </span>
            {tag && (
                <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: 'rgba(0,219,231,0.1)', color: 'rgba(0,219,231,0.7)', border: '1px solid rgba(0,219,231,0.2)' }}>
                    {tag}
                </span>
            )}
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
        </div>
        {children}
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════ */
export default function SettingsPanel({ isOpen, onClose }) {
    const [profile, setProfile] = useState({
        character: null, markets: [], risk: null,
        phone: '',
        notificationPrefs: { aiAlerts: true, smsEnabled: false },
    });
    const [saved, setSaved]     = useState(false);
    const [dirty, setDirty]     = useState(false);
    const [phoneError, setPhoneError] = useState('');

    /* ── Load from localStorage ──────────────────────────────────────────── */
    useEffect(() => {
        if (!isOpen) return;
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) setProfile(JSON.parse(raw));
        } catch {}
        setSaved(false);
        setDirty(false);
    }, [isOpen]);

    /* ── Setters ─────────────────────────────────────────────────────────── */
    const setCharacter = (key) => {
        setProfile(p => ({ ...p, character: key }));
        setDirty(true);
    };

    const toggleMarket = (key) => {
        setProfile(p => {
            const prev = p.markets || [];
            return { ...p, markets: prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key] };
        });
        setDirty(true);
    };

    const setRisk = (key) => {
        setProfile(p => ({ ...p, risk: key }));
        setDirty(true);
    };

    const setPhone = (val) => {
        setProfile(p => ({ ...p, phone: val }));
        setDirty(true);
        if (val && !/^[\+]?[0-9\s\-\(\)]{7,}$/.test(val)) {
            setPhoneError('Geçerli bir numara girin');
        } else {
            setPhoneError('');
            if (!val) setProfile(p => ({ ...p, phone: val, notificationPrefs: { ...(p.notificationPrefs || {}), smsEnabled: false } }));
        }
    };

    const togglePref = (key) => {
        setProfile(p => ({
            ...p,
            notificationPrefs: { ...(p.notificationPrefs || { aiAlerts: true, smsEnabled: false }), [key]: !p.notificationPrefs?.[key] },
        }));
        setDirty(true);
    };

    /* ── Save ────────────────────────────────────────────────────────────── */
    const handleSave = useCallback(() => {
        if (phoneError) return;
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(profile));
        } catch {}
        setSaved(true);
        setDirty(false);
        setTimeout(() => setSaved(false), 2200);
    }, [profile, phoneError]);

    /* ── Panel animation ─────────────────────────────────────────────────── */
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="sp-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 300,
                            background: 'rgba(0,0,0,0.52)',
                            backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
                        }}
                    />

                    {/* Panel */}
                    <motion.div
                        key="sp-panel"
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 32, stiffness: 340 }}
                        style={{
                            position: 'fixed', top: 0, right: 0, bottom: 0,
                            width: '100%', maxWidth: 420,
                            zIndex: 310,
                            background: 'rgba(6, 9, 20, 0.96)',
                            backdropFilter: 'blur(36px)', WebkitBackdropFilter: 'blur(36px)',
                            borderLeft: `1px solid ${saved ? '#00dbe7' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: saved
                                ? '-8px 0 60px rgba(0,219,231,0.18), -2px 0 0 rgba(0,219,231,0.4)'
                                : '-8px 0 60px rgba(0,0,0,0.6)',
                            display: 'flex', flexDirection: 'column',
                            transition: 'border-color 0.4s, box-shadow 0.4s',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '18px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            flexShrink: 0,
                        }}>
                            <div>
                                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#00dbe7', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 3 }}>
                                    TERMINAL CONFIG
                                </div>
                                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#e1e2eb', letterSpacing: '0.02em' }}>
                                    Profile Settings
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {dirty && (
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                                    >
                                        UNSAVED
                                    </motion.span>
                                )}
                                <button
                                    onClick={onClose}
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 12px' }}>

                            {/* ── Q1: Financial Character ───────────────── */}
                            <Section title="Financial Character" tag="PARAM 01">
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {CHARACTER_OPTS.map(o => (
                                        <Chip
                                            key={o.key} icon={o.icon} label={o.label} accent={o.accent}
                                            selected={profile.character === o.key}
                                            onClick={() => setCharacter(o.key)}
                                        />
                                    ))}
                                </div>
                            </Section>

                            {/* ── Q2: Target Markets ────────────────────── */}
                            <Section title="Target Markets" tag="PARAM 02">
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {MARKET_OPTS.map(o => (
                                        <Chip
                                            key={o.key} icon={o.icon} label={o.label} accent={o.accent}
                                            selected={(profile.markets || []).includes(o.key)}
                                            onClick={() => toggleMarket(o.key)}
                                        />
                                    ))}
                                </div>
                                <div style={{ marginTop: 8, fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
                                    Multi-select — affects data feed priority
                                </div>
                            </Section>

                            {/* ── Q3: Risk Tolerance ───────────────────── */}
                            <Section title="Risk Tolerance" tag="PARAM 03">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {RISK_OPTS.map(o => {
                                        const sel = profile.risk === o.key;
                                        return (
                                            <button
                                                key={o.key}
                                                onClick={() => setRisk(o.key)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                    padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                                                    border: `1px solid ${sel ? o.accent : 'rgba(255,255,255,0.07)'}`,
                                                    background: sel ? `${o.accent}0d` : 'rgba(255,255,255,0.02)',
                                                    outline: 'none', textAlign: 'left', width: '100%',
                                                    transition: 'all 0.16s ease',
                                                    boxShadow: sel ? `0 0 20px ${o.accent}18` : 'none',
                                                }}
                                                onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor = `${o.accent}44`; }}
                                                onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                                            >
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: sel ? `${o.accent}18` : 'rgba(255,255,255,0.04)',
                                                    border: `1px solid ${sel ? o.accent : 'rgba(255,255,255,0.08)'}`,
                                                    transition: 'all 0.16s',
                                                }}>
                                                    <o.icon size={16} color={sel ? o.accent : 'rgba(255,255,255,0.35)'} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: sel ? o.accent : '#e1e2eb', transition: 'color 0.16s' }}>{o.label}</div>
                                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>{o.sublabel}</div>
                                                </div>
                                                <AnimatePresence>
                                                    {sel && (
                                                        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.18 }}>
                                                            <CheckCircle2 size={16} color={o.accent} />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </button>
                                        );
                                    })}
                                </div>
                            </Section>

                            {/* ── AI Intelligence & Notifications ───────── */}
                            <Section title="AI İstihbarat ve Bildirim Ayarları" tag="PARAM 04">

                                {/* Master toggle: AI Risk Agent */}
                                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,230,118,0.04)', border: `1px solid ${(profile.notificationPrefs?.aiAlerts ?? true) ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.07)'}`, marginBottom: 10, transition: 'border-color 0.2s' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (profile.notificationPrefs?.aiAlerts ?? true) ? 'rgba(0,230,118,0.14)' : 'rgba(255,255,255,0.04)', border: `1px solid ${(profile.notificationPrefs?.aiAlerts ?? true) ? 'rgba(0,230,118,0.4)' : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.2s' }}>
                                                <Brain size={14} color={(profile.notificationPrefs?.aiAlerts ?? true) ? '#00E676' : 'rgba(255,255,255,0.3)'} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: (profile.notificationPrefs?.aiAlerts ?? true) ? '#00E676' : 'rgba(255,255,255,0.5)', transition: 'color 0.2s' }}>AI Risk ve Fırsat Ajanı</div>
                                                <div style={{ fontSize: '0.55rem', fontWeight: 700, color: (profile.notificationPrefs?.aiAlerts ?? true) ? 'rgba(0,230,118,0.6)' : 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>{(profile.notificationPrefs?.aiAlerts ?? true) ? 'AKTIF — 7/24 TARAMA' : 'DEVRE DIŞI'}</div>
                                            </div>
                                        </div>
                                        {/* Toggle switch */}
                                        <button
                                            onClick={() => togglePref('aiAlerts')}
                                            style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0, outline: 'none', position: 'relative', background: (profile.notificationPrefs?.aiAlerts ?? true) ? 'rgba(0,230,118,0.35)' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', boxShadow: (profile.notificationPrefs?.aiAlerts ?? true) ? '0 0 10px rgba(0,230,118,0.3)' : 'none' }}
                                        >
                                            <div style={{ position: 'absolute', top: 3, left: (profile.notificationPrefs?.aiAlerts ?? true) ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: (profile.notificationPrefs?.aiAlerts ?? true) ? '#00E676' : 'rgba(255,255,255,0.4)', transition: 'left 0.2s, background 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.55, margin: 0, letterSpacing: '0.02em' }}>
                                        Sistem, açık pozisyonlarını ve piyasa fırsatlarını 7/24 tarar. Kritik balina hareketlerinde ve risk durumlarında <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>e-posta ile standart olarak</span> uyarılırsın.
                                    </p>
                                </div>

                                {/* Phone input */}
                                <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: '0.54rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Smartphone size={10} />
                                        Telefon Numarası (Opsiyonel)
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="tel"
                                            value={profile.phone || ''}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="+90 5XX XXX XX XX"
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${phoneError ? 'rgba(239,68,68,0.5)' : profile.phone ? 'rgba(0,230,118,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, color: '#e1e2eb', padding: '9px 12px 9px 36px', fontSize: '0.78rem', fontWeight: 600, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                        />
                                        <Smartphone size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: phoneError ? '#ef4444' : profile.phone ? '#00E676' : 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                                    </div>
                                    {phoneError
                                        ? <p style={{ fontSize: '0.58rem', color: '#ef4444', margin: '4px 0 0', letterSpacing: '0.04em' }}>{phoneError}</p>
                                        : <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.22)', margin: '5px 0 0', lineHeight: 1.5, letterSpacing: '0.02em' }}>
                                            <Info size={9} style={{ verticalAlign: 'middle', marginRight: 4, opacity: 0.6 }} />
                                            E-postalar gecikebilir. Flash-crash veya ani likidite avlarında <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>saniyeler içinde doğrudan cebine</span> bildirim almak için numaranı ekleyebilirsin.
                                          </p>
                                    }
                                </div>

                                {/* SMS toggle */}
                                {(() => {
                                    const hasValidPhone = !!profile.phone && !phoneError;
                                    const smsOn = profile.notificationPrefs?.smsEnabled;
                                    return (
                                        <div style={{ padding: '10px 14px', borderRadius: 10, background: hasValidPhone ? (smsOn ? 'rgba(0,230,118,0.04)' : 'rgba(255,255,255,0.02)') : 'rgba(255,255,255,0.015)', border: `1px solid ${hasValidPhone && smsOn ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: hasValidPhone ? 1 : 0.45, transition: 'all 0.2s', cursor: hasValidPhone ? 'default' : 'not-allowed' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                <MessageSquare size={13} color={hasValidPhone && smsOn ? '#00E676' : 'rgba(255,255,255,0.3)'} />
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: hasValidPhone ? (smsOn ? '#00E676' : '#e1e2eb') : 'rgba(255,255,255,0.35)' }}>Anlık SMS Uyarıları</div>
                                                    <div style={{ fontSize: '0.57rem', color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>{hasValidPhone ? 'Opsiyonel — VIP Güvenlik Katmanı' : 'Önce geçerli bir numara girin'}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => hasValidPhone && togglePref('smsEnabled')}
                                                disabled={!hasValidPhone}
                                                style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: hasValidPhone ? 'pointer' : 'not-allowed', padding: 0, outline: 'none', position: 'relative', background: (hasValidPhone && smsOn) ? 'rgba(0,230,118,0.35)' : 'rgba(255,255,255,0.08)', transition: 'background 0.2s', boxShadow: (hasValidPhone && smsOn) ? '0 0 10px rgba(0,230,118,0.28)' : 'none' }}
                                            >
                                                <div style={{ position: 'absolute', top: 3, left: (hasValidPhone && smsOn) ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: (hasValidPhone && smsOn) ? '#00E676' : 'rgba(255,255,255,0.3)', transition: 'left 0.2s, background 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
                                            </button>
                                        </div>
                                    );
                                })()}
                            </Section>

                            {/* ── Current profile summary ───────────────── */}
                            <div style={{
                                padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                                background: 'rgba(0,219,231,0.04)',
                                border: '1px solid rgba(0,219,231,0.1)',
                            }}>
                                <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'rgba(0,219,231,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                                    ACTIVE CONFIGURATION
                                </div>
                                {[
                                    { label: 'Character', value: CHARACTER_OPTS.find(o => o.key === profile.character)?.label || '—' },
                                    { label: 'Markets',   value: (profile.markets || []).map(k => MARKET_OPTS.find(o => o.key === k)?.label).filter(Boolean).join(', ') || '—' },
                                    { label: 'Risk',      value: RISK_OPTS.find(o => o.key === profile.risk)?.label || '—' },
                                    { label: 'AI Ajan',   value: (profile.notificationPrefs?.aiAlerts ?? true) ? 'Aktif' : 'Kapalı' },
                                    { label: 'SMS',       value: profile.notificationPrefs?.smsEnabled ? 'Aktif' : 'Kapalı' },
                                ].map(row => (
                                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.06em' }}>{row.label}</span>
                                        <span style={{ fontSize: '0.72rem', color: '#e1e2eb', fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', gap: 10 }}>
                            {/* Reset */}
                            <button
                                onClick={() => { setProfile({ character: null, markets: [], risk: null, phone: '', notificationPrefs: { aiAlerts: true, smsEnabled: false } }); setPhoneError(''); setDirty(true); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '11px 14px', borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    background: 'rgba(255,255,255,0.03)',
                                    color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', fontWeight: 700,
                                    cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                            >
                                <RefreshCw size={13} />
                                Reset
                            </button>

                            {/* Save */}
                            <motion.button
                                onClick={handleSave}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                    background: saved
                                        ? 'linear-gradient(135deg, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.1) 100%)'
                                        : 'linear-gradient(135deg, rgba(0,219,231,0.22) 0%, rgba(0,219,231,0.1) 100%)',
                                    color: saved ? '#10b981' : '#00dbe7',
                                    fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                                    border: `1px solid ${saved ? 'rgba(16,185,129,0.45)' : 'rgba(0,219,231,0.4)'}`,
                                    boxShadow: saved ? '0 0 24px rgba(16,185,129,0.22)' : '0 0 18px rgba(0,219,231,0.15)',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {saved
                                    ? <><CheckCircle2 size={15} /> Saved</>
                                    : <><Save size={15} /> Save Config</>
                                }
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
