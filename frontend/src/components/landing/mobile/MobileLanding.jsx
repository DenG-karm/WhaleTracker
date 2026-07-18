import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import MobileNavbar from './MobileNavbar';
import MobileHero from './MobileHero';
import MobileFeatures from './MobileFeatures';
import MobileClimaxCTA from './MobileClimaxCTA';
import '../../../styles/landing.css';

/* ── Mobil HowItWorks — tek adım bileşeni ────────────────────── */
function StepItem({ step, i }) {
  const stepRef    = useRef(null);
  const stepInView = useInView(stepRef, { once: true, margin: '-30px' });
  return (
    <motion.div
      ref={stepRef}
      initial={{ opacity: 0, x: -20 }}
      animate={stepInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: i * 0.1 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 16,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.06)`,
        borderLeft: `3px solid ${step.accent}`,
        borderRadius: 14, padding: '18px 16px',
      }}
    >
      <span style={{
        fontSize: '1.6rem', fontWeight: 900, color: step.accent,
        opacity: 0.25, lineHeight: 1, flexShrink: 0, minWidth: 36,
      }}>
        {step.n}
      </span>
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 800, color: 'white' }}>
          {step.title}
        </h3>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(240,244,255,0.45)', lineHeight: 1.6 }}>
          {step.desc}
        </p>
      </div>
    </motion.div>
  );
}


const STEP_ACCENTS = ['#00d4ff', '#a855f7', '#10b981'];

function MobileHowItWorks() {
  const { t }    = useTranslation();
  const ref      = useRef(null);
  const inView   = useInView(ref, { once: true, margin: '-40px' });

  const STEPS = [
    { n: '01', accent: STEP_ACCENTS[0], title: t('landing.hiw.s1Title'), desc: t('landing.hiw.s1Desc') },
    { n: '02', accent: STEP_ACCENTS[1], title: t('landing.hiw.s2Title'), desc: t('landing.hiw.s2Desc') },
    { n: '03', accent: STEP_ACCENTS[2], title: t('landing.hiw.s3Title'), desc: t('landing.hiw.s3Desc') },
  ];

  return (
    <section id="how-it-works" style={{ padding: '64px 20px 48px' }}>
      {/* Heading */}
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55 }}
        style={{ textAlign: 'center', marginBottom: 36 }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 100,
          border: '1px solid rgba(168,85,247,0.2)',
          background: 'rgba(168,85,247,0.05)', marginBottom: 16,
        }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#a855f7', display: 'inline-block' }} />
          <span style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(168,85,247,0.75)', fontWeight: 600 }}>
            {t('landing.hiw.badge')}
          </span>
        </div>
        <h2 style={{
          fontSize: 'clamp(1.8rem,8vw,2.6rem)', fontWeight: 900,
          lineHeight: 1.1, letterSpacing: '-0.025em', color: 'white', margin: 0,
        }}>
          {t('landing.hiw.title')}{' '}
          <span style={{ background: 'linear-gradient(135deg,#a855f7,#7b2fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('landing.hiw.titleHighlight')}
          </span>
        </h2>
      </motion.div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {STEPS.map((step, i) => (
          <StepItem key={i} step={step} i={i} />
        ))}
      </div>
    </section>
  );
}

/* ── Mobil Community (GSAP yok) ───────────────────────────────── */
const TESTIMONIAL_ACCENTS = ['#10b981', '#00d4ff', '#a855f7', '#f97316'];
const STAT_VALUES = ['12K+', '150+', '4.9★', '$2.4B+'];

function MobileCommunity() {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const ref      = useRef(null);
  const inView   = useInView(ref, { once: true, margin: '-40px' });

  const STATS = [
    { v: STAT_VALUES[0], l: t('landing.community.stat1') },
    { v: STAT_VALUES[1], l: t('landing.community.stat2') },
    { v: STAT_VALUES[2], l: t('landing.community.stat3') },
    { v: STAT_VALUES[3], l: t('landing.community.stat4') },
  ];

  const TESTIMONIALS = [
    { quote: t('landing.community.t1Quote'), name: t('landing.community.t1Name'), role: t('landing.community.t1Role'), pnl: '+340% YTD', accent: TESTIMONIAL_ACCENTS[0] },
    { quote: t('landing.community.t2Quote'), name: t('landing.community.t2Name'), role: t('landing.community.t2Role'), pnl: '+127%',     accent: TESTIMONIAL_ACCENTS[1] },
    { quote: t('landing.community.t3Quote'), name: t('landing.community.t3Name'), role: t('landing.community.t3Role'), pnl: 'Sharpe: 2.8', accent: TESTIMONIAL_ACCENTS[2] },
    { quote: t('landing.community.t4Quote'), name: t('landing.community.t4Name'), role: t('landing.community.t4Role'), pnl: '+89%',       accent: TESTIMONIAL_ACCENTS[3] },
  ];

  return (
    <section
      id="community"
      style={{ padding: '64px 20px 64px', background: 'rgba(0,0,0,0.25)' }}
    >
      {/* Heading */}
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 100,
          border: '1px solid rgba(0,212,255,0.18)',
          background: 'rgba(0,212,255,0.05)', marginBottom: 16,
        }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#00d4ff', display: 'inline-block' }} />
          <span style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.7)', fontWeight: 600 }}>
            {t('landing.community.badge')}
          </span>
        </div>
        <h2 style={{
          fontSize: 'clamp(1.8rem,8vw,2.6rem)', fontWeight: 900,
          lineHeight: 1.1, letterSpacing: '-0.025em', color: 'white', margin: 0,
        }}>
          {t('landing.community.title')}{' '}
          <span style={{ background: 'linear-gradient(135deg,#00d4ff,#7b2fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('landing.community.titleHighlight')}
          </span>
        </h2>
      </motion.div>

      {/* Stats — 2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        {STATS.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            style={{
              textAlign: 'center', padding: '20px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
            }}
          >
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {s.v}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(240,244,255,0.4)', marginTop: 6, fontWeight: 500 }}>
              {s.l}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Testimonials — yatay scroll */}
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {TESTIMONIALS.map((tm, i) => (
          <div
            key={i}
            style={{
              minWidth: '72vw', maxWidth: 280,
              scrollSnapAlign: 'start',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid rgba(255,255,255,0.07)`,
              borderTop: `2px solid ${tm.accent}`,
              borderRadius: 16, padding: '20px 18px',
              flexShrink: 0,
            }}
          >
            <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: 'rgba(240,244,255,0.65)', lineHeight: 1.65, fontStyle: 'italic' }}>
              "{tm.quote}"
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white' }}>{tm.name}</div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(240,244,255,0.35)', marginTop: 2 }}>{tm.role}</div>
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: 800, color: tm.accent,
                background: `${tm.accent}15`, padding: '4px 10px', borderRadius: 20,
              }}>
                {tm.pnl}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Mobil Footer ─────────────────────────────────────────────── */
