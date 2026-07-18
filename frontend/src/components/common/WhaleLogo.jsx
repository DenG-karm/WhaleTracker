import React from 'react';

/**
 * WhaleLogo — Gerçekçi kambur balina (Megaptera novaeangliae) silueti
 *  • Anatomik olarak doğru kambur balina profili
 *  • Uzun pektoral yüzgeç (kambur balinanın en belirgin özelliği)
 *  • Küçük dorsal fin (kambur balinanın tümsek efekti)
 *  • İki loplu kuyruk yüzgeci
 *  • Baş tüberkülü (rostrum üzerindeki karakteristik çıkıntılar)
 *  • Gırtlak olukları (pleats)
 *  • Turkuaz (#00e5ff) → mor (#7b2fff) neon gradyan + derin glow
 *
 * Props:
 *   size     : 'sm' | 'md' | 'lg' | 'xl' | 'hero'
 *   showText : bool
 *   animated : bool
 *   id       : string
 */

const SIZE_MAP = {
  sm:   { svg: 32,  title: '0.82rem', sub: '0.48rem' },
  md:   { svg: 44,  title: '1.05rem', sub: '0.52rem' },
  lg:   { svg: 60,  title: '1.4rem',  sub: '0.58rem' },
  xl:   { svg: 80,  title: '1.85rem', sub: '0.62rem' },
  hero: { svg: 180, title: '3.2rem',  sub: '0.9rem'  },
};

let _idCounter = 0;

/* ─── AÇIKLAMA: viewBox "0 0 100 56"
   Balina sağa doğru yüzüyor.
   Temel noktalar:
     Burun: (5, 29)
     Arka plato: (44, 13) – (67, 13)
     Dorsal fin: (67,13) → tepe (70, 6) → (72.5, 14)
     Kuyruk sapı: (89, 28)
     Üst fluk ucu: (99.5, 17)
     Alt fluk ucu: (99.5, 40)
     Karın: (55, 44)
     Pektoral fin bağlantısı: (27, 34)
     Pektoral fin ucu: (9, 53)
─────────────────────────────────────── */

// BODY, PECTORAL, BELLY SVGs omitted because we now use the drawing directly.

export default function WhaleLogo({
  size     = 'md',
  showText = true,
  animated = false,
  id,
}) {
  const s   = SIZE_MAP[size] ?? SIZE_MAP.md;
  const uid = id ?? `wl${++_idCounter}`;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.svg * 0.2,
        lineHeight: 1,
        animation: animated ? 'whalePulse 3s ease-in-out infinite' : undefined,
      }}
    >
      {/* ═══════════════════ LOGO İKON ══════════════════════════════════ */}
        <img
          src="/whale-logo.png"
          alt="WhaleTracker Logo"
          style={{
            width: s.svg,
            height: s.svg,
            flexShrink: 0,
            objectFit: 'contain',
            mixBlendMode: 'screen',
            borderRadius: s.svg * 0.1,
          }}
        />

      {/* ═══════════════════ METİN ══════════════════════════════════════ */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
            <span style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 800,
              fontSize: s.title,
              letterSpacing: '0.04em',
              background: 'linear-gradient(135deg, #74f5ff 0%, #00dbe7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>WHALE</span>
            <span style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 400,
              fontSize: s.title,
              letterSpacing: '0.04em',
              color: 'rgba(255,255,255,0.92)',
            }}>TRACKER</span>
          </div>
          {(size === 'lg' || size === 'xl' || size === 'hero') && (
            <div style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: s.sub,
              fontWeight: 400,
              letterSpacing: '0.32em',
              color: 'rgba(255,255,255,0.38)',
              textTransform: 'uppercase',
              marginTop: 2,
            }}>INTELLIGENCE TERMINAL</div>
          )}
        </div>
      )}

      {animated && (
        <style>{`@keyframes whalePulse{0%,100%{filter:drop-shadow(0 0 6px rgba(0,229,255,.6))}50%{filter:drop-shadow(0 0 14px rgba(0,229,255,.9))}}`}</style>
      )}
    </div>
  );
}
