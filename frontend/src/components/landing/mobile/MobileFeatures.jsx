import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const FEATURES = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10" stroke="#00d4ff" strokeWidth="1.5" fill="none" />
        <circle cx="14" cy="14" r="4" fill="#00d4ff" opacity="0.8" />
        <circle cx="14" cy="14" r="7" stroke="#00d4ff" strokeWidth="0.8" strokeDasharray="2 3" fill="none" opacity="0.4" />
      </svg>
    ),
    accent: '#00d4ff', tag: 'On-Chain Intel', titleKey: 'f1Title', descKey: 'f1Desc',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <path d="M6 22 L11 15 L16 18 L22 8" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="22" cy="8" r="2.5" fill="#a855f7" />
      </svg>
    ),
    accent: '#a855f7', tag: 'AI Powered', titleKey: 'f2Title', descKey: 'f2Desc',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <rect x="5" y="16" width="4" height="7" rx="1" fill="#3b82f6" opacity="0.6" />
        <rect x="12" y="11" width="4" height="12" rx="1" fill="#3b82f6" opacity="0.8" />
        <rect x="19" y="5" width="4" height="18" rx="1" fill="#3b82f6" />
      </svg>
    ),
    accent: '#3b82f6', tag: 'Deep Analytics', titleKey: 'f3Title', descKey: 'f3Desc',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <path d="M14 4 L16 10 H22 L17.5 13.5 L19.5 20 L14 16 L8.5 20 L10.5 13.5 L6 10 H12 Z" stroke="#eab308" strokeWidth="1.4" fill="rgba(234,179,8,0.2)" strokeLinejoin="round" />
      </svg>
    ),
    accent: '#eab308', tag: 'Smart Alerts', titleKey: 'f4Title', descKey: 'f4Desc',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <path d="M5 18 Q8 10 14 12 Q20 14 23 6" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    accent: '#10b981', tag: 'Backtest', titleKey: 'f5Title', descKey: 'f5Desc',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <rect x="5" y="5" width="18" height="18" rx="4" stroke="#f97316" strokeWidth="1.5" fill="none" />
        <path d="M10 14 L13 17 L18 11" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: '#f97316', tag: 'News Intel', titleKey: 'f6Title', descKey: 'f6Desc',
  },
];

function FeatureCard({ feature, index }) {
  const ref      = useRef(null);
  const inView   = useInView(ref, { once: true, margin: '-40px' });
  const { t }    = useTranslation();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: (index % 2) * 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.06)`,
        borderTop: `2px solid ${feature.accent}`,
        borderRadius: 16, padding: '20px 18px',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 60, height: 60,
        borderRadius: '50%', background: `${feature.accent}12`,
        transform: 'translate(20px,-20px)',
      }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${feature.accent}15`,
        border: `1px solid ${feature.accent}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        {feature.icon}
      </div>
      <div style={{
        fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: feature.accent,
        marginBottom: 6, opacity: 0.8,
      }}>
        {feature.tag}
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: '0.92rem', fontWeight: 800, color: 'white', lineHeight: 1.3 }}>
        {t(`landing.features.${feature.titleKey}`)}
      </h3>
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(240,244,255,0.45)', lineHeight: 1.65 }}>
        {t(`landing.features.${feature.descKey}`)}
      </p>
    </motion.div>
  );
}

export default function MobileFeatures() {
  const headRef = useRef(null);
  const headInView = useInView(headRef, { once: true, margin: '-40px' });
  const { t } = useTranslation();

  return (
    <section id="features" style={{ padding: '64px 20px 48px', background: 'rgba(0,0,0,0.2)' }}>
      {/* Başlık */}
      <motion.div
        ref={headRef}
        initial={{ opacity: 0, y: 30 }}
        animate={headInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: 36 }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 100,
          border: '1px solid rgba(0,212,255,0.18)',
          background: 'rgba(0,212,255,0.05)', marginBottom: 16,
        }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#00d4ff', display: 'inline-block' }} />
          <span style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.7)', fontWeight: 600 }}>
            {t('landing.features.badge')}
          </span>
        </div>
        <h2 style={{
          fontSize: 'clamp(1.8rem,8vw,2.6rem)', fontWeight: 900,
          lineHeight: 1.1, letterSpacing: '-0.025em',
          color: 'white', margin: '0 0 12px',
        }}>
          {t('landing.features.title')}{' '}
          <span style={{ background: 'linear-gradient(135deg,#00d4ff,#7b2fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('landing.features.titleHighlight')}
          </span>
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'rgba(240,244,255,0.45)', lineHeight: 1.7, margin: 0 }}>
          {t('landing.features.sub')}
        </p>
      </motion.div>

      {/* Feature Grid — 2 sütun */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {FEATURES.map((feat, i) => (
          <FeatureCard key={i} feature={feat} index={i} />
        ))}
      </div>
    </section>
  );
}
