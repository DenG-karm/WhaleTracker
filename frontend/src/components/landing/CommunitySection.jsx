import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const TESTIMONIAL_ACCENTS = ['#10b981', '#00d4ff', '#a855f7', '#f97316'];
const STAT_VALUES = ['12K+', '150+', '4.9★', '$2.4B+'];

export default function CommunitySection() {
  const sectionRef = useRef(null);
  const headRef    = useRef(null);
  const statsRef   = useRef(null);
  const cardsRef   = useRef(null);
  const ctaRef     = useRef(null);
  const navigate   = useNavigate();
  const { t }      = useTranslation();

  const TESTIMONIALS = [
    { quote: t('landing.community.t1Quote'), name: t('landing.community.t1Name'), role: t('landing.community.t1Role'), pnl: '+340% YTD',        accent: TESTIMONIAL_ACCENTS[0] },
    { quote: t('landing.community.t2Quote'), name: t('landing.community.t2Name'), role: t('landing.community.t2Role'), pnl: '+127%',              accent: TESTIMONIAL_ACCENTS[1] },
    { quote: t('landing.community.t3Quote'), name: t('landing.community.t3Name'), role: t('landing.community.t3Role'), pnl: 'Sharpe: 2.8',        accent: TESTIMONIAL_ACCENTS[2] },
    { quote: t('landing.community.t4Quote'), name: t('landing.community.t4Name'), role: t('landing.community.t4Role'), pnl: '+89%',               accent: TESTIMONIAL_ACCENTS[3] },
  ];

  const STATS = [
    { v: STAT_VALUES[0], l: t('landing.community.stat1') },
    { v: STAT_VALUES[1], l: t('landing.community.stat2') },
    { v: STAT_VALUES[2], l: t('landing.community.stat3') },
    { v: STAT_VALUES[3], l: t('landing.community.stat4') },
  ];

  useGSAP(() => {
    gsap.fromTo(headRef.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: headRef.current, start: 'top 82%' } }
    );

    gsap.fromTo(statsRef.current?.querySelectorAll('.stat-item') ?? [],
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: statsRef.current, start: 'top 82%' } }
    );

    gsap.fromTo(cardsRef.current?.querySelectorAll('.t-card') ?? [],
      { y: 60, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.85, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: cardsRef.current, start: 'top 78%' } }
    );

    gsap.fromTo(ctaRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: ctaRef.current, start: 'top 85%' } }
    );
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      id="community"
      className="section-base community-blend"
      aria-labelledby="community-title"
      style={{ padding: 'clamp(6rem,12vw,10rem) 0 clamp(8rem,18vw,14rem)' }}
    >
      <div className="wrap">

        {/* Heading */}
        <div ref={headRef} className="text-center" style={{ marginBottom: 'clamp(3rem,6vw,5rem)' }}>
          <div
            className="inline-flex items-center gap-2 mb-6"
            style={{ padding: '0.4rem 1rem', borderRadius: '100px', border: '1px solid rgba(0,212,255,0.18)', background: 'rgba(0,212,255,0.05)' }}
          >
            <span className="pulse rounded-full" style={{ width: '5px', height: '5px', background: '#00d4ff', display: 'inline-block' }} aria-hidden="true" />
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.7)', fontWeight: 600 }}>
              {t('landing.community.badge')}
            </span>
          </div>
          <h2
            id="community-title"
            className="t-head"
            style={{ fontSize: 'clamp(2rem,5.5vw,4rem)', lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: '1.25rem' }}
          >
            {t('landing.community.title')}{' '}
            <span className="g-text">{t('landing.community.titleHighlight')}</span>
          </h2>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.15rem)', color: 'rgba(240,244,255,0.45)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.75 }}>
            {t('landing.community.sub')}
          </p>
        </div>

        {/* Stats */}
        <div
          ref={statsRef}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'clamp(1rem,2.5vw,1.5rem)', marginBottom: 'clamp(4rem,8vw,7rem)' }}
        >
          {STATS.map((s, i) => (
            <div key={i} className="stat-item card text-center" style={{ padding: 'clamp(1.5rem,3vw,2rem) 1rem' }}>
              <div className="t-head g-text" style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', marginBottom: '0.4rem' }}>{s.v}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(240,244,255,0.38)', letterSpacing: '0.05em' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div
          ref={cardsRef}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: 'clamp(1.25rem,2.5vw,1.75rem)', marginBottom: 'clamp(5rem,10vw,8rem)' }}
        >
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="t-card card" style={{ padding: 'clamp(2rem,3.5vw,2.5rem)' }}>
              <div style={{ fontSize: '3rem', lineHeight: 0.8, marginBottom: '1.25rem', color: `${t.accent}35`, fontFamily: 'Georgia, serif' }}>&ldquo;</div>
              <p style={{ fontSize: 'clamp(0.9rem,1.6vw,1rem)', color: 'rgba(240,244,255,0.65)', lineHeight: 1.8, marginBottom: '1.75rem' }}>
                {t.quote}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(240,244,255,0.88)', marginBottom: '0.2rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(240,244,255,0.35)' }}>{t.role}</div>
                </div>
                <div style={{ padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, color: t.accent, background: `${t.accent}12`, border: `1px solid ${t.accent}22`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {t.pnl}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          ref={ctaRef}
          className="card text-center"
          style={{ padding: 'clamp(3rem,6vw,5rem) clamp(2rem,5vw,4rem)', borderColor: 'rgba(0,212,255,0.1)', background: 'linear-gradient(135deg, rgba(0,212,255,0.04) 0%, rgba(10,31,61,0.6) 50%, rgba(168,85,247,0.04) 100%)', position: 'relative', overflow: 'hidden' }}
        >
          <div aria-hidden="true" style={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(0,212,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <h3 className="t-head" style={{ fontSize: 'clamp(1.6rem,4vw,2.8rem)', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
              {t('landing.community.ctaTitle')}{' '}
              <span className="g-text">{t('landing.community.ctaTitleHighlight')}</span>
            </h3>
            <p style={{ fontSize: 'clamp(0.95rem,1.8vw,1.1rem)', color: 'rgba(240,244,255,0.45)', maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
              Her geçen saniye balinalar pozisyon kuruyor. Onları izlemek için artık geç değil — ama her geçen saniye bir fırsat kaybı.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => navigate('/login?mode=register')}
                  className="btn btn-primary"
                  style={{ padding: 'clamp(0.9rem,1.5vw,1.15rem) clamp(2rem,4vw,3rem)', fontSize: 'clamp(0.9rem,1.5vw,1.05rem)' }}
                >
                  {t('landing.community.ctaBtn1')}
                </button>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="btn btn-outline"
                  style={{ padding: 'clamp(0.9rem,1.5vw,1.15rem) clamp(2rem,4vw,3rem)', fontSize: 'clamp(0.9rem,1.5vw,1.05rem)' }}
                >
                  {t('landing.community.ctaBtn2')}
                </button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'rgba(240,244,255,0.25)' }}>{t('landing.community.ctaNote')}</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
