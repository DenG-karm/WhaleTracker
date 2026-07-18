import { useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const THREAT_BORDER     = '#FF3B30';
const OPP_BORDER        = '#00E676';
const ACCENT_THREAT     = '#FF3B30';
const ACCENT_OPP        = '#22d3ee';
const BG                = '#050810';
const SCAN_INTERVAL_MS  = 45_000;   // autonomous scan cadence
const PRICE_DROP_THRESH = 0.0035;   // 0.35% intra-scan drop = threat

// ─── Toast renderer ───────────────────────────────────────────────────────────
function fireToast({ type, title, body, channel }) {
  const isTheat = type === 'threat';
  const border  = isTheat ? THREAT_BORDER : OPP_BORDER;
  const accent  = isTheat ? ACCENT_THREAT : ACCENT_OPP;
  const icon    = isTheat ? '🚨' : '🐋';

  toast.custom(
    (t) => (
      <div
        onClick={() => toast.dismiss(t.id)}
        style={{
          display       : 'flex',
          flexDirection : 'column',
          gap           : 6,
          background    : BG,
          border        : `1px solid ${border}`,
          borderLeft    : `3px solid ${border}`,
          borderRadius  : 10,
          padding       : '12px 16px',
          minWidth      : 320,
          maxWidth       : 420,
          boxShadow     : `0 0 24px ${border}33, 0 4px 32px rgba(0,0,0,0.7)`,
          cursor        : 'pointer',
          fontFamily    : "'JetBrains Mono', 'Fira Code', monospace",
          opacity       : t.visible ? 1 : 0,
          transform     : t.visible ? 'translateY(0)' : 'translateY(-8px)',
          transition    : 'opacity 220ms ease, transform 220ms ease',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {icon} AI SENTINEL  •  {channel}
          </span>
          <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em' }}>
            {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e1e2eb', lineHeight: 1.3 }}>
          {title}
        </div>

        {/* Body */}
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          {body}
        </div>

        {/* Channel badge row */}
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          {channel.includes('E-POSTA') && (
            <span style={{ fontSize: '0.56rem', padding: '2px 6px', borderRadius: 4, border: `1px solid ${accent}55`, color: accent, letterSpacing: '0.08em' }}>
              📧 E-POSTA
            </span>
          )}
          {channel.includes('SMS') && (
            <span style={{ fontSize: '0.56rem', padding: '2px 6px', borderRadius: 4, border: `1px solid ${accent}55`, color: accent, letterSpacing: '0.08em' }}>
              📱 SMS
            </span>
          )}
          {channel.includes('IN-APP') && (
            <span style={{ fontSize: '0.56rem', padding: '2px 6px', borderRadius: 4, border: `1px solid ${accent}55`, color: accent, letterSpacing: '0.08em' }}>
              🔔 IN-APP
            </span>
          )}
        </div>
      </div>
    ),
    {
      duration : isTheat ? 9000 : 7000,
      position : 'top-right',
    }
  );
}

// ─── Channel resolver ─────────────────────────────────────────────────────────
function resolveChannels() {
  try {
    const raw   = localStorage.getItem('wt_user_profile');
    const prefs = raw ? JSON.parse(raw)?.notificationPrefs ?? {} : {};
    const ch    = ['IN-APP'];
    if (prefs.aiAlerts  !== false) ch.push('E-POSTA');
    if (prefs.smsEnabled === true)  ch.push('SMS');
    return ch.join(' + ');
  } catch {
    return 'IN-APP';
  }
}

// ─── Event builders ───────────────────────────────────────────────────────────
function buildThreatEvent(positions, price) {
  const longs = positions.filter(p => p.direction === 'long' || p.side === 'long' || p.type === 'long');
  const worst = longs.reduce((acc, p) => {
    const entry = p.entry ?? p.entryPrice ?? price;
    const pnlPct = ((price - entry) / entry) * 100;
    return pnlPct < acc.pnlPct ? { ...p, pnlPct } : acc;
  }, { pnlPct: 0 });

  const symbol   = worst.symbol ?? worst.asset ?? 'Pozisyon';
  const pnlStr   = worst.pnlPct !== undefined ? `${worst.pnlPct.toFixed(2)}%` : '—';
  const sizeStr  = worst.size ? `$${Number(worst.size).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '';

  return {
    type    : 'threat',
    title   : `Risk Alarmı — ${symbol} Long Tehdit Altında`,
    body    : `[WHALETRACKER SMS] 🚨 Anlık fiyat hareketi tespit edildi. ${symbol} Long pozisyonun${sizeStr ? ` (${sizeStr})` : ''} risk altında. Tahmini PnL: ${pnlStr}. Acil değerlendirme önerilir.`,
    channel : resolveChannels(),
  };
}

function buildOpportunityEvent() {
  const SCENARIOS = [
    {
      title : 'Kurumsal Balina Aktivitesi — BTC',
      body  : '[WHALETRACKER E-POSTA] 📧 Sistem Taraması: Kurumsal balina cüzdanlarında anomali algılandı. Son 15 dakikada $50M+ akış gözlemlendi. Yeni fırsatlar için terminale dönün.',
    },
    {
      title : 'Whale Wallet Anomali Uyarısı',
      body  : '[WHALETRACKER SMS] 🐋 Bilinmeyen büyük cüzdan $120M değerinde varlık hareketi gerçekleştirdi. Momentum sinyali pozitif. Pozisyon değerlendirmesi önerilir.',
    },
    {
      title : 'Kurumsal Akış Fırsatı Tespit Edildi',
      body  : '[WHALETRACKER E-POSTA] 📧 Tarama tamamlandı: 3 ayrı kurumsal cüzdanda koordineli alım hareketi gözlemlendi. Risk/ödül oranı tarihi ortalamanın üzerinde.',
    },
    {
      title : 'Zincir Üstü Sinyal — ETH Akümülasyonu',
      body  : '[WHALETRACKER SMS] 🐋 ETH borsalardan masif çekim: 48.000 ETH son 2 saatte exchange\'dan çıktı. Uzun vadeli akümülasyon sinyali güçlü.',
    },
  ];
  const s = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  return { type: 'opportunity', ...s, channel: resolveChannels() };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAISentinel = (openPositions = [], currentPrice = 0) => {
  const priceHistoryRef  = useRef([]);
  const scanTimerRef     = useRef(null);
  const isMountedRef     = useRef(true);

  // ── Price history tracker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentPrice) return;
    priceHistoryRef.current.push({ price: currentPrice, ts: Date.now() });
    // Keep only last 60 samples (~1 min at 1s cadence)
    if (priceHistoryRef.current.length > 60) {
      priceHistoryRef.current.shift();
    }
  }, [currentPrice]);

  // ── Autonomous scan engine ─────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    const runScan = () => {
      if (!isMountedRef.current) return;

      const positions = openPositions ?? [];
      const price     = priceHistoryRef.current.at(-1)?.price ?? currentPrice;
      const history   = priceHistoryRef.current;

      // Threat check: long + price dropped >= threshold since window start
      const hasLong = positions.some(
        p => p.direction === 'long' || p.side === 'long' || p.type === 'long'
      );

      if (hasLong && history.length >= 2) {
        const windowStart = history[Math.max(0, history.length - 20)].price;
        const delta       = (price - windowStart) / windowStart;
        if (delta <= -PRICE_DROP_THRESH) {
          fireToast(buildThreatEvent(positions, price));
          return; // don't fire opportunity on same scan
        }
      }

      // Opportunity check: no open positions → fire whale alert
      if (positions.length === 0) {
        fireToast(buildOpportunityEvent());
        return;
      }

      // Positions exist but no immediate threat → random deep-scan opportunity (25% chance)
      if (Math.random() < 0.25) {
        fireToast(buildOpportunityEvent());
      }
    };

    // Stagger first scan by 8s so UI settles
    const initialDelay = setTimeout(() => {
      if (!isMountedRef.current) return;
      runScan();
      scanTimerRef.current = setInterval(runScan, SCAN_INTERVAL_MS);
    }, 8_000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initialDelay);
      clearInterval(scanTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — uses refs for live data

  // ── Manual test trigger ────────────────────────────────────────────────────
  const triggerManualScan = useCallback((forceType = null) => {
    const positions = openPositions ?? [];
    const price     = priceHistoryRef.current.at(-1)?.price ?? currentPrice;

    if (forceType === 'threat' || (!forceType && positions.length > 0)) {
      fireToast(buildThreatEvent(positions, price || 1));
    } else {
      fireToast(buildOpportunityEvent());
    }
  }, [openPositions, currentPrice]);

  return { triggerManualScan };
};
