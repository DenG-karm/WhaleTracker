/**
 * SubscriptionManager.js
 * ──────────────────────────────────────────────────────────────────────────
 * Saf Vanilla JS singleton — React bağımlılığı yoktur.
 * Uygulama genelinde abonelik durumunu, limit motorunu ve Upgrade Modal'ı yönetir.
 *
 * Kullanım (herhangi bir React/JS dosyasından):
 *   import SubscriptionManager from '../utils/SubscriptionManager';
 *   SubscriptionManager.guardTrade(() => doTrade());   // 6. işlemde modal açar
 *   SubscriptionManager.guardAI(() => fetchAI());      // isPro değilse modal açar
 *   SubscriptionManager.showUpgradeModal();            // doğrudan modal aç
 */

// ── Mock kullanıcı durumu (prod'da AuthContext / API'den gelir) ───────────────
let _user = {
  isPro:           true,   // BETA: herkese tam erişim
  tradesThisMonth: 0,
  tradeLimit:      Infinity,
};

// ── Stil enjeksiyonu ──────────────────────────────────────────────────────────
(function injectStyles() {
  if (document.getElementById('wt-sub-styles')) return;
  const style = document.createElement('style');
  style.id    = 'wt-sub-styles';
  style.textContent = `
    /* ── Upgrade Modal ──────────────────────────────────────────────────── */
    #wt-upgrade-modal {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
      opacity: 0; pointer-events: none;
      transition: opacity 0.22s cubic-bezier(0.4,0,0.2,1);
      font-family: 'Inter', system-ui, sans-serif;
    }
    #wt-upgrade-modal.wt-modal-open {
      opacity: 1; pointer-events: all;
    }
    #wt-modal-box {
      width: 430px; max-width: calc(100vw - 32px);
      background: linear-gradient(145deg, #0d1220 0%, #0a0f1a 100%);
      border: 1px solid rgba(34, 211, 238, 0.18);
      border-radius: 20px;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.7),
                  0 0 60px rgba(34,211,238,0.06);
      padding: 36px 32px 28px;
      transform: scale(0.95) translateY(12px);
      transition: transform 0.26s cubic-bezier(0.34,1.56,0.64,1);
      position: relative; overflow: hidden;
    }
    #wt-upgrade-modal.wt-modal-open #wt-modal-box {
      transform: scale(1) translateY(0);
    }
    /* Glow accent */
    #wt-modal-box::before {
      content: '';
      position: absolute; top: -60px; left: 50%; transform: translateX(-50%);
      width: 260px; height: 120px;
      background: radial-gradient(ellipse, rgba(34,211,238,0.14) 0%, transparent 70%);
      pointer-events: none;
    }
    #wt-modal-close {
      position: absolute; top: 14px; right: 14px;
      width: 28px; height: 28px; border-radius: 7px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.4); font-size: 14px; line-height: 1;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.14s;
    }
    #wt-modal-close:hover { color: #fff; background: rgba(255,255,255,0.1); }

    .wt-modal-badge {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: #22d3ee;
      background: rgba(34,211,238,0.1); border: 1px solid rgba(34,211,238,0.22);
      padding: 4px 10px; border-radius: 20px; margin-bottom: 18px;
    }
    .wt-modal-title {
      font-size: 1.45rem; font-weight: 800; color: #f1f5f9;
      letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 8px;
    }
    .wt-modal-title span { color: #22d3ee; }
    .wt-modal-sub {
      font-size: 0.82rem; color: rgba(255,255,255,0.45); margin-bottom: 24px;
      line-height: 1.5;
    }
    /* Feature list */
    .wt-feature-list { list-style: none; padding: 0; margin: 0 0 26px; display: flex; flex-direction: column; gap: 11px; }
    .wt-feature-list li {
      display: flex; align-items: flex-start; gap: 11px;
      padding: 12px 14px; border-radius: 10px;
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .wt-feature-icon {
      width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
    }
    .wt-feature-icon.cyan  { background: rgba(34,211,238,0.12); border: 1px solid rgba(34,211,238,0.22); }
    .wt-feature-icon.gold  { background: rgba(251,191,36,0.12);  border: 1px solid rgba(251,191,36,0.22);  }
    .wt-feature-icon.green { background: rgba(0,255,157,0.1);    border: 1px solid rgba(0,255,157,0.2);    }
    .wt-feature-text-title { font-size: 0.82rem; font-weight: 700; color: #e2e8f0; margin-bottom: 2px; }
    .wt-feature-text-desc  { font-size: 0.72rem; color: rgba(255,255,255,0.4); line-height: 1.4; }
    /* CTA */
    #wt-upgrade-cta {
      width: 100%; padding: 14px 0; border-radius: 12px; cursor: pointer;
      font-size: 0.92rem; font-weight: 800; letter-spacing: 0.02em;
      border: 1px solid rgba(34,211,238,0.4);
      background: linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(34,211,238,0.08) 100%);
      color: #22d3ee;
      box-shadow: 0 0 24px rgba(34,211,238,0.18), inset 0 1px 0 rgba(255,255,255,0.06);
      transition: all 0.18s; margin-bottom: 10px; display: block;
    }
    #wt-upgrade-cta:hover {
      background: linear-gradient(135deg, rgba(34,211,238,0.32) 0%, rgba(34,211,238,0.14) 100%);
      box-shadow: 0 0 36px rgba(34,211,238,0.28); transform: translateY(-1px);
    }
    #wt-upgrade-cta:active { transform: translateY(0); }
    .wt-modal-fine {
      text-align: center; font-size: 0.67rem; color: rgba(255,255,255,0.25);
    }

    /* ── AI Widget Pro Lock ──────────────────────────────────────────────── */
    .wt-pro-lock-wrap {
      position: relative; isolation: isolate; border-radius: inherit;
    }
    .wt-pro-lock-wrap > .wt-lock-blur {
      filter: blur(5px) brightness(0.7);
      pointer-events: none; user-select: none;
      transition: filter 0.3s;
    }
    .wt-pro-lock-overlay {
      position: absolute; inset: 0; z-index: 10; border-radius: inherit;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; cursor: pointer;
      background: rgba(10,14,23,0.55);
      backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
      transition: background 0.2s;
    }
    .wt-pro-lock-overlay:hover { background: rgba(10,14,23,0.7); }
    .wt-lock-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: rgba(34,211,238,0.12); border: 1px solid rgba(34,211,238,0.3);
      display: flex; align-items: center; justify-content: center; font-size: 16px;
      box-shadow: 0 0 16px rgba(34,211,238,0.2);
    }
    .wt-lock-label {
      font-size: 0.72rem; font-weight: 700; color: #22d3ee;
      background: rgba(34,211,238,0.1); border: 1px solid rgba(34,211,238,0.22);
      padding: 4px 12px; border-radius: 20px; letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  `;
  document.head.appendChild(style);
})();

