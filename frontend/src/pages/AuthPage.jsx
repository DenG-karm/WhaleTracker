import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext, ToastContext } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import { Lock, Mail, User, ShieldCheck, ChevronRight, BrainCircuit, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import WhaleLogo from '../components/common/WhaleLogo';
import { useGoogleLogin } from '@react-oauth/google';

const GOOGLE_ENABLED = !!process.env.REACT_APP_GOOGLE_CLIENT_ID;

const HeroWhale = ({ className }) => (
  <img
    src="/whale-logo.png"
    alt=""
    aria-hidden="true"
    className={className}
    style={{ mixBlendMode: 'screen', objectFit: 'contain' }}
  />
);

export default function AuthPage() {
    const { t } = useTranslation();
    const authContext = useContext(AuthContext);
    const toastContext = useContext(ToastContext);
    const login = authContext?.login || (() => {});
    const user  = authContext?.user;
    const showToast = toastContext || (() => {});
    const navigate = useNavigate();

    // Token state'i güncellendikten SONRA yönlendir — React batch update timing sorununu önler
    const [pendingDashboard, setPendingDashboard] = useState(false);
    useEffect(() => {
        if (pendingDashboard && user?.token) {
            console.log('[Auth] Login başarılı, token alındı, /dashboard\'a yönlendiriliyor. token:', user.token.slice(0, 20) + '...');
            navigate('/dashboard', { replace: true });
        } else if (pendingDashboard && !user?.token) {
            console.warn('[Auth] pendingDashboard=true ama user.token hala yok! user state:', user);
        }
    }, [user, pendingDashboard, navigate]);

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const data = await apiClient('/google-auth', {
                    method: 'POST',
                    body: { access_token: tokenResponse.access_token },
                });
                if (data.status === 'ok') {
                    login(data);
                    setPendingDashboard(true);
                }
            } catch (err) {
                showToast(err.message || t('auth.errUnknown'), 'error');
            }
        },
        onError: () => showToast(t('auth.errUnknown'), 'error'),
    });
    
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(() => {
        const mode = searchParams.get('mode');
        if (mode === 'login')    return 'LOGIN';
        if (mode === 'register') return 'EMAIL';
        return 'LANDING';
    }); // LANDING, LOGIN, EMAIL, CODE, REGISTER, FORGOT_PASSWORD, RESET_PASSWORD, RESET_CODE, BETA_FULL
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ email: '', code: '', password: '', fullName: '', newPassword: '' });
    const [rememberMe, setRememberMe] = useState(false);

    const handleAction = async (e, actionType) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            let data;
            if (actionType === 'send') {
                // Zero-friction beta: direkt kayıt
                if (!form.email || !form.password || !form.fullName) {
                    throw new Error(t('auth.errFillAll'));
                }
                if (form.password.length < 8) {
                    throw new Error(t('auth.errPwdLen'));
                }
                if (!/[A-Z]/.test(form.password)) {
                    throw new Error(t('auth.errPwdUpper'));
                }
                if (!/\d/.test(form.password)) {
                    throw new Error(t('auth.errPwdNum'));
                }
                data = await apiClient('/register', {
                    method: 'POST',
                    body: { email: form.email, password: form.password, full_name: form.fullName },
                });
            } else if (actionType === 'verify') {
                data = await apiClient('/verify-code', { method: 'POST', body: { email: form.email, code: form.code } });
            } else if (actionType === 'register') {
                // Client-side validation
                if (!form.email || !form.password || !form.code || !form.fullName) {
                    throw new Error(t('auth.errFillAll'));
                }
                if (form.password.length < 8) {
                    throw new Error(t('auth.errPwdLen'));
                }
                if (!/[A-Z]/.test(form.password)) {
                    throw new Error(t('auth.errPwdUpper'));
                }
                if (!/\d/.test(form.password)) {
                    throw new Error(t('auth.errPwdNum'));
                }
                data = await apiClient('/register', { 
                    method: 'POST', 
                    body: { email: form.email, password: form.password, code: form.code, full_name: form.fullName } 
                });
            } else if (actionType === 'login') {
                data = await apiClient('/login', { method: 'POST', body: { email: form.email, password: form.password } });
            } else if (actionType === 'forgot') {
                data = await apiClient('/forgot-password', { method: 'POST', body: { email: form.email } });
            } else if (actionType === 'reset-send') {
                data = await apiClient('/forgot-password', { method: 'POST', body: { email: form.email } });
            } else if (actionType === 'reset') {
                // Client-side validation
                if (!form.email ||!form.code || !form.newPassword) {
                    throw new Error(t('auth.errFillAll'));
                }
                if (form.newPassword.length < 8) {
                    throw new Error(t('auth.errPwdLen'));
                }
                if (!/[A-Z]/.test(form.newPassword)) {
                    throw new Error(t('auth.errPwdUpper'));
                }
                if (!/\d/.test(form.newPassword)) {
                    throw new Error(t('auth.errPwdNum'));
                }
                data = await apiClient('/reset-password', { 
                    method: 'POST', 
                    body: { email: form.email, code: form.code, new_password: form.newPassword } 
                });
            }

            if (data && data.status === 'beta_full') {
                setStep('BETA_FULL');
                return;
            }
            if (data && data.status === 'error') {
                throw new Error(data.msg || t('auth.errGeneral'));
            }

            if (actionType === 'send') {
                // Kayıt başarılı, otomatik giriş yap
                const loginData = await apiClient('/login', { method: 'POST', body: { email: form.email, password: form.password } });
                if (loginData.status === 'error') throw new Error(loginData.msg);
                console.log('[Auth] send→login başarılı, token:', loginData.token?.slice(0, 20));
                login(loginData);
                setPendingDashboard(true); // useEffect token state'i görünce navigate eder
                return;
            } else if (actionType === 'verify') {
                showToast(t('auth.toastCodeVerified'), 'success');
                setStep('REGISTER');
            } else if (actionType === 'register') {
                // Kayıt başarılı, otomatik giriş yap
                const loginData = await apiClient('/login', { method: 'POST', body: { email: form.email, password: form.password } });
                if (loginData.status === 'error') throw new Error(loginData.msg);
                console.log('[Auth] register→login başarılı, token:', loginData.token?.slice(0, 20));
                login(loginData);
                setPendingDashboard(true);
            } else if (actionType === 'login') {
                console.log('[Auth] login başarılı, token:', data.token?.slice(0, 20));
                login(data);
                setPendingDashboard(true);
            } else if (actionType === 'forgot') {
                showToast(t('auth.toastCheckEmail'), 'success');
                setStep('RESET_CODE');
            } else if (actionType === 'reset-send') {
                showToast(t('auth.toastCodeSent'), 'success');
                setStep('RESET_CODE');
            } else if (actionType === 'reset') {
                showToast(t('auth.toastPwdReset'), 'success');
                setStep('LOGIN');
                setForm({ email: '', code: '', password: '', fullName: '', newPassword: '' });
            }
            
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                showToast(t('auth.errConnection'), 'error');
            } else {
                showToast(error.message || t('auth.errUnknown'), 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // LANDING adımındaysa ana sayfaya yönlendir (render gövdesinde navigate() çağrısından kaçın)
    useEffect(() => {
        if (step === 'LANDING') {
            navigate('/');
        }
    }, [step, navigate]);

    if (step === 'LANDING') {
        return null;
    }

    // ── Beta kontenjanı doldu ekranı ─────────────────────────────────────────
    if (step === 'BETA_FULL') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-50 font-sans">
                <div className="w-full max-w-md text-center">
                    {/* Glow */}
                    <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)', width:320, height:320, background:'radial-gradient(ellipse, rgba(168,85,247,0.12) 0%, transparent 70%)', pointerEvents:'none', borderRadius:'50%' }} />

                    <div style={{ position:'relative', zIndex:1 }}>
                        {/* İkon */}
                        <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(168,85,247,0.12)', border:'1px solid rgba(168,85,247,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', fontSize:32, boxShadow:'0 0 40px rgba(168,85,247,0.2)' }}>
                            🐋
                        </div>

                        <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.65rem', fontWeight:900, letterSpacing:'0.12em', color:'#a855f7', background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.3)', borderRadius:20, padding:'4px 12px', marginBottom:20, textTransform:'uppercase' }}>
                            Beta · Kontenjan Dolu
                        </div>

                        <h2 style={{ fontSize:'1.8rem', fontWeight:900, color:'#f1f5f9', letterSpacing:'-0.02em', marginBottom:12, lineHeight:1.2 }}>
                            100 Balina<br />
                            <span style={{ color:'#a855f7' }}>Aramıza Katıldı</span>
                        </h2>

                        <p style={{ fontSize:'0.9rem', color:'rgba(255,255,255,0.5)', lineHeight:1.7, marginBottom:32, maxWidth:360, margin:'0 auto 32px' }}>
                            Beta kontenjanımız doldu. Erken erişim listesine adını ekle — tam sürüm çıktığında seni öncelikli olarak içeri alıyoruz ve beta kullanıcılara özel bir sürprizimiz var.
                        </p>

                        <div style={{ background:'rgba(168,85,247,0.07)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:16, padding:'20px 24px', marginBottom:28 }}>
                            <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#a855f7', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>Beta Kullanıcılarına Özel</div>
                            <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>
                                ✦ Tam sürümde %30 indirimli fiyatlandırma<br />
                                ✦ Pro özellikler 3 ay ücretsiz<br />
                                ✦ Öncelikli erişim ve özel rozet
                            </div>
                        </div>

                        <button
                            onClick={() => window.open('mailto:info@whaletracker.app?subject=Beta%20Bekleme%20Listesi&body=Tam%20s%C3%BCr%C3%BCm%20%C3%A7%C4%B1k%C4%B1nca%20haberdar%20edilmek%20istiyorum.', '_blank')}
                            style={{ width:'100%', padding:'14px 0', borderRadius:12, border:'1px solid rgba(168,85,247,0.4)', background:'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(168,85,247,0.08) 100%)', color:'#a855f7', fontWeight:800, fontSize:'0.9rem', cursor:'pointer', letterSpacing:'0.02em', marginBottom:14, boxShadow:'0 0 24px rgba(168,85,247,0.15)' }}
                        >
                            Bekleme Listesine Katıl →
                        </button>

                        <button
                            onClick={() => navigate('/login')}
                            style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontSize:'0.8rem', cursor:'pointer', textDecoration:'underline' }}
                        >
                            Zaten hesabım var — giriş yap
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex text-slate-50 font-sans selection:bg-cyan-500/30">
            {/* SOL TARAF: Siber Vizyon (Desktop) */}
            <div className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-center items-center p-12 border-r border-slate-800/50 bg-gradient-to-br from-slate-900 to-slate-950">
                {/* Yüzen Balina Animasyonu (Spinning Radar Yerine) */}
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex items-center justify-center">
                    <style>{`
                        @keyframes swimAuth {
                            0%, 100% { transform: translateY(0) rotate(-5deg); }
                            50% { transform: translateY(-20px) rotate(-3deg); }
                        }
                        .animate-swim-auth { animation: swimAuth 10s ease-in-out infinite; }
                    `}</style>
                    <HeroWhale className="w-[150%] h-[150%] animate-swim-auth drop-shadow-[0_0_50px_rgba(255,255,255,0.05)]" />
                </div>
                
                <div className="relative z-10 w-full max-w-lg">
                    <div className="flex items-center gap-4 mb-12">
                        <WhaleLogo size="lg" showText={true} animated={false} />
                    </div>

                    <h2 className="text-4xl font-bold mb-6 leading-tight text-white">
                        {t('auth.leftH2Part1')} <span className="text-cyan-400">{t('auth.leftH2Highlight')}</span> <br />{t('auth.leftH2Part2')}
                    </h2>
                    
                    <div className="space-y-6">
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md">
                            <BrainCircuit className="text-purple-400 mt-1" size={28} />
                            <div>
                                <h4 className="font-bold text-white mb-1 text-lg">{t('auth.feature1Title')}</h4>
                                <p className="text-sm text-slate-400 leading-relaxed">{t('auth.feature1Body')}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-md">
                            <ShieldCheck className="text-cyan-400 mt-1" size={28} />
                            <div>
                                <h4 className="font-bold text-white mb-1 text-lg">{t('auth.feature2Title')}</h4>
                                <p className="text-sm text-slate-400 leading-relaxed">{t('auth.feature2Body')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SAÄ TARAF: Cam Efektli (Glassmorphism) Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 relative">
                {/* Glow Efekti */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none"></div>
                
                <button onClick={() => navigate('/')} className="absolute top-8 left-8 text-sm font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-2 z-20">
                    {t('auth.backBtn')}
                </button>

                <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 p-10 rounded-[2.5rem] relative z-10" style={{ boxShadow: "0 0 0 1px rgba(0,219,231,0.08), 0 32px 64px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                    {/* BETA rozeti */}
                    {(step === 'EMAIL' || step === 'CODE' || step === 'REGISTER') && (
                        <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.6rem', fontWeight:900, letterSpacing:'0.12em', color:'#22d3ee', background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', borderRadius:4, padding:'3px 9px', marginBottom:14, textTransform:'uppercase' }}>
                            BETA · 100 Kişilik Erken Erişim
                        </div>
                    )}
                    <h3 className="text-3xl font-black text-white mb-2">
                        {step === 'LOGIN' ? t('auth.formTitleLogin') : step === 'FORGOT_PASSWORD' ? t('auth.formTitleForgot') : step === 'RESET_PASSWORD' ? t('auth.formTitleReset') : t('auth.formTitleCreate')}
                    </h3>
                    <p className="text-slate-400 mb-8 text-sm font-light">
                        {step === 'LOGIN' ? t('auth.formSubLogin') : step === 'FORGOT_PASSWORD' ? t('auth.formSubForgot') : step === 'RESET_PASSWORD' ? t('auth.formSubReset') : t('auth.formSubCreate')}
                    </p>

                        {(step === 'LOGIN' || step === 'EMAIL') && (
                        <>
                            <button
                                type="button"
                                onClick={() => GOOGLE_ENABLED ? googleLogin() : showToast('Google Client ID henüz tanımlanmadı.', 'error')}
                                className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 px-5 text-sm font-semibold text-slate-200 transition-all duration-200"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.10)',
                                    backdropFilter: 'blur(10px)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.20)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                                }}
                            >
                                {/* Google SVG icon */}
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                                </svg>
                                {t('auth.googleBtn')}
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-3 my-6">
                                <div className="flex-1 h-px bg-slate-800" />
                                <span className="text-[11px] font-medium text-slate-500 tracking-wider whitespace-nowrap">
                                    {t('auth.orContinueWith')}
                                </span>
                                <div className="flex-1 h-px bg-slate-800" />
                            </div>
                        </>
                    )}

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (step === 'LOGIN') handleAction(e, 'login');
                        else if (step === 'EMAIL') handleAction(e, 'send');
                        else if (step === 'CODE') handleAction(e, 'verify');
                        else if (step === 'REGISTER') handleAction(e, 'register');
                        else if (step === 'FORGOT_PASSWORD') handleAction(e, 'forgot');
                        else if (step === 'RESET_CODE') {
                            // RESET_CODE'dan RESET_PASSWORD'a geçiş
                            if (!form.code) {
                                showToast(t('auth.errEnterCode'), 'error');
                                return;
                            }
                            setStep('RESET_PASSWORD');
                        }
                        else if (step === 'RESET_PASSWORD') handleAction(e, 'reset');
                    }} className="space-y-5">
                        
                        {(step === 'LOGIN' || step === 'EMAIL') && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelEmail')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input 
                                        type="email" 
                                        required 
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                                        placeholder="ornek@email.com"
                                        value={form.email}
                                        onChange={e => setForm({...form, email: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 'EMAIL' && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelFullName')}</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                                            placeholder="John Doe"
                                            value={form.fullName}
                                            onChange={e => setForm({...form, fullName: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelPasswordSet')}</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input 
                                            type="password" 
                                            required 
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                                            placeholder="••••••••"
                                            value={form.password}
                                            onChange={e => setForm({...form, password: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 'CODE' && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelCode')}</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600 tracking-widest font-mono"
                                        placeholder="123456"
                                        value={form.code}
                                        onChange={e => setForm({...form, code: e.target.value})}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">{t('auth.codeHint')}</p>
                            </div>
                        )}

                        {step === 'REGISTER' && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelFullName')}</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                                            placeholder="John Doe"
                                            value={form.fullName}
                                            onChange={e => setForm({...form, fullName: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelPasswordSet')}</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input 
                                            type="password" 
                                            required 
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                                            placeholder="••••••••"
                                            value={form.password}
                                            onChange={e => setForm({...form, password: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 'LOGIN' && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelPassword')}</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input 
                                            type="password" 
                                            required 
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                                            placeholder="••••••••"
                                            value={form.password}
                                            onChange={e => setForm({...form, password: e.target.value})}
                                        />
                                    </div>
                                    {/* Beni Hatırla */}
                                    <label className="flex items-center gap-3 mt-3 cursor-pointer group">
                                        <div
                                            onClick={() => setRememberMe(v => !v)}
                                            className="relative w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all duration-200"
                                            style={{
                                                border: rememberMe ? '2px solid #00dbe7' : '2px solid rgba(255,255,255,0.18)',
                                                background: rememberMe ? 'rgba(0,219,231,0.15)' : 'transparent',
                                                boxShadow: rememberMe ? '0 0 10px rgba(0,219,231,0.5)' : 'none',
                                            }}
                                        >
                                            {rememberMe && (
                                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                    <path d="M1 4l3 3 5-6" stroke="#00dbe7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors select-none">{t('auth.rememberMe') || 'Beni Hatırla'}</span>
                                    </label>
                                    <button 
                                        type="button"
                                        onClick={() => setStep('FORGOT_PASSWORD')}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 transition-colors"
                                    >
                                        {t('auth.forgotLink')}
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 'FORGOT_PASSWORD' && (
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelEmail')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input 
                                        type="email" 
                                        required 
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                                        placeholder="ornek@email.com"
                                        value={form.email}
                                        onChange={e => setForm({...form, email: e.target.value})}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-2">{t('auth.forgotHint')}</p>
                            </div>
                        )}

                        {step === 'RESET_CODE' && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelEmail')}</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input 
                                            type="email" 
                                            required 
                                            disabled
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-600 focus:outline-none cursor-not-allowed"
                                            value={form.email}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelCode')}</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600 tracking-widest font-mono"
                                            placeholder="123456"
                                            value={form.code}
                                            onChange={e => setForm({...form, code: e.target.value})}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">{t('auth.codeHint')}</p>
                                </div>
                            </>
                        )}

                        {step === 'RESET_PASSWORD' && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('auth.labelNewPassword')}</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input 
                                            type="password" 
                                            required 
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                                            placeholder="••••••••"
                                            value={form.newPassword}
                                            onChange={e => setForm({...form, newPassword: e.target.value})}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">{t('auth.resetHint')}</p>
                                </div>
                            </>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full relative group overflow-hidden rounded-xl p-[1px] font-bold text-sm tracking-widest uppercase mt-6"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity"></span>
                            <div className="relative flex items-center justify-center gap-2 px-6 py-4 bg-slate-950 rounded-xl group-hover:bg-transparent transition-colors">
                                <span className="text-white drop-shadow-md">
                                    {loading ? t('auth.loading') : (
                                        step === 'LOGIN' ? t('auth.btnLogin') : 
                                        step === 'EMAIL' ? t('auth.btnSendCode') :
                                        step === 'CODE' ? t('auth.btnVerify') : 
                                        step === 'REGISTER' ? t('auth.btnRegister') :
                                        step === 'FORGOT_PASSWORD' ? t('auth.btnSendCode') :
                                        step === 'RESET_CODE' ? t('auth.btnResetCode') : t('auth.btnSaveNewPwd')
                                    )}
                                </span>
                                {!loading && <ChevronRight size={18} className="text-cyan-400 group-hover:text-white group-hover:translate-x-1 transition-all" />}
                            </div>
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-slate-800/50 pt-6">
                        <p className="text-sm text-slate-400">
                            {step === 'LOGIN' ? t('auth.footerNoAccount') : step === 'FORGOT_PASSWORD' || step === 'RESET_CODE' || step === 'RESET_PASSWORD' ? t('auth.footerGoBack') : t('auth.footerHasAccount')}
                            <button 
                                onClick={() => {
                                    if (step === 'FORGOT_PASSWORD' || step === 'RESET_CODE' || step === 'RESET_PASSWORD') {
                                        setForm({ email: '', code: '', password: '', fullName: '', newPassword: '' });
                                        setStep('LOGIN');
                                    } else {
                                        setForm({ email: '', code: '', password: '', fullName: '', newPassword: '' });
                                        setStep(step === 'LOGIN' ? 'EMAIL' : 'LOGIN');
                                    }
                                }} 
                                className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors ml-1"
                            >
                                {step === 'FORGOT_PASSWORD' || step === 'RESET_CODE' || step === 'RESET_PASSWORD' ? t('auth.footerSignIn') : (step === 'LOGIN' ? t('auth.footerSignUp') : t('auth.footerSignIn'))}
                            </button>
                        </p>
                        {step === 'CODE' && (
                            <button 
                                onClick={() => setStep('EMAIL')}
                                className="text-xs text-slate-500 hover:text-slate-300 mt-4 underline"
                            >
                                {t('auth.changeEmail')}
                            </button>
                        )}
                        {step === 'RESET_CODE' && (
                            <button 
                                onClick={() => setStep('FORGOT_PASSWORD')}
                                className="text-xs text-slate-500 hover:text-slate-300 mt-4 underline"
                            >
                                {t('auth.changeEmail')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


