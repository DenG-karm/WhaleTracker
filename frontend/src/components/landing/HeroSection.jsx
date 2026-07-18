import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

export default function HeroSection() {
  const sectionRef = useRef(null);
  const overlayRef = useRef(null);
  const badgeRef   = useRef(null);
  const titleRef   = useRef(null);
  const subRef     = useRef(null);
  const ctaRef     = useRef(null);
  const scrollRef  = useRef(null);
  const navigate   = useNavigate();
  const { t }      = useTranslation();

  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.2 });

    tl.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 2.5, ease: 'power1.out' }
    );

    tl.fromTo(badgeRef.current,
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' },
      '-=1.8'
    );

    if (titleRef.current) {
      tl.fromTo(titleRef.current,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, ease: 'power4.out' },
        '-=0.6'
      );
    }

    tl.fromTo(subRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' },
      '-=0.35'
    );

    tl.fromTo(ctaRef.current,
      { y: 22, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.8)' },
      '-=0.4'
    );

    tl.fromTo(scrollRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 1 },
      '-=0.2'
    );
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="hero-wrap hero-blend section-base"
      aria-label={t('landing.hero.ariaLabel')}
    >
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 1, transform: 'translateZ(0)', willChange: 'transform' }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src="/intro-whale.mp4" type="video/mp4" />
      </video>

      {/* Cinematic overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{
          zIndex: 2,
          willChange: 'opacity',
          background: [
            'linear-gradient(180deg, rgba(2,4,8,0.78) 0%, rgba(2,4,8,0.2) 40%, rgba(2,4,8,0.55) 68%, rgba(2,4,8,0.97) 100%)',
            'radial-gradient(ellipse 90% 60% at 50% 40%, rgba(0,47,135,0.18) 0%, transparent 70%)',
          ].join(', '),
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pt-32 pb-12 px-4 text-center">
        {/* Badge */}
        <div
          ref={badgeRef}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs font-bold tracking-widest uppercase mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          WHALE INTELLIGENCE PLATFORM
        </div>

        {/* Headline */}
        <h1
          ref={titleRef}
          className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6"
          style={{ willChange: 'transform, opacity' }}
        >
          {t('landing.hero.title')}<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            {t('landing.hero.titleHighlight')}
          </span>
        </h1>

        {/* Sub */}
        <p
          ref={subRef}
          className="max-w-2xl mx-auto text-lg md:text-xl text-gray-300 font-light leading-relaxed mb-12"
        >
          {t('landing.hero.sub')}{' '}
          <span className="text-white font-medium">{t('landing.hero.subHighlight')}</span>
        </p>

        {/* CTA buttons */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
          <button
            onClick={() => navigate('/login?mode=register')}
            className="px-14 py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] text-base"
          >
            {t('landing.hero.ctaFree')}
          </button>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-14 py-5 bg-transparent border border-white/20 hover:border-white/60 text-gray-300 hover:text-white font-semibold rounded-full transition-all backdrop-blur-sm text-base"
          >
            {t('landing.hero.ctaHow')}
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-10 left-1/2 bounce-y"
        style={{ zIndex: 4, willChange: 'opacity' }}
        aria-hidden="true"
      >
        <div className="flex flex-col items-center gap-2">
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(240,244,255,0.28)' }}>
            {t('landing.hero.scroll')}
          </span>
          <svg width="14" height="22" viewBox="0 0 14 22" fill="none">
            <rect x="1" y="1" width="12" height="20" rx="6" stroke="rgba(240,244,255,0.2)" strokeWidth="1.4" />
            <rect x="6" y="5" width="2" height="5" rx="1" fill="rgba(0,212,255,0.6)" />
          </svg>
        </div>
      </div>
    </section>
  );
}