// ── Modal HTML enjeksiyonu ────────────────────────────────────────────────────
(function injectModal() {
  if (document.getElementById('wt-upgrade-modal')) return;
  const el = document.createElement('div');
  el.id    = 'wt-upgrade-modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'wt-modal-title-el');
  el.innerHTML = `
    <div id="wt-modal-box">
      <button id="wt-modal-close" aria-label="Kapat">✕</button>

      <div class="wt-modal-badge">
        ⚡ Pro Tier
      </div>

      <h2 class="wt-modal-title" id="wt-modal-title-el">
        Institutional <span>Edge</span>'i Açın
      </h2>
      <p class="wt-modal-sub">
        Serbest katmanı aştınız. Pro ile sınırları kaldırın ve kurumsal düzeyde araçlara erişin.
      </p>

      <ul class="wt-feature-list">
        <li>
          <div class="wt-feature-icon cyan">∞</div>
          <div>
            <div class="wt-feature-text-title">Sınırsız İşlem Takibi</div>
            <div class="wt-feature-text-desc">Aylık limit yok — tüm işlemleriniz kaydedilir, analiz edilir.</div>
          </div>
        </li>
        <li>
          <div class="wt-feature-icon gold">🧠</div>
          <div>
            <div class="wt-feature-text-title">Acımasız AI Koçluğu &amp; Daily Bias</div>
            <div class="wt-feature-text-desc">GPT-4o destekli işlem analizi, psikoloji skoru ve günlük piyasa yönelimi.</div>
          </div>
        </li>
        <li>
          <div class="wt-feature-icon green">🔬</div>
          <div>
            <div class="wt-feature-text-title">Advanced Simulation Lab</div>
            <div class="wt-feature-text-desc">Sınırsız geçmiş replay, strateji stres testi ve AI otopsi modülü.</div>
          </div>
        </li>
      </ul>

      <button id="wt-upgrade-cta">Upgrade Now — $39 / ay</button>
      <p class="wt-modal-fine">İstediğiniz zaman iptal edin · Güvenli ödeme Stripe ile</p>
    </div>
  `;
  document.body.appendChild(el);

  // Kapatma: overlay tıklama veya ✕
  el.addEventListener('click', (e) => {
    if (e.target === el) SubscriptionManager.hideUpgradeModal();
  });
  document.getElementById('wt-modal-close').addEventListener('click', () => {
    SubscriptionManager.hideUpgradeModal();
  });
  document.getElementById('wt-upgrade-cta').addEventListener('click', () => {
    // Stripe checkout: paywall.js _redirectToCheckout ile yönetilir
  });

  // ESC ile kapat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') SubscriptionManager.hideUpgradeModal();
  });
})();