function MobileFooter() {
  const { t } = useTranslation();
  return (
    <footer style={{
      background: '#020408',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '32px 20px',
      paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <img src="/assets/data-whale.svg" alt="WhaleTracker" width={24} height={24} />
        <span style={{ fontWeight: 900, fontSize: '0.82rem', letterSpacing: '0.18em', color: '#f0f4ff' }}>
          WHALETRACKER
        </span>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'rgba(240,244,255,0.28)', lineHeight: 1.7, margin: '0 0 20px', maxWidth: 300 }}>
        {t('landing.footer.tagline')}
      </p>
      <div style={{ fontSize: '0.72rem', color: 'rgba(240,244,255,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
        {t('landing.footer.copyright')}
      </div>
    </footer>
  );
}

/* ── Ana MobileLanding ────────────────────────────────────────── */
export default function MobileLanding() {
  useEffect(() => {
    document.body.classList.add('wt-landing-active');
    return () => document.body.classList.remove('wt-landing-active');
  }, []);

  return (
    <div className="wt-landing" id="top" style={{ background: '#020408', minHeight: '100svh' }}>
      <div className="noise" aria-hidden="true" />
      <MobileNavbar />
      <MobileHero />
      <MobileFeatures />
      <MobileHowItWorks />
      <MobileCommunity />
      <MobileClimaxCTA />
      <MobileFooter />
    </div>
  );
}
