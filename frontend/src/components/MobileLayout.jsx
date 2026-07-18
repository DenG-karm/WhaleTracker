import React, { useContext, useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Radio, Globe, BarChart3, Settings, LogOut,
  WifiOff, Brain, X, Menu
} from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import apiRequest from '../api/api';
import WhaleLogo from './common/WhaleLogo';
import AIChat from './AIChat';

const TAB_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, labelKey: 'nav.dashboard'     },
  { to: '/whale-feed',   icon: Radio,           labelKey: 'nav.whaleFeed'     },
  { to: '/news',         icon: Globe,           labelKey: 'nav.news'          },
  { to: '/makro-analiz', icon: BarChart3,       labelKey: 'nav.macroAnalysis' },
  { to: '/settings',     icon: Settings,        labelKey: 'nav.settings'      },
];

export default function MobileLayout() {
  const { user, logout } = useContext(AuthContext);
  const { t }            = useTranslation();
  const isOnline         = useNetworkStatus();
  const location         = useLocation();
  const [showAI, setShowAI]     = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  /* ── Trades (AppLayout ile aynı yapı, Outlet context icin) ── */
  const [trades, setTrades]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchTrades = useCallback(async () => {
    setIsLoading(true);
    const { ok, data } = await apiRequest('/trades', null, 'GET');
    if (ok && Array.isArray(data)) setTrades(data);
    setIsLoading(false);
  }, []);
  useEffect(() => { if (user?.token) fetchTrades(); }, [user?.token, fetchTrades]);
  useEffect(() => { setShowMenu(false); }, [location.pathname]);

  if (!user?.token) return <Navigate to="/login" replace />;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', background: '#10131a', color: '#e1e2eb',
      overflow: 'hidden', position: 'relative',
    }}>

      {/* ── Offline Banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 36, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              background: '#7c2d12', color: '#fed7aa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <WifiOff size={14} /> Çevrimdışısın — önbellek gösteriliyor
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Üst Header ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 52, flexShrink: 0,
        background: 'rgba(16,19,26,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <WhaleLogo size="sm" showText animated={false} />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* AI Chat butonu */}
          <button
            onClick={() => setShowAI(v => !v)}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: showAI ? 'rgba(0,219,231,0.15)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(0,219,231,0.2)',
              color: '#00dbe7', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}
            aria-label="AI Asistan"
          >
            <Brain size={17} />
          </button>
          {/* Overflow menu */}
          <button
            onClick={() => setShowMenu(v => !v)}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#849495', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}
            aria-label="Menü"
          >
            {showMenu ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* ── Overflow Dropdown Menu ─────────────────────────────── */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'absolute', top: 52, right: 12, zIndex: 200,
              background: '#1a1d26', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '8px 0', minWidth: 180,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e1e2eb' }}>
                {user?.email?.split('@')[0] || 'Kullanıcı'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#849495', marginTop: 2 }}>
                {user?.email}
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', background: 'transparent', border: 'none',
                color: '#f87171', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600,
              }}
            >
              <LogOut size={15} /> {t('nav.logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Chat Overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 300,
              background: '#10131a', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              <span style={{ fontWeight: 700, color: '#00dbe7', fontSize: '0.95rem' }}>
                AI Asistan
              </span>
              <button
                onClick={() => setShowAI(false)}
                style={{ background: 'none', border: 'none', color: '#849495', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <AIChat embedded />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sayfa İçeriği ──────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.22 } }}
            exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
            style={{ minHeight: '100%' }}
          >
            <Outlet context={{ trades, fetchTrades, isLoading }} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom Tab Bar ─────────────────────────────────────── */}
      <nav
        style={{
          display: 'flex', alignItems: 'stretch',
          background: 'rgba(16,19,26,0.98)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          flexShrink: 0, zIndex: 100,
        }}
        role="navigation"
        aria-label="Ana gezinti"
      >
        {TAB_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            style={{ flex: 1, textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '10px 4px',
                position: 'relative',
              }}>
                {/* Aktif göstergesi — alt nokta */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    style={{
                      position: 'absolute', bottom: 4, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#00dbe7',
                      boxShadow: '0 0 6px #00dbe7',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon
                  size={24}
                  color={isActive ? '#00dbe7' : '#4b5563'}
                  strokeWidth={isActive ? 2.2 : 1.7}
                />
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
