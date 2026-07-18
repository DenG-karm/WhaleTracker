/**
 * PsychStatsWidget.js
 * Command Center / Institutional Tier – Dark Mode, Neon Detail
 *
 * Kullanım:
 *   import { renderPsychStats } from './PsychStatsWidget';
 *   renderPsychStats(containerEl, apiData);
 *
 * apiData beklenen şema:
 * {
 *   total_revenge_loss:  number,        // negatif USD değer
 *   high_psych_win_rate: number | null, // 0-1 (örn. 0.72)
 *   low_psych_win_rate:  number | null,
 *   high_psych_total:    number,
 *   low_psych_total:     number
 * }
 */

// ── Stil enjeksiyonu (tek seferlik) ──────────────────────────────────────────
const STYLE_ID = "__psych-stats-style__";

function _injectStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const css = `
    .psc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      font-family: 'Inter', 'Segoe UI', sans-serif;
    }

    /* ── Kart gövdesi ── */
    .psc-card {
      position: relative;
      background: #0d1117;
      border: 1px solid #1e2d3d;
      border-radius: 14px;
      padding: 24px;
      overflow: hidden;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .psc-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 0 28px rgba(0, 255, 180, 0.08);
    }

    /* Neon kenar çizgisi (üst) */
    .psc-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--neon), transparent);
      opacity: 0.9;
    }

    /* Arka-plan glow lekesi */
    .psc-card::after {
      content: '';
      position: absolute;
      width: 180px; height: 180px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--neon-bg) 0%, transparent 70%);
      top: -50px; right: -40px;
      pointer-events: none;
    }

    /* Kart renk varyantları */
    .psc-card--danger  { --neon: #ff3a5c; --neon-bg: rgba(255,58,92,0.08); }
    .psc-card--psych   { --neon: #00ffb4; --neon-bg: rgba(0,255,180,0.06); }

    /* ── Başlık ── */
    .psc-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #4a6070;
      margin-bottom: 6px;
    }
    .psc-title {
      font-size: 13px;
      font-weight: 600;
      color: #8ba0b0;
      margin-bottom: 20px;
    }

    /* ── Ana değer ── */
    .psc-value {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: -1px;
      line-height: 1;
      margin-bottom: 6px;
    }
    .psc-value--loss   { color: #ff3a5c; }
    .psc-value--neutral { color: #c8d8e0; }

    .psc-sub {
      font-size: 11px;
      color: #4a6070;
      margin-bottom: 22px;
    }

    /* ── Bar karşılaştırması ── */
    .psc-bars { display: flex; flex-direction: column; gap: 12px; }

    .psc-bar-row { display: flex; flex-direction: column; gap: 5px; }

    .psc-bar-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .psc-bar-label { font-size: 11px; color: #5a7080; }
    .psc-bar-pct   { font-size: 12px; font-weight: 700; }

    .psc-bar-track {
      width: 100%;
      height: 6px;
      background: #1a2532;
      border-radius: 3px;
      overflow: hidden;
    }
    .psc-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .psc-bar-fill--high {
      background: linear-gradient(90deg, #00ffb4, #00c4ff);
      box-shadow: 0 0 8px rgba(0,255,180,0.4);
    }
    .psc-bar-fill--low  {
      background: linear-gradient(90deg, #ff6a00, #ee0979);
      box-shadow: 0 0 8px rgba(238,9,121,0.3);
    }

    /* ── Badge ── */
    .psc-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .psc-badge--danger  { background: rgba(255,58,92,0.12); color: #ff3a5c; border: 1px solid rgba(255,58,92,0.25); }
    .psc-badge--success { background: rgba(0,255,180,0.10); color: #00ffb4; border: 1px solid rgba(0,255,180,0.2); }

    /* ── Divider ── */
    .psc-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #1e2d3d 30%, #1e2d3d 70%, transparent);
      margin: 18px 0;
    }

    /* ── Footer istatistik ── */
    .psc-footer {
      display: flex;
      gap: 20px;
    }
    .psc-stat { display: flex; flex-direction: column; gap: 2px; }
    .psc-stat-val { font-size: 16px; font-weight: 700; color: #c8d8e0; }
    .psc-stat-lbl { font-size: 10px; color: #3a5060; letter-spacing: 0.5px; }

    /* ── NULL / veri yok durumu ── */
    .psc-no-data {
      font-size: 12px;
      color: #2a3d50;
      font-style: italic;
    }
  `;

  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}

// ── Yardımcı ─────────────────────────────────────────────────────────────────

function _pct(rate) {
  if (rate == null) return null;
  return Math.round(rate * 100);
}

function _fmtUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ── Kart 1: İntikam İşlemi Kayıp Widgeti ─────────────────────────────────────

function _buildRevengeCard(data) {
  const loss      = data.total_revenge_loss ?? 0;
  const isLoss    = loss < 0;
  const formatted = _fmtUsd(loss);

  const card = document.createElement("div");
  card.className = "psc-card psc-card--danger";
  card.innerHTML = `
    <div class="psc-label">Revenge Trading</div>
    <div class="psc-title">İntikam İşlemlerindeki Toplam Kayıp</div>

    <div class="psc-value ${isLoss ? "psc-value--loss" : "psc-value--neutral"}">
      ${formatted}
    </div>
    <div class="psc-sub">Son 30 gün · Kapalı işlemler</div>

    <span class="psc-badge ${isLoss ? "psc-badge--danger" : "psc-badge--success"}">
      ${isLoss ? "▼ ZARAR" : "— NÖTR"}
    </span>

    <div class="psc-divider"></div>

    <div style="font-size:11px; color:#3a5060; line-height:1.6">
      <code style="color:#ff3a5c; background:#1a0d0f; padding:1px 6px; border-radius:4px; font-size:10px">
        is_revenge_trade: true
      </code>
      &nbsp;olan tüm zarar pozisyonlarının kümülatif toplamı.
    </div>
  `;
  return card;
}

