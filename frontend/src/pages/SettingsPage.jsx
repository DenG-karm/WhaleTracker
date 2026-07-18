import React, { useState, useContext } from 'react';
import { User, Upload } from 'lucide-react';
import { AuthContext, ToastContext } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useIsMobile';

const inputStyle = {
  width: '100%', background: 'rgba(11,14,20,0.8)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
  padding: '8px 12px', color: '#e1e2eb', fontSize: '0.85rem',
  outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box'
};
const labelStyle = {
  fontSize: '0.65rem', fontWeight: 600, color: '#849495',
  letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 4
};
const cardStyle = {
  background: 'rgba(29,32,38,0.6)', backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12,
  padding: '24px', display: 'flex', flexDirection: 'column', gap: 20
};

function ApiKeyRow({ name, suffix, perms, lastActive, onDelete }) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <td style={{ padding: '14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#00dbe7', fontSize: '0.8rem' }}>🔑</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#e1e2eb' }}>{name}</span>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#849495', fontFamily: 'monospace', marginTop: 2 }}>{suffix}</div>
      </td>
      <td style={{ padding: '14px 8px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {perms.map(p => (
            <span key={p} style={{ padding: '2px 6px', borderRadius: 3, fontSize: '0.6rem',
              background: p === 'Write' ? 'rgba(255,180,171,0.1)' : 'rgba(39,42,49,1)',
              border: p === 'Write' ? '1px solid rgba(255,180,171,0.2)' : '1px solid rgba(255,255,255,0.08)',
              color: p === 'Write' ? '#ffb4ab' : '#e1e2eb' }}>{p}</span>
          ))}
        </div>
      </td>
      <td style={{ padding: '14px 8px', fontSize: '0.8rem', color: '#849495' }}>{lastActive}</td>
      <td style={{ padding: '14px 8px', textAlign: 'right' }}>
        <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: '#849495', cursor: 'pointer', padding: 4, fontSize: '0.85rem', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ffb4ab'}
          onMouseLeave={e => e.currentTarget.style.color = '#849495'}>🗑</button>
      </td>
    </tr>
  );
}

