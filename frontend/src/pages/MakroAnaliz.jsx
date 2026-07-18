import React, { useState, useContext } from 'react';
import { Search, Brain, Activity, ShieldAlert, Trash2 } from 'lucide-react';
import { AuthContext, ToastContext } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useIsMobile';
import { useWalletAnalysis } from '../contexts/WalletAnalysisContext';

const panelStyle = {
  background: 'rgba(29,32,38,0.6)', backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12
};

export const MakroAnaliz = () => {
  const isMobile = useIsMobile();
  const { user } = useContext(AuthContext);
  const showToast = useContext(ToastContext);
  const { t, i18n } = useTranslation();

  const { activeTask, prediction, predicting, startAnalysis, savedWallets, deleteWallet } = useWalletAnalysis();

  const [address, setAddress]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [inputError, setInputError]   = useState('');

  const profile = activeTask?.result?.data || null;
  const status  = activeTask ? activeTask.status : 'idle';

  const ETH_RE = /^0x[0-9a-fA-F]{40}$/;

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!ETH_RE.test(trimmed)) { setInputError(t('macro.invalidEthAddress')); return; }
    // Dili tıklama anında yakala — resolvedLanguage önce (i18next'in kesinleşmiş değeri)
    const rawLang = i18n.resolvedLanguage || i18n.language || localStorage.getItem('wt_language') || 'tr';
    const lang = rawLang.toLowerCase().startsWith('en') ? 'EN' : 'TR';
    setSubmitting(true);
    try {
      const res = await apiClient(`/analytics/wallet/${trimmed}?lang=${lang}`, { method: 'POST' });
      startAnalysis(res.task_id, trimmed, lang);
    } catch (err) {
      setInputError(err.message || t('macro.startFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting || status === 'pending' || status === 'processing';

  if (isMobile) return (
    <div style={{ padding: '14px 12px', color: '#e1e2eb', paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Brain size={18} color="#22d3ee" />
        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>{t('nav.macroAnalysis')}</span>
      </div>

      {/* Arama formu */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} color="#546268" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={t('macro.placeholder')}
            value={address}
            onChange={e => { setAddress(e.target.value); setInputError(''); }}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 12, padding: '12px 14px 12px 38px',
              color: '#e1e2eb', fontSize: '0.85rem', outline: 'none',
            }}
          />
        </div>        {inputError && (
          <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#ffb4ab', paddingLeft: 4 }}>{inputError}</p>
        )}        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%', padding: '12px', borderRadius: 12,
            background: isLoading ? 'rgba(0,219,231,0.2)' : 'linear-gradient(135deg, #00dbe7, #0098a5)',
            border: 'none', color: isLoading ? '#00dbe7' : '#001f23',
            fontWeight: 800, fontSize: '0.88rem', cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? `⏳ ${t('macro.analyzing')}` : `🔍 ${t('macro.searchBtn')}`}
        </button>
      </form>

      {/* Yükleniyor */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(0,219,231,0.2)', borderTop: '3px solid #00dbe7', borderRadius: '50%', animation: 'mmSpin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#546268' }}>{t('macro.analyzing')}</p>
        </div>
      )}

      {/* Profil sonuçları */}
      {profile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Özet kart */}
          <div style={{ background: 'rgba(0,219,231,0.06)', border: '1px solid rgba(0,219,231,0.15)', borderRadius: 12, padding: '14px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{t('macro.walletProfile')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: t('macro.totalTx'),      value: profile.total_txs?.toLocaleString() || '-' },
                { label: t('macro.activeDays'),    value: profile.active_days || '-' },
                { label: t('macro.totalVolume'),   value: profile.total_volume_usd ? `$${(profile.total_volume_usd / 1e6).toFixed(1)}M` : '-' },
                { label: t('macro.riskScore'),     value: profile.risk_score != null ? `${profile.risk_score}/100` : '-' },
              ].map((m, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.6rem', color: '#546268', fontWeight: 700, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: 'white' }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Tahmin */}
          {(prediction || predicting) && (
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Brain size={14} color="#22d3ee" />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#22d3ee' }}>{t('macro.aiPredictionTitle')}</span>
              </div>
              {predicting ? (
                <div style={{ height: 60, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'mmSkeleton 1.5s infinite', borderRadius: 8 }} />
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{prediction}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Boş durum */}
      {status === 'idle' && !profile && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#546268' }}>
          <ShieldAlert size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
          <p style={{ margin: 0, fontSize: '0.82rem' }}>{t('macro.emptyDesc')}</p>
        </div>
      )}

      <style>{`
        @keyframes mmSpin { to { transform: rotate(360deg); } }
        @keyframes mmSkeleton {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: '#e1e2eb' }}>

      {/* Header + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{t('nav.macroAnalysis')}</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#849495' }}>{t('macro.description')}</p>
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} color="#849495" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="text" placeholder={t('macro.placeholder')} value={address}
              onChange={e => { setAddress(e.target.value); setInputError(''); }}
              style={{ background: 'rgba(11,14,20,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '8px 12px 8px 30px', color: '#e1e2eb', fontSize: '0.8rem', outline: 'none', width: 300 }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,219,231,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </div>
          <button type="submit" disabled={isLoading} style={{ padding: '8px 20px', background: isLoading ? 'rgba(0,219,231,0.3)' : '#00dbe7', border: 'none', borderRadius: 4, color: '#00363a', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
            {isLoading ? t('macro.analyzing') : t('macro.searchBtn')}
          </button>
          {inputError && (
            <span style={{ width: '100%', fontSize: '0.72rem', color: '#ffb4ab', marginTop: -4 }}>{inputError}</span>
          )}
        </form>
      </div>

      {/* Kayıtlı Cüzdan Defteri */}
      {savedWallets.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#849495', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            {t('macro.savedWallets')}:
          </span>
          {savedWallets.map(w => (
            <div key={w.wallet_address} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,219,231,0.07)', border: '1px solid rgba(0,219,231,0.18)', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,219,231,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,219,231,0.07)'}
            >
              <span
                style={{ fontSize: '0.72rem', color: '#e1e2eb', fontWeight: 600 }}
                onClick={() => setAddress(w.wallet_address)}
              >
                {w.wallet_name || 'Wallet'} <span style={{ color: '#849495', fontWeight: 400 }}>...{w.wallet_address.slice(-4)}</span>
              </span>
              <button
                onClick={e => { e.stopPropagation(); deleteWallet(w.wallet_address); }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0, opacity: 0.5 }}
                title={t('macro.deleteWallet')}
              >
                <Trash2 size={11} color="#ffb4ab" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ ...panelStyle, padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(0,219,231,0.2)', borderTopColor: '#00dbe7', animation: 'makroSpin 1s linear infinite' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{t('macro.loadingTitle')}</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#849495' }}>{t('macro.loadingDesc')}</p>
        </div>
      )}

      {/* Failed */}
      {status === 'failed' && (
        <div style={{ ...panelStyle, padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', borderLeft: '3px solid rgba(255,180,171,0.5)' }}>
          <ShieldAlert size={36} color="#ffb4ab" style={{ opacity: 0.7 }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#ffb4ab' }}>{t('macro.failedTitle')}</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#849495', maxWidth: 400 }}>{t('macro.failedDesc')}</p>
        </div>
      )}

      {/* Idle */}
      {status === 'idle' && (
        <div style={{ ...panelStyle, padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <Brain size={44} color="rgba(0,219,231,0.35)" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{t('macro.engineTitle')}</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#849495', maxWidth: 420 }}>{t('macro.engineDesc')}</p>
        </div>
      )}

      {/* Results */}
      {status === 'completed' && profile && (
        <>
          {/* Bento Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>

            {/* Total Volume Card */}
            <div style={{ ...panelStyle, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,219,231,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#849495', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('macro.totalVolume30d')}</span>
                  <Activity size={15} color="#849495" />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#00f2ff', letterSpacing: '-0.02em', marginBottom: 8 }}>
                  ${(profile.total_volume_usd / 1e6).toFixed(2)}M
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, background: 'rgba(78,222,163,0.1)', border: '1px solid rgba(78,222,163,0.2)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4edea3' }} />
                  <span style={{ fontSize: '0.65rem', color: '#4edea3', fontWeight: 600 }}>{t('macro.analyzed')}</span>
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14, marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#849495' }}>{t('macro.activeTokens')}: <span style={{ color: '#e1e2eb', fontWeight: 600 }}>{profile.top_tokens?.length || 0}</span></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShieldAlert size={13} color={profile.risk_score > 70 ? '#ffb4ab' : profile.risk_score > 40 ? '#ffd8a8' : '#4edea3'} />
                  <span style={{ fontSize: '0.75rem', color: profile.risk_score > 70 ? '#ffb4ab' : profile.risk_score > 40 ? '#ffd8a8' : '#4edea3', fontWeight: 600 }}>
                    {t('macro.riskDisplay', { score: profile.risk_score })}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Protocol Insights */}
            <div style={{ ...panelStyle, padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#849495', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('macro.aiProtocolInsights')}</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: 'rgba(0,219,231,0.08)', border: '1px solid rgba(0,219,231,0.15)', fontSize: '0.58rem', color: '#00dbe7', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  ◉ {t('macro.scanning')}
                </div>
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'center' }}>
                <div style={{ borderLeft: '2px solid rgba(0,219,231,0.5)', paddingLeft: 14 }}>
                  <div style={{ fontSize: '0.6rem', color: '#849495', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{t('macro.walletProfile')}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e1e2eb' }}>{profile.label}</div>
                  <div style={{ fontSize: '0.78rem', color: '#4edea3' }}>{profile.tx_count_30d} {t('macro.txns30d')}</div>
                </div>
                <div style={{ borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: 14 }}>
                  <div style={{ fontSize: '0.6rem', color: '#849495', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{t('macro.riskLevel')}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: profile.risk_score > 70 ? '#ffb4ab' : profile.risk_score > 40 ? '#ffd8a8' : '#4edea3' }}>
                    {profile.risk_score > 70 ? t('macro.high') : profile.risk_score > 40 ? t('macro.medium') : t('macro.low')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#849495' }}>{profile.risk_score > 70 ? t('macro.actionSuggested') : t('macro.monitor')}</div>
                </div>
                <div style={{ borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: 14 }}>
                  <div style={{ fontSize: '0.6rem', color: '#849495', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{t('macro.firstSeenLabel')}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e1e2eb' }}>{profile.first_seen}</div>
                  <div style={{ fontSize: '0.78rem', color: '#849495' }}>{t('macro.onChainDebut')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Asset Registry Table */}
          <div style={{ ...panelStyle, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(11,14,20,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#e1e2eb' }}>{t('macro.assetRegistry')}</h3>
              <div style={{ position: 'relative' }}>
                <Search size={11} color="#849495" style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="text" placeholder={t('macro.findAsset')} value={assetSearch} onChange={e => setAssetSearch(e.target.value)}
                  style={{ background: 'rgba(39,42,49,1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '4px 10px 4px 22px', color: '#e1e2eb', fontSize: '0.72rem', outline: 'none' }} />
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(11,14,20,0.3)' }}>
                    {[t('macro.colAsset'), t('macro.colTxCount'), t('macro.colVolume'), t('macro.colStatus'), t('macro.colActions')].map((h, i) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: i === 4 ? 'center' : i > 0 ? 'right' : 'left', fontSize: '0.58rem', fontWeight: 700, color: '#849495', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(profile.top_tokens || []).filter(tok => tok.toLowerCase().includes(assetSearch.toLowerCase())).map((tok, idx) => (
                    <tr key={tok} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(39,42,49,1)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#00dbe7' }}>
                            {tok[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{tok}</div>
                            <div style={{ fontSize: '0.62rem', color: '#849495' }}>{t('macro.tokenLabel')}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.8rem', color: '#849495' }}>—</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.8rem', color: '#849495' }}>—</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: idx === 0 ? '#4edea3' : idx === 1 ? '#ffb4ab' : '#849495' }}>
                          {idx === 0 ? t('macro.topPerformer') : idx === 1 ? t('macro.highVolatility') : t('macro.holdSignal')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button style={{ padding: '4px 12px', borderRadius: 4, background: '#00dbe7', border: 'none', color: '#00363a', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}
                          onClick={() => showToast(t('macro.analyzingToken', { tok }), 'info')}>
                          {t('macro.analyzeTokenBtn')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Prediction Panel */}
          {(predicting || prediction) && (
            <div style={{ ...panelStyle, padding: 24, borderLeft: '3px solid rgba(0,219,231,0.5)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'rgba(0,219,231,0.05)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Brain size={16} color="#00dbe7" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('macro.aiBehavioralAnalysis')}</span>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#00dbe7', letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 4 }}>{t('macro.aiEngineLabel')}</span>
              </div>
              {predicting ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[100, 90, 95, 70, 85].map((w, i) => (
                    <div key={i} style={{ height: 12, borderRadius: 4, width: `${w}%`, background: 'rgba(39,42,49,1)', animation: 'makroSkeleton 1.5s infinite' }} />
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.875rem', color: '#b9cacb', lineHeight: 1.75 }}>
                  {prediction.split('\n').map((para, i) => para.trim() && (
                    <p key={i} style={{ marginBottom: 8, marginTop: 0 }}>{para}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes makroSpin { 100% { transform: rotate(360deg); } }
        @keyframes makroSkeleton { 0%,100% { opacity: 0.4; } 50% { opacity: 0.7; } }
      `}</style>
    </div>
  );
};

export default MakroAnaliz;