// ── Singleton ─────────────────────────────────────────────────────────────────
const SubscriptionManager = {
  // ── Kullanıcı durumunu güncelle (AuthContext'ten çağrılabilir) ──────────
  setUser(partialUser) {
    _user = { ..._user, ...partialUser };
  },

  getUser() {
    return { ..._user };
  },

  // ── Limit kontrolleri ───────────────────────────────────────────────────
  canTrade() {
    return true; // BETA: sınır yok
  },

  canUseAI() {
    return true; // BETA: sınır yok
  },

  // ── Guard helpers ───────────────────────────────────────────────────────
  guardTrade(onAllow) {
    // BETA: her zaman izin ver
    if (typeof onAllow === 'function') onAllow();
    return true;
  },

  guardAI(onAllow) {
    // BETA: her zaman izin ver
    if (typeof onAllow === 'function') onAllow();
    return true;
  },

  // ── Modal ───────────────────────────────────────────────────────────────
  showUpgradeModal(reason) {
    const modal = document.getElementById('wt-upgrade-modal');
    if (!modal) return;
    // Başlığı nedene göre özelleştir
    const sub = modal.querySelector('.wt-modal-sub');
    if (sub) {
      if (reason === 'trade_limit') {
        sub.textContent = `Aylık ${_user.tradeLimit} işlem limitine ulaştınız. Pro ile sınırları kaldırın.`;
      } else if (reason === 'ai_locked') {
        sub.textContent = 'AI analiz araçları Pro katmana özeldir. Hemen yükseltin.';
      } else {
        sub.textContent = 'Serbest katmanı aştınız. Pro ile kurumsal düzeyde araçlara erişin.';
      }
    }
    modal.classList.add('wt-modal-open');
    document.body.style.overflow = 'hidden';
  },

  hideUpgradeModal() {
    const modal = document.getElementById('wt-upgrade-modal');
    if (modal) modal.classList.remove('wt-modal-open');
    document.body.style.overflow = '';
  },
};

export default SubscriptionManager;
