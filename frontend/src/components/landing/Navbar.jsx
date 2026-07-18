import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WhaleLogo from '../common/WhaleLogo';

const NAV_KEYS = [
  { key: 'features',   href: '#features'    },
  { key: 'howItWorks', href: '#how-it-works' },
  { key: 'community',  href: '#community'   },
];

export default function LandingNavbar() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  // i18n.language is NOT reactive on its own — listen to the event to force re-render
  const [activeLang, setActiveLang] = useState(
    () => (i18n.language?.startsWith('tr') ? 'TR' : 'EN')
  );

  useEffect(() => {
    const onLangChange = (lng) => {
      setActiveLang(lng?.startsWith('tr') ? 'TR' : 'EN');
    };
    i18n.on('languageChanged', onLangChange);
    return () => i18n.off('languageChanged', onLangChange);
  }, [i18n]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (href) => {
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const switchLang = (lang) => {
    // react-i18next → triggers 'languageChanged' event → setActiveLang fires
    i18n.changeLanguage(lang.toLowerCase());
  };

  return (
    <header className={`nav-base ${scrolled ? 'nav-frosted' : ''}`} role="banner">
      <div className="wrap flex items-center justify-between h-16">

        {/* Brand — Projenin orijinal WhaleLogo bileşeni */}
        <button
          onClick={() => scrollTo('#hero')}
          className="flex items-center bg-transparent border-none cursor-pointer"
          aria-label="WhaleTracker — Ana Sayfa"
        >
          <WhaleLogo size="md" showText={true} animated={false} />
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
          {NAV_KEYS.map(({ key, href }) => (
            <button
              key={href}
              onClick={() => scrollTo(href)}
              className="text-sm font-medium transition-colors duration-200 bg-transparent border-none cursor-pointer"
              style={{ color: 'rgba(240,244,255,0.45)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,244,255,1)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.45)')}
            >
              {t(`landing.nav.${key}`)}
            </button>
          ))}
        </nav>

        {/* CTAs + Lang switcher */}
        <div className="flex items-center gap-3">
          {/* TR / EN split buttons — active class applied reactively */}
          <div className="flex items-center" style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', overflow: 'hidden' }}>
            {['TR', 'EN'].map((lang) => (
              <button
                key={lang}
                onClick={() => switchLang(lang)}
                className={`lang-btn${activeLang === lang ? ' active' : ''}`}
                style={{
                  borderRadius: 0,
                  border: 'none',
                  borderRight: lang === 'TR' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  padding: '0.3rem 0.65rem',
                  minWidth: '2.4rem',
                  justifyContent: 'center',
                  ...(activeLang === lang
                    ? { color: '#00d4ff', background: 'rgba(0,212,255,0.1)' }
                    : {}),
                }}
                aria-pressed={activeLang === lang}
                aria-label={lang === 'TR' ? 'Türkçeye geç' : 'Switch to English'}
              >
                {activeLang === lang && (
                  <span
                    aria-hidden="true"
                    style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00d4ff', display: 'inline-block', marginRight: '0.3rem', flexShrink: 0 }}
                  />
                )}
                {lang}
              </button>
            ))}
          </div>

          {/* Login */}
          <button
            onClick={() => navigate('/login?mode=login')}
            className="btn btn-outline hidden sm:inline-flex"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
          >
            {t('landing.nav.login')}
          </button>

          {/* Register */}
          <button
            onClick={() => navigate('/login?mode=register')}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
          >
            {t('landing.nav.register')}
          </button>
        </div>

      </div>
    </header>
  );
}
