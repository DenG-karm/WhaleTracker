/**
 * src/constants/colors.js
 * WhaleTracker renk paleti — web ile birebir eşleşen dark theme
 * Web'deki: #020617 bg, #00dbe7 primary cyan, #a855f7 purple
 */

export const Colors = {
  // ── Zemin ────────────────────────────────────────────────────────────────────
  bg:          '#020617',   // slate-950
  surface:     '#0f172a',   // slate-900
  card:        '#1e293b',   // slate-800
  cardAlt:     'rgba(30,41,59,0.7)', // glassmorphic kart
  border:      '#334155',   // slate-700
  borderLight: 'rgba(51,65,85,0.5)',
  borderGlass: 'rgba(255,255,255,0.07)',

  // ── Cyan (birincil) ──────────────────────────────────────────────────────────
  cyan:        '#22d3ee',   // Web dark mode --primary: #00dbe7 (yakın ton)
  cyanPrimary: '#00dbe7',   // Web'deki tam primary
  cyanDim:     'rgba(34,211,238,0.1)',
  cyanDimAlt:  'rgba(0,219,231,0.08)',
  cyanBorder:  'rgba(34,211,238,0.25)',
  cyanGlow:    'rgba(0,219,231,0.4)',

  // ── Purple (ikincil) ─────────────────────────────────────────────────────────
  purple:      '#a855f7',
  purpleDim:   'rgba(168,85,247,0.12)',
  purpleBorder:'rgba(168,85,247,0.3)',
  purpleGlow:  'rgba(168,85,247,0.4)',

  // ── Durum renkleri ───────────────────────────────────────────────────────────
  profit:   '#10b981',  // emerald-500 (web: C.green)
  loss:     '#ef4444',  // red-500
  warning:  '#f97316',  // orange-500
  yellow:   '#eab308',  // yellow-500
  blue:     '#3b82f6',  // blue-500

  // ── Metin ────────────────────────────────────────────────────────────────────
  textPrimary:   '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted:     'rgba(255,255,255,0.35)',

  // ── Gradient stop'lar ─────────────────────────────────────────────────────────
  gradientCyan:   ['#00d4ff', '#7b2fff'], // logo gradient
  gradientSubmit: ['#22d3ee', '#a855f7'], // submit buton
};
