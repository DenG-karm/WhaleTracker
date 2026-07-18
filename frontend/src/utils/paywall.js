/**
 * paywall.js
 * ──────────
 * Kullanıcı "free" ise hedef elementleri bulanıklaştırır ve
 * ortasına "Upgrade to Pro" overlay'i yerleştirir.
 *
 * Kullanım:
 *   import { initPaywall } from '../utils/paywall';
 *   initPaywall(user);   // user: { subscription_status: 'free' | 'pro', token: '...' }
 *
 * Hedef elementler data-paywall-gate="true" attribute'u taşımalıdır.
 */

// ── CSS enjeksiyonu (bir kez çalışır) ────────────────────────────────────────
;(function _injectStyles() {
  if (document.getElementById('wt-paywall-styles')) return;
  const tag = document.createElement('style');
  tag.id = 'wt-paywall-styles';
  tag.textContent = `
    /* ── Kilitli alan: blur + parlaklık düşüşü ─────────────────────────── */
    .paywall-blur {
      position: relative;
      /* içeriği bulanıklaştır */
      filter: blur(6px) brightness(0.45);
      -webkit-filter: blur(6px) brightness(0.45);
      /* kullanıcı seçimini ve pointer event'i engelle */
      user-select: none;
      pointer-events: none;
      transition: filter 0.5s ease, opacity 0.5s ease;
    }

    /* ── Overlay kapsayıcı ──────────────────────────────────────────────── */
    .paywall-overlay {
      position: absolute;
      inset: 0;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      background: radial-gradient(
        ellipse at 50% 50%,
        rgba(4, 6, 15, 0.82) 0%,
        rgba(4, 6, 15, 0.60) 100%
      );
      border-radius: inherit;
      pointer-events: all;
      backdrop-filter: none;
    }

    /* ── Kilit ikonu (CSS'te çizilir) ──────────────────────────────────── */
    .paywall-overlay__lock {
      width: 38px;
      height: 38px;
      border: 2px solid rgba(0, 230, 118, 0.5);
      border-radius: 8px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 18px rgba(0, 230, 118, 0.25);
    }
    .paywall-overlay__lock::before {
      content: '';
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 14px;
      border: 2px solid rgba(0, 230, 118, 0.5);
      border-bottom: none;
      border-radius: 10px 10px 0 0;
    }
    .paywall-overlay__lock::after {
      content: '';
      width: 6px;
      height: 8px;
      background: rgba(0, 230, 118, 0.7);
      border-radius: 2px;
    }

    /* ── Başlık ─────────────────────────────────────────────────────────── */
    .paywall-overlay__title {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.4);
      margin: 0;
    }

    /* ── Upgrade butonu ─────────────────────────────────────────────────── */
    .paywall-overlay__btn {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 11px 24px;
      background: transparent;
      border: 1.5px solid #00e676;
      border-radius: 4px;
      color: #00e676;
      font-size: 0.82rem;
      font-weight: 900;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      font-family: inherit;
      position: relative;
      overflow: hidden;
      transition: color 0.22s, box-shadow 0.22s, background 0.22s;
      box-shadow: 0 0 18px rgba(0, 230, 118, 0.2), inset 0 0 0 0 rgba(0,230,118,0);
    }
    .paywall-overlay__btn:hover {
      background: rgba(0, 230, 118, 0.08);
      box-shadow: 0 0 32px rgba(0, 230, 118, 0.45), inset 0 0 16px rgba(0, 230, 118, 0.06);
      color: #fff;
    }
    .paywall-overlay__btn:active {
      transform: scale(0.97);
    }
    .paywall-overlay__btn--loading {
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
    }
    .paywall-overlay__btn-arrow {
      font-size: 1rem;
      transition: transform 0.2s;
    }
    .paywall-overlay__btn:hover .paywall-overlay__btn-arrow {
      transform: translateX(4px);
    }

    /* ── Alt not ────────────────────────────────────────────────────────── */
    .paywall-overlay__note {
      font-size: 0.62rem;
      color: rgba(255, 255, 255, 0.22);
      margin: 0;
      letter-spacing: 0.04em;
    }
  `;
  document.head.appendChild(tag);
})();


