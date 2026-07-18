import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const STEP_ACCENTS = ['#00d4ff', '#a855f7', '#10b981'];

export default function HowItWorksSection() {
  const sectionRef = useRef(null);
  const headRef    = useRef(null);
  const stepsRef   = useRef(null);
  const navigate   = useNavigate();
  const { t }      = useTranslation();

  const STEPS = [
    { n: '01', accent: STEP_ACCENTS[0], title: t('landing.hiw.s1Title'), desc: t('landing.hiw.s1Desc'), detail: t('landing.hiw.s1Detail') },
    { n: '02', accent: STEP_ACCENTS[1], title: t('landing.hiw.s2Title'), desc: t('landing.hiw.s2Desc'), detail: t('landing.hiw.s2Detail') },
    { n: '03', accent: STEP_ACCENTS[2], title: t('landing.hiw.s3Title'), desc: t('landing.hiw.s3Desc'), detail: t('landing.hiw.s3Detail') },
  ];

  useGSAP(() => {
    gsap.fromTo(headRef.current,
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: headRef.current, start: 'top 82%' },
      }
    );

    const items = stepsRef.current?.querySelectorAll('.step-item');
    if (items?.length) {
      gsap.fromTo(items,
        { x: -40, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 0.9, stagger: 0.18, ease: 'power3.out',
          scrollTrigger: { trigger: stepsRef.current, start: 'top 78%' },
        }
      );
    }
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="section-base"
      aria-labelledby="hiw-title"
      style={{ padding: 'clamp(6rem,12vw,10rem) 0' }}
    >
      <div className="wrap-narrow">

        {/* Heading */}
        <div ref={headRef} className="text-center" style={{ marginBottom: 'clamp(3.5rem,7vw,5.5rem)' }}>
          <div
            className="inline-flex items-center gap-2 mb-6"
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '100px',
              border: '1px solid rgba(168,85,247,0.2)',
              background: 'rgba(168,85,247,0.05)',
            }}
          >
            <span className="pulse rounded-full" style={{ width: '5px', height: '5px', background: '#a855f7', display: 'inline-block' }} aria-hidden="true" />
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(168,85,247,0.75)', fontWeight: 600 }}>
              {t('landing.hiw.badge')}
            </span>
          </div>

          <h2
            id="hiw-title"
            className="t-head"
            style={{ fontSize: 'clamp(2rem,5.5vw,4rem)', lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: '1.25rem' }}
          >
            {t('landing.hiw.title')}{' '}
            <span className="g-text">{t('landing.hiw.titleHighlight')}</span>
          </h2>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.15rem)', color: 'rgba(240,244,255,0.45)', lineHeight: 1.75 }}>
            {t('landing.hiw.sub')}
          </p>
        </div>

        {/* Steps */}
        <div ref={stepsRef} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(1.5rem,4vw,2rem)' }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="step-item card"
              style={{
                padding: 'clamp(2rem,4vw,2.75rem)',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 'clamp(1.5rem,3vw,2.5rem)',
                alignItems: 'start',
                borderLeft: `2px solid ${s.accent}35`,
              }}
            >
              {/* Number */}
              <div
                className="t-head flex-shrink-0 flex items-center justify-center rounded-2xl"
                style={{
                  width: '64px',
                  height: '64px',
                  fontSize: '1.5rem',
                  color: s.accent,
                  background: `${s.accent}10`,
                  border: `1px solid ${s.accent}25`,
                }}
              >
                {s.n}
              </div>

              {/* Content */}
              <div>
                <h3 className="t-head" style={{ fontSize: 'clamp(1.1rem,2.2vw,1.4rem)', color: 'rgba(240,244,255,0.92)', marginBottom: '0.6rem', lineHeight: 1.3 }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 'clamp(0.9rem,1.6vw,1rem)', color: 'rgba(240,244,255,0.45)', lineHeight: 1.75, marginBottom: '1rem' }}>
                  {s.desc}
                </p>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.78rem',
                    color: s.accent,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.accent, display: 'inline-block' }} />
                  {s.detail}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center" style={{ marginTop: 'clamp(3rem,6vw,5rem)' }}>
          <button
            onClick={() => navigate('/login?mode=register')}
            className="btn btn-primary"
            style={{
              padding: 'clamp(0.9rem,1.5vw,1.15rem) clamp(2.5rem,5vw,3.5rem)',
              fontSize: 'clamp(0.95rem,1.5vw,1.05rem)',
            }}
          >
            {t('landing.hiw.cta')}
          </button>
          <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(240,244,255,0.28)' }}>
            {t('landing.hiw.ctaSub')}
          </p>
        </div>

      </div>
    </section>
  );
}
