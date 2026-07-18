/**
 * WhaleScrollytelling.jsx -- Landing Page v3
 * i18n integrated (useTranslation + wt_lang), Inter font, TR/EN toggle
 * Sections: AuroraBackground · Navbar · Hero · StatsStrip · FeaturesBento · FinalCta
 */

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import posthog from 'posthog-js';
import {
  motion,
  AnimatePresence,
  useMotionTemplate,
  useMotionValue,
  useInView,
  useTransform,
  animate as fmAnimate,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  ShieldCheck,
  Activity,
  Gauge,
  Globe2,
  Bot,
  Radar,
  Brain,
  LineChart,
} from "lucide-react";
import WhaleLogo from "./common/WhaleLogo";

/* ─────────────────────────────────────────────────────────────────────────────
   AURORA BACKGROUND
───────────────────────────────────────────────────────────────────────────── */
function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(12,22,44,0.9) 0%, #050810 60%)" }} />
      <motion.div
        className="absolute -top-32 -left-32 h-[38rem] w-[38rem] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34,230,255,0.18) 0%, rgba(34,230,255,0.06) 40%, transparent 70%)", filter: "blur(40px)" }}
        animate={{ x: [0, 80, -40, 0], y: [0, 40, 20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 h-[42rem] w-[42rem] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(140,130,220,0.14) 0%, rgba(140,130,220,0.05) 45%, transparent 75%)", filter: "blur(60px)" }}
        animate={{ x: [0, -60, 30, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-15rem] left-1/3 h-[50rem] w-[50rem] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34,230,255,0.10) 0%, rgba(34,230,255,0.03) 50%, transparent 75%)", filter: "blur(80px)" }}
        animate={{ x: [0, -50, 50, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(34,230,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(34,230,255,0.07) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 80%)",
        }}
      />
      <motion.div
        className="absolute inset-x-0 top-1/4 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(34,230,255,0.45) 50%, transparent 100%)" }}
        animate={{ opacity: [0, 0.6, 0], x: ["-10%", "10%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-x-0 top-2/3 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(34,230,255,0.35) 50%, transparent 100%)" }}
        animate={{ opacity: [0, 0.5, 0], x: ["5%", "-10%"] }}
        transition={{ duration: 8, delay: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(5,8,16,0.85) 100%)" }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   NAVBAR  (TR/EN toggle integrated with i18next wt_lang)
───────────────────────────────────────────────────────────────────────────── */
function Navbar({ setStep }) {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState(() =>
    i18n.language?.startsWith("tr") ? "tr" : "en"
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleLang = () => {
    const next = lang === "tr" ? "en" : "tr";
    setLang(next);
    i18n.changeLanguage(next); // persists to localStorage wt_lang via i18n.js config
  };

  const navLinks = [
    { label: t("landingV2.navFeatures"), href: "#features" },
    { label: t("landingV2.navTerminal"), href: "#terminal" },
    { label: t("landingV2.navApi"), href: "#api" },
  ];

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <div
        className={`flex w-full max-w-7xl items-center justify-between rounded-2xl border px-5 py-3 transition-all duration-500 ${
          scrolled
            ? "border-white/10 bg-[#050810]/70 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(34,230,255,0.15)]"
            : "border-white/5 bg-white/[0.02] backdrop-blur-md"
        }`}
      >
        {/* Logo — original WhaleLogo component */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group focus:outline-none"
          aria-label={t("landingV2.scrollBack")}
        >
          <WhaleLogo size="sm" showText animated={false} />
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative rounded-md px-4 py-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <span className="relative z-10">{l.label}</span>
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* TR / EN language toggle — writes to wt_lang localStorage */}
          <button
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md transition-all hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:text-cyan-300"
            aria-label="Toggle language"
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span className="font-mono tracking-wider">{lang.toUpperCase()}</span>
            <span className="text-white/30">/</span>
            <span className="font-mono tracking-wider text-white/40">{lang === "tr" ? "EN" : "TR"}</span>
          </button>

          <button
            onClick={() => setStep("LOGIN")}
            className="hidden h-9 items-center rounded-md px-4 text-sm font-medium text-white/80 transition-colors hover:text-white sm:inline-flex"
          >
            {t("landingV2.login")}
          </button>
          <motion.button
            onClick={() => { posthog.capture('beta_join_clicked', { location: 'navbar' }); setStep("EMAIL"); }}
            className="group relative inline-flex h-9 items-center rounded-md bg-cyan-300 px-4 text-sm font-semibold text-[#050810] transition-all hover:bg-cyan-200"
            style={{ boxShadow: "0 0 0 1px rgba(34,230,255,0.5), 0 0 24px rgba(34,230,255,0.35)" }}
            whileHover={{ boxShadow: "0 0 0 1px rgba(34,230,255,0.9), 0 0 36px rgba(34,230,255,0.55)" }}
          >
            {t("landingV2.register")}
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HERO
───────────────────────────────────────────────────────────────────────────── */
const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.2 } },
};
const heroItem = {
  hidden: { y: 24, opacity: 0, filter: "blur(8px)" },
  show: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.22, 0.61, 0.36, 1] },
  },
};