// ── Kart 2: Psikoloji Skoru Kazanma Oranı Widgeti ────────────────────────────

function _buildPsychCard(data) {
  const highPct = _pct(data.high_psych_win_rate);
  const lowPct  = _pct(data.low_psych_win_rate);
  const highN   = data.high_psych_total ?? 0;
  const lowN    = data.low_psych_total  ?? 0;

  const _barRow = (label, pct, fillClass, badgeClass, n) => {
    if (pct == null) {
      return `
        <div class="psc-bar-row">
          <div class="psc-bar-meta">
            <span class="psc-bar-label">${label}</span>
            <span class="psc-no-data">Veri yok</span>
          </div>
        </div>`;
    }
    return `
      <div class="psc-bar-row">
        <div class="psc-bar-meta">
          <span class="psc-bar-label">${label}</span>
          <span class="psc-bar-pct" style="color:${fillClass === "psc-bar-fill--high" ? "#00ffb4" : "#ff6a00"}">
            ${pct}%
          </span>
        </div>
        <div class="psc-bar-track">
          <div
            class="psc-bar-fill ${fillClass}"
            style="width: ${pct}%"
          ></div>
        </div>
      </div>`;
  };

  const card = document.createElement("div");
  card.className = "psc-card psc-card--psych";
  card.innerHTML = `
    <div class="psc-label">Psychology Score</div>
    <div class="psc-title">Psikoloji Puanı → Kazanma Oranı</div>

    <div class="psc-bars">
      ${_barRow("Puan &gt; 7 &nbsp;<span style='color:#2a3d50'>(Yüksek Bilinç)</span>", highPct, "psc-bar-fill--high", "success", highN)}
      ${_barRow("Puan &lt; 4 &nbsp;<span style='color:#2a3d50'>(Düşük Bilinç)</span>",  lowPct,  "psc-bar-fill--low",  "danger",  lowN)}
    </div>

    <div class="psc-divider"></div>

    <div class="psc-footer">
      <div class="psc-stat">
        <span class="psc-stat-val" style="color:#00ffb4">${highN}</span>
        <span class="psc-stat-lbl">Puan &gt; 7 İşlem</span>
      </div>
      <div class="psc-stat">
        <span class="psc-stat-val" style="color:#ff6a00">${lowN}</span>
        <span class="psc-stat-lbl">Puan &lt; 4 İşlem</span>
      </div>
      ${highPct != null && lowPct != null ? `
      <div class="psc-stat" style="margin-left:auto">
        <span class="psc-stat-val">${highPct - lowPct > 0 ? "+" : ""}${highPct - lowPct}%</span>
        <span class="psc-stat-lbl">Bilinç Katkısı</span>
      </div>` : ""}
    </div>
  `;
  return card;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * API verisini alıp containerEl içine iki widget kartı render eder.
 *
 * @param {HTMLElement} containerEl - Widget'ların ekleneceği DOM düğümü
 * @param {Object}      apiData     - /analytics/psych-report yanıtı
 */
export function renderPsychStats(containerEl, apiData) {
  _injectStyles();

  const grid = document.createElement("div");
  grid.className = "psc-grid";

  grid.appendChild(_buildRevengeCard(apiData));
  grid.appendChild(_buildPsychCard(apiData));

  containerEl.innerHTML = "";
  containerEl.appendChild(grid);
}

/**
 * Fetch + render pipeline.
 * Bearer token otomatik localStorage'dan okunur (authToken key).
 *
 * @param {HTMLElement} containerEl
 * @param {string}      [baseUrl]   - API base URL (varsayılan: window.location.origin)
 */
export async function fetchAndRenderPsychStats(containerEl, baseUrl) {
  const origin = baseUrl ?? window.location.origin;
  const token  = localStorage.getItem("authToken") ?? "";

  // Yükleniyor durumu
  _injectStyles();
  containerEl.innerHTML = `
    <div style="
      display:flex; align-items:center; gap:10px;
      padding:20px; color:#2a4050;
      font-family:'Inter',sans-serif; font-size:13px
    ">
      <span style="
        width:16px; height:16px; border-radius:50%;
        border:2px solid #00ffb4; border-top-color:transparent;
        animation:psc-spin 0.8s linear infinite;
        display:inline-block;
      "></span>
      Psikoloji raporu yükleniyor…
    </div>
    <style>@keyframes psc-spin{to{transform:rotate(360deg)}}</style>
  `;

  const res = await fetch(`${origin}/analytics/psych-report`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    containerEl.innerHTML = `
      <div style="color:#ff3a5c; font-size:12px; padding:20px; font-family:'Inter',sans-serif">
        Veri alınamadı: ${res.status} ${res.statusText}
      </div>`;
    return;
  }

  const data = await res.json();
  renderPsychStats(containerEl, data);
}
