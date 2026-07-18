import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

export default function MobileClimaxCTA() {
  const ref      = useRef(null);
  const inView   = useInView(ref, { once: true, margin: '-60px' });
  const navigate = useNavigate();
  const { t }    = useTranslation();

  return (
    <section
      ref={ref}
      style={{
        padding: '72px 24px 80px',
        textAlign: 'center',
        background: 'linear-gradient(180deg,rgba(0,0,0,0.4) 0%,rgba(0,10,20,0.9) 100%)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(ellipse,rgba(0,212,255,0.12) 0%,transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{
            display: 'inline-flex', padding: '8px 20px', borderRadius: 100,
            border: '1px solid rgba(0,212,255,0.2)',
            background: 'rgba(0,212,255,0.06)',
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(0,212,255,0.8)',
          }}>
            {t('landing.climax.badge')}
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.1 }}
          style={{
            fontSize: 'clamp(2rem,9vw,3rem)', fontWeight: 900,
            lineHeight: 1.05, letterSpacing: '-0.03em',
            color: 'white', margin: '0 0 16px',
          }}
        >
          {t('landing.climax.title')}{' '}
          <span style={{
            background: 'linear-gradient(135deg,#00d4ff 0%,#7b2fff 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {t('landing.climax.titleHighlight')}
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontSize: '0.95rem', color: 'rgba(240,244,255,0.5)',
            lineHeight: 1.7, margin: '0 0 36px', maxWidth: 340,
            marginLeft: 'auto', marginRight: 'auto',
          }}
        >
          {t('landing.climax.sub')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <button
            onClick={() => navigate('/login?mode=register')}
            style={{
              padding: '17px 24px', borderRadius: 14,
              background: 'linear-gradient(135deg,#00d4ff 0%,#7b2fff 100%)',
              border: 'none', color: 'white', fontSize: '1rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 30px rgba(0,212,255,0.4)',
            }}
          >
            {t('landing.climax.ctaPrimary')} <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate('/login?mode=login')}
            style={{
              padding: '15px 24px', borderRadius: 14,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(240,244,255,0.65)', fontSize: '0.95rem', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('landing.climax.ctaSecondary')}
          </button>
        </motion.div>

        {/* Güven notu */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: 24 }}
        >
          {t('landing.climax.trustNote')}
        </motion.p>
      </div>
    </section>
  );
}
