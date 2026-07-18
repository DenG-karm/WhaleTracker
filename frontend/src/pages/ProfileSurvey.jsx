import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, BarChart2, Globe, Bitcoin, ArrowRight,
    ShieldCheck, Zap, Target, CheckCircle2,
} from 'lucide-react';
import WhaleLogo from '../components/common/WhaleLogo';

/* ── Shared style tokens ─────────────────────────────────────────────────── */
const T = {
    bg:          '#050810',
    surface:     'rgba(10, 13, 26, 0.75)',
    border:      'rgba(255,255,255,0.07)',
    borderHover: 'rgba(0,219,231,0.35)',
    cyan:        '#00dbe7',
    cyanDim:     'rgba(0,219,231,0.12)',
    text:        '#e1e2eb',
    muted:       'rgba(255,255,255,0.35)',
};

/* ── Step variants for framer-motion ─────────────────────────────────────── */
const stepVariants = {
    enter: { opacity: 0, y: 28, filter: 'blur(6px)' },
    center: {
        opacity: 1, y: 0, filter: 'blur(0px)',
        transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] },
    },
    exit: {
        opacity: 0, y: -20, filter: 'blur(4px)',
        transition: { duration: 0.24, ease: [0.4, 0, 1, 1] },
    },
};

/* ── Cyber grid background ────────────────────────────────────────────────── */
const GridBg = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(0,219,231,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(0,219,231,0.022) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
        }} />
        <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '55vw', height: '55vw', background: 'radial-gradient(circle, rgba(0,219,231,0.06) 0%, transparent 68%)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-10%',  width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)' }} />
    </div>
);

/* ── Progress bar ─────────────────────────────────────────────────────────── */
const ProgressBar = ({ step, total }) => (
    <div style={{ width: '100%', marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: T.cyan, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                CONFIG STEP {step} / {total}
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: T.muted, letterSpacing: '0.08em' }}>
                {Math.round((step / total) * 100)}%
            </span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
                style={{ height: '100%', background: 'linear-gradient(90deg, #00dbe7, #7c3aed)', borderRadius: 2 }}
                animate={{ width: `${(step / total) * 100}%` }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {Array.from({ length: total }).map((_, i) => (
                <motion.div
                    key={i}
                    animate={{
                        background: i < step ? T.cyan : 'rgba(255,255,255,0.1)',
                        boxShadow: i < step ? `0 0 8px ${T.cyan}` : 'none',
                    }}
                    transition={{ duration: 0.3 }}
                    style={{ flex: 1, height: 2, borderRadius: 1 }}
                />
            ))}
        </div>
    </div>
);

/* ── Selection card ───────────────────────────────────────────────────────── */
const OptionCard = ({ icon: Icon, label, sublabel, selected, onClick, accentColor = T.cyan }) => (
    <motion.button
        onClick={onClick}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 16,
            padding: '18px 20px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
            background: selected ? `${accentColor}0f` : 'rgba(255,255,255,0.025)',
            border: `1px solid ${selected ? accentColor : T.border}`,
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            transition: 'border-color 0.18s, background 0.18s, box-shadow 0.18s',
            boxShadow: selected ? `0 0 28px ${accentColor}22, inset 0 1px 0 ${accentColor}18` : 'none',
            outline: 'none',
        }}
    >
        <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: selected ? `${accentColor}18` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${selected ? accentColor : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.18s',
        }}>
            <Icon size={20} color={selected ? accentColor : 'rgba(255,255,255,0.4)'} />
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: selected ? accentColor : T.text, letterSpacing: '0.02em', marginBottom: 2, transition: 'color 0.18s' }}>
                {label}
            </div>
            {sublabel && (
                <div style={{ fontSize: '0.72rem', color: T.muted, lineHeight: 1.4 }}>
                    {sublabel}
                </div>
            )}
        </div>
        <motion.div
            animate={{ opacity: selected ? 1 : 0, scale: selected ? 1 : 0.6 }}
            transition={{ duration: 0.2 }}
        >
            <CheckCircle2 size={18} color={accentColor} />
        </motion.div>
    </motion.button>
);

