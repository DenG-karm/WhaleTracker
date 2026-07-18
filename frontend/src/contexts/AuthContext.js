import { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ZenProvider } from './ZenContext';
import { TiltProvider } from './TiltContext';

export const AuthContext = createContext(null);
export const ToastContext = createContext();
export const LanguageContext = createContext();

export const useAuth = () => useContext(AuthContext);
export const useToast = () => useContext(ToastContext);
export const useLang = () => useContext(LanguageContext);

export const AppProviders = ({ children }) => {
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = 'success') => {
        let message = msg;
        if (typeof msg === 'object' && msg !== null) {
            message = msg.msg || msg.detail || "İşlem yapıldı";
        }
        setToast({ msg: message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const [user, setUser] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        try {
            const u = localStorage.getItem('user');
            if (u) setUser(JSON.parse(u));
        } catch (error) {
            console.error("Local storage error:", error);
        } finally {
            setIsCheckingAuth(false);
        }
    }, []);

    const login = (data) => {
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        // client.js'teki 401 redirect flag'ini sıfırla — bir sonraki login sonrası 401'de köprenmez
        try { window.__wtRedirecting = false; } catch (_) {}
    };
    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('wt_user_profile');
        localStorage.removeItem('wt_token');
        setUser(null);
        window.location.href = '/';
    };
    const updateUser = (data) => {
        const n = { ...user, ...data };
        localStorage.setItem('user', JSON.stringify(n));
        setUser(n);
    };

    document.body.className = 'dark-mode';

    // ── i18next köprüsü ──────────────────────────────────────────────────────
    // Tüm uygulama useTranslation() kullanabilir, ya da geriye dönük uyum için
    // useLang() hook'u da çalışmaya devam eder.
    const { t, i18n } = useTranslation();
    const lang = (i18n.language || 'tr').slice(0, 2);
    const toggleLang = () => i18n.changeLanguage(lang === 'tr' ? 'en' : 'tr');

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, isCheckingAuth }}>
            <TiltProvider>
                <ZenProvider>
                    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
                        <ToastContext.Provider value={showToast}>
                        {children}
                    {toast && (
                        <div className="fade-in" style={{
                            position: 'fixed', top: 20, right: 20, zIndex: 9999,
                            background: toast.type === 'success' ? '#10b981' : '#ef4444',
                            color: 'white', padding: '15px 25px', borderRadius: 12, fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 400
                        }}>
                            {toast.type === 'success'
                                ? <span>✓</span>
                                : <span>✕</span>}
                            <div style={{ whiteSpace: 'pre-line', fontSize: '0.9rem' }}>{toast.msg}</div>
                        </div>
                    )}
                    </ToastContext.Provider>
                </LanguageContext.Provider>
            </ZenProvider>
        </TiltProvider>
    </AuthContext.Provider>
    );
};