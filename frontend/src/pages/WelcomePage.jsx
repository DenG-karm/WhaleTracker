import React, { useState } from 'react';
import { Mail, Chrome, Zap, ArrowRight, ShieldCheck, TrendingUp, Activity } from 'lucide-react';
import WhaleLogo from '../components/common/WhaleLogo';

/* ── Animated background particles ─────────────────────────────────────── */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.round(5 + (i * 37 + i * i * 13) % 90),
    y: Math.round(5 + (i * 53 + i * i * 7)  % 90),
    delay: (i * 0.37).toFixed(2),
    dur:   (6 + (i % 5)).toFixed(1),
    size:  1 + (i % 3),
}));

const GridBg = () => (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Cyber grid */}
        <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(0,219,231,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,219,231,0.025) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
        }} />
        {/* Radial glow top-left */}
        <div style={{
            position: 'absolute', top: '-20%', left: '-10%',
            width: '60vw', height: '60vw',
            background: 'radial-gradient(circle, rgba(0,219,231,0.07) 0%, transparent 70%)',
        }} />
        {/* Radial glow bottom-right */}
        <div style={{
            position: 'absolute', bottom: '-20%', right: '-10%',
            width: '55vw', height: '55vw',
            background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
        }} />
        {/* Floating particles */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {PARTICLES.map(p => (
                <circle key={p.id} cx={`${p.x}%`} cy={`${p.y}%`} r={p.size}
                    fill="rgba(0,219,231,0.35)"
                    style={{ animation: `wt-float ${p.dur}s ease-in-out ${p.delay}s infinite alternate` }}
                />
            ))}
        </svg>
    </div>
);

/* ── Stat pills shown on left panel ─────────────────────────────────────── */
const STATS = [
    { icon: Activity,   value: '$2.4B',  label: 'Daily Volume Tracked' },
    { icon: TrendingUp, value: '94.7%',  label: 'Signal Accuracy'      },
    { icon: ShieldCheck, value: '12K+', label: 'Active Traders'        },
];

