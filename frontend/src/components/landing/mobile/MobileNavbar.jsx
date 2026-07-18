import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Menu, LayoutDashboard, LogOut } from 'lucide-react';
import WhaleLogo from '../../common/WhaleLogo';
import { AuthContext } from '../../../contexts/AuthContext';

const NAV_KEYS = [
  { key: 'features',   href: '#features'    },
  { key: 'howItWorks', href: '#how-it-works' },
  { key: 'community',  href: '#community'   },
];

export default function MobileNavbar() {
  const navigate   = useNavigate();
  const { i18n, t } = useTranslation();
  const { user, logout } = useContext(AuthContext);
  const isAuthenticated = !!user?.token;
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [activeLang, setActiveLang] = useState(
    () => i18n.language?.startsWith('tr') ? 'TR' : 'EN'
  );

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const onLang = (lng) => setActiveLang(lng?.startsWith('tr') ? 'TR' : 'EN');
    i18n.on('languageChanged', onLang);
    return () => i18n.off('languageChanged', onLang);
  }, [i18n]);

  const scrollTo = (href) => {
    const id = href.replace('#', '');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <>
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: 56,
          background: scrolled
            ? 'rgba(2,4,8,0.92)'
            : 'linear-gradient(180deg,rgba(2,4,8,0.85) 0%,transparent 100%)',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', justifyContent: 'space-between',
          transition: 'all 0.3s',
        }}
      >
        <button
          onClick={() => scrollTo('#hero')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <WhaleLogo size="sm" showText animated={false} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Dil */}
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, overflow: 'hidden' }}>
            {['TR', 'EN'].map(lang => (
              <button
                key={lang}
                onClick={() => i18n.changeLanguage(lang.toLowerCase())}
                style={{
                  padding: '4px 10px', fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.08em', border: 'none', cursor: 'pointer',
                  background: activeLang === lang ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: activeLang === lang ? 'white' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {lang}
              </button>
            ))}
          </div>
          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Dropdown Menü */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed', top: 56, left: 0, right: 0, zIndex: 99,
            background: 'rgba(2,4,8,0.97)', backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 0',
          }}
        >
          {NAV_KEYS.map(({ key, href }) => (
            <button
              key={href}
              onClick={() => scrollTo(href)}
              style={{
                display: 'block', width: '100%', padding: '14px 24px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'rgba(240,244,255,0.7)', fontSize: '1rem', fontWeight: 500,
                textAlign: 'left',
              }}
            >
              {t(`landing.nav.${key}`)}
            </button>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />
          {isAuthenticated ? (
            /* ── Giriş yapılmış: Dashboard + Çıkış ── */
            <div style={{ display: 'flex', gap: 12, padding: '8px 24px' }}>
              <button
                onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: 'linear-gradient(135deg,#00d4ff,#7b2fff)',
                  border: 'none', color: 'white', fontSize: '0.9rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <LayoutDashboard size={15} /> Dashboard
              </button>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(240,244,255,0.8)', fontSize: '0.9rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <LogOut size={15} /> {t('nav.logout')}
              </button>
            </div>
          ) : (
            /* ── Giriş yapılmamış: Login + GetStarted ── */
            <div style={{ display: 'flex', gap: 12, padding: '8px 24px' }}>
              <button
                onClick={() => navigate('/login?mode=login')}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(240,244,255,0.8)', fontSize: '0.9rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('landing.nav.login')}
              </button>
              <button
                onClick={() => navigate('/login?mode=register')}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  background: 'linear-gradient(135deg,#00d4ff,#7b2fff)',
                  border: 'none', color: 'white', fontSize: '0.9rem', fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('landing.nav.getStarted')}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
