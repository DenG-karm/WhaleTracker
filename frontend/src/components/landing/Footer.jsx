import { useTranslation } from 'react-i18next';

const LINK_KEYS = [
  { headKey: 'p1', links: ['p1l1','p1l2','p1l3','p1l4'] },
  { headKey: 'p2', links: ['p2l1','p2l2','p2l3','p2l4'] },
  { headKey: 'p3', links: ['p3l1','p3l2','p3l3','p3l4'] },
  { headKey: 'p4', links: ['p4l1','p4l2','p4l3','p4l4'] },
];

export default function LandingFooter() {
  const { t } = useTranslation();
  return (
    <footer
      aria-label="Site alt bilgisi"
      style={{
        background: '#020408',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div className="wrap" style={{ padding: 'clamp(4rem,8vw,6rem) clamp(1.5rem,5vw,4rem)' }}>

        {/* Top row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'clamp(2rem,5vw,4rem)', marginBottom: 'clamp(3rem,6vw,5rem)' }}>

          {/* Brand column */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <img src="/assets/data-whale.svg" alt="WhaleTracker" width={32} height={32} />
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.2em', color: '#f0f4ff' }}>
                WHALETRACKER
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'rgba(240,244,255,0.32)', lineHeight: 1.75, maxWidth: '240px' }}>
              {t('landing.footer.tagline')}
            </p>
          </div>

          {/* Link columns */}
          {LINK_KEYS.map(({ headKey, links }) => (
            <div key={headKey}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,244,255,0.4)', marginBottom: '1.25rem' }}>
                {t(`landing.footer.${headKey}`)}
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {links.map(linkKey => (
                  <li key={linkKey}>
                    <a
                      href="#"
                      style={{ fontSize: '0.875rem', color: 'rgba(240,244,255,0.42)', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.85)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,244,255,0.42)')}
                    >
                      {t(`landing.footer.${linkKey}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: 'clamp(1.5rem,3vw,2rem)' }} />

        {/* Bottom bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'rgba(240,244,255,0.25)' }}>
            &copy; {new Date().getFullYear()} WhaleTracker. {t('landing.footer.copyright')}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {['𝕏', 'TG', 'DC', 'YT'].map(s => (
              <a
                key={s}
                href="#"
                aria-label={`Social: ${s}`}
                style={{
                  width: '32px', height: '32px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.78rem',
                  color: 'rgba(240,244,255,0.4)',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.color = 'rgba(0,212,255,0.8)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(240,244,255,0.4)'; }}
              >
                {s}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
