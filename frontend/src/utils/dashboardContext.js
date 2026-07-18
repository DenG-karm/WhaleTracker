/**
 * dashboardContext.js
 *
 * updateDashboardContext(symbolType, data)
 * ─────────────────────────────────────────
 * WhaleFeed sayfasındaki üst metrik kutularını ve başlığı,
 * seçili sembole göre saf DOM manipülasyonuyla günceller.
 *
 * Bağımlılık sıfır — React/Vue kullanılmaz.
 * Hedefleme: data-wf-metric="inflow|outflow|pressure|intel"
 *            id="wf-page-title"
 *            id="wf-status-badge"
 */

// ─── CSS enjeksiyonu (bir kez çalışır) ───────────────────────────────────────
;(function _injectStyles() {
  if (document.getElementById('wf-ctx-styles')) return;
  const tag = document.createElement('style');
  tag.id = 'wf-ctx-styles';
  tag.textContent = `
    /* Yenileme efekti — veri değişirken metrik kutu solar */
    .wf-ctx--refreshing {
      opacity: 0.35;
      transform: translateY(3px);
      transition: opacity 220ms ease, transform 220ms ease;
      pointer-events: none;
    }

    /* Animasyon bitti, yumuşak giriş */
    .wf-ctx--resolved {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 320ms ease, transform 320ms ease;
    }

    /* Başlık badge'i — sembol adı */
    .wf-symbol-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 6px;
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid rgba(139, 92, 246, 0.35);
      font-size: 0.67rem;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #a78bfa;
      margin-left: 10px;
      vertical-align: middle;
      font-family: inherit;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
    }

    .wf-symbol-badge--forex {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .wf-symbol-badge--crypto {
      background: rgba(34, 211, 238, 0.1);
      border-color: rgba(34, 211, 238, 0.3);
      color: #22d3ee;
    }

    .wf-symbol-badge--stock {
      background: rgba(249, 115, 22, 0.1);
      border-color: rgba(249, 115, 22, 0.3);
      color: #fb923c;
    }

    /* Spinner — pressure kartı için */
    @keyframes wf-spin {
      to { transform: rotate(360deg); }
    }
    .wf-loading-spinner {
      display: inline-block;
      width: 9px;
      height: 9px;
      border: 1.5px solid rgba(255,255,255,0.15);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: wf-spin 0.7s linear infinite;
      vertical-align: middle;
      margin-right: 4px;
    }
  `;
  document.head.appendChild(tag);
})();

// ─── Label haritaları ──────────────────────────────────────────────────────
const LABEL_MAP = {
  CRYPTO: {
    inflow:   { label: 'Exchange Inflow',    sub: 'Borsa girişleri' },
    outflow:  { label: 'Exchange Outflow',   sub: 'Borsa çıkışları' },
    pressure: { label: 'Net Pressure',       sub: null },
    intel:    { label: 'Live On-Chain',      sub: null },
    badge:    'LIVE ON-CHAIN',
  },
  FOREX: {
    inflow:   { label: 'Institutional Order Flow', sub: 'Buy-side akım' },
    outflow:  { label: 'Sell-Side Flow',           sub: 'Sell-side akım' },
    pressure: { label: 'Net Market Pressure',      sub: null },
    intel:    { label: 'Global Volume Metrics',    sub: null },
    badge:    'FX ANALYTICS',
  },
  STOCK: {
    inflow:   { label: 'Institutional Buy',  sub: 'Kurumsal alım' },
    outflow:  { label: 'Retail Sell',        sub: 'Perakende satış' },
    pressure: { label: 'Order Imbalance',    sub: null },
    intel:    { label: 'Dark Pool Activity', sub: null },
    badge:    'EQUITY FEED',
  },
};

// ─── Dahili yardımcılar ─────────────────────────────────────────────────────

/** Metrik kutudaki ilk küçük span'ı (label) döner */
function _findLabel(metricEl) {
  return metricEl.querySelector('[data-wf-label]') || metricEl.querySelector('span');
}

/** Metrik kutudaki alt açıklama divini döner */
function _findSub(metricEl) {
  return metricEl.querySelector('[data-wf-sub]');
}

/** Tüm data-wf-metric elementlerini array olarak döner */
function _allMetricEls() {
  return Array.from(document.querySelectorAll('[data-wf-metric]'));
}

// ─── Mevcut sembol durumu (modül-private) ─────────────────────────────────
let _currentSymbol = null;
let _badgeEl       = null;  // başlığa eklenen badge referansı

// ─── Ana API ──────────────────────────────────────────────────────────────

