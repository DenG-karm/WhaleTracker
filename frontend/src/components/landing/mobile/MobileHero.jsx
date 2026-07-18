import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Zap } from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] } },
});

export default function MobileHero() {
  const navigate = useNavigate();
  const { t }    = useTranslation();

  return (
    <section
      id="hero"
      style={{
        position: 'relative', minHeight: '100svh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 48px', textAlign: 'center', overflow: 'hidden',
      }}
    >
      {/* Background video */}
      <video
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 0,
        }}
        autoPlay muted loop playsInline preload="auto"
        poster="/assets/hero-poster.jpg"
        aria-hidden="true"
      >
        <source src="/intro-whale.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: [
          'linear-gradient(180deg,rgba(2,4,8,0.75) 0%,rgba(2,4,8,0.25) 40%,rgba(2,4,8,0.65) 70%,rgba(2,4,8,0.98) 100%)',
          'radial-gradient(ellipse 100% 70% at 50% 30%,rgba(0,47,135,0.2) 0%,transparent 70%)',
        ].join(','),
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 420, width: '100%' }}>

        {/* Badge */}
        <motion.div {...fadeUp(0.1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          <div style={{
            padding: '6px 14px', borderRadius: 100,
            border: '1px solid rgba(0,212,255,0.25)',
            background: 'rgba(0,212,255,0.07)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00d4ff', display: 'inline-block', boxShadow: '0 0 6px #00d4ff' }} />
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.8)', fontWeight: 700 }}>
              {t('landing.hero.badge')}
            </span>
          </div>
        </motion.div>

        {/* Başlık */}
        <motion.h1
          {...fadeUp(0.25)}
          style={{
            fontSize: 'clamp(2.4rem, 11vw, 3.6rem)',
            fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.03em',
            color: 'white', margin: '0 0 16px',
          }}
        >
          {t('landing.hero.title')}
        </motion.h1>

        {/* Alt yazı */}
        <motion.p
          {...fadeUp(0.4)}
          style={{
            fontSize: 'clamp(0.95rem, 4.2vw, 1.1rem)',
            color: 'rgba(240,244,255,0.55)', lineHeight: 1.7,
            margin: '0 0 36px',
          }}
        >
          {t('landing.hero.sub')}
        </motion.p>

        {/* CTA Butonlar */}
        <motion.div {...fadeUp(0.55)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => navigate('/login?mode=register')}
            style={{
              padding: '16px 24px', borderRadius: 14,
              background: 'linear-gradient(135deg,#00d4ff 0%,#7b2fff 100%)',
              border: 'none', color: 'white', fontSize: '1rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 24px rgba(0,212,255,0.35)',
              letterSpacing: '-0.01em',
            }}
          >
            {t('landing.hero.ctaPrimary')} <ArrowRight size={18} />
          </button>
          <button
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '14px 24px', borderRadius: 14,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(240,244,255,0.75)', fontSize: '0.95rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
            }}
          >
            <Zap size={16} color="#eab308" /> {t('landing.hero.ctaSecondary')}
          </button>
        </motion.div>

      </div>

      {/* Scroll indicator */}
      <motion.div
        {...fadeUp(0.9)}
        style={{
          position: 'absolute', bottom: 28, left: '50%',
          transform: 'translateX(-50%)', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}
      >
        <div style={{
          width: 1, height: 40,
          background: 'linear-gradient(180deg,rgba(255,255,255,0.3),transparent)',
        }} />
      </motion.div>
    </section>
  );
}