const SettingsPage = () => {
  const { user, updateUser } = useContext(AuthContext);
  const showToast = useContext(ToastContext);
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'tr').slice(0, 2);
  const isMobile = useIsMobile();

  const [form, setForm] = useState({
    fullName: user?.user_name || '',
    strategy: user?.settings?.strategy || '',
    target: user?.settings?.target || 10000,
    dailyLoss: user?.settings?.dailyLoss || 500,
    avatar: null
  });
  const [pass, setPass] = useState({ old: '', new: '', confirm: '' });
  const [mfa, setMfa] = useState(true);
  const [alerts, setAlerts] = useState({ whaleApp: true, whalePush: true, flashApp: true, flashSms: true, dailyEmail: false });
  const [termPrefs, setTermPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wt_term_prefs') || '{}'); } catch { return {}; }
  });
  const tpDef = { cryptoProvider: 'Binance', forexProvider: 'OANDA', audioEnabled: true, volume: 70, startupAsset: 'BTC/USDT' };
  const tp    = { ...tpDef, ...termPrefs };
  const setTp = (upd) => setTermPrefs(prev => ({ ...prev, ...upd }));
  const saveTermPrefs = () => {
    localStorage.setItem('wt_term_prefs', JSON.stringify({ ...tpDef, ...termPrefs }));
    showToast('Terminal preferences saved', 'success');
  };

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm(f => ({ ...f, avatar: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    if (!form.fullName.trim()) return showToast(t('settings.nameRequired'), 'error');
    try {
      await apiClient('/update-profile', {
        method: 'POST',
        body: { user_id: user.user_id, full_name: form.fullName, strategy_description: form.strategy, target_amount: parseFloat(form.target), daily_loss_limit: parseFloat(form.dailyLoss), avatar_url: form.avatar }
      });
      showToast(t('settings.profileSaved'), 'success');
      updateUser({ ...user, user_name: form.fullName, avatar: form.avatar || user?.avatar, settings: { strategy: form.strategy, target: form.target, dailyLoss: form.dailyLoss } });
    } catch (err) {
      showToast(err.message || t('settings.profileError'), 'error');
    }
  };

  const changePass = async () => {
    if (!pass.old || !pass.new) return showToast(t('settings.allFieldsRequired'), 'error');
    if (pass.new !== pass.confirm) return showToast(t('settings.passwordMismatch'), 'error');
    if (pass.new.length < 6) return showToast(t('settings.passwordTooShort'), 'error');
    try {
      const data = await apiClient('/change-password', { method: 'POST', body: { old_password: pass.old, new_password: pass.new } });
      if (data.status === 'error') throw new Error(data.msg);
      showToast(data.msg || t('settings.passwordUpdated'), 'success');
      setPass({ old: '', new: '', confirm: '' });
    } catch (err) {
      showToast(err.message || t('settings.passwordChangeFailed'), 'error');
    }
  };

  const focusIn  = e => e.target.style.borderColor = 'rgba(0,219,231,0.5)';
  const focusOut = e => e.target.style.borderColor = 'rgba(255,255,255,0.1)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: '#e1e2eb', overflowX: 'hidden', maxWidth: '100%' }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#e1e2eb', letterSpacing: '-0.02em' }}>{t('settings.pageTitle')}</h1>
        <p style={{ margin: '4px 0 0', color: '#849495', fontSize: '0.875rem' }}>{t('settings.pageSubtitle')}</p>
      </div>

      {/* Main Grid — mobilde tek kolon, desktop'ta iki kolon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
        gap: 20,
        alignItems: 'start',
        overflowX: 'hidden',
      }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Identity Profile */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#e1e2eb' }}>{t('settings.identityProfile')}</h3>
              <User size={16} color="#849495" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(0,219,231,0.2)', overflow: 'hidden', background: 'rgba(39,42,49,1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(form.avatar || user?.avatar)
                    ? <img src={form.avatar || user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
                    : <User size={24} color="#849495" />}
                </div>
                <label style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: 'rgba(29,32,38,1)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Upload size={9} color="#849495" />
                  <input type="file" hidden accept="image/*" onChange={handleAvatar} />
                </label>
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#849495', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{t('settings.status')}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, background: 'rgba(78,222,163,0.1)', border: '1px solid rgba(78,222,163,0.2)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4edea3' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4edea3' }}>{t('settings.proTierActive')}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>{t('settings.handle')}</label>
                <input style={inputStyle} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={labelStyle}>{t('settings.communicationRelay')}</label>
                <input style={{ ...inputStyle, opacity: 0.55 }} value={user?.email || ''} readOnly />
              </div>
            </div>
            <button onClick={saveProfile} style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid rgba(0,219,231,0.3)', background: 'transparent', color: '#00dbe7', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,219,231,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {t('settings.updateIdentity')}
            </button>
          </div>

          {/* Security Protocols */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#e1e2eb' }}>{t('settings.securityProtocols')}</h3>
              <span style={{ color: '#849495' }}>🛡️</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>{t('settings.currentAccessKey')}</label>
                <input style={inputStyle} type="password" value={pass.old} placeholder="••••••••••••" onChange={e => setPass(p => ({ ...p, old: e.target.value }))} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={labelStyle}>{t('settings.newAccessKey')}</label>
                <input style={inputStyle} type="password" value={pass.new} placeholder={t('settings.newKeyPlaceholder')} onChange={e => setPass(p => ({ ...p, new: e.target.value }))} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={labelStyle}>{t('settings.confirmKey')}</label>
                <input style={inputStyle} type="password" value={pass.confirm} placeholder={t('settings.confirmKeyPlaceholder')} onChange={e => setPass(p => ({ ...p, confirm: e.target.value }))} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <button onClick={changePass} style={{ width: '100%', padding: '8px', borderRadius: 4, background: 'rgba(39,42,49,1)', border: '1px solid rgba(255,255,255,0.1)', color: '#e1e2eb', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(39,42,49,1)'}>
                {t('settings.rotateKey')}
              </button>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#e1e2eb' }}>{t('settings.mfaTitle')}</div>
                <div style={{ fontSize: '0.68rem', color: '#849495' }}>{t('settings.mfaSubtitle')}</div>
              </div>
              <div style={{ position: 'relative', width: 40, height: 22, cursor: 'pointer' }} onClick={() => setMfa(v => !v)}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: mfa ? 'rgba(0,219,231,0.2)' : 'rgba(39,42,49,1)', border: mfa ? '1px solid #00dbe7' : '1px solid rgba(255,255,255,0.1)', transition: '0.2s' }} />
                <div style={{ position: 'absolute', top: 3, left: mfa ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: mfa ? '#00dbe7' : '#849495', transition: 'left 0.2s' }} />
              </div>
            </div>
          </div>

          {/* Language */}
          <div style={cardStyle}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#e1e2eb', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 14 }}>{t('settings.interfaceLanguage')}</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              {['tr', 'en'].map(code => (
                <button key={code} onClick={() => i18n.changeLanguage(code)} style={{ flex: 1, padding: '10px', borderRadius: 4, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', border: lang === code ? '1px solid rgba(0,219,231,0.5)' : '1px solid rgba(255,255,255,0.1)', background: lang === code ? 'rgba(0,219,231,0.08)' : 'transparent', color: lang === code ? '#00dbe7' : '#849495', transition: '0.2s' }}>
                  {code === 'tr' ? '🇹🇷 Türkçe' : '🇬🇧 English'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* API Management — beta: gizli */}
          {false && <div style={{ ...cardStyle, gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#e1e2eb' }}>{t('settings.apiManagement')}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#849495' }}>{t('settings.apiManagementDesc')}</p>
              </div>
              <button style={{ padding: '7px 14px', borderRadius: 4, background: '#00dbe7', border: 'none', color: '#00363a', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0, boxShadow: '0 0 15px rgba(0,219,231,0.2)' }}
                onClick={() => showToast(t('settings.apiKeyGenerated'), 'success')}>
                {t('settings.generateToken')}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {[t('settings.colIdentifier'), t('settings.colPermissions'), t('settings.colLastActive'), t('settings.colActions')].map((h, i) => (
                      <th key={h} style={{ padding: '0 8px 10px', textAlign: i === 3 ? 'right' : 'left', fontSize: '0.58rem', fontWeight: 700, color: '#849495', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <ApiKeyRow name="Trading_Algo_V4" suffix="wt_live_8f92...a1b2" perms={['Read','Write']} lastActive={t('settings.minsAgo', { n: 2 })} onDelete={() => showToast(t('settings.tokenRevoked'), 'success')} />
                  <ApiKeyRow name="Data_Scraper_Readonly" suffix="wt_live_44d1...99x0" perms={['Read']} lastActive={t('settings.hoursAgo', { n: 14 })} onDelete={() => showToast(t('settings.tokenRevoked'), 'success')} />
                </tbody>
              </table>
            </div>
          </div>}

          {/* Alert Parameters */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#e1e2eb' }}>{t('settings.alertParameters')}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#849495' }}>{t('settings.alertParametersDesc')}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              {[
                { labelKey: 'settings.alertWhale',    channels: ['App', 'Push'], keys: ['whaleApp', 'whalePush'] },
                { labelKey: 'settings.alertFlash',    channels: ['App', 'SMS'],  keys: ['flashApp', 'flashSms'] },
                { labelKey: 'settings.alertSecurity', channels: ['Email'],       keys: ['secEmail'], disabled: true },
                { labelKey: 'settings.alertDaily',    channels: ['Email'],       keys: ['dailyEmail'] }
              ].map(item => (
                <div key={item.labelKey} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#e1e2eb' }}>{t(item.labelKey)}</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {item.channels.map((ch, i) => (
                        <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: item.disabled ? 'default' : 'pointer' }}>
                          <input type="checkbox" checked={item.disabled ? true : (alerts[item.keys[i]] || false)} disabled={!!item.disabled}
                            onChange={e => !item.disabled && setAlerts(a => ({ ...a, [item.keys[i]]: e.target.checked }))}
                            style={{ accentColor: '#00dbe7', cursor: item.disabled ? 'default' : 'pointer', opacity: item.disabled ? 0.5 : 1 }} />
                          <span style={{ fontSize: '0.65rem', color: '#849495', opacity: item.disabled ? 0.5 : 1 }}>{ch}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Trading Parameters */}
          <div style={cardStyle}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#e1e2eb', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 14 }}>{t('settings.tradingParameters')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>{t('settings.targetBalanceUsd')}</label>
                <input style={inputStyle} type="number" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={labelStyle}>{t('settings.dailyLossLimitUsd')}</label>
                <input style={inputStyle} type="number" value={form.dailyLoss} onChange={e => setForm(f => ({ ...f, dailyLoss: e.target.value }))} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={labelStyle}>{t('settings.strategyDescription')}</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }} rows={3} value={form.strategy}
                  onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))} placeholder={t('settings.strategyPlaceholder')} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
            <button onClick={saveProfile} style={{ padding: '10px 24px', borderRadius: 4, background: '#00dbe7', border: 'none', color: '#00363a', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', alignSelf: 'flex-start', boxShadow: '0 0 15px rgba(0,219,231,0.2)' }}>
              {t('settings.saveParameters')}
            </button>
          </div>

          {/* ── Terminal Preferences ──────────────────────────────────────── */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#e1e2eb' }}>{t('settings.terminalPreferences')}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#849495' }}>{t('settings.terminalPreferencesDesc')}</p>
              </div>
              <span style={{ color: '#849495' }}>🖥️</span>
            </div>

            {/* ── Default Data Provider ── */}
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#00dbe7', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{t('settings.defaultDataProvider')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>{t('settings.cryptoExchange')}</label>
                  <select value={tp.cryptoProvider} onChange={e => setTp({ cryptoProvider: e.target.value })} onFocus={focusIn} onBlur={focusOut}
                    style={{ ...inputStyle, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none',
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23849495' d='M5 6L0 0h10z'/%3E%3C/svg%3E\")",
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 28 }}>
                    <option value="Binance" style={{ background: '#0b0e14', color: '#e1e2eb' }}>Binance</option>
                    <option value="Bybit"   style={{ background: '#0b0e14', color: '#e1e2eb' }}>Bybit</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t('settings.forexBroker')}</label>
                  <select value={tp.forexProvider} onChange={e => setTp({ forexProvider: e.target.value })} onFocus={focusIn} onBlur={focusOut}
                    style={{ ...inputStyle, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none',
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23849495' d='M5 6L0 0h10z'/%3E%3C/svg%3E\")",
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 28 }}>
                    <option value="OANDA" style={{ background: '#0b0e14', color: '#e1e2eb' }}>OANDA</option>
                    <option value="FXCM"  style={{ background: '#0b0e14', color: '#e1e2eb' }}>FXCM</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

            {/* ── Audio Alerts ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#e1e2eb' }}>{t('settings.audioAlerts')}</div>
                  <div style={{ fontSize: '0.68rem', color: '#849495' }}>{t('settings.audioAlertsDesc')}</div>
                </div>
                <div style={{ position: 'relative', width: 40, height: 22, cursor: 'pointer' }} onClick={() => setTp({ audioEnabled: !tp.audioEnabled })}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: tp.audioEnabled ? 'rgba(0,219,231,0.2)' : 'rgba(39,42,49,1)', border: tp.audioEnabled ? '1px solid #00dbe7' : '1px solid rgba(255,255,255,0.1)', transition: '0.2s' }} />
                  <div style={{ position: 'absolute', top: 3, left: tp.audioEnabled ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: tp.audioEnabled ? '#00dbe7' : '#849495', transition: 'left 0.2s' }} />
                </div>
              </div>
              <div style={{ opacity: tp.audioEnabled ? 1 : 0.35, transition: 'opacity 0.2s', pointerEvents: tp.audioEnabled ? 'auto' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={labelStyle}>{t('settings.volume')}</label>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#00dbe7', fontFamily: 'monospace' }}>{tp.volume}%</span>
                </div>
                <input type="range" min={0} max={100} value={tp.volume} onChange={e => setTp({ volume: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#00dbe7', cursor: 'pointer' }} />
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

            {/* ── Startup Asset ── */}
            <div>
              <label style={labelStyle}>{t('settings.startupAsset')}</label>
              <input style={inputStyle} value={tp.startupAsset} placeholder="e.g. BTC/USDT"
                onChange={e => setTp({ startupAsset: e.target.value.toUpperCase() })} onFocus={focusIn} onBlur={focusOut} />
              <div style={{ fontSize: '0.62rem', color: '#849495', marginTop: 4 }}>{t('settings.startupAssetDesc')}</div>
            </div>

            <button onClick={saveTermPrefs} style={{ padding: '10px 24px', borderRadius: 4, background: '#00dbe7', border: 'none', color: '#00363a', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', alignSelf: 'flex-start', boxShadow: '0 0 15px rgba(0,219,231,0.2)' }}>
              {t('settings.savePreferences')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;