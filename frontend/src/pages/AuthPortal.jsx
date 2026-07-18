import React, { useState } from 'react';
import { Mail, Chrome, ArrowRight, Zap, ShieldCheck, Lock } from 'lucide-react';

/* ── Grid background ─────────────────────────────────────────────────────── */
const Bg = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:
                'linear-gradient(rgba(0,219,231,0.022) 1px, transparent 1px),' +
                'linear-gradient(90deg, rgba(0,219,231,0.022) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
        }} />
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '80vw', height: '60vw', background: 'radial-gradient(ellipse, rgba(0,219,231,0.055) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '45vw', height: '45vw', background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)' }} />
    </div>
);

/* ── Auth action button ───────────────────────────────────────────────────── */
const AuthBtn = ({ icon: Icon, label, onClick, primary }) => (
    <button
        onClick={onClick}
        style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '13px 20px', borderRadius: 12, cursor: 'pointer',
            border: primary ? '1px solid rgba(0,219,231,0.5)' : '1px solid rgba(255,255,255,0.09)',
            background: primary
                ? 'linear-gradient(135deg, rgba(0,219,231,0.16) 0%, rgba(0,219,231,0.06) 100%)'
                : 'rgba(255,255,255,0.03)',
            color: primary ? '#00dbe7' : 'rgba(255,255,255,0.68)',
            fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.01em',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            boxShadow: primary ? '0 0 26px rgba(0,219,231,0.13)' : 'none',
            transition: 'all 0.18s ease',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.borderColor   = primary ? 'rgba(0,219,231,0.75)' : 'rgba(255,255,255,0.2)';
            e.currentTarget.style.background    = primary
                ? 'linear-gradient(135deg, rgba(0,219,231,0.24) 0%, rgba(0,219,231,0.1) 100%)'
                : 'rgba(255,255,255,0.07)';
            e.currentTarget.style.boxShadow     = primary ? '0 0 40px rgba(0,219,231,0.22)' : 'none';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.borderColor   = primary ? 'rgba(0,219,231,0.5)' : 'rgba(255,255,255,0.09)';
            e.currentTarget.style.background    = primary
                ? 'linear-gradient(135deg, rgba(0,219,231,0.16) 0%, rgba(0,219,231,0.06) 100%)'
                : 'rgba(255,255,255,0.03)';
            e.currentTarget.style.boxShadow     = primary ? '0 0 26px rgba(0,219,231,0.13)' : 'none';
        }}
    >
        <Icon size={17} />
        {label}
    </button>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════ */
export default function AuthPortal() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'

    const handleGoogle = () => {
        if (mode === 'login') window.location.href = '/entry';
        else                  window.location.href = '/profile-survey';
    };

    const handleEmail = () => {
        if (mode === 'login') window.location.href = '/entry';
        else                  window.location.href = '/profile-survey';
    };

    return (
        <div style={{
            minHeight: '100vh', background: '#050810',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', padding: '24px',
        }}>
            <Bg />

            {/* Card */}
            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', maxWidth: 420,
                background: 'rgba(8, 11, 22, 0.78)',
                backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 22,
                padding: '38px 36px 32px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>

                {/* Logo mark */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: 'rgba(0,219,231,0.08)',
                        border: '1px solid rgba(0,219,231,0.22)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 28px rgba(0,219,231,0.15)',
                    }}>
                        <Zap size={22} color="#00dbe7" fill="rgba(0,219,231,0.3)" />
                    </div>
                </div>

                {/* Badge */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '5px 14px', borderRadius: 40,
                        background: 'rgba(0,219,231,0.08)',
                        border: '1px solid rgba(0,219,231,0.22)',
                    }}>
                        <ShieldCheck size={11} color="#00dbe7" />
                        <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#00dbe7', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            14-Day Pro Trial · Free
                        </span>
                    </div>
                </div>

                {/* Heading */}
                <h1 style={{
                    textAlign: 'center', fontWeight: 800,
                    fontSize: '1.55rem', color: '#e1e2eb',
                    margin: '0 0 6px', lineHeight: 1.2,
                }}>
                    {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h1>
                <p style={{
                    textAlign: 'center', fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.36)', margin: '0 0 26px', lineHeight: 1.55,
                }}>
                    {mode === 'login'
                        ? 'Access your institutional trading terminal.'
                        : 'Start your free trial. No credit card required.'}
                </p>

                {/* Mode toggle */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: 4, padding: 4,
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12, marginBottom: 22,
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
                                fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.04em',
                                transition: 'all 0.18s ease',
                                background: mode === tab.key ? 'rgba(0,219,231,0.13)' : 'transparent',
                                color: mode === tab.key ? '#00dbe7' : 'rgba(255,255,255,0.36)',
                                boxShadow: mode === tab.key ? '0 0 16px rgba(0,219,231,0.14)' : 'none',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <AuthBtn icon={Chrome} label="Continue with Google" onClick={handleGoogle} primary={false} />
                    <AuthBtn icon={Mail}   label="Continue with Email"  onClick={handleEmail} primary />
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Lock size={10} color="rgba(255,255,255,0.2)" />
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                            End-to-end encrypted
                        </span>
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                {/* Footer */}
                <p style={{ textAlign: 'center', fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', lineHeight: 1.6, margin: 0 }}>
                    By continuing you agree to our{' '}
                    <button style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(0,219,231,0.55)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600 }}>
                        Terms
                    </button>{' '}
                    and{' '}
                    <button style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(0,219,231,0.55)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600 }}>
                        Privacy Policy
                    </button>.
                </p>

                {/* Inline mode switch */}
                <div style={{ textAlign: 'center', marginTop: 18 }}>
                    <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.28)' }}>
                        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    </span>
                    <button
                        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                        style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            color: '#00dbe7', fontSize: '0.76rem', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}
                    >
                        {mode === 'login' ? 'Sign Up' : 'Log In'}
                        <ArrowRight size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}