// ── Checkout redirect ─────────────────────────────────────────────────────────

async function _redirectToCheckout(token, btnEl) {
  btnEl.disabled = true;
  btnEl.classList.add('paywall-overlay__btn--loading');
  btnEl.textContent = 'Yükleniyor…';

  try {
    const res = await fetch('/api/v1/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      console.error('[Paywall] JSON parse hatası — yanıt JSON değil:', jsonErr);
      throw new Error('Sunucu geçersiz yanıt döndürdü.');
    }

    if (!res.ok) {
      throw new Error(data.detail || `HTTP ${res.status}`);
    }

    if (!data.checkout_url) {
      throw new Error('checkout_url bulunamadı.');
    }

    window.location.href = data.checkout_url;
  } catch (e) {
    console.error('[Paywall] Checkout hatası:', e.message);
    btnEl.disabled = false;
    btnEl.classList.remove('paywall-overlay__btn--loading');
    btnEl.innerHTML = 'Hata — Tekrar Dene <span class="paywall-overlay__btn-arrow">→</span>';
  }
}


// ── Overlay oluştur ───────────────────────────────────────────────────────────

function _buildOverlay(token) {
  const overlay = document.createElement('div');
  overlay.className = 'paywall-overlay';
  overlay.setAttribute('aria-label', 'Pro özellik — yükseltme gerekli');

  const lock = document.createElement('div');
  lock.className = 'paywall-overlay__lock';
  lock.setAttribute('aria-hidden', 'true');

  const title = document.createElement('p');
  title.className = 'paywall-overlay__title';
  title.textContent = 'PRO Özellik';

  const btn = document.createElement('button');
  btn.className = 'paywall-overlay__btn';
  btn.setAttribute('type', 'button');
  btn.innerHTML = 'Upgrade to Pro — $39/mo <span class="paywall-overlay__btn-arrow" aria-hidden="true">→</span>';
  btn.addEventListener('click', () => _redirectToCheckout(token, btn));

  const note = document.createElement('p');
  note.className = 'paywall-overlay__note';
  note.textContent = 'İstediğin zaman iptal et • Güvenli ödeme';

  overlay.appendChild(lock);
  overlay.appendChild(title);
  overlay.appendChild(btn);
  overlay.appendChild(note);
  return overlay;
}


// ── Ana API ───────────────────────────────────────────────────────────────────

/**
 * Kullanıcı durumuna göre paywall'u başlatır.
 *
 * @param {{ subscription_status: string, token: string }} user
 */
function initPaywall(user) {
  if (!user) return;

  const isPro = user.subscription_status === 'pro';

  /** @type {NodeListOf<HTMLElement>} */
  const gates = document.querySelectorAll('[data-paywall-gate]');

  gates.forEach(el => {
    if (isPro) {
      // Pro kullanıcı: blur kaldır, overlay sil
      el.classList.remove('paywall-blur');
      el.querySelector('.paywall-overlay')?.remove();
      el.style.pointerEvents = '';
    } else {
      // Free kullanıcı: blur ekle, overlay yerleştir
      if (!el.classList.contains('paywall-blur')) {
        el.classList.add('paywall-blur');
      }
      // Overlay daha önce eklenmemişse ekle
      if (!el.querySelector('.paywall-overlay')) {
        // Position context için gerekli
        const current = getComputedStyle(el).position;
        if (current === 'static' || !current) el.style.position = 'relative';
        el.appendChild(_buildOverlay(user.token));
      }
    }
  });
}

/**
 * Abonelik durumu değiştiğinde (ör: webhook sonrası polling) UI'yi güncelle.
 * @param {{ subscription_status: string, token: string }} freshUser
 */
function refreshPaywallState(freshUser) {
  initPaywall(freshUser);
}

export { initPaywall, refreshPaywallState };