function Hero({ setStep }) {
  const { t } = useTranslation();
  return (
    <section className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden pt-28">
      <AuroraBackground />
      <motion.div
        variants={heroContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 text-center"
      >
        <motion.div variants={heroItem}>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
            </span>
            <span className="text-xs font-medium tracking-[0.18em] text-white/70">
              {t("landingV2.badge")}
            </span>
          </div>
        </motion.div>

        <motion.h1
          variants={heroItem}
          className="font-inter text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.25rem]"
        >
          {t("landingV2.heroTitle1")}
          <br />
          <span className="relative inline-block">
            <span
              className="bg-gradient-to-b from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 0 28px rgba(34,230,255,0.25))" }}
            >
              {t("landingV2.heroTitle2")}
            </span>
          </span>{" "}
          <span className="text-white/90">{t("landingV2.heroTitle3")}</span>
        </motion.h1>

        <motion.p
          variants={heroItem}
          className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-white/60 sm:text-lg"
        >
          {t("landingV2.heroSub")}
        </motion.p>

        <motion.div
          variants={heroItem}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <motion.button
            onClick={() => setStep("LOGIN")}
            className="group relative inline-flex h-12 items-center gap-2 rounded-lg bg-cyan-300 px-6 text-sm font-semibold text-[#050810] transition-all hover:bg-cyan-200"
            style={{
              boxShadow:
                "0 0 0 1px rgba(34,230,255,0.55), 0 10px 40px -4px rgba(34,230,255,0.5), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            {t("landingV2.ctaAccess")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </motion.button>
          <motion.button
            onClick={() => { posthog.capture('beta_join_clicked', { location: 'hero' }); setStep("EMAIL"); }}
            className="group inline-flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-6 text-sm font-medium text-white/90 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.07]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/5 transition-all group-hover:border-cyan-300/40 group-hover:text-cyan-300">
              <Play className="h-3 w-3 fill-current" strokeWidth={0} />
            </span>
            {t("landingV2.ctaFree")}
          </motion.button>
        </motion.div>

        <motion.div
          variants={heroItem}
          className="mt-12 flex items-center gap-2 text-xs text-white/40"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="tracking-wide">{t("landingV2.trust")}</span>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATS STRIP
───────────────────────────────────────────────────────────────────────────── */
function Counter({ stat }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) =>
    stat.format ? stat.format(v) : v.toFixed(0)
  );

  useEffect(() => {
    if (!inView) return;
    const controls = fmAnimate(mv, stat.value, {
      duration: 2,
      ease: [0.22, 0.61, 0.36, 1],
    });
    return () => controls.stop();
  }, [inView, mv, stat.value]);

  return (
    <span ref={ref} className="inline-flex items-baseline">
      {stat.prefix && (
        <span className="text-cyan-300/90">{stat.prefix}</span>
      )}
      <motion.span>{display}</motion.span>
      {stat.suffix && (
        <span className="text-cyan-300/90">{stat.suffix}</span>
      )}
    </span>
  );
}

function StatsStrip() {
  const { t } = useTranslation();
  const STATS = [
    { icon: Activity, value: 2.3, prefix: "$", suffix: "T+", labelKey: "landingV2.statVolume", format: (n) => n.toFixed(1) },
    { icon: Gauge, value: 50, prefix: "<", suffix: "ms", labelKey: "landingV2.statLatency", format: (n) => Math.round(n).toString() },
    { icon: Globe2, value: 12, suffix: "+", labelKey: "landingV2.statChains", format: (n) => Math.round(n).toString() },
  ];

  return (
    <section className="relative z-10 -mt-16 flex justify-center px-6 sm:-mt-20">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl"
        style={{
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(34,230,255,0.06)",
        }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(34,230,255,0.8) 50%, transparent 100%)",
          }}
          animate={{ x: ["-40%", "40%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="grid grid-cols-1 divide-y divide-white/5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.labelKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 * i, duration: 0.8 }}
                className="flex items-center gap-5 px-6 py-6 sm:px-8"
              >
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/5">
                  <Icon className="h-5 w-5 text-cyan-300" strokeWidth={1.8} />
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
                    <Counter stat={s} />
                  </span>
                  <span className="mt-0.5 text-xs uppercase tracking-[0.15em] text-white/50">
                    {t(s.labelKey)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURES BENTO
───────────────────────────────────────────────────────────────────────────── */
function GlowCard({ children, className }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };
  const background = useMotionTemplate`radial-gradient(360px circle at ${mouseX}px ${mouseY}px, rgba(34,230,255,0.12), transparent 65%)`;
  return (
    <div
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md transition-colors duration-500 hover:border-cyan-300/25 ${className || ""}`}
      style={{
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 20px 50px -30px rgba(0,0,0,0.6)",
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background }}
      />
      {children}
    </div>
  );
}

function AgentNodes() {
  const nodes = [
    { cx: 30, cy: 40 }, { cx: 90, cy: 30 }, { cx: 150, cy: 60 },
    { cx: 60, cy: 100 }, { cx: 120, cy: 110 }, { cx: 180, cy: 140 },
    { cx: 40, cy: 160 }, { cx: 150, cy: 170 },
  ];
  const edges = [[0,1],[1,2],[0,3],[3,4],[2,4],[4,5],[3,6],[6,7],[4,7],[5,7]];
  return (
    <svg viewBox="0 0 210 200" className="h-full w-full">
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].cx} y1={nodes[a].cy}
          x2={nodes[b].cx} y2={nodes[b].cy}
          stroke="rgba(34,230,255,0.35)"
          strokeWidth="1"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: i * 0.08 }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <motion.circle
            cx={n.cx} cy={n.cy} r={3}
            fill="rgba(34,230,255,0.9)"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, delay: i * 0.2, repeat: Infinity }}
            style={{
              transformOrigin: `${n.cx}px ${n.cy}px`,
              filter: "drop-shadow(0 0 6px rgba(34,230,255,0.8))",
            }}
          />
        </g>
      ))}
    </svg>
  );
}

function RadarSweep() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-48 w-48">
          {[0.3, 0.55, 0.8, 1].map((r, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-cyan-400/20"
              style={{ transform: `scale(${r})` }}
            />
          ))}
          <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-400/10" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-400/10" />
          <motion.div
            className="absolute inset-0 origin-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{
              background:
                "conic-gradient(from 0deg, rgba(34,230,255,0.35) 0deg, rgba(34,230,255,0) 60deg, transparent 360deg)",
              borderRadius: "9999px",
              maskImage: "radial-gradient(circle, black 0%, black 95%, transparent 100%)",
            }}
          />
          {[
            { top: "25%", left: "70%", delay: 0 },
            { top: "62%", left: "30%", delay: 1.2 },
            { top: "78%", left: "68%", delay: 2.4 },
          ].map((p, i) => (
            <div key={i} className="absolute h-2 w-2" style={{ top: p.top, left: p.left }}>
              <motion.span
                className="absolute inset-0 rounded-full bg-cyan-300"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 3, delay: p.delay, repeat: Infinity }}
                style={{ boxShadow: "0 0 12px rgba(34,230,255,0.9)" }}
              />
              <motion.span
                className="absolute inset-0 rounded-full border border-cyan-300/60"
                animate={{ scale: [1, 3.5], opacity: [0.8, 0] }}
                transition={{ duration: 3, delay: p.delay, repeat: Infinity }}
              />
            </div>
          ))}
          <div
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300"
            style={{ boxShadow: "0 0 10px rgba(34,230,255,1)" }}
          />
        </div>
      </div>
    </div>
  );
}

function LeakageWaveform() {
  return (
    <svg viewBox="0 0 300 160" className="h-full w-full">
      <defs>
        <linearGradient id="wv" x1="0" x2="1">
          <stop offset="0%" stopColor="rgba(34,230,255,0)" />
          <stop offset="50%" stopColor="rgba(34,230,255,0.9)" />
          <stop offset="100%" stopColor="rgba(34,230,255,0)" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0,80 L40,80 L55,60 L70,100 L85,40 L100,120 L115,80 L180,80 L195,60 L210,100 L225,30 L240,130 L255,80 L300,80"
        fill="none"
        stroke="url(#wv)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
      />
      <path
        d="M0,80 L40,80 L55,60 L70,100 L85,40 L100,120 L115,80 L180,80 L195,60 L210,100 L225,30 L240,130 L255,80 L300,80"
        fill="none"
        stroke="rgba(34,230,255,0.15)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <g>
        <rect x="72" y="18" width="62" height="18" rx="4" fill="rgba(34,230,255,0.12)" stroke="rgba(34,230,255,0.5)" />
        <text x="78" y="31" fill="#7ff3ff" fontSize="10" fontFamily="ui-monospace, monospace">FUD · 94%</text>
        <rect x="208" y="108" width="70" height="18" rx="4" fill="rgba(140,130,220,0.12)" stroke="rgba(140,130,220,0.5)" />
        <text x="214" y="121" fill="#c0b8ff" fontSize="10" fontFamily="ui-monospace, monospace">EUPHORIA</text>
      </g>
    </svg>
  );
}

function BacktestChart() {
  return (
    <svg viewBox="0 0 300 160" className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="btarea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(34,230,255,0.45)" />
          <stop offset="100%" stopColor="rgba(34,230,255,0)" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="0" y1={40 * (i + 1)} x2="300" y2={40 * (i + 1)} stroke="rgba(255,255,255,0.05)" />
      ))}
      <path
        d="M0,120 L30,115 L60,118 L90,110 L120,105 L150,108 L180,100 L210,95 L240,92 L270,88 L300,85"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <motion.path
        d="M0,130 L30,120 L60,125 L90,108 L120,92 L150,95 L180,72 L210,58 L240,40 L270,32 L300,18"
        fill="none"
        stroke="rgba(34,230,255,0.95)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      <motion.path
        d="M0,130 L30,120 L60,125 L90,108 L120,92 L150,95 L180,72 L210,58 L240,40 L270,32 L300,18 L300,160 L0,160 Z"
        fill="url(#btarea)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay: 0.6 }}
      />
    </svg>
  );
}

function FeatureHeader({ icon: Icon, title, tag }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/5">
          <Icon className="h-[18px] w-[18px] text-cyan-300" strokeWidth={1.8} />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h3>
      </div>
      <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 sm:inline-block">
        {tag}
      </span>
    </div>
  );
}

function FeaturesBento() {
  const { t } = useTranslation();
  return (
    <section id="features" className="relative px-6 py-32 sm:py-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,230,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,230,255,0.04) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.9 }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
              {t("landingV2.featBadge")}
            </span>
          </div>
          <h2 className="font-inter text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            {t("landingV2.featHeadline")}{" "}
            <span className="bg-gradient-to-b from-white to-cyan-300 bg-clip-text text-transparent">
              {t("landingV2.featHighlight")}
            </span>{" "}
            {t("landingV2.featSuffix")}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty leading-relaxed text-white/55">
            {t("landingV2.featSub")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:gap-5">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.9, delay: 0.05 }}
            className="md:col-span-4 md:row-span-2"
          >
            <GlowCard className="flex h-full min-h-[24rem] flex-col p-7 sm:p-8">
              <FeatureHeader icon={Bot} title={t("landingV2.feat1Title")} tag="CORE · L1" />
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
                {t("landingV2.feat1Body")}
              </p>
              <div className="relative mt-6 flex-1 overflow-hidden rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
                <AgentNodes />
                <div className="absolute inset-x-4 bottom-4 space-y-1.5 font-mono text-[10px] leading-tight text-white/50">
                  <div>
                    <span className="text-cyan-300/90">&rsaquo;</span>
                    {' scan.dex("ETH/USDC") → imbalance +3.2σ'}
                  </div>
                  <div>
                    <span className="text-cyan-300/90">&rsaquo;</span>
                    {" eval.sentiment() → divergence detected"}
                  </div>
                  <div>
                    <span className="text-cyan-300/90">&rsaquo;</span>
                    {" action: OPEN_LONG · conviction 0.87"}
                  </div>
                </div>
              </div>
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="md:col-span-2 md:row-span-2"
          >
            <GlowCard className="flex h-full min-h-[24rem] flex-col p-7">
              <FeatureHeader icon={Radar} title={t("landingV2.feat2Title")} tag="LIVE" />
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                {t("landingV2.feat2Body")}
              </p>
              <div className="relative mt-4 flex-1 overflow-hidden rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                <RadarSweep />
              </div>
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.9, delay: 0.25 }}
            className="md:col-span-3"
          >
            <GlowCard className="flex h-full min-h-[16rem] flex-col p-7">
              <FeatureHeader icon={Brain} title={t("landingV2.feat3Title")} tag="MENTAL" />
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                {t("landingV2.feat3Body")}
              </p>
              <div className="mt-4 flex-1 overflow-hidden rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-3">
                <LeakageWaveform />
              </div>
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.9, delay: 0.35 }}
            className="md:col-span-3"
          >
            <GlowCard className="flex h-full min-h-[16rem] flex-col p-7">
              <FeatureHeader icon={LineChart} title={t("landingV2.feat4Title")} tag="HISTORY" />
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                {t("landingV2.feat4Body")}
              </p>
              <div className="relative mt-4 flex-1 overflow-hidden rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-3">
                <BacktestChart />
                <div className="absolute right-4 top-3 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] text-cyan-200">
                  +312.4% · 8y
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FINAL CTA
───────────────────────────────────────────────────────────────────────────── */
function FinalCta({ setStep }) {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden px-6 py-40 sm:py-48">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(34,230,255,0.12) 0%, rgba(5,8,16,0) 55%), linear-gradient(to bottom, #030610 0%, #050810 50%, #030610 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(34,230,255,0.4) 50%, transparent 100%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute h-40 w-40 rounded-full border border-cyan-400/30"
            animate={{ scale: [1, 3.4], opacity: [0.45, 0] }}
            transition={{ duration: 5, delay: i * 1.6, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      </div>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative mx-auto flex max-w-4xl flex-col items-center text-center"
      >
        <div className="mb-8" style={{ filter: "drop-shadow(0 0 40px rgba(34,230,255,0.4))" }}>
          <WhaleLogo size="sm" showText={false} animated />
        </div>
        <h2 className="font-inter text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
          {t("landingV2.ctaTitle1")}{" "}
          <span
            className="bg-gradient-to-b from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent"
            style={{ filter: "drop-shadow(0 0 32px rgba(34,230,255,0.3))" }}
          >
            {t("landingV2.ctaTitle2")}
          </span>{" "}
          {t("landingV2.ctaTitle3")}
        </h2>
        <p className="mt-6 max-w-xl text-pretty leading-relaxed text-white/55">
          {t("landingV2.ctaSub")}
        </p>
        <div className="relative mt-10">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-lg"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(34,230,255,0.5)",
                "0 0 0 22px rgba(34,230,255,0)",
              ],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.button
            onClick={() => { posthog.capture('beta_join_clicked', { location: 'final_cta' }); setStep("EMAIL"); }}
            className="group relative inline-flex h-14 items-center gap-2 rounded-lg bg-cyan-300 px-8 text-base font-semibold text-[#050810] transition-all hover:bg-cyan-200"
            style={{
              boxShadow:
                "0 0 0 1px rgba(34,230,255,0.55), 0 12px 60px -4px rgba(34,230,255,0.6), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            {t("landingV2.ctaJoin")}
            <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </motion.button>
        </div>
        <p className="mt-8 text-xs text-white/30">{t("landingV2.ctaFooter")}</p>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
export default function WhaleScrollytelling({ setStep }) {
  return (
    <div
      className="min-h-screen w-full overflow-x-hidden font-inter antialiased"
      style={{ background: "#050810", color: "#fff" }}
    >
      <Navbar setStep={setStep} />
      <Hero setStep={setStep} />
      <StatsStrip />
      <FeaturesBento />
      <FinalCta setStep={setStep} />
    </div>
  );
}
