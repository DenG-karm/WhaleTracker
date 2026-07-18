import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslation } from 'react-i18next';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const FEATURE_ICONS = [
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><circle cx="14" cy="14" r="10" stroke="#00d4ff" strokeWidth="1.5" fill="none" /><circle cx="14" cy="14" r="4" fill="#00d4ff" opacity="0.8" /><circle cx="14" cy="14" r="7" stroke="#00d4ff" strokeWidth="0.8" strokeDasharray="2 3" fill="none" opacity="0.4" /></svg>), accent: '#00d4ff', tag: 'On-Chain Intel', titleKey: 'f1Title', descKey: 'f1Desc' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M6 22 L11 15 L16 18 L22 8" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="22" cy="8" r="2.5" fill="#a855f7" /></svg>), accent: '#a855f7', tag: 'AI Powered', titleKey: 'f2Title', descKey: 'f2Desc' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="5" y="16" width="4" height="7" rx="1" fill="#3b82f6" opacity="0.6" /><rect x="12" y="11" width="4" height="12" rx="1" fill="#3b82f6" opacity="0.8" /><rect x="19" y="5" width="4" height="18" rx="1" fill="#3b82f6" /></svg>), accent: '#3b82f6', tag: 'Deep Analytics', titleKey: 'f3Title', descKey: 'f3Desc' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M14 4 L16 10 H22 L17.5 13.5 L19.5 20 L14 16 L8.5 20 L10.5 13.5 L6 10 H12 Z" stroke="#eab308" strokeWidth="1.4" fill="rgba(234,179,8,0.2)" strokeLinejoin="round" /></svg>), accent: '#eab308', tag: 'Smart Alerts', titleKey: 'f4Title', descKey: 'f4Desc' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M5 18 Q8 10 14 12 Q20 14 23 6" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" /><path d="M5 22 Q10 15 14 17 Q18 19 23 12" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" /></svg>), accent: '#10b981', tag: 'Backtest', titleKey: 'f5Title', descKey: 'f5Desc' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="5" y="5" width="18" height="18" rx="4" stroke="#f97316" strokeWidth="1.5" fill="none" /><path d="M10 14 L13 17 L18 11" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>), accent: '#f97316', tag: 'News Intel', titleKey: 'f6Title', descKey: 'f6Desc' },
];

export default function FeaturesSection() {
  const sectionRef = useRef(null);
  const headRef    = useRef(null);
  const gridRef    = useRef(null);
  const { t }      = useTranslation();

  useGSAP(() => {
    gsap.fromTo(headRef.current,
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: headRef.current, start: 'top 82%' },
      }
    );

    const cards = gridRef.current?.querySelectorAll('.feat-card');
    if (cards?.length) {
      gsap.fromTo(cards,
        { y: 60, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.85, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: gridRef.current, start: 'top 78%' },
        }
      );
    }
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      id="features"
      className="section-base"
      aria-labelledby="features-title"
      style={{ padding: 'clamp(6rem,12vw,10rem) 0' }}
    >
      <div className="wrap">

        {/* Heading */}
        <div ref={headRef} className="text-center" style={{ marginBottom: 'clamp(3.5rem,7vw,6rem)' }}>
          <div
            className="inline-flex items-center gap-2 mb-6"
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '100px',
              border: '1px solid rgba(0,212,255,0.18)',
              background: 'rgba(0,212,255,0.05)',
            }}
          >
            <span className="pulse rounded-full" style={{ width: '5px', height: '5px', background: '#00d4ff', display: 'inline-block' }} aria-hidden="true" />
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.7)', fontWeight: 600 }}>
              {t('landing.features.badge')}
            </span>
          </div>

          <h2
            id="features-title"
            className="t-head"
            style={{ fontSize: 'clamp(2rem,5.5vw,4rem)', lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: '1.25rem' }}
          >
            {t('landing.features.title')}{' '}
            <span className="g-text">{t('landing.features.titleHighlight')}</span>
          </h2>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.15rem)', color: 'rgba(240,244,255,0.45)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.75 }}>
            {t('landing.features.sub')}
          </p>
        </div>

        {/* Feature grid */}
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: 'clamp(1rem,2.5vw,1.5rem)',
          }}
        >
          {FEATURE_ICONS.map((f, i) => (
            <div
              key={i}
              className="feat-card card feature-card"
              style={{ padding: 'clamp(1.75rem,3vw,2.25rem)' }}
            >
              <div
                className="inline-flex items-center justify-center rounded-xl mb-6"
                style={{ width: '52px', height: '52px', background: `${f.accent}12`, border: `1px solid ${f.accent}25` }}
              >
                {f.icon}
              </div>

              <div
                className="inline-flex mb-4"
                style={{
                  padding: '0.2rem 0.7rem',
                  borderRadius: '100px',
                  fontSize: '0.65rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: f.accent,
                  background: `${f.accent}12`,
                  border: `1px solid ${f.accent}20`,
                }}
              >
                {f.tag}
              </div>

              <h3
                className="t-head"
                style={{ fontSize: '1.1rem', color: 'rgba(240,244,255,0.92)', marginBottom: '0.75rem', lineHeight: 1.3 }}
              >
                {t(`landing.features.${f.titleKey}`)}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'rgba(240,244,255,0.42)', lineHeight: 1.75 }}>
                {t(`landing.features.${f.descKey}`)}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
