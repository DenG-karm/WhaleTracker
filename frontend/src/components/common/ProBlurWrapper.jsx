/**
 * ProBlurWrapper.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Herhangi bir widget'ı çevreler; kullanıcı Pro değilse içeriği bulanıklaştırır
 * ve "Unlock AI Insights" kilit katmanı gösterir.
 *
 * Kullanım:
 *   <ProBlurWrapper>
 *     <AiStressTestWidget />
 *   </ProBlurWrapper>
 */

import React from 'react';
import SubscriptionManager from '../../utils/SubscriptionManager';

export default function ProBlurWrapper({ children, label = 'Unlock AI Insights' }) {
  // BETA: tüm özellikler açık — blur yok
  const isPro = SubscriptionManager.canUseAI();

  if (isPro) return children;

  return (
    <div className="wt-pro-lock-wrap" style={{ position: 'relative', borderRadius: 'inherit' }}>
      {/* Blurlu içerik */}
      <div className="wt-lock-blur">
        {children}
      </div>

      {/* Kilit katmanı */}
      <div
        className="wt-pro-lock-overlay"
        onClick={() => SubscriptionManager.showUpgradeModal('ai_locked')}
        role="button"
        tabIndex={0}
        aria-label="Pro özelliğini kilidi aç"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') SubscriptionManager.showUpgradeModal('ai_locked'); }}
      >
        <div className="wt-lock-icon">🔒</div>
        <span className="wt-lock-label">{label}</span>
      </div>
    </div>
  );
}
