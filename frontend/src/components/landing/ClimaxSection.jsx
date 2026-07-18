import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/**
 * ClimaxSection — Kilitli Final Sahnesi
 *
 * Faz 1 (0→38%)   : Siyah overlay scroll ile dolar
 * Faz 2 (38→58%)  : Sessizlik — saf siyah
 * Faz 3 (58→100%) : Başlık, alt yazı ve butonlar karanlıktan yükselir
 */
export default function ClimaxSection() {
  const sectionRef  = useRef(null);
  const videoRef    = useRef(null);
  const blackRef    = useRef(null);
  const contentRef  = useRef(null);
  const titleRef    = useRef(null);
  const subtitleRef = useRef(null);
  const btnsRef     = useRef(null);
  const navigate    = useNavigate();
  const { t }       = useTranslation();

  useGSAP(() => {
    const section = sectionRef.current;
    const black   = blackRef.current;
    const content = contentRef.current;
    if (!section || !black || !content) return;

    const title    = titleRef.current;
    const subtitle = subtitleRef.current;
    const btns     = btnsRef.current;
    if (!title || !subtitle || !btns) return;

    gsap.set(black,    { opacity: 0 });
    gsap.set(content,  { opacity: 0 });
    gsap.set(title,    { y: 100, opacity: 0 });
    gsap.set(subtitle, { y: 55,  opacity: 0 });
    gsap.set(btns,     { y: 38,  opacity: 0, scale: 0.92 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=400%',
        pin: true,
        pinSpacing: true,
        scrub: 1,
        anticipatePin: 1,
      },
    });

    tl.to(black, { opacity: 1, duration: 0.38, ease: 'power2.inOut' }, 0);

    tl.to(content,  { opacity: 1, duration: 0.001 }, 0.58);

    tl.fromTo(title,
      { y: 100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.27, ease: 'power2.out' },
      0.60
    );

    tl.fromTo(subtitle,
      { y: 55, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.18, ease: 'power2.out' },
      0.80
    );

    tl.fromTo(btns,
      { y: 38, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.12, ease: 'back.out(1.4)' },
      0.91
    );
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      id="climax"
      className="climax-section"
      aria-label={t('landing.climax.ariaLabel')}
    >
      <div className="climax-inner">

        {/* Üst karıştırıcı */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '30vh',
            background: 'linear-gradient(to bottom, #000000 0%, transparent 100%)',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />

        {/* Video */}
        <video
          ref={videoRef}
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            zIndex: 1,
            transform: 'translateZ(0)',
            willChange: 'transform',
          }}
        >
          <source src="/swallow-pov.mp4" type="video/mp4" />
        </video>

        {/* Vignette */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            zIndex: 2,
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.72) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Siyah overlay (scroll ile dolar) */}
        <div
          ref={blackRef}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 10, willChange: 'opacity' }}
        />

        {/* İçerik */}
        <div
          ref={contentRef}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 clamp(1.5rem, 7vw, 8rem)',
            zIndex: 20,
            willChange: 'opacity',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '2.5rem',
              padding: '0.45rem 1.1rem',
              borderRadius: '100px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <span
              className="pulse rounded-full"
              style={{ width: '6px', height: '6px', background: '#00d4ff', display: 'inline-block', flexShrink: 0 }}
              aria-hidden="true"
            />
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.75)', fontWeight: 600 }}>
              {t('landing.climax.badge')}
            </span>
          </div>

          {/* Title */}
          <h2
            ref={titleRef}
            className="t-head"
            style={{
              fontSize: 'clamp(2.5rem,7vw,5.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: '#fff',
              marginBottom: '1.5rem',
              willChange: 'transform, opacity',
            }}
          >
            {t('landing.climax.title')}{' '}
            <span className="g-text">{t('landing.climax.titleHighlight')}</span>
          </h2>

          {/* Subtitle */}
          <p
            ref={subtitleRef}
            style={{
              fontSize: 'clamp(1rem,2.2vw,1.2rem)',
              color: 'rgba(240,244,255,0.5)',
              maxWidth: '560px',
              lineHeight: 1.8,
              marginBottom: '3rem',
              willChange: 'transform, opacity',
            }}
          >
            {t('landing.climax.sub')}
          </p>

          {/* Buttons */}
          <div ref={btnsRef} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', willChange: 'transform, opacity' }}>
            <button
              onClick={() => navigate('/login?mode=register')}
              className="btn btn-primary"
              style={{ padding: 'clamp(0.9rem,1.5vw,1.2rem) clamp(2.5rem,5vw,3.5rem)', fontSize: 'clamp(0.95rem,1.5vw,1.05rem)' }}
            >
              {t('landing.climax.register')}
            </button>
            <button
              onClick={() => navigate('/login?mode=login')}
              className="btn btn-outline"
              style={{ padding: 'clamp(0.9rem,1.5vw,1.2rem) clamp(2.5rem,5vw,3.5rem)', fontSize: 'clamp(0.95rem,1.5vw,1.05rem)' }}
            >
              {t('landing.climax.login')}
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