/**
 * @param {'CRYPTO'|'FOREX'|'STOCK'} symbolType  - Seçilen sembolün tipi
 * @param {object}  data
 * @param {string}  data.symbol        - Görünür sembol adı (ör: "EURUSD", "BTCUSDT")
 * @param {string}  [data.inflow]      - İnflow değer metni
 * @param {string}  [data.outflow]     - Outflow değer metni
 * @param {number}  [data.bearPct]     - Bear yüzdesi (0-100)
 * @param {number}  [data.bullPct]     - Bull yüzdesi (0-100)
 * @param {string}  [data.intelValue]  - Intel kart değeri
 * @param {string}  [data.intelSub]    - Intel kart alt başlığı
 */
function updateDashboardContext(symbolType, data = {}) {
  const type   = (symbolType || 'CRYPTO').toUpperCase();
  const labels = LABEL_MAP[type] || LABEL_MAP.CRYPTO;
  const FADE_DURATION = 220;  // ms — opacity düşüş süresi
  const HOLD_DURATION = 350;  // ms — düşükte bekleme

  // 1 ── Tüm metrik kutulara "refreshing" class'ı ekle
  const els = _allMetricEls();
  els.forEach(el => {
    el.classList.remove('wf-ctx--resolved');
    el.classList.add('wf-ctx--refreshing');
  });

  // 2 ── Başlık badgesine spinner koy (geçici)
  _updateTitleBadge(data.symbol, type, /* loading */ true);

  // 3 ── HOLD_DURATION sonra DOM'u güncelle, sonra efekti kaldır
  setTimeout(() => {
    // Label ve sub metinlerini güncelle
    els.forEach(el => {
      const metricKey = el.getAttribute('data-wf-metric');
      const cfg       = labels[metricKey];
      if (!cfg) return;

      const labelEl = _findLabel(el);
      if (labelEl) labelEl.textContent = cfg.label;

      const subEl = _findSub(el);
      if (subEl && cfg.sub) subEl.textContent = cfg.sub;
    });

    // Başlık badge'ini güncelle (spinner kaldır)
    _updateTitleBadge(data.symbol, type, /* loading */ false);

    // "refreshing" → "resolved" (fade-in)
    els.forEach(el => {
      el.classList.remove('wf-ctx--refreshing');
      el.classList.add('wf-ctx--resolved');
    });

    _currentSymbol = data.symbol;

  }, FADE_DURATION + HOLD_DURATION);
}

/**
 * Sayfa başlığındaki h1'e sembol badge'i ekler veya günceller.
 * @param {string}  symbol
 * @param {string}  type      'CRYPTO' | 'FOREX' | 'STOCK'
 * @param {boolean} loading   true iken spinner gösterir
 */
function _updateTitleBadge(symbol, type, loading) {
  const titleEl = document.getElementById('wf-page-title');
  if (!titleEl) return;

  const labels     = LABEL_MAP[type] || LABEL_MAP.CRYPTO;
  const typeClass  = `wf-symbol-badge--${type.toLowerCase()}`;
  const displaySym = symbol || '—';

  // Badge daha önce eklendiyse güncelle
  if (_badgeEl) {
    _badgeEl.className = `wf-symbol-badge ${typeClass}`;
    _badgeEl.innerHTML = loading
      ? `<span class="wf-loading-spinner"></span>${displaySym}`
      : `${displaySym} <span style="opacity:0.5;font-weight:400">Bias</span>`;
    return;
  }

  // İlk kez — badge oluştur ve h1'in sonuna ekle
  _badgeEl = document.createElement('span');
  _badgeEl.className = `wf-symbol-badge ${typeClass}`;
  _badgeEl.setAttribute('aria-label', `Aktif sembol: ${displaySym}`);
  _badgeEl.innerHTML = loading
    ? `<span class="wf-loading-spinner"></span>${displaySym}`
    : `${displaySym} <span style="opacity:0.5;font-weight:400">Bias</span>`;
  titleEl.appendChild(_badgeEl);
}

/**
 * Aktif sembol badge'ini kaldırır (sembol seçimi iptal edildiğinde).
 */
function clearDashboardContext() {
  if (_badgeEl) {
    _badgeEl.remove();
    _badgeEl = null;
  }
  _currentSymbol = null;

  // Tüm metrik kutulara kısa bir "sıfırlama" efekti
  const els = _allMetricEls();
  els.forEach(el => {
    el.classList.remove('wf-ctx--resolved');
    el.classList.add('wf-ctx--refreshing');
  });
  setTimeout(() => {
    els.forEach(el => {
      el.classList.remove('wf-ctx--refreshing');
      el.classList.add('wf-ctx--resolved');
    });
  }, 300);
}

/** Şu an aktif olan sembolü döner */
function getActiveSymbol() {
  return _currentSymbol;
}

export { updateDashboardContext, clearDashboardContext, getActiveSymbol };
