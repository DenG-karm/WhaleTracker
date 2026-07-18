/**
 * SimulationLobby.jsx -- Backtest Simülasyon Lobisi
 * Geçmiş simülasyonlar tablosu + Yeni Simülasyon Modal
 * Sessions: localStorage "wt_sim_sessions"
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Play, X, ChevronDown, FlaskConical,
  ChevronRight, Clock, TrendingUp, TrendingDown, Search,
  Calendar, DollarSign, BarChart2, FileText, Zap, AlertCircle,
} from 'lucide-react';

// ── Sabitler ────────────────────────────────────────────────────────────────
const SESSIONS_KEY = 'wt_sim_sessions';

const THEME = {
  bg:       '#0A0E17',
  bgCard:   'rgba(13, 18, 30, 0.82)',
  border:   'rgba(255, 255, 255, 0.07)',
  neonCyan: '#22d3ee',
  neonGold: '#fbbf24',
  neonUp:   '#00ff9d',
  neonDown: '#ff3366',
  textMain: '#e2e8f0',
  textMuted:'rgba(255,255,255,0.38)',
};

const PAIRS = [
  { group: 'Kripto',  label: 'simLobby.groupCrypto',  items: ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','AVAXUSDT','DOGEUSDT'] },
  { group: 'Forex',   label: 'Forex',                 items: ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','EUR/GBP','USD/CHF'] },
  { group: 'Emtia',   label: 'simLobby.groupCommodity', items: ['XAUUSD','XAGUSD','USOIL','NGAS'] },
  { group: 'Hisse',   label: 'simLobby.groupEquity',  items: ['AAPL','TSLA','NVDA','MSFT','META','SPY','QQQ'] },
];

const TIMEFRAMES = ['1m','5m','15m','30m','1H','4H','1D','1W'];

const PAIR_LABELS = {
  BTCUSDT:'BTC/USDT', ETHUSDT:'ETH/USDT', SOLUSDT:'SOL/USDT', BNBUSDT:'BNB/USDT',
  XRPUSDT:'XRP/USDT', AVAXUSDT:'AVAX/USDT', DOGEUSDT:'DOGE/USDT',
  'EUR/USD':'EUR/USD','GBP/USD':'GBP/USD','USD/JPY':'USD/JPY','AUD/USD':'AUD/USD',
  'USD/CAD':'USD/CAD','EUR/GBP':'EUR/GBP','USD/CHF':'USD/CHF',
  XAUUSD:'XAU/USD (Gold)', XAGUSD:'XAG/USD (Silver)', USOIL:'Brent Crude Oil', NGAS:'Natural Gas',
  AAPL:'AAPL',TSLA:'TSLA',NVDA:'NVDA',MSFT:'MSFT',META:'META',SPY:'SPY',QQQ:'QQQ',
};

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtBalance(n) {
  return n?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—';
}

function getPnlColor(start, current) {
  if (current == null || start == null) return THEME.textMuted;
  return current >= start ? THEME.neonUp : THEME.neonDown;
}

function getPnlPct(start, current) {
  if (!start || current == null) return null;
  const pct = ((current - start) / start) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
}

// ── Session depolama yardımcıları ───────────────────────────────────────────
function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {}
}

// ── PairDropdown ──────────────────────────────────────────────────────────
function PairDropdown({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const dropRef             = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allItems = PAIRS.flatMap((g) => g.items);
  const filtered = query
    ? allItems.filter((p) =>
        p.toLowerCase().includes(query.toLowerCase()) ||
        (PAIR_LABELS[p] || '').toLowerCase().includes(query.toLowerCase())
      )
    : null;

  const selectItem = (item) => {
    onChange(item);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={dropRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 10,
          border: `1px solid ${open ? THEME.neonCyan + '55' : THEME.border}`,
          background: 'rgba(255,255,255,0.03)', color: THEME.textMain,
          fontSize: '0.875rem', cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
      >
        <span>{value ? (PAIR_LABELS[value] || value) : t('simLobby.pairPlaceholder')}</span>
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
              borderRadius: 12, border: `1px solid ${THEME.neonCyan}30`,
              background: 'rgba(10,14,23,0.98)', backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
              maxHeight: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{ padding: '8px 10px', borderBottom: `1px solid ${THEME.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 10px' }}>
                <Search size={13} style={{ color: THEME.textMuted }} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('simLobby.searchPlaceholder')}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: THEME.textMain, fontSize: '0.8rem' }}
                />
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered ? (
                filtered.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: THEME.textMuted, fontSize: '0.8rem' }}>
                    {t('simLobby.noResults')}
                  </div>
                ) : (
                  <div>
                    {filtered.map((item) => (
                      <button key={item} type="button" onClick={() => selectItem(item)}
                        style={{ width: '100%', display: 'block', textAlign: 'left',
                          padding: '8px 14px', background: 'none', border: 'none',
                          color: value === item ? THEME.neonCyan : THEME.textMain,
                          fontSize: '0.82rem', cursor: 'pointer',
                          borderLeft: value === item ? `2px solid ${THEME.neonCyan}` : '2px solid transparent',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      >
                        {PAIR_LABELS[item] || item}
                      </button>
                    ))}
                  </div>
                )
              ) : (
                PAIRS.map((group) => (
                  <div key={group.group}>
                    <div style={{ padding: '6px 14px 4px', fontSize: '0.68rem',
                      fontWeight: 700, letterSpacing: '0.12em', color: THEME.neonCyan,
                      textTransform: 'uppercase', opacity: 0.7 }}>
                      {group.group}
                    </div>
                    {group.items.map((item) => (
                      <button key={item} type="button" onClick={() => selectItem(item)}
                        style={{ width: '100%', display: 'block', textAlign: 'left',
                          padding: '7px 14px', background: 'none', border: 'none',
                          color: value === item ? THEME.neonCyan : THEME.textMain,
                          fontSize: '0.82rem', cursor: 'pointer',
                          borderLeft: value === item ? `2px solid ${THEME.neonCyan}` : '2px solid transparent',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      >
                        {PAIR_LABELS[item] || item}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── NewSimulationModal ───────────────────────────────────────────────────────
function NewSimulationModal({ onClose, onStart }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    pair:         '',
    timeframe:    '1H',
    dateFrom:     '',
    dateTo:       '',
    startBalance: '10000',
    strategy:     '',
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.pair) errs.pair = t('simLobby.errPairRequired');
    if (!form.timeframe) errs.timeframe = t('simLobby.errTfRequired');
    if (!form.startBalance || isNaN(Number(form.startBalance)) || Number(form.startBalance) <= 0)
      errs.startBalance = t('simLobby.errBalanceInvalid');
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const session = {
      id:             genId(),
      pair:           form.pair,
      timeframe:      form.timeframe,
      dateFrom:       form.dateFrom || null,
      dateTo:         form.dateTo || null,
      startBalance:   Number(form.startBalance),
      currentBalance: Number(form.startBalance),
      strategy:       form.strategy.trim(),
      createdAt:      new Date().toISOString(),
      status:         'active',
      tradeCount:     0,
    };

    // localStorage'a kaydet
    const existing = loadSessions();
    saveSessions([session, ...existing]);
    onStart(session);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(5,8,16,0.85)', backdropFilter: 'blur(8px)', padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 12, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
        style={{
          width: '100%', maxWidth: 580,
          borderRadius: 20,
          border: `1px solid ${THEME.neonCyan}28`,
          background: 'rgba(10, 14, 23, 0.97)',
          backdropFilter: 'blur(32px)',
          boxShadow: `0 0 0 1px rgba(34,211,238,0.06), 0 40px 100px rgba(0,0,0,0.7), 0 0 120px rgba(34,211,238,0.06)`,
          overflow: 'hidden',
        }}
      >
        {/* Üst şerit */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${THEME.neonCyan}60, transparent)` }} />

        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${THEME.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
              border: `1px solid ${THEME.neonCyan}40`,
              background: `${THEME.neonCyan}10`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlaskConical size={16} color={THEME.neonCyan} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: THEME.textMain }}>
                {t('simLobby.modalTitle')}
              </div>
              <div style={{ fontSize: '0.72rem', color: THEME.textMuted, marginTop: 2 }}>
                {t('simLobby.modalSubtitle')}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: THEME.textMuted, padding: 6, borderRadius: 8,
            display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = THEME.textMain; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = THEME.textMuted; }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1 }}>
          {/* Parite */}
          <div>
            <Label icon={<BarChart2 size={12} />} text={t('simLobby.pairMarket')} required />
            <PairDropdown value={form.pair} onChange={(v) => set('pair', v)} />
            {errors.pair && <ErrorMsg text={errors.pair} />}
          </div>

          {/* Zaman Dilimi */}
          <div>
            <Label icon={<Clock size={12} />} text={t('simLobby.timeframeLabel')} required />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf} type="button"
                  onClick={() => set('timeframe', tf)}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    border: form.timeframe === tf
                      ? `1px solid ${THEME.neonCyan}80`
                      : `1px solid ${THEME.border}`,
                    background: form.timeframe === tf
                      ? `${THEME.neonCyan}15`
                      : 'rgba(255,255,255,0.03)',
                    color: form.timeframe === tf ? THEME.neonCyan : THEME.textMuted,
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Tarih Aralığı */}
          <div>
            <Label icon={<Calendar size={12} />} text={t('simLobby.dateRangeLabel')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: THEME.textMuted, marginBottom: 5 }}>{t('simLobby.startDate')}</div>
                <input
                  type="date"
                  value={form.dateFrom}
                  onChange={(e) => set('dateFrom', e.target.value)}
                  style={{ ...inputStyle(), colorScheme: 'dark', cursor: 'pointer' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: THEME.textMuted, marginBottom: 5 }}>{t('simLobby.endDate')}</div>
                <input
                  type="date"
                  value={form.dateTo}
                  onChange={(e) => set('dateTo', e.target.value)}
                  style={{ ...inputStyle(), colorScheme: 'dark', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Başlangıç Bakiyesi */}
          <div>
            <Label icon={<DollarSign size={12} />} text={t('simLobby.startBalance')} required />
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: THEME.neonGold, fontSize: '0.85rem', fontWeight: 700 }}>$</span>
              <input
                type="number"
                min="100"
                step="100"
                value={form.startBalance}
                onChange={(e) => set('startBalance', e.target.value)}
                placeholder="10000"
                style={{ ...inputStyle(), paddingLeft: 32 }}
              />
            </div>
            {errors.startBalance && <ErrorMsg text={errors.startBalance} />}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {[1000, 5000, 10000, 25000, 100000].map((v) => (
                <button key={v} type="button" onClick={() => set('startBalance', String(v))}
                  style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${THEME.border}`,
                    background: 'rgba(255,255,255,0.03)',
                    color: THEME.textMuted }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.neonGold + '60'; e.currentTarget.style.color = THEME.neonGold; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textMuted; }}>
                  ${v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Strateji Açıklaması */}
          <div>
            <Label icon={<FileText size={12} />} text={t('simLobby.strategyLabel')} />
            <textarea
              value={form.strategy}
              onChange={(e) => set('strategy', e.target.value)}
              placeholder={t('simLobby.strategyPlaceholder')}
              rows={3}
              style={{
                ...inputStyle(),
                resize: 'vertical', minHeight: 80, lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: '0.7rem', color: THEME.textMuted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Zap size={11} color={THEME.neonCyan} />
              {t('simLobby.strategyHint')}
            </div>
          </div>

          {/* Aksiyon Butonları */}
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '11px 0', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
                border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.03)',
                color: THEME.textMuted, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = THEME.textMain; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textMuted; }}>
              {t('simLobby.cancel')}
            </button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 2, padding: '11px 0', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700,
                border: `1px solid ${THEME.neonCyan}50`,
                background: `linear-gradient(135deg, ${THEME.neonCyan}22, ${THEME.neonCyan}0c)`,
                color: THEME.neonCyan, cursor: 'pointer',
                boxShadow: `0 0 24px ${THEME.neonCyan}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Play size={14} strokeWidth={2.5} />
              {t('simLobby.startSim')}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Küçük yardımcılar ───────────────────────────────────────────────────────
function Label({ icon, text, required }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6,
      marginBottom: 8, fontSize: '0.78rem', fontWeight: 600,
      color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      <span style={{ color: THEME.neonCyan, opacity: 0.8 }}>{icon}</span>
      {text}
      {required && <span style={{ color: THEME.neonCyan, marginLeft: 2 }}>*</span>}
    </div>
  );
}

function ErrorMsg({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6,
      marginTop: 6, fontSize: '0.75rem', color: THEME.neonDown }}>
      <AlertCircle size={12} />
      {text}
    </div>
  );
}


function inputStyle() {
  return {
    width: '100%', padding: '10px 14px', borderRadius: 10, outline: 'none',
    border: `1px solid ${THEME.border}`,
    background: 'rgba(255,255,255,0.03)',
    color: THEME.textMain, fontSize: '0.875rem',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };
}

// ── SessionRow ───────────────────────────────────────────────────────────────
function SessionRow({ session, onDelete, onResume, index }) {
  const { t } = useTranslation();
  const pnl   = session.currentBalance - session.startBalance;
  const isPos = pnl >= 0;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ borderBottom: `1px solid ${THEME.border}` }}
    >
      {/* Parite & TF */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: `${THEME.neonCyan}12`, border: `1px solid ${THEME.neonCyan}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={14} color={THEME.neonCyan} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: THEME.textMain }}>
              {PAIR_LABELS[session.pair] || session.pair}
            </div>
            <div style={{ fontSize: '0.72rem', color: THEME.textMuted, marginTop: 1 }}>
              {session.timeframe} · {fmtDate(session.createdAt)}
            </div>
          </div>
        </div>
      </td>

      {/* Başlangıç */}
      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: THEME.textMuted }}>
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>
          ${fmtBalance(session.startBalance)}
        </span>
      </td>

      {/* Güncel Bakiye */}
      <td style={{ padding: '14px 16px' }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700,
            fontFamily: 'ui-monospace, monospace',
            color: getPnlColor(session.startBalance, session.currentBalance) }}>
            ${fmtBalance(session.currentBalance)}
          </div>
          <div style={{ fontSize: '0.7rem', marginTop: 2,
            color: isPos ? THEME.neonUp : THEME.neonDown,
            display: 'flex', alignItems: 'center', gap: 3 }}>
            {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {getPnlPct(session.startBalance, session.currentBalance)}
          </div>
        </div>
      </td>

      {/* Tarih aralığı */}
      <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: THEME.textMuted }}>
        {session.dateFrom
          ? `${fmtDate(session.dateFrom)} → ${fmtDate(session.dateTo) || '?'}`
          : <span style={{ opacity: 0.45 }}>{t('simLobby.liveData')}</span>}
      </td>

      {/* Durum */}
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          background: session.status === 'active' ? `${THEME.neonCyan}14` : 'rgba(255,255,255,0.05)',
          border: `1px solid ${session.status === 'active' ? THEME.neonCyan + '40' : THEME.border}`,
          color: session.status === 'active' ? THEME.neonCyan : THEME.textMuted,
        }}>
          {session.status === 'active'
            ? (<><span style={{ width: 6, height: 6, borderRadius: '50%',
                background: THEME.neonCyan, boxShadow: `0 0 6px ${THEME.neonCyan}` }} />{t('simLobby.statusActive')}'</>)
            : t('simLobby.statusCompleted')}
        </span>
      </td>

      {/* Aksiyonlar */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <motion.button
            onClick={() => onResume(session)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
              border: `1px solid ${THEME.neonCyan}50`,
              background: `${THEME.neonCyan}12`,
              color: THEME.neonCyan, cursor: 'pointer',
              boxShadow: `0 0 12px ${THEME.neonCyan}12`,
            }}
          >
            <Play size={11} strokeWidth={2.5} />
            {t('simLobby.resume')}
          </motion.button>
          <motion.button
            onClick={() => onDelete(session.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${THEME.border}`,
              background: 'rgba(255,51,102,0.05)',
              color: 'rgba(255,51,102,0.5)', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = THEME.neonDown + '60';
              e.currentTarget.style.color = THEME.neonDown;
              e.currentTarget.style.background = `${THEME.neonDown}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = THEME.border;
              e.currentTarget.style.color = 'rgba(255,51,102,0.5)';
              e.currentTarget.style.background = 'rgba(255,51,102,0.05)';
            }}
          >
            <Trash2 size={13} />
          </motion.button>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onNew }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '64px 24px', textAlign: 'center' }}
    >
      <div style={{ width: 80, height: 80, borderRadius: 20, margin: '0 auto 24px',
        background: `${THEME.neonCyan}08`, border: `1px solid ${THEME.neonCyan}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FlaskConical size={32} color={THEME.neonCyan} style={{ opacity: 0.5 }} />
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: THEME.textMain, marginBottom: 10 }}>
        {t('simLobby.emptyTitle')}
      </div>
      <div style={{ fontSize: '0.85rem', color: THEME.textMuted, maxWidth: 340, margin: '0 auto 28px', lineHeight: 1.6 }}>
        {t('simLobby.emptyDesc')}
      </div>
      <motion.button
        onClick={onNew}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 24px', borderRadius: 10, fontSize: '0.875rem', fontWeight: 700,
          border: `1px solid ${THEME.neonCyan}50`,
          background: `${THEME.neonCyan}14`,
          color: THEME.neonCyan, cursor: 'pointer',
          boxShadow: `0 0 20px ${THEME.neonCyan}18`,
        }}
      >
        <Plus size={15} strokeWidth={2.5} />
        {t('simLobby.emptyBtn')}
      </motion.button>
    </motion.div>
  );
}

// ── Ana bileşen: SimulationLobby ────────────────────────────────────────────
export default function SimulationLobby({ onStart }) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState(() => loadSessions());
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // session id

  const refresh = () => setSessions(loadSessions());

  const handleDelete = (id) => {
    if (deleteConfirm === id) {
      const updated = sessions.filter((s) => s.id !== id);
      saveSessions(updated);
      setSessions(updated);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleResume = (session) => {
    onStart(session);
  };

  const handleNewStart = (session) => {
    setShowModal(false);
    refresh();
    onStart(session);
  };

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, color: THEME.textMain,
      fontFamily: "'Inter', system-ui, sans-serif", padding: '32px 24px' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ maxWidth: 1200, margin: '0 auto 32px', display: 'flex',
          alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14,
            background: `${THEME.neonCyan}12`, border: `1px solid ${THEME.neonCyan}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 24px ${THEME.neonCyan}18` }}>
            <FlaskConical size={22} color={THEME.neonCyan} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em',
              margin: 0, color: THEME.textMain }}>
              {t('simLobby.title')}
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: THEME.textMuted }}>
              {t('simLobby.sessionCount', { count: sessions.length })}
            </p>
          </div>
        </div>

        {/* Yeni Simülasyon Butonu */}
        <motion.button
          onClick={() => setShowModal(true)}
          whileHover={{ scale: 1.03, boxShadow: `0 0 32px ${THEME.neonCyan}35` }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 800,
            letterSpacing: '0.02em',
            border: `1px solid ${THEME.neonCyan}55`,
            background: `linear-gradient(135deg, ${THEME.neonCyan}20, ${THEME.neonCyan}08)`,
            color: THEME.neonCyan, cursor: 'pointer',
            boxShadow: `0 0 20px ${THEME.neonCyan}18, inset 0 1px 0 rgba(255,255,255,0.06)`,
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Shine efekti */}
          <motion.span
            style={{ position: 'absolute', inset: 0, background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
              transform: 'skewX(-15deg)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
          />
          <Plus size={16} strokeWidth={2.5} style={{ position: 'relative' }} />
          <span style={{ position: 'relative' }}>{t('simLobby.newSimBtn')}</span>
        </motion.button>
      </motion.div>

      {/* İstatistik Kartları */}
      {sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ maxWidth: 1200, margin: '0 auto 28px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}
        >
          {[
            {
              label: t('simLobby.statTotal'),
              value: sessions.length,
              icon: <FlaskConical size={16} />,
              color: THEME.neonCyan,
            },
            {
              label: t('simLobby.statActive'),
              value: sessions.filter((s) => s.status === 'active').length,
              icon: <Zap size={16} />,
              color: THEME.neonGold,
            },
            {
              label: t('simLobby.statPnl'),
              value: (() => {
                const t = sessions.reduce((acc, s) => acc + (s.currentBalance - s.startBalance), 0);
                return (t >= 0 ? '+$' : '-$') + Math.abs(t).toFixed(0);
              })(),
              icon: <TrendingUp size={16} />,
              color: sessions.reduce((acc, s) => acc + s.currentBalance - s.startBalance, 0) >= 0 ? THEME.neonUp : THEME.neonDown,
            },
          ].map((card) => (
            <motion.div
              key={card.label}
              whileHover={{ y: -2 }}
              style={{ padding: '16px 20px', borderRadius: 14,
                border: `1px solid ${THEME.border}`,
                background: THEME.bgCard, backdropFilter: 'blur(12px)',
                boxShadow: `0 4px 24px rgba(0,0,0,0.3)` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ color: card.color, opacity: 0.7 }}>{card.icon}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: THEME.textMuted,
                  textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {card.label}
                </span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: card.color,
                fontFamily: 'ui-monospace, monospace', letterSpacing: '-0.02em' }}>
                {card.value}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Tablo */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ maxWidth: 1200, margin: '0 auto',
          borderRadius: 18, border: `1px solid ${THEME.border}`,
          background: THEME.bgCard, backdropFilter: 'blur(16px)',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}
      >
        {/* Tablo header şeridi */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${THEME.neonCyan}40, transparent)` }} />

        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${THEME.border}`,
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} color={THEME.neonCyan} style={{ opacity: 0.7 }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('simLobby.historyTitle')}
          </span>
        </div>

        {sessions.length === 0 ? (
          <EmptyState onNew={() => setShowModal(true)} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  {[t('simLobby.colPair'), t('simLobby.colStart'), t('simLobby.colCurrent'), t('simLobby.colDateRange'), t('simLobby.colStatus'), ''].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left',
                      fontSize: '0.7rem', fontWeight: 700, color: THEME.textMuted,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sessions.map((session, i) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      index={i}
                      onDelete={handleDelete}
                      onResume={handleResume}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Silme onay mesajı */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              style={{ padding: '12px 20px', background: `${THEME.neonDown}12`,
                borderTop: `1px solid ${THEME.neonDown}30`,
                fontSize: '0.8rem', color: THEME.neonDown,
                display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <AlertCircle size={14} />
              {t('simLobby.deleteConfirm')}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <NewSimulationModal
            onClose={() => setShowModal(false)}
            onStart={handleNewStart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