/* ── Social/Email buttons ───────────────────────────────────────────────── */
const AuthButton = ({ icon: Icon, label, onClick, variant = 'ghost' }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '13px 20px',
            borderRadius: 12,
            border: variant === 'primary'
                ? '1px solid rgba(0,219,231,0.55)'
                : '1px solid rgba(255,255,255,0.1)',
            background: variant === 'primary'
                ? 'linear-gradient(135deg, rgba(0,219,231,0.18) 0%, rgba(0,219,231,0.07) 100%)'
                : 'rgba(255,255,255,0.04)',
            color: variant === 'primary' ? '#00dbe7' : 'rgba(255,255,255,0.75)',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transition: 'all 0.18s ease',
            boxShadow: variant === 'primary' ? '0 0 24px rgba(0,219,231,0.12)' : 'none',
            letterSpacing: '0.01em',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.borderColor = variant === 'primary' ? 'rgba(0,219,231,0.8)' : 'rgba(255,255,255,0.22)';
            e.currentTarget.style.background  = variant === 'primary'
                ? 'linear-gradient(135deg, rgba(0,219,231,0.26) 0%, rgba(0,219,231,0.12) 100%)'
                : 'rgba(255,255,255,0.08)';
            e.currentTarget.style.boxShadow   = variant === 'primary' ? '0 0 36px rgba(0,219,231,0.22)' : 'none';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.borderColor = variant === 'primary' ? 'rgba(0,219,231,0.55)' : 'rgba(255,255,255,0.1)';
            e.currentTarget.style.background  = variant === 'primary'
                ? 'linear-gradient(135deg, rgba(0,219,231,0.18) 0%, rgba(0,219,231,0.07) 100%)'
                : 'rgba(255,255,255,0.04)';
            e.currentTarget.style.boxShadow   = variant === 'primary' ? '0 0 24px rgba(0,219,231,0.12)' : 'none';
        }}
    >
        <Icon size={18} />
        {label}
    </button>
);

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function WelcomePage() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'

    const handleGoogle = () => {
        // Google OAuth - AuthContext tarafından yönetilir
    };

    const handleEmail = () => {
        // Email auth - AuthContext tarafından yönetilir
    };

    return (
        <div style={{ minHeight: '100vh', background: '#050810', display: 'flex', overflow: 'hidden', position: 'relative' }}>
            <GridBg />

            {/* ── Left Panel (hidden on mobile) ──────────────────────────── */}
            <div className="hidden lg:flex" style={{
                flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start',
                padding: '60px 64px', position: 'relative', zIndex: 1,
                display: 'none',
            }}>
                {/* override display for lg */}
                <style>{`
                    @media (min-width: 1024px) { .wt-left-panel { display: flex !important; } }
                    @keyframes wt-float { 0% { transform: translateY(0); } 100% { transform: translateY(-8px); } }
                    @keyframes wt-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes wt-pulse-glow { 0%, 100% { box-shadow: 0 0 18px rgba(0,219,231,0.25); } 50% { box-shadow: 0 0 36px rgba(0,219,231,0.5); } }
                `}</style>
            </div>

            {/* Left panel — flex via className */}
            <div className="wt-left-panel" style={{
                display: 'none', flex: 1, flexDirection: 'column',
                justifyContent: 'center', alignItems: 'flex-start',
                padding: '60px 64px', position: 'relative', zIndex: 1,
            }}>
                {/* Vertical line accent */}
                <div style={{
                    position: 'absolute', left: 0, top: '15%', bottom: '15%',
                    width: 1,
                    background: 'linear-gradient(to bottom, transparent, rgba(0,219,231,0.3), transparent)',
                }} />

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}>
                    <WhaleLogo size="sm" showText={false} />
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#00dbe7', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                            WhaleTracker
                        </div>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Institutional Terminal
                        </div>
                    </div>
                </div>

                {/* Headline */}
                <h1 style={{
                    fontSize: 'clamp(2rem, 3.2vw, 3rem)', fontWeight: 800,
                    lineHeight: 1.15, color: '#e1e2eb',
                    maxWidth: 440, marginBottom: 20,
                    animation: 'wt-fade-up 0.6s ease both',
                }}>
                    Trade with{' '}
                    <span style={{ color: '#00dbe7', textShadow: '0 0 28px rgba(0,219,231,0.5)' }}>
                        institutional
                    </span>
                    {' '}precision.
                </h1>
                <p style={{
                    fontSize: '1rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.45)',
                    maxWidth: 400, marginBottom: 52,
                    animation: 'wt-fade-up 0.6s 0.1s ease both',
                }}>
                    Real-time whale tracking, AI-powered risk analytics, and multi-market intelligence — unified in a single terminal.
                </p>

                {/* Stats */}
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: 16,
                    animation: 'wt-fade-up 0.6s 0.2s ease both',
                }}>
                    {STATS.map(({ icon: Icon, value, label }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                background: 'rgba(0,219,231,0.08)',
                                border: '1px solid rgba(0,219,231,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icon size={16} color="#00dbe7" />
                            </div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#e1e2eb', lineHeight: 1.2 }}>{value}</div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', fontWeight: 500 }}>{label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Divider line to right */}
                <div style={{
                    position: 'absolute', right: 0, top: '10%', bottom: '10%',
                    width: 1,
                    background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent)',
                }} />
            </div>

            {/* ── Right Panel: Auth Card ─────────────────────────────────── */}
            <div style={{
                width: '100%', maxWidth: 480,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '32px 24px',
                position: 'relative', zIndex: 1,
                margin: '0 auto',
            }}>
                <div style={{
                    width: '100%',
                    background: 'rgba(10, 13, 24, 0.72)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20,
                    padding: '36px 32px',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
                    animation: 'wt-fade-up 0.5s ease both',
                }}>
                    {/* 14-Day Trial Badge */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '6px 16px', borderRadius: 40,
                            background: 'rgba(0,219,231,0.1)',
                            border: '1px solid rgba(0,219,231,0.28)',
                            animation: 'wt-pulse-glow 3s ease-in-out infinite',
                        }}>
                            <Zap size={12} color="#00dbe7" fill="#00dbe7" />
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#00dbe7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                14-Day Pro Trial — Free
                            </span>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 style={{
                        textAlign: 'center', fontWeight: 800, fontSize: '1.5rem',
                        color: '#e1e2eb', marginBottom: 6, lineHeight: 1.25,
                    }}>
                        {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </h2>
                    <p style={{
                        textAlign: 'center', fontSize: '0.82rem',
                        color: 'rgba(255,255,255,0.38)', marginBottom: 28, lineHeight: 1.5,
                    }}>
                        {mode === 'login'
                            ? 'Access your War Room dashboard.'
                            : 'Start your institutional-grade trading journey.'}
                    </p>

                    {/* Mode Toggle */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 12, padding: 4, marginBottom: 28,
                    }}>
                        {[
                            { key: 'login',  label: 'Login'   },
                            { key: 'signup', label: 'Sign Up' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setMode(tab.key)}
                                style={{
                                    padding: '9px 0', border: 'none', borderRadius: 9, cursor: 'pointer',
                                    fontSize: '0.82rem', fontWeight: 700, transition: 'all 0.18s ease',
                                    background: mode === tab.key
                                        ? 'rgba(0,219,231,0.14)'
                                        : 'transparent',
                                    color: mode === tab.key ? '#00dbe7' : 'rgba(255,255,255,0.38)',
                                    boxShadow: mode === tab.key ? '0 0 14px rgba(0,219,231,0.15)' : 'none',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Auth Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <AuthButton
                            icon={Chrome}
                            label="Continue with Google"
                            onClick={handleGoogle}
                            variant="ghost"
                        />
                        <AuthButton
                            icon={Mail}
                            label="Continue with Email"
                            onClick={handleEmail}
                            variant="primary"
                        />
                    </div>

                    {/* Divider */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        margin: '24px 0',
                    }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Secure & Encrypted
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                    </div>

                    {/* Footer note */}
                    <p style={{
                        textAlign: 'center', fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.22)', lineHeight: 1.6,
                    }}>
                        By continuing you agree to our{' '}
                        <button style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(0,219,231,0.6)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
                            Terms of Service
                        </button>
                        {' '}and{' '}
                        <button style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(0,219,231,0.6)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
                            Privacy Policy
                        </button>.
                    </p>

                    {/* Switch mode inline link */}
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
                            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                        </span>
                        <button
                            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                            style={{
                                background: 'none', border: 'none', padding: 0,
                                color: '#00dbe7', fontSize: '0.78rem', fontWeight: 700,
                                cursor: 'pointer', letterSpacing: '0.02em',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}
                        >
                            {mode === 'login' ? 'Sign Up' : 'Log In'}
                            <ArrowRight size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
