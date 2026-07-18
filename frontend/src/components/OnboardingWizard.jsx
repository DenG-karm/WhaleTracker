import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useTranslation } from 'react-i18next';
import { Zap, BarChart2, TrendingUp, Clock, ShieldOff, Scale, Flame, Bitcoin, Gem, LineChart, DollarSign, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

// ─── Veri Tanımları ────────────────────────────────────────────────────────────

const STEPS = [
    {
        step: 1,
        title: 'WhaleTracker\'a\nHoş Geldin.',
        subtitle: 'Ana ticaret tarzın nedir?',
        field: 'trading_style',
        single: true,
        options: [
            {
                value: 'Scalper',
                label: 'Scalper',
                desc: 'Saniyeler & dakikalar. Hız her şeydir.',
                icon: <Zap size={28} />,
                color: '#22d3ee',
            },
            {
                value: 'Day Trader',
                label: 'Day Trader',
                desc: 'Gün içi dalgalanmaları yakalar, gün bitmeden çıkar.',
                icon: <BarChart2 size={28} />,
                color: '#a855f7',
            },
            {
                value: 'Swing',
                label: 'Swing Trader',
                desc: 'Günler ve haftalar boyunca trendleri sürer.',
                icon: <TrendingUp size={28} />,
                color: '#22d3ee',
            },
            {
                value: 'Investor',
                label: 'Uzun Vade Yatırımcı',
                desc: 'Aylarca, yıllarca tutar. Bileşik büyüme peşinde.',
                icon: <Clock size={28} />,
                color: '#a855f7',
            },
        ],
    },
    {
        step: 2,
        title: 'Risk İştahın',
        subtitle: 'Risk toleransını nasıl tanımlarsın?',
        field: 'risk_tolerance',
        single: true,
        options: [
            {
                value: 'Low',
                label: 'Korumacı',
                desc: 'Sermaye güvende kalsın, fırsatı bekle.',
                icon: <ShieldOff size={28} />,
                color: '#22d3ee',
            },
            {
                value: 'Medium',
                label: 'Dengeli',
                desc: 'Risk ve getiriyi birlikte yönet.',
                icon: <Scale size={28} />,
                color: '#a855f7',
            },
            {
                value: 'High',
                label: 'Agresif',
                desc: 'Yüksek risk, yüksek getiri. Tam gaz.',
                icon: <Flame size={28} />,
                color: '#f97316',
            },
        ],
    },
    {
        step: 3,
        title: 'Piyasaların',
        subtitle: 'En çok hangi piyasalarda işlem yaparsın? (Çoklu seçim)',
        field: 'primary_markets',
        single: false,
        options: [
            {
                value: 'Crypto',
                label: 'Kripto',
                desc: 'BTC, ETH, Altcoinler',
                icon: <Bitcoin size={28} />,
                color: '#22d3ee',
            },
            {
                value: 'Commodities',
                label: 'Emtia',
                desc: 'Altın, Petrol, Gümüş',
                icon: <Gem size={28} />,
                color: '#f59e0b',
            },
            {
                value: 'Stocks',
                label: 'Hisse',
                desc: 'Borsa, Endeks, ETF',
                icon: <LineChart size={28} />,
                color: '#a855f7',
            },
            {
                value: 'Forex',
                label: 'Forex',
                desc: 'Döviz çiftleri, Majörler',
                icon: <DollarSign size={28} />,
                color: '#22d3ee',
            },
        ],
    },
];

// ─── Bileşen ──────────────────────────────────────────────────────────────────

const OnboardingWizard = ({ onComplete }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({ trading_style: null, risk_tolerance: null, primary_markets: [] });
    const [direction, setDirection] = useState('forward'); // 'forward' | 'back'
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const step = STEPS[currentStep];

    const isSelected = (field, value, single) => {
        if (single) return answers[field] === value;
        return answers[field].includes(value);
    };

    const handleSelect = (field, value, single) => {
        if (single) {
            setAnswers(prev => ({ ...prev, [field]: value }));
        } else {
            setAnswers(prev => {
                const list = prev[field];
                if (list.includes(value)) return { ...prev, [field]: list.filter(v => v !== value) };
                return { ...prev, [field]: [...list, value] };
            });
        }
    };

    const canProceed = () => {
        if (step.single) return answers[step.field] !== null;
        return answers[step.field].length > 0;
    };

    const goNext = () => {
        if (!canProceed()) return;
        if (currentStep < STEPS.length - 1) {
            setDirection('forward');
            setCurrentStep(s => s + 1);
        } else {
            handleSave();
        }
    };

    const goBack = () => {
        if (currentStep > 0) {
            setDirection('back');
            setCurrentStep(s => s - 1);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            await apiClient('/users/onboarding', {
                method: 'POST',
                body: {
                    trading_style: answers.trading_style,
                    risk_tolerance: answers.risk_tolerance,
                    primary_markets: answers.primary_markets,
                },
            });
            // "Aha!" anı: yeni kullanıcıya dashboard'a geçer geçmez AI koç selamı açılsın
            sessionStorage.setItem('wt_ai_welcome', JSON.stringify({
                style: answers.trading_style,
                risk: answers.risk_tolerance,
                markets: answers.primary_markets,
            }));
            setDone(true);
            setTimeout(() => {
                onComplete();
                navigate('/dashboard');
            }, 1400); // 2800ms → 1400ms: daha hızlı değere ulaşım
        } catch (e) {
            setError(e.message || t('onboarding.errorSaving'));
        } finally {
            setSaving(false);
        }
    };

    // ── Başarı Ekranı ─────────────────────────────────────────────────────────
    if (done) {
        return (
            <Overlay>
                <div style={styles.card}>
                    <div style={{ textAlign: 'center', padding: '48px 32px' }}>
                        <div style={{ ...styles.iconCircle, background: 'rgba(34,211,238,0.15)', boxShadow: '0 0 40px rgba(34,211,238,0.3)', margin: '0 auto 24px' }}>
                            <CheckCircle2 size={48} color="#22d3ee" />
                        </div>
                        <h2 style={{ ...styles.gradientTitle, fontSize: '2rem', marginBottom: 12 }}>
                            {t('onboarding.doneTitle')}
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: 1.6 }}>
                            {t('onboarding.doneBody1')}<br />
                            <strong style={{ color: '#22d3ee' }}>{t('onboarding.doneBody2')}</strong>{t('onboarding.doneBody3')}
                        </p>
                        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 8 }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: '#22d3ee',
                                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                    opacity: 0.8,
                                }} />
                            ))}
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: 16 }}>{t('onboarding.doneRedirecting')}</p>
                    </div>
                </div>
                <PulseKeyframes />
            </Overlay>
        );
    }

    return (
        <>
            <Overlay>
                <div style={styles.card}>
                    {/* Üst Stepper */}
                    <div style={styles.stepperRow}>
                        {STEPS.map((s, i) => (
                            <React.Fragment key={i}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: '0.85rem',
                                    background: i < currentStep
                                        ? 'linear-gradient(135deg, #22d3ee, #a855f7)'
                                        : i === currentStep
                                            ? 'rgba(34,211,238,0.15)'
                                            : 'rgba(255,255,255,0.05)',
                                    color: i <= currentStep ? '#22d3ee' : 'rgba(255,255,255,0.3)',
                                    border: i === currentStep ? '1px solid #22d3ee' : '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: i === currentStep ? '0 0 12px rgba(34,211,238,0.4)' : 'none',
                                    transition: 'all 0.3s ease',
                                    flexShrink: 0,
                                }}>
                                    {i < currentStep ? '✓' : i + 1}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div style={{
                                        flex: 1, height: 1,
                                        background: i < currentStep
                                            ? 'linear-gradient(to right, #22d3ee, #a855f7)'
                                            : 'rgba(255,255,255,0.1)',
                                        transition: 'background 0.4s ease',
                                    }} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* İçerik — Adım */}
                    <div key={currentStep} style={{ ...styles.stepContent, animation: `slideIn${direction === 'forward' ? 'Right' : 'Left'} 0.35s cubic-bezier(0.4,0,0.2,1) both` }}>
                        <div style={{ marginBottom: 28, textAlign: 'center' }}>
                            <h2 style={{ ...styles.gradientTitle, whiteSpace: 'pre-line' }}>
                                {step.title}
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', marginTop: 8 }}>
                                {step.subtitle}
                            </p>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: step.options.length === 3 ? 'repeat(3,1fr)' : 'repeat(2,1fr)',
                            gap: 14,
                        }}>
                            {step.options.map(opt => {
                                const selected = isSelected(step.field, opt.value, step.single);
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleSelect(step.field, opt.value, step.single)}
                                        style={{
                                            ...styles.optionCard,
                                            borderColor: selected ? opt.color : 'rgba(255,255,255,0.08)',
                                            background: selected
                                                ? `rgba(${hexToRgb(opt.color)}, 0.1)`
                                                : 'rgba(255,255,255,0.03)',
                                            boxShadow: selected
                                                ? `0 0 20px rgba(${hexToRgb(opt.color)}, 0.35), 0 0 1px rgba(${hexToRgb(opt.color)}, 0.6) inset`
                                                : 'none',
                                            transform: selected ? 'translateY(-2px)' : 'none',
                                        }}
                                    >
                                        <div style={{ color: opt.color, marginBottom: 10, filter: selected ? `drop-shadow(0 0 8px ${opt.color})` : 'none', transition: 'filter 0.3s' }}>
                                            {opt.icon}
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: selected ? '#fff' : 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                                            {opt.label}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                                            {opt.desc}
                                        </div>
                                        {!step.single && selected && (
                                            <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#000', fontWeight: 900 }}>
                                                ✓
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {error && (
                            <div style={{ marginTop: 16, color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Alt Butonlar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
                        <button
                            onClick={goBack}
                            disabled={currentStep === 0}
                            style={{
                                ...styles.navBtn,
                                opacity: currentStep === 0 ? 0.2 : 1,
                                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                            }}
                        >
                            <ChevronLeft size={16} /> Geri
                        </button>

                        <button
                            onClick={goNext}
                            disabled={!canProceed() || saving}
                            style={{
                                ...styles.primaryBtn,
                                opacity: canProceed() && !saving ? 1 : 0.4,
                                cursor: canProceed() && !saving ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {saving ? 'Kaydediliyor...' : currentStep === STEPS.length - 1 ? 'Profilimi Kaydet' : 'Devam Et'}
                            {!saving && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </Overlay>

            <SlideKeyframes />
        </>
    );
};

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

const Overlay = ({ children }) => (
    <div style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(10, 14, 23, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
    }}>
        {children}
    </div>
);

const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r},${g},${b}`;
};

const SlideKeyframes = () => (
    <style>{`
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(40px); }
            to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-40px); }
            to   { opacity: 1; transform: translateX(0); }
        }
    `}</style>
);

const PulseKeyframes = () => (
    <style>{`
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50%       { transform: scale(1.5); opacity: 0.3; }
        }
    `}</style>
);

// ─── Stiller ──────────────────────────────────────────────────────────────────

const styles = {
    card: {
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '36px 40px',
        width: '100%',
        maxWidth: 640,
        boxShadow: '0 0 80px rgba(0,0,0,0.6), 0 0 40px rgba(168,85,247,0.05)',
    },
    stepperRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 32,
    },
    stepContent: {
        minHeight: 340,
    },
    gradientTitle: {
        fontSize: '1.75rem',
        fontWeight: 900,
        lineHeight: 1.2,
        background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 60%, #ffffff 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        margin: 0,
    },
    optionCard: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '20px 14px',
        borderRadius: 16,
        border: '1px solid',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        outline: 'none',
        backdropFilter: 'blur(8px)',
    },
    iconCircle: {
        width: 80, height: 80, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    navBtn: {
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 20px', borderRadius: 10,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem',
        fontWeight: 500, cursor: 'pointer',
        transition: 'all 0.2s',
    },
    primaryBtn: {
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '12px 28px', borderRadius: 12,
        background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
        border: 'none', color: '#000',
        fontWeight: 700, fontSize: '0.95rem',
        cursor: 'pointer',
        boxShadow: '0 0 24px rgba(34,211,238,0.3)',
        transition: 'all 0.25s',
    },
};

export default OnboardingWizard;
