/**
 * ReplayRoom.jsx — Aktif Simülasyon Replay Odası
 * Bir simülasyon oturumu başlatıldığında SimulationLobby'nin yerini alır.
 * Props: { session, onEnd }
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import {
  Play, Pause, SkipForward, Zap, Save, FlaskConical,
  BarChart2, Clock, AlertCircle, Activity, Brain,
  DollarSign, TrendingUp, TrendingDown,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────
const SESSIONS_KEY = 'wt_sim_sessions';

const THEME = {
  bg:        '#0A0E17',
  bgCard:    'rgba(13, 18, 30, 0.82)',
  bgPanel:   'rgba(10, 14, 23, 0.95)',
  border:    'rgba(255, 255, 255, 0.07)',
  neonCyan:  '#22d3ee',
  neonGold:  '#fbbf24',
  neonUp:    '#00ff9d',
  neonDown:  '#ff3366',
  textMain:  '#e2e8f0',
  textMuted: 'rgba(255,255,255,0.38)',
};

const BASE_PRICES = {
  BTCUSDT: 65000, ETHUSDT: 3200, SOLUSDT: 180, BNBUSDT: 580,
  XRPUSDT: 0.58,  AVAXUSDT: 38,  DOGEUSDT: 0.12,
  'EUR/USD': 1.085, 'GBP/USD': 1.265, 'USD/JPY': 152.3,
  'AUD/USD': 0.645, 'USD/CAD': 1.362, 'EUR/GBP': 0.858, 'USD/CHF': 0.898,
  XAUUSD: 2350, XAGUSD: 27.5, USOIL: 82.4, NGAS: 2.15,
  AAPL: 195, TSLA: 175, NVDA: 890, MSFT: 415, META: 505, SPY: 520, QQQ: 440,
};

const PAIR_LABELS = {
  BTCUSDT: 'BTC/USDT', ETHUSDT: 'ETH/USDT', SOLUSDT: 'SOL/USDT', BNBUSDT: 'BNB/USDT',
  XRPUSDT: 'XRP/USDT', AVAXUSDT: 'AVAX/USDT', DOGEUSDT: 'DOGE/USDT',
  'EUR/USD': 'EUR/USD', 'GBP/USD': 'GBP/USD', 'USD/JPY': 'USD/JPY',
  'AUD/USD': 'AUD/USD', 'USD/CAD': 'USD/CAD', 'EUR/GBP': 'EUR/GBP', 'USD/CHF': 'USD/CHF',
  XAUUSD: 'XAU/USD', XAGUSD: 'XAG/USD', USOIL: 'OIL/USD', NGAS: 'NAT.GAS',
  AAPL: 'AAPL', TSLA: 'TSLA', NVDA: 'NVDA', MSFT: 'MSFT',
  META: 'META', SPY: 'SPY', QQQ: 'QQQ',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch { return []; }
}
function saveSessions(s) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s)); } catch {}
}
function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function formatPrice(price, pair) {
  if (price == null) return '—';
  const p = (pair || '').toUpperCase();
  if (p === 'XRPUSDT' || p === 'DOGEUSDT') return price.toFixed(5);
  if (p.includes('JPY')) return price.toFixed(3);
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return price.toFixed(2);
}
function formatPriceShort(price, pair) {
  if (price == null) return '';
  const p = (pair || '').toUpperCase();
  if (p === 'XRPUSDT' || p === 'DOGEUSDT') return price.toFixed(4);
  if (p.includes('JPY')) return price.toFixed(2);
  if (price < 0.01) return price.toFixed(4);
  if (price < 1) return price.toFixed(3);
  if (price >= 10000) return (price / 1000).toFixed(1) + 'K';
  return price.toFixed(1);
}
function fmtBal(n) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// İlk açılışta ekranda gösterilecek (geçmiş) mum sayısı
const INITIAL_VISIBLE = 50;

// ── Data Sources: Binance (paged) + Yahoo Finance fallback ─────────────────
const CRYPTO_PAIRS = new Set([
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','AVAXUSDT','DOGEUSDT',
]);

const TF_MAP = {
  '1m':'1m','5m':'5m','15m':'15m','30m':'30m',
  '1H':'1h','4H':'4h','1D':'1d','1W':'1w',
};

const YAHOO_SYMBOLS = {
  'EUR/USD':'EURUSD=X','GBP/USD':'GBPUSD=X','USD/JPY':'JPY=X',
  'AUD/USD':'AUDUSD=X','USD/CAD':'CADUSD=X','EUR/GBP':'EURGBP=X','USD/CHF':'CHF=X',
  'XAUUSD':'GC=F','XAGUSD':'SI=F','USOIL':'CL=F','NGAS':'NG=F',
  'AAPL':'AAPL','TSLA':'TSLA','NVDA':'NVDA','MSFT':'MSFT',
  'META':'META','SPY':'SPY','QQQ':'QQQ',
};

const YAHOO_TF = {
  '1m':'1m','5m':'5m','15m':'15m','30m':'30m',
  '1H':'1h','4H':'1h','1D':'1d','1W':'1wk',
};

const BACKEND_ORIGIN = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Tek istek: backend proxy üzerinden — while döngüsü yok, CORS yok
async function fetchBinanceCandles(symbol, interval, startMs, endMs) {
  const params = new URLSearchParams({ symbol, interval, limit: '1000' });
  if (startMs) params.set('startTime', String(startMs));
  if (endMs)   params.set('endTime',   String(endMs));
  const res = await fetch(`${BACKEND_ORIGIN}/api/proxy/binance/klines?${params}`);
  if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
  const raw = await res.json();
  return raw.map((k) => ({
    open: parseFloat(k[1]), high: parseFloat(k[2]),
    low:  parseFloat(k[3]), close: parseFloat(k[4]),
    volume: parseFloat(k[5]), time: Math.floor(k[0] / 1000),
  }));
}

async function fetchYahooCandles(symbol, interval, startMs, endMs) {
  const ysym = YAHOO_SYMBOLS[symbol];
  if (!ysym) return null;
  const yint = YAHOO_TF[interval] || '1d';
  const p1   = Math.floor((startMs || Date.now() - 365 * 24 * 3600 * 1000) / 1000);
  const p2   = Math.floor((endMs   || Date.now()) / 1000);
  const params = new URLSearchParams({
    interval: yint,
    period1:  String(p1),
    period2:  String(p2),
    includePrePost: 'false',
  });
  const res = await fetch(
    `${BACKEND_ORIGIN}/api/proxy/yahoo/chart/${encodeURIComponent(ysym)}?${params}`
  );
  if (!res.ok) throw new Error(`Yahoo proxy HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const ts = result.timestamp;
  const q  = result.indicators?.quote?.[0];
  if (!ts || !q) return null;
  return ts.map((t, i) => ({
    open:   q.open[i]   ?? q.close[i],
    high:   q.high[i]   ?? q.close[i],
    low:    q.low[i]    ?? q.close[i],
    close:  q.close[i],
    volume: q.volume?.[i] ?? 0,
    time:   t,
  })).filter((c) => c.close != null && !isNaN(c.close));
}

async function loadCandles(pair, timeframe, dateFrom, dateTo, onProgress) {
  const interval = TF_MAP[timeframe] || '1h';
  const startMs  = dateFrom ? new Date(dateFrom).getTime()           : null;
  const endMs    = dateTo   ? new Date(dateTo).getTime() + 86399999  : null;
  if (CRYPTO_PAIRS.has(pair)) {
    try {
      const candles = await fetchBinanceCandles(pair, interval, startMs, endMs);
      if (onProgress) onProgress(candles.length);
      if (candles.length > 5) return { candles, source: 'Binance' };
    } catch (e) { console.warn('Binance proxy failed:', e.message); }
  } else {
    try {
      const candles = await fetchYahooCandles(pair, interval, startMs, endMs);
      if (candles && candles.length > 5) {
        if (onProgress) onProgress(candles.length);
        return { candles, source: 'Yahoo Finance' };
      }
    } catch (e) { console.warn('Yahoo proxy failed:', e.message); }
  }
  return { candles: generateFakeCandles(pair, 500), source: 'Simüle' };
}

// ── Candle generator ───────────────────────────────────────────────────────
function generateFakeCandles(pair, count = 200) {
  let price = BASE_PRICES[pair] || 100;
  const vol =
    price > 10000 ? 0.010 :
    price > 1000  ? 0.014 :
    price > 10    ? 0.018 :
    price > 1     ? 0.022 : 0.030;
  const candles = [];
  // Gerçek tarih damgaları: 2024-01-01'den itibaren saatlik mumlar
  let ts = Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000);
  const step = 3600;
  for (let i = 0; i < count; i++) {
    const trend = Math.sin(i / 25) * 0.0015;
    const change = (Math.random() - 0.5 + trend) * price * vol;
    const open = price;
    const close = Math.max(price * 0.0001, price + change);
    const wf = vol * 0.55;
    const high = Math.max(open, close) * (1 + Math.random() * wf);
    const low  = Math.min(open, close) * (1 - Math.random() * wf);
    candles.push({ time: ts, open, close, high, low, volume: Math.random() * 80 + 20 });
    ts += step;
    price = close;
  }
  return candles;
}

// ── LightweightChart — interaktif mum grafiği (pan + zoom destekli) ───────
const LWCandleChart = React.memo(function LWCandleChart({ allCandles, visibleCount }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);
  const volSeriesRef = useRef(null);
  const prevCountRef = useRef(0);

  // Grafik ilk kez DOM'a eklendiğinde oluştur
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor:  '#e2e8f0',
        fontSize:   11,
        fontFamily: "'Inter', system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.22)', width: 1, labelBackgroundColor: '#1e2d40' },
        horzLine: { color: 'rgba(255,255,255,0.22)', width: 1, labelBackgroundColor: '#1e2d40' },
      },
      rightPriceScale: {
        borderColor:  'rgba(255,255,255,0.07)',
        scaleMargins: { top: 0.08, bottom: 0.26 },
        textColor:    'rgba(255,255,255,0.35)',
      },
      timeScale: {
        borderColor:    'rgba(255,255,255,0.07)',
        timeVisible:    true,
        secondsVisible: false,
        textColor:      'rgba(255,255,255,0.35)',
      },
      // Mouse ile kaydırma ve tekerlek ile yakınlaştırma
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor:        '#00ff9d',
      downColor:      '#ff3366',
      borderUpColor:  '#00ff9d',
      borderDownColor:'#ff3366',
      wickUpColor:    '#00ff9d',
      wickDownColor:  '#ff3366',
    });

    const volSeries = chart.addHistogramSeries({
      color:        'rgba(34,211,238,0.15)',
      priceFormat:  { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chartRef.current     = chart;
    seriesRef.current    = candleSeries;
    volSeriesRef.current = volSeries;
    prevCountRef.current = 0;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) chart.applyOptions({ width, height });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current     = null;
      seriesRef.current    = null;
      volSeriesRef.current = null;
    };
  }, []);

  // allCandles değişince (ilk yükleme / sembol değişimi) tüm veriyi sıfırla
  useEffect(() => {
    if (!seriesRef.current || !allCandles.length) return;
    const slice = allCandles.slice(0, visibleCount);
    seriesRef.current.setData(slice);
    volSeriesRef.current?.setData(slice.map((c) => ({
      time:  c.time,
      value: c.volume ?? 0,
      color: c.close >= c.open ? 'rgba(0,255,157,0.2)' : 'rgba(255,51,102,0.2)',
    })));
    chartRef.current?.timeScale().fitContent();
    prevCountRef.current = visibleCount;
  }, [allCandles]); // eslint-disable-line

  // visibleCount arttıkça yeni mumu ekle (replay)
  useEffect(() => {
    if (!seriesRef.current || !allCandles.length) return;
    const prev = prevCountRef.current;

    // Geri sarma / sıfırlama durumu
    if (visibleCount < prev) {
      const slice = allCandles.slice(0, visibleCount);
      seriesRef.current.setData(slice);
      volSeriesRef.current?.setData(slice.map((c) => ({
        time:  c.time,
        value: c.volume ?? 0,
        color: c.close >= c.open ? 'rgba(0,255,157,0.2)' : 'rgba(255,51,102,0.2)',
      })));
      chartRef.current?.timeScale().fitContent();
      prevCountRef.current = visibleCount;
      return;
    }

    // İleriye replay: sadece yeni mumları ekle
    for (let i = prev; i < visibleCount && i < allCandles.length; i++) {
      const c = allCandles[i];
      seriesRef.current.update(c);
      volSeriesRef.current?.update({
        time:  c.time,
        value: c.volume ?? 0,
        color: c.close >= c.open ? 'rgba(0,255,157,0.2)' : 'rgba(255,51,102,0.2)',
      });
    }
    prevCountRef.current = visibleCount;
    // En son mumu görünür tut (kullanıcı manüel kaydırmamışsa)
    chartRef.current?.timeScale().scrollToRealTime();
  }, [visibleCount]); // eslint-disable-line

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
});

// ── Replay Controls — lüks cam efektli panel ────────────────────────────────
const ReplayControls = React.memo(function ReplayControls({ isPlaying, speed, onPlayPause, onNext, onSpeedChange, candleIndex, total }) {
  const SPEEDS   = [1, 3, 5];
  const progress = total > 0 ? Math.min((candleIndex / total) * 100, 100) : 0;
  const isDone   = total > 0 && candleIndex >= total;

  return (
    <div style={{ flexShrink: 0, position: 'relative' }}>
      {/* ── İlerleme çubuğu ── */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <motion.div
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${THEME.neonCyan}, ${THEME.neonGold})`,
            boxShadow: `0 0 8px ${THEME.neonCyan}70`,
          }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.25, ease: 'linear' }}
        />
      </div>

      {/* ── Cam panel ── */}
      <div style={{
        height: 68,
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
        background: 'rgba(8, 12, 22, 0.78)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -6px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>

        {/* Sol: mum sayacı */}
        <div style={{
          minWidth: 130, fontFamily: 'ui-monospace, monospace',
          fontSize: '0.72rem', userSelect: 'none', letterSpacing: '0.02em',
        }}>
          <span style={{ color: THEME.neonCyan, fontWeight: 800 }}>{candleIndex}</span>
          <span style={{ color: THEME.textMuted }}>
            {' '}/ {total} <span style={{ opacity: 0.55 }}>mum</span>
          </span>
          {isDone && (
            <span style={{
              marginLeft: 8, fontSize: '0.6rem', fontWeight: 700,
              padding: '1px 7px', borderRadius: 4,
              background: 'rgba(0,255,157,0.12)',
              border: '1px solid rgba(0,255,157,0.25)',
              color: THEME.neonUp,
            }}>
              ✓ BİTTİ
            </span>
          )}
        </div>

        {/* Orta: kontroller */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 12,
        }}>

          {/* Sonraki Mum */}
          <motion.button
            onClick={onNext}
            disabled={isDone}
            whileHover={{ scale: isDone ? 1 : 1.07 }}
            whileTap={{ scale: isDone ? 1 : 0.91 }}
            title="Sonraki Mum (→)"
            style={{
              width: 42, height: 42, borderRadius: 11,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(8px)',
              color: isDone ? THEME.textMuted : THEME.textMain,
              cursor: isDone ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isDone ? 0.35 : 1,
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <SkipForward size={15} />
          </motion.button>

          {/* Oynat / Durdur */}
          <motion.button
            onClick={onPlayPause}
            disabled={isDone}
            whileHover={{ scale: isDone ? 1 : 1.08 }}
            whileTap={{ scale: isDone ? 1 : 0.93 }}
            animate={isPlaying && !isDone ? {
              boxShadow: [
                `0 0 10px ${THEME.neonCyan}28`,
                `0 0 30px ${THEME.neonCyan}60`,
                `0 0 10px ${THEME.neonCyan}28`,
              ],
            } : {
              boxShadow: `0 0 12px ${THEME.neonUp}18`,
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 56, height: 56, borderRadius: 16,
              border: `1px solid ${
                isDone ? 'rgba(255,255,255,0.08)'
                : isPlaying ? THEME.neonCyan + '50'
                : THEME.neonUp + '45'
              }`,
              background: isDone
                ? 'rgba(255,255,255,0.03)'
                : isPlaying
                  ? 'rgba(34,211,238,0.13)'
                  : 'rgba(0,255,157,0.10)',
              backdropFilter: 'blur(10px)',
              color: isDone
                ? THEME.textMuted
                : isPlaying ? THEME.neonCyan : THEME.neonUp,
              cursor: isDone ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isDone ? 0.35 : 1,
              transition: 'background 0.2s, border-color 0.2s, color 0.2s',
            }}
          >
            {isPlaying
              ? <Pause size={22} strokeWidth={2.5} />
              : <Play  size={22} strokeWidth={2.5} />}
          </motion.button>

          {/* Hız seçimi */}
          <div style={{
            display: 'flex', gap: 3,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 11, padding: '4px',
          }}>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                style={{
                  padding: '5px 15px', borderRadius: 7,
                  fontSize: '0.72rem', fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: `1px solid ${
                    speed === s ? THEME.neonGold + '55' : 'transparent'
                  }`,
                  background: speed === s
                    ? 'rgba(251,191,36,0.15)'
                    : 'transparent',
                  color: speed === s ? THEME.neonGold : THEME.textMuted,
                  boxShadow: speed === s
                    ? '0 0 10px rgba(251,191,36,0.20)'
                    : 'none',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Sağ: durum göstergesi */}
        <div style={{
          minWidth: 130, textAlign: 'right',
          fontSize: '0.7rem', fontWeight: 700, userSelect: 'none',
        }}>
          {isDone ? (
            <span style={{
              color: THEME.neonUp,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: THEME.neonUp, display: 'inline-block',
                boxShadow: `0 0 6px ${THEME.neonUp}`,
              }} />
              TAMAMLANDI
            </span>
          ) : isPlaying ? (
            <motion.span
              animate={{ opacity: [1, 0.45, 1] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                color: THEME.neonUp,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.45, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.3, repeat: Infinity }}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: THEME.neonUp, display: 'inline-block',
                  boxShadow: `0 0 8px ${THEME.neonUp}`,
                }}
              />
              OYNATILIYOR
            </motion.span>
          ) : (
            <span style={{
              color: THEME.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: THEME.textMuted, display: 'inline-block',
              }} />
              DURAKLATILDI
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Execution Panel ────────────────────────────────────────────────────────
const ExecutionPanel = React.memo(function ExecutionPanel({ currentPrice, pair, balance, openPositions, onTrade, onClose, onAiRequest }) {
  const [side,   setSide]   = useState('BUY');
  const [amount, setAmount] = useState('');
  const [error,  setError]  = useState('');
  const [flash,  setFlash]  = useState(null);

  const unrealizedPnl = useMemo(() => openPositions.reduce((acc, p) => {
    if (currentPrice == null) return acc;
    const diff = currentPrice - p.entryPrice;
    return acc + (p.side === 'BUY' ? diff * p.size : -diff * p.size);
  }, 0), [openPositions, currentPrice]);

  const submit = useCallback(() => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)   { setError('Miktar giriniz');      return; }
    if (amt > balance)      { setError('Bakiye yetersiz');     return; }
    if (!currentPrice)      { setError('Fiyat bekleniyor...'); return; }
    setError('');
    setFlash(side);
    setTimeout(() => setFlash(null), 600);
    onTrade({ side, size: amt / currentPrice, amount: amt, entryPrice: currentPrice });
    setAmount('');
  }, [amount, balance, currentPrice, onTrade, side]);

  const QUICK = useMemo(() => [100, 500, 1000, 5000].filter((v) => v <= balance), [balance]);

  return (
    <div style={{
      width: 300, flexShrink: 0,
      borderLeft: `1px solid ${THEME.border}`,
      background: THEME.bgPanel,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{ padding: '13px 16px 11px',
        borderBottom: `1px solid ${THEME.border}`,
        background: 'rgba(255,255,255,0.012)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Zap size={13} color={THEME.neonGold} />
          <span style={{ fontSize: '0.7rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: THEME.textMuted }}>
            İşlem Paneli
          </span>
        </div>
      </div>

      {/* Price ticker */}
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${THEME.border}` }}>
        <div style={{ fontSize: '0.65rem', color: THEME.textMuted,
          marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {PAIR_LABELS[pair] || pair}
        </div>
        <motion.div
          key={String(currentPrice?.toFixed?.(5) ?? '')}
          initial={{ opacity: 0.4, y: -3 }}
          animate={{ opacity: 1,   y: 0  }}
          style={{
            fontSize: '1.5rem', fontWeight: 800,
            fontFamily: 'ui-monospace, monospace',
            color: THEME.neonCyan, letterSpacing: '-0.02em',
          }}
        >
          {currentPrice ? formatPrice(currentPrice, pair) : '—'}
        </motion.div>
      </div>

      {/* Order form */}
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${THEME.border}` }}>
        {/* Long / Short toggle */}
        <div style={{ display: 'flex', borderRadius: 10,
          border: `1px solid ${THEME.border}`, overflow: 'hidden', marginBottom: 14 }}>
          {['BUY', 'SELL'].map((s) => (
            <button
              key={s}
              onClick={() => { setSide(s); setError(''); }}
              style={{
                flex: 1, padding: '10px 0',
                fontSize: '0.8rem', fontWeight: 800,
                border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
                transition: 'all 0.15s',
                background: side === s
                  ? (s === 'BUY' ? `${THEME.neonUp}22` : `${THEME.neonDown}22`)
                  : 'rgba(255,255,255,0.02)',
                color: side === s
                  ? (s === 'BUY' ? THEME.neonUp : THEME.neonDown)
                  : THEME.textMuted,
                borderBottom: side === s
                  ? `2px solid ${s === 'BUY' ? THEME.neonUp : THEME.neonDown}`
                  : '2px solid transparent',
              }}
            >
              {s === 'BUY' ? '↑ LONG' : '↓ SHORT'}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: '0.67rem', color: THEME.textMuted,
            marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Miktar (USDT)
          </div>
          <div style={{ position: 'relative' }}>
            <DollarSign size={12} style={{ position: 'absolute', left: 11,
              top: '50%', transform: 'translateY(-50%)', color: THEME.textMuted }} />
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              placeholder="0.00"
              style={{
                width: '100%', padding: '9px 12px 9px 28px',
                borderRadius: 9, outline: 'none', boxSizing: 'border-box',
                border: `1px solid ${error ? THEME.neonDown + '60' : THEME.border}`,
                background: 'rgba(255,255,255,0.03)',
                color: THEME.textMain, fontSize: '0.9rem',
                fontFamily: 'ui-monospace, monospace',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e)  => { e.target.style.borderColor = THEME.neonCyan + '60'; }}
              onBlur={(e)   => { e.target.style.borderColor = error ? THEME.neonDown + '60' : THEME.border; }}
            />
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5,
              marginTop: 5, fontSize: '0.7rem', color: THEME.neonDown }}>
              <AlertCircle size={11} />{error}
            </div>
          )}
        </div>

        {/* Quick amounts */}
        {QUICK.length > 0 && (
          <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
            {QUICK.map((v) => (
              <button
                key={v}
                onClick={() => { setAmount(String(v)); setError(''); }}
                style={{
                  padding: '3px 9px', borderRadius: 6,
                  fontSize: '0.67rem', fontWeight: 600,
                  border: `1px solid ${THEME.border}`,
                  background: 'rgba(255,255,255,0.03)',
                  color: THEME.textMuted, cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.neonCyan + '50'; e.currentTarget.style.color = THEME.neonCyan; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textMuted; }}
              >
                ${v >= 1000 ? (v / 1000) + 'K' : v}
              </button>
            ))}
            <button
              onClick={() => { setAmount(Math.floor(balance * 0.5).toString()); setError(''); }}
              style={{
                padding: '3px 9px', borderRadius: 6,
                fontSize: '0.67rem', fontWeight: 600,
                border: `1px solid ${THEME.border}`,
                background: 'rgba(255,255,255,0.03)',
                color: THEME.textMuted, cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.neonGold + '50'; e.currentTarget.style.color = THEME.neonGold; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textMuted; }}
            >
              50%
            </button>
          </div>
        )}

        {/* Execute button */}
        <motion.button
          onClick={submit}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          animate={flash ? {
            boxShadow: flash === 'BUY'
              ? [`0 0 0px ${THEME.neonUp}00`, `0 0 36px ${THEME.neonUp}80`, `0 0 0px ${THEME.neonUp}00`]
              : [`0 0 0px ${THEME.neonDown}00`, `0 0 36px ${THEME.neonDown}80`, `0 0 0px ${THEME.neonDown}00`],
          } : {}}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 10,
            fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
            letterSpacing: '0.04em',
            border: `1px solid ${side === 'BUY' ? THEME.neonUp + '55' : THEME.neonDown + '55'}`,
            background: side === 'BUY'
              ? `linear-gradient(135deg, ${THEME.neonUp}20, ${THEME.neonUp}0a)`
              : `linear-gradient(135deg, ${THEME.neonDown}20, ${THEME.neonDown}0a)`,
            color: side === 'BUY' ? THEME.neonUp : THEME.neonDown,
            boxShadow: side === 'BUY'
              ? `0 0 16px ${THEME.neonUp}18`
              : `0 0 16px ${THEME.neonDown}18`,
          }}
        >
          {side === 'BUY' ? '↑ LONG AÇ' : '↓ SHORT AÇ'}
        </motion.button>
      </div>

      {/* Balance summary */}
      <div style={{ padding: '10px 16px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          fontSize: '0.72rem', marginBottom: 3 }}>
          <span style={{ color: THEME.textMuted }}>Serbest Bakiye</span>
          <span style={{ color: THEME.textMain,
            fontFamily: 'ui-monospace,monospace', fontWeight: 600 }}>
            ${fmtBal(balance)}
          </span>
        </div>
        {openPositions.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <span style={{ color: THEME.textMuted }}>Açık PnL</span>
            <span style={{
              fontFamily: 'ui-monospace,monospace', fontWeight: 700,
              color: unrealizedPnl >= 0 ? THEME.neonUp : THEME.neonDown,
            }}>
              {unrealizedPnl >= 0 ? '+' : ''}{fmtBal(unrealizedPnl)}
            </span>
          </div>
        )}
      </div>

      {/* AI Analysis button */}
      <div style={{ padding: '12px 16px 10px', borderTop: `1px solid ${THEME.border}`, flexShrink: 0 }}>
        <motion.button
          onClick={onAiRequest}
          whileHover={{ scale: 1.02, boxShadow: `0 0 28px ${THEME.neonCyan}45` }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 10,
            fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
            letterSpacing: '0.04em',
            border: `1px solid ${THEME.neonCyan}55`,
            background: `linear-gradient(135deg, ${THEME.neonCyan}18, ${THEME.neonCyan}06)`,
            color: THEME.neonCyan,
            boxShadow: `0 0 14px ${THEME.neonCyan}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <motion.span
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.08), transparent)',
              transform: 'skewX(-15deg)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
          />
          <Brain size={14} style={{ position: 'relative' }} />
          <span style={{ position: 'relative' }}>AI Analizi İste</span>
        </motion.button>
      </div>

      {/* Open Positions list */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        borderTop: `1px solid ${THEME.border}` }}>
        <div style={{ padding: '8px 16px 6px',
          display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={11} color={THEME.neonCyan} style={{ opacity: 0.7 }} />
          <span style={{ fontSize: '0.67rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', color: THEME.textMuted }}>
            Açık Pozisyonlar ({openPositions.length})
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {openPositions.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center',
              fontSize: '0.75rem', color: THEME.textMuted, lineHeight: 1.7 }}>
              Açık pozisyon yok.<br />
              <span style={{ opacity: 0.6 }}>Yukarıdan al veya sat.</span>
            </div>
          ) : (
            <AnimatePresence>
              {openPositions.map((pos) => {
                const diff  = currentPrice ? currentPrice - pos.entryPrice : 0;
                const pnl   = pos.side === 'BUY' ? diff * pos.size : -diff * pos.size;
                const pnlPct = pos.entryPrice
                  ? ((pnl / (pos.size * pos.entryPrice)) * 100)
                  : 0;
                const col = pnl >= 0 ? THEME.neonUp : THEME.neonDown;
                return (
                  <motion.div
                    key={pos.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    style={{ padding: '10px 16px',
                      borderBottom: `1px solid ${THEME.border}` }}
                  >
                    <div style={{ display: 'flex',
                      justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{
                          fontSize: '0.67rem', fontWeight: 800, letterSpacing: '0.05em',
                          color: pos.side === 'BUY' ? THEME.neonUp : THEME.neonDown,
                          background: pos.side === 'BUY'
                            ? `${THEME.neonUp}15` : `${THEME.neonDown}15`,
                          padding: '1px 6px', borderRadius: 4, display: 'inline-block',
                        }}>
                          {pos.side === 'BUY' ? '↑ LONG' : '↓ SHORT'}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: THEME.textMuted, marginTop: 3 }}>
                          Giriş:{' '}
                          <span style={{ fontFamily: 'ui-monospace,monospace' }}>
                            {formatPrice(pos.entryPrice, pair)}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700,
                          color: col, fontFamily: 'ui-monospace, monospace' }}>
                          {pnl >= 0 ? '+' : ''}{fmtBal(pnl)}
                        </div>
                        <div style={{ fontSize: '0.67rem', color: col, opacity: 0.8 }}>
                          ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex',
                      justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.67rem', color: THEME.textMuted }}>
                        ${fmtBal(pos.amount)} · {pos.size.toFixed(5)} lot
                      </span>
                      <button
                        onClick={() => onClose(pos.id)}
                        style={{
                          padding: '3px 10px', borderRadius: 6,
                          fontSize: '0.68rem', fontWeight: 700,
                          border: `1px solid ${THEME.neonDown}40`,
                          background: `${THEME.neonDown}10`,
                          color: THEME.neonDown, cursor: 'pointer',
                        }}
                      >
                        Kapat
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
});

// ── End Simulation Modal ───────────────────────────────────────────────────
const EndConfirmModal = React.memo(function EndConfirmModal({ onConfirm, onCancel, finalBalance, startBalance, tradeCount }) {
  const pnl    = finalBalance - startBalance;
  const pnlPct = startBalance ? ((pnl / startBalance) * 100) : 0;
  const isPos  = pnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(5,8,16,0.88)', backdropFilter: 'blur(10px)', padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 24 }}
        animate={{ scale: 1,   y: 0  }}
        exit={{ scale: 0.92, y: 12 }}
        style={{
          width: '100%', maxWidth: 440,
          borderRadius: 20, overflow: 'hidden',
          border: `1px solid ${THEME.neonDown}30`,
          background: 'rgba(10,14,23,0.98)',
          boxShadow: `0 0 0 1px rgba(255,51,102,0.08), 0 40px 80px rgba(0,0,0,0.7)`,
        }}
      >
        {/* Top accent */}
        <div style={{ height: 1, background:
          `linear-gradient(90deg, transparent, ${THEME.neonDown}65, transparent)` }} />

        <div style={{ padding: 28 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: `${THEME.neonDown}14`,
              border: `1px solid ${THEME.neonDown}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Save size={18} color={THEME.neonDown} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: THEME.textMain }}>
                Simülasyonu Kaydet &amp; Bitir
              </div>
              <div style={{ fontSize: '0.72rem', color: THEME.textMuted, marginTop: 2 }}>
                Tüm açık pozisyonlar piyasa fiyatından kapatılacak
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10, marginBottom: 24 }}>
            {[
              {
                label: 'Son Bakiye',
                value: `$${fmtBal(finalBalance)}`,
                color: isPos ? THEME.neonUp : THEME.neonDown,
              },
              {
                label: `PnL ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`,
                value: `${isPos ? '+' : ''}$${fmtBal(Math.abs(pnl))}`,
                color: isPos ? THEME.neonUp : THEME.neonDown,
              },
              {
                label: 'Trade Sayısı',
                value: String(tradeCount),
                color: THEME.neonCyan,
              },
            ].map((s) => (
              <div key={s.label} style={{
                padding: '10px', borderRadius: 10,
                border: `1px solid ${THEME.border}`,
                background: 'rgba(255,255,255,0.02)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.63rem', color: THEME.textMuted,
                  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800,
                  color: s.color, fontFamily: 'ui-monospace,monospace' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10,
                fontSize: '0.82rem', fontWeight: 600,
                border: `1px solid ${THEME.border}`,
                background: 'rgba(255,255,255,0.03)',
                color: THEME.textMuted, cursor: 'pointer',
              }}
            >
              Devam Et
            </button>
            <motion.button
              onClick={onConfirm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 2, padding: '11px 0', borderRadius: 10,
                fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
                border: `1px solid ${THEME.neonDown}55`,
                background: `linear-gradient(135deg, ${THEME.neonDown}22, ${THEME.neonDown}0a)`,
                color: THEME.neonDown,
                boxShadow: `0 0 20px ${THEME.neonDown}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Save size={14} />
              Kaydet &amp; Lobiye Dön
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

// ── Main: ReplayRoom ───────────────────────────────────────────────────────
export default function ReplayRoom({ session, onEnd }) {
  const pair = session?.pair || 'BTCUSDT';

  // Candle data — async load (Binance API for crypto, generated for others)
  const [allCandles,    setAllCandles]    = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataSource,    setDataSource]    = useState('');
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingData(true);
    setLoadProgress(0);
    const onProgress = (n) => { if (!cancelled) setLoadProgress(n); };
    loadCandles(pair, session?.timeframe || '1H', session?.dateFrom, session?.dateTo, onProgress)
      .then(({ candles, source }) => {
        if (cancelled) return;
        setAllCandles(candles);
        setLoadProgress(candles.length);
        setDataSource(source);
        setIsLoadingData(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAllCandles(generateFakeCandles(pair, 500));
        setDataSource('Simüle');
        setIsLoadingData(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair]);

  // Replay state
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [speed,        setSpeed]        = useState(1);

  // Trading state
  const [balance,        setBalance]        = useState(session?.startBalance || 10000);
  const [openPositions,  setOpenPositions]  = useState([]);
  const [closedTrades,   setClosedTrades]   = useState([]);

  // UI state
  const [showEnd,      setShowEnd]      = useState(false);
  const [notification, setNotification] = useState(null);

  const intervalRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Refs: interval içinde en güncel veriyi okumak için (stale closure önlemi)
  const allCandlesRef      = useRef(allCandles);
  const openPositionsRef   = useRef([]);
  const currentPriceRef    = useRef(null);
  const balanceRef         = useRef(session?.startBalance || 10000);
  const closedTradesRef    = useRef([]);
  const visibleCountRef    = useRef(INITIAL_VISIBLE);
  useEffect(() => { allCandlesRef.current    = allCandles;      }, [allCandles]);
  useEffect(() => { openPositionsRef.current = openPositions;   }, [openPositions]);
  useEffect(() => { balanceRef.current       = balance;         }, [balance]);
  useEffect(() => { closedTradesRef.current  = closedTrades;    }, [closedTrades]);
  useEffect(() => { visibleCountRef.current  = visibleCount;    }, [visibleCount]);
  // ─────────────────────────────────────────────────────────────────────────

  // Current price = close of last visible candle
  const currentPrice = useMemo(
    () => allCandles.length > 0 ? (allCandles[Math.min(visibleCount, allCandles.length) - 1]?.close ?? null) : null,
    [allCandles, visibleCount]
  );
  useEffect(() => { currentPriceRef.current = currentPrice; }, [currentPrice]);

  // Bir sonraki muma geç (ref kullanır → nextCandle hiç yeniden oluşmaz)
  const nextCandle = useCallback(() => {
    setVisibleCount((v) => Math.min(v + 1, allCandlesRef.current.length));
  }, []); // deps boş: ref üzerinden okur

  useEffect(() => {
    if (isPlaying) {
      // 1x → 1 mum/sn, 3x → 3 mum/sn, 5x → 5 mum/sn
      const delay = speed === 1 ? 1000 : speed === 3 ? 333 : 200;
      intervalRef.current = setInterval(nextCandle, delay);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, nextCandle]);

  // ── Canlı PnL güncelleme: her yeni mum geldiğinde açık pozisyonları güncelle
  useEffect(() => {
    const positions = openPositionsRef.current;
    if (positions.length === 0 || allCandlesRef.current.length === 0) return;
    const newPrice = allCandlesRef.current[Math.min(visibleCount, allCandlesRef.current.length) - 1]?.close;
    if (newPrice == null) return;
    setOpenPositions((prev) =>
      prev.map((pos) => ({
        ...pos,
        pnl: pos.side === 'BUY'
          ? (newPrice - pos.entryPrice) * pos.size
          : (pos.entryPrice - newPrice) * pos.size,
      }))
    );
  }, [visibleCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop playing when all candles are consumed
  useEffect(() => {
    if (visibleCount >= allCandles.length) setIsPlaying(false);
  }, [visibleCount, allCandles.length]);
  // Klavye: Space = play/pause, ArrowRight = sonraki mum
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space')      { e.preventDefault(); setIsPlaying((p) => !p); }
      if (e.code === 'ArrowRight') { e.preventDefault(); nextCandle(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextCandle]);

  // Notification helper
  const notify = useCallback((msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  }, []);

  // İşleme giriş: entryPrice = o anki mumun kapanış fiyatı
  const handleTrade = useCallback(({ side, size, amount, entryPrice }) => {
    setBalance((b) => b - amount);
    const pos = { id: genId(), side, size, amount, entryPrice, pnl: 0, openedAt: visibleCountRef.current };
    setOpenPositions((p) => [pos, ...p]);
    notify(`${side === 'BUY' ? '↑ LONG' : '↓ SHORT'} açıldı @ ${formatPrice(entryPrice, pair)}`, side);
  }, [notify, pair]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pozisyon kapat: anlık PnL bakiyeye yansıtılır
  const handleClose = useCallback((posId) => {
    const pos = openPositionsRef.current.find((p) => p.id === posId);
    if (!pos) return;
    // Kaydedilmiş canlı PnL'i kullan; yoksa currentPriceRef'den hesapla
    const cp = currentPriceRef.current;
    const pnl = pos.pnl !== undefined && pos.pnl !== 0
      ? pos.pnl
      : (() => {
          if (cp == null) return 0;
          const diff = cp - pos.entryPrice;
          return pos.side === 'BUY' ? diff * pos.size : -diff * pos.size;
        })();
    const closeAt = cp ?? pos.entryPrice;
    const ret = pos.amount + pnl;
    setBalance((b) => b + ret);
    setOpenPositions((p) => p.filter((p2) => p2.id !== posId));
    setClosedTrades((ct) => [...ct, { ...pos, closePrice: closeAt, pnl }]);
    notify(
      `Kapatıldı ${pnl >= 0 ? '+' : ''}${fmtBal(Math.abs(pnl))}`,
      pnl >= 0 ? 'profit' : 'loss',
    );
  }, [notify]); // eslint-disable-line react-hooks/exhaustive-deps

  // Simülasyonu bitir: tüm açık pozisyonlar PnL ile birlikte kapatılır
  const handleEndConfirm = useCallback(() => {
    const cp = currentPriceRef.current;
    const positions = openPositionsRef.current;
    const trades = closedTradesRef.current;
    let finalBal = balanceRef.current;
    positions.forEach((pos) => {
      // Kaydedilmiş canlı PnL yoksa currentPriceRef'den hesapla
      const pnl = pos.pnl !== undefined
        ? pos.pnl
        : (() => {
            if (cp == null) return 0;
            const diff = cp - pos.entryPrice;
            return pos.side === 'BUY' ? diff * pos.size : -diff * pos.size;
          })();
      finalBal += pos.amount + pnl;
    });
    const sessions = loadSessions();
    const updated  = sessions.map((s) =>
      s.id === session.id
        ? { ...s, currentBalance: finalBal,
            tradeCount: trades.length + positions.length,
            status: 'completed' }
        : s
    );
    saveSessions(updated);
    onEnd();
  }, [session, onEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Kalıcılık: her işlem açma/kapamada session'ı güncelle ─────────────
  useEffect(() => {
    if (!session?.id) return;
    const sessions = loadSessions();
    const updated = sessions.map((s) =>
      s.id === session.id
        ? { ...s, currentBalance: balance, tradeCount: closedTrades.length, status: 'active' }
        : s
    );
    saveSessions(updated);
  }, [balance, closedTrades.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI Analiz talebi ───────────────────────────────────────────────────
  const handleAiRequest = useCallback(() => {
    const tradesSummary = closedTrades.length === 0
      ? 'Henüz kapatılmış işlem yok'
      : closedTrades
          .map((t, i) =>
            `#${i + 1} ${t.side === 'BUY' ? 'LONG' : 'SHORT'} giriş:${formatPrice(t.entryPrice, pair)}→çıkış:${formatPrice(t.closePrice, pair)} (${t.pnl >= 0 ? '+' : ''}$${fmtBal(Math.abs(t.pnl))})`
          )
          .join(' | ');

    const ctx = {
      timestamp:      Date.now(),
      pair:           PAIR_LABELS[pair] || pair,
      timeframe:      session?.timeframe || '—',
      strategy:       session?.strategy || 'belirtilmemiş',
      startBalance:   session?.startBalance || 10000,
      currentBalance: balance,
      realizedPnl:    closedTrades.reduce((a, t) => a + t.pnl, 0),
      unrealizedPnl,
      equity,
      tradeCount:     closedTrades.length,
      openCount:      openPositions.length,
      tradesSummary,
    };
    try { localStorage.setItem('wt_sim_analysis_ctx', JSON.stringify(ctx)); } catch {}

    const strategyLabel = session?.strategy?.trim()
      ? `"${session.strategy.trim()}"`
      : 'stratejimi';
    const realizedPnlVal = closedTrades.reduce((a, t) => a + t.pnl, 0);
    const promptMessage =
      `${PAIR_LABELS[pair] || pair} üzerinde ${strategyLabel} ile yaptığım simülasyonu analiz et. ` +
      `${closedTrades.length} işlem kapattım, gerçekleşmiş PnL: ${realizedPnlVal >= 0 ? '+' : ''}$${fmtBal(Math.abs(realizedPnlVal))}. ` +
      `Genel performansımı ve stratejimin güçlü/zayıf yönlerini değerlendirir misin?`;

    window.dispatchEvent(new CustomEvent('wt-open-ai-chat', { detail: { promptMessage } }));
    notify('AI koç devreye alınıyor...', 'info');
  }, [pair, session, balance, closedTrades, openPositions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived values — useMemo prevents recomputation on unrelated state changes
  const unrealizedPnl = useMemo(() => openPositions.reduce((acc, p) => {
    if (currentPrice == null) return acc;
    const diff = currentPrice - p.entryPrice;
    return acc + (p.side === 'BUY' ? diff * p.size : -diff * p.size);
  }, 0), [openPositions, currentPrice]);
  const realizedPnl  = useMemo(() => closedTrades.reduce((acc, t) => acc + t.pnl, 0), [closedTrades]);
  const equity       = useMemo(() => balance + unrealizedPnl, [balance, unrealizedPnl]);
  const totalPnl     = useMemo(() => equity - (session?.startBalance || 10000), [equity, session]);
  const totalPnlPct  = useMemo(() => ((totalPnl / (session?.startBalance || 10000)) * 100), [totalPnl, session]);

  if (isLoadingData) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: THEME.bg, color: THEME.textMain,
        fontFamily: "'Inter', system-ui, sans-serif", gap: 18 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ width: 36, height: 36, borderRadius: '50%',
            border: `2px solid ${THEME.border}`,
            borderTopColor: THEME.neonCyan }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: THEME.textMain }}>
            {PAIR_LABELS[pair] || pair} verileri yükleniyor...</div>
          {loadProgress > 0 && (
            <div style={{ fontSize: '0.82rem', fontFamily: 'ui-monospace,monospace',
              color: THEME.neonCyan, marginTop: 8, fontWeight: 700 }}>
              {loadProgress.toLocaleString()} mum çekildi...
            </div>
          )}
          <div style={{ fontSize: '0.72rem', color: THEME.textMuted, marginTop: 4 }}>
            {CRYPTO_PAIRS.has(pair) ? "Binance API'den geçmiş mumlar çekiliyor" : "Yahoo Finance'den geçmiş veriler çekiliyor"}</div>
        </div>
      </div>
    );
  }

    return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: THEME.bg, color: THEME.textMain,
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'hidden', position: 'relative',
    }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{
        height: 56, flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 0,
        borderBottom: `1px solid ${THEME.border}`,
        background: 'rgba(8,12,20,0.96)',
        backdropFilter: 'blur(12px)', zIndex: 10,
      }}>
        {/* Left: session info + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <FlaskConical size={14} color={THEME.neonCyan} />
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: THEME.textMain }}>
              {PAIR_LABELS[pair] || pair}
            </span>
            <span style={{
              fontSize: '0.68rem', padding: '2px 7px', borderRadius: 5,
              background: `${THEME.neonCyan}14`,
              border: `1px solid ${THEME.neonCyan}28`,
              color: THEME.neonCyan, fontWeight: 700,
            }}>
              {session?.timeframe || '1H'}
            </span>
          </div>

          <div style={{ width: 1, height: 20, background: THEME.border, flexShrink: 0 }} />

          {/* Equity */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: '0.68rem', color: THEME.textMuted }}>Portföy</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800,
              fontFamily: 'ui-monospace,monospace', color: THEME.textMain }}>
              ${fmtBal(equity)}
            </span>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700,
              fontFamily: 'ui-monospace,monospace',
              color: totalPnl >= 0 ? THEME.neonUp : THEME.neonDown,
            }}>
              {totalPnl >= 0 ? '▲' : '▼'}{Math.abs(totalPnlPct).toFixed(2)}%
            </span>
          </div>

          <div style={{ width: 1, height: 20, background: THEME.border, flexShrink: 0 }} />

          {/* Realized PnL */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: '0.68rem', color: THEME.textMuted }}>Gerç. PnL</span>
            <span style={{
              fontSize: '0.82rem', fontWeight: 700,
              fontFamily: 'ui-monospace,monospace',
              color: realizedPnl >= 0 ? THEME.neonUp : THEME.neonDown,
            }}>
              {realizedPnl >= 0 ? '+' : ''}${fmtBal(realizedPnl)}
            </span>
          </div>

          <div style={{ width: 1, height: 20, background: THEME.border, flexShrink: 0 }} />

          {/* Trade count */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: '0.68rem', color: THEME.textMuted }}>İşlemler</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700,
              fontFamily: 'ui-monospace,monospace', color: THEME.neonGold }}>
              {closedTrades.length}
            </span>
          </div>
        </div>

        {/* Right: End button */}
        <motion.button
          onClick={() => setShowEnd(true)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          animate={{
            boxShadow: [
              `0 0 6px  ${THEME.neonDown}20`,
              `0 0 20px ${THEME.neonDown}45`,
              `0 0 6px  ${THEME.neonDown}20`,
            ],
          }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 10,
            border: `1px solid ${THEME.neonDown}55`,
            background: `linear-gradient(135deg, ${THEME.neonDown}1e, ${THEME.neonDown}08)`,
            color: THEME.neonDown, cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.03em',
            flexShrink: 0,
          }}
        >
          <Save size={13} />
          SİMÜLASYONU BİTİR
        </motion.button>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Chart column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Chart toolbar */}
          <div style={{
            padding: '9px 16px', borderBottom: `1px solid ${THEME.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.01)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BarChart2 size={13} color={THEME.neonCyan} style={{ opacity: 0.65 }} />
              <span style={{ fontSize: '0.7rem', color: THEME.textMuted,
                textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                Replay Grafiği
              </span>
              <span style={{
                fontSize: '0.67rem', padding: '1px 7px', borderRadius: 4,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${THEME.border}`,
                color: THEME.textMuted,
              }}>
{dataSource ? `${dataSource} Verisi` : 'Simülasyon Modu'}
              </span>
            </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14,
              fontSize: '0.68rem', fontFamily: 'ui-monospace,monospace', flexShrink: 0 }}>
              {(() => {
                const c = allCandles[Math.min(visibleCount, allCandles.length) - 1];
                if (!c) return null;
                const col = c.close >= c.open ? THEME.neonUp : THEME.neonDown;
                return (<>
                  <span style={{ color: THEME.textMuted }}>O <span style={{ color: col }}>{formatPriceShort(c.open, pair)}</span></span>
                  <span style={{ color: THEME.textMuted }}>H <span style={{ color: THEME.neonUp }}>{formatPriceShort(c.high, pair)}</span></span>
                  <span style={{ color: THEME.textMuted }}>L <span style={{ color: THEME.neonDown }}>{formatPriceShort(c.low, pair)}</span></span>
                  <span style={{ color: THEME.textMuted }}>C <span style={{ color: col, fontWeight: 800 }}>{formatPriceShort(c.close, pair)}</span></span>
                  <span style={{ color: THEME.textMuted, opacity: 0.5 }}>
                    <span style={{ color: THEME.neonCyan }}>{visibleCount}</span>/{allCandles.length}
                  </span>
                </>);
              })()}
            </div>
          </div>

          {/* Chart SVG area */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
            {/* Subtle grid overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: `
                linear-gradient(rgba(34,211,238,0.013) 1px, transparent 1px),
                linear-gradient(90deg, rgba(34,211,238,0.013) 1px, transparent 1px)
              `,
              backgroundSize: '56px 56px',
            }} />

            {/* Scanline sweep */}
            <motion.div
              style={{
                position: 'absolute', left: 0, right: 0, height: 90, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, transparent, rgba(34,211,238,0.018), transparent)',
              }}
              animate={{ y: ['-90px', '110%'] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
            />

            <div style={{ position: 'absolute', inset: '8px 4px 8px 8px' }}>
              <LWCandleChart allCandles={allCandles} visibleCount={visibleCount} />
            </div>
          </div>
        </div>

        {/* Right: Execution panel */}
        <ExecutionPanel
          currentPrice={currentPrice}
          pair={pair}
          balance={balance}
          openPositions={openPositions}
          onTrade={handleTrade}
          onClose={handleClose}
          onAiRequest={handleAiRequest}
        />
      </div>

      {/* ── REPLAY CONTROLS ──────────────────────────────────────────────── */}
      <ReplayControls
        isPlaying={isPlaying}
        speed={speed}
        onPlayPause={() => setIsPlaying((p) => !p)}
        onNext={nextCandle}
        onSpeedChange={setSpeed}
        candleIndex={visibleCount}
        total={allCandles.length}
      />

      {/* ── TOAST NOTIFICATION ───────────────────────────────────────────── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.msg + notification.type}
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0,  x: '-50%' }}
            exit={{ opacity: 0, y: -10, x: '-50%' }}
            style={{
              position: 'fixed', bottom: 76, left: '50%',
              zIndex: 500, whiteSpace: 'nowrap',
              padding: '10px 20px', borderRadius: 10,
              background: 'rgba(10,14,23,0.97)',
              border: `1px solid ${
                notification.type === 'BUY'    ? THEME.neonUp   + '55' :
                notification.type === 'SELL'   ? THEME.neonDown + '55' :
                notification.type === 'profit' ? THEME.neonUp   + '55' :
                notification.type === 'loss'   ? THEME.neonDown + '55' :
                THEME.neonCyan + '50'
              }`,
              color:
                notification.type === 'BUY'    ? THEME.neonUp   :
                notification.type === 'SELL'   ? THEME.neonDown :
                notification.type === 'profit' ? THEME.neonUp   :
                notification.type === 'loss'   ? THEME.neonDown :
                THEME.neonCyan,
              fontSize: '0.82rem', fontWeight: 700,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── END CONFIRM MODAL ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEnd && (
          <EndConfirmModal
            onConfirm={handleEndConfirm}
            onCancel={() => setShowEnd(false)}
            finalBalance={equity}
            startBalance={session?.startBalance || 10000}
            tradeCount={closedTrades.length + openPositions.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