/* ── Continue button ─────────────────────────────────────────────────────── */
const ContinueBtn = ({ onClick, disabled, label = 'Continue', isLast = false }) => (
    <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={disabled ? {} : { y: -1, boxShadow: '0 0 44px rgba(0,219,231,0.35)' }}
        whileTap={disabled ? {} : { scale: 0.97 }}
        style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none',
            background: disabled
                ? 'rgba(255,255,255,0.05)'
                : isLast
                    ? 'linear-gradient(135deg, #00dbe7 0%, #00a8b5 100%)'
                    : 'rgba(0,219,231,0.15)',
            color: disabled ? 'rgba(255,255,255,0.2)' : isLast ? '#001f22' : T.cyan,
            fontSize: '0.875rem', fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            boxShadow: disabled ? 'none' : isLast ? '0 0 28px rgba(0,219,231,0.3)' : '0 0 18px rgba(0,219,231,0.15)',
            border: disabled ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${isLast ? 'transparent' : 'rgba(0,219,231,0.4)'}`,
            transition: 'box-shadow 0.2s, background 0.2s',
        }}
    >
        {isLast ? <Zap size={16} fill={disabled ? 'none' : '#001f22'} /> : null}
        {!isLast ? <ArrowRight size={16} /> : null}
        {label}
    </motion.button>
);

/* ── Step question label ─────────────────────────────────────────────────── */
const StepLabel = ({ index, question, hint }) => (
    <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: T.cyan, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10, opacity: 0.7 }}>
            CONFIGURATION MATRIX — PARAMETER {index}
        </div>
        <h2 style={{
            fontSize: 'clamp(1.4rem, 3vw, 1.95rem)', fontWeight: 800,
            color: T.text, lineHeight: 1.2, margin: 0, marginBottom: hint ? 10 : 0,
        }}>
            {question}
        </h2>
        {hint && (
            <p style={{ fontSize: '0.82rem', color: T.muted, margin: 0, lineHeight: 1.55 }}>{hint}</p>
        )}
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   STEPS CONFIG
═══════════════════════════════════════════════════════════════════════════ */
const STEPS = [
    {
        key: 'character',
        question: 'What is your financial character?',
        hint: 'This calibrates your terminal layout and default risk parameters.',
        type: 'single',
        options: [
            {
                key: 'trader',
                icon: TrendingUp,
                label: 'Active Trader',
                sublabel: 'Short-to-mid term. Technicals, momentum, and execution speed.',
                accent: '#00dbe7',
            },
            {
                key: 'investor',
                icon: BarChart2,
                label: 'Long-Term Investor',
                sublabel: 'Fundamentals-driven. Portfolio construction, macro cycles.',
                accent: '#818cf8',
            },
        ],
    },
    {
        key: 'markets',
        question: 'Which markets are you targeting?',
        hint: 'Multi-select. Your terminal data feeds will be configured accordingly.',
        type: 'multi',
        options: [
            {
                key: 'crypto',
                icon: Bitcoin,
                label: 'Crypto & Digital Assets',
                sublabel: 'BTC, ETH, altcoins — on-chain & DEX intelligence.',
                accent: '#f59e0b',
            },
            {
                key: 'stocks',
                icon: TrendingUp,
                label: 'Equities & Stocks',
                sublabel: 'US/EU markets, ETFs, sector rotation strategies.',
                accent: '#10b981',
            },
            {
                key: 'forex',
                icon: Globe,
                label: 'Forex & Commodities',
                sublabel: 'Major/minor FX pairs, gold, oil, macro plays.',
                accent: '#6366f1',
            },
        ],
    },
    {
        key: 'risk',
        question: 'Define your risk tolerance.',
        hint: 'Sets your default position sizing model and alert thresholds.',
        type: 'single',
        options: [
            {
                key: 'conservative',
                icon: ShieldCheck,
                label: 'Conservative',
                sublabel: 'Risk ≤1% per trade. Capital preservation priority.',
                accent: '#10b981',
            },
            {
                key: 'balanced',
                icon: Target,
                label: 'Balanced',
                sublabel: 'Risk 1–3% per trade. Growth with managed drawdown.',
                accent: '#00dbe7',
            },
            {
                key: 'degen',
                icon: Zap,
                label: 'High Risk / Degen',
                sublabel: 'Risk 3–10%+. Maximum upside, higher volatility tolerance.',
                accent: '#ef4444',
            },
        ],
    },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function ProfileSurvey() {
    const [stepIndex, setStepIndex] = useState(0);
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
    const [answers, setAnswers] = useState({ character: null, markets: [], risk: null });

    const step = STEPS[stepIndex];
    const isLast = stepIndex === STEPS.length - 1;

    /* ── Answer helpers ──────────────────────────────────────────────────── */
    const select = (key) => {
        if (step.type === 'single') {
            setAnswers(a => ({ ...a, [step.key]: key }));
        } else {
            setAnswers(a => {
                const prev = a[step.key];
                return {
                    ...a,
                    [step.key]: prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
                };
            });
        }
    };

    const isSelected = (key) =>
        step.type === 'single'
            ? answers[step.key] === key
            : answers[step.key].includes(key);

    const canContinue = () =>
        step.type === 'single'
            ? answers[step.key] !== null
            : answers[step.key].length > 0;

    /* ── Navigation ──────────────────────────────────────────────────────── */
    const advance = () => {
        if (!canContinue()) return;
        if (isLast) {
            localStorage.setItem('wt_user_profile', JSON.stringify(answers));
            window.location.href = '/entry';
            return;
        }
        setDirection(1);
        setStepIndex(i => i + 1);
    };

    /* ── Complete screen ─────────────────────────────────────────────────── */
    const isComplete = stepIndex === STEPS.length && answers.character !== null;

    return (
        <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <GridBg />

            {/* ── Top bar ────────────────────────────────────────────────── */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: 'rgba(5,8,16,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <WhaleLogo size="sm" showText={false} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: T.cyan, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                        Profile Configuration
                    </span>
                </div>
                <div style={{ fontSize: '0.62rem', color: T.muted, letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
                    Secure · Encrypted · Local
                </div>
            </div>

            {/* ── Card ──────────────────────────────────────────────────── */}
            <div style={{
                position: 'relative', zIndex: 1, width: '100%', maxWidth: 560,
                margin: '80px auto 32px', padding: '0 20px',
            }}>
                <div style={{
                    background: T.surface,
                    backdropFilter: 'blur(36px)', WebkitBackdropFilter: 'blur(36px)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 22,
                    padding: '36px 36px 32px',
                    boxShadow: '0 28px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}>
                    <ProgressBar step={stepIndex + 1} total={STEPS.length} />

                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={stepIndex}
                            custom={direction}
                            variants={stepVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                        >
                            <StepLabel
                                index={stepIndex + 1}
                                question={step.question}
                                hint={step.hint}
                            />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                                {step.options.map(opt => (
                                    <OptionCard
                                        key={opt.key}
                                        icon={opt.icon}
                                        label={opt.label}
                                        sublabel={opt.sublabel}
                                        selected={isSelected(opt.key)}
                                        onClick={() => select(opt.key)}
                                        accentColor={opt.accent}
                                    />
                                ))}
                            </div>

                            {step.type === 'multi' && (
                                <div style={{ fontSize: '0.67rem', color: T.muted, marginBottom: 18, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.cyan, display: 'inline-block', opacity: 0.6 }} />
                                    Select all that apply
                                </div>
                            )}

                            <ContinueBtn
                                onClick={advance}
                                disabled={!canContinue()}
                                label={isLast ? 'Launch War Room' : 'Next Parameter'}
                                isLast={isLast}
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Step counter footer */}
                <div style={{ textAlign: 'center', marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s.key}>
                            <div style={{
                                fontSize: '0.62rem', fontWeight: 700, color: i === stepIndex ? T.cyan : i < stepIndex ? 'rgba(0,219,231,0.45)' : T.muted,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                transition: 'color 0.25s',
                            }}>
                                {s.key === 'character' ? 'Character' : s.key === 'markets' ? 'Markets' : 'Risk'}
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{ width: 16, height: 1, background: i < stepIndex ? 'rgba(0,219,231,0.35)' : 'rgba(255,255,255,0.1)', transition: 'background 0.25s' }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}
