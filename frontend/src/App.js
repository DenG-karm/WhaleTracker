import React, { useContext } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { AppProviders, AuthContext } from './contexts/AuthContext';
import { AiChatProvider } from './contexts/AiChatContext';
import { WalletAnalysisProvider } from './contexts/WalletAnalysisContext';
import PostHogProvider from './contexts/PostHogProvider';
import ErrorBoundary  from './components/common/ErrorBoundary';
import AppLayout      from './components/AppLayout';
import MobileLayout   from './components/MobileLayout';
import AuthPage       from './pages/AuthPage';
import LandingPage    from './pages/LandingPage';
import WelcomePage    from './pages/WelcomePage';
import ProfileSurvey  from './pages/ProfileSurvey';
import AuthPortal     from './pages/AuthPortal';
import Dashboard      from './pages/Dashboard';
import TradeTerminal  from './pages/TradeTerminal';
import Notebook       from './pages/Notebook';
import SettingsPage   from './pages/SettingsPage';
import News           from './pages/News';
import MakroAnaliz    from './pages/MakroAnaliz';
import WhaleFeed      from './pages/WhaleFeed';
import BacktestLab    from './pages/BacktestLab';
import ZekaSimulasyon from './pages/ZekaSimulasyon';
import AiChatPage     from './pages/AiChatPage';
import { useIsMobile } from './hooks/useIsMobile';
import './index.css';

/* ── Route Korumaları ────────────────────────────────────────────────────── */
const AuthSpinner = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  // Auth kontrolü bitene kadar spinner göster — asla navigate etme
  if (isCheckingAuth) {
    console.log('[ProtectedRoute] Auth kontrol ediliyor, spinner...');
    return <AuthSpinner />;
  }
  // localStorage fallback: login() setUser()'dan önce localStorage'a yazar (sync),
  // bu sayede React state batch update'i beklenmeden doğrulanabilir.
  const token = user?.token ?? (() => {
    try { return JSON.parse(localStorage.getItem('user'))?.token; }
    catch { return null; }
  })();
  console.log('[ProtectedRoute] Token bulundu mu?', !!token, '| user state:', !!user?.token, '| LS fallback:', !user?.token && !!token);
  if (!token) {
    console.warn('[ProtectedRoute] Token YOK — /login\'e yönlendiriliyor');
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  if (isCheckingAuth) return <AuthSpinner />;
  const token = user?.token ?? (() => {
    try { return JSON.parse(localStorage.getItem('user'))?.token; }
    catch { return null; }
  })();
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
};

/* ── Sayfa Geçiş Animasyonu ─────────────────────────────────────────────── */
function AnimatedRoutes() {
  const location     = useLocation();
  const reducedMotion = useReducedMotion();
  const isMobile     = useIsMobile();

  const group =
    location.pathname === '/login' ? 'auth' : 'app';

  const variants = reducedMotion
    ? {}
    : {
        initial:  { opacity: 0 },
        animate:  { opacity: 1, transition: { duration: 0.28 } },
        exit:     { opacity: 0, transition: { duration: 0.16 } },
      };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={group} {...variants} style={{ minHeight: '100vh', width: '100%' }}>
        <Routes location={location}>

          {/* Kök → Balinalı Landing Page */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />

          {/* Welcome Page (alternatif) */}
          <Route
            path="/welcome"
            element={
              <PublicRoute>
                <WelcomePage />
              </PublicRoute>
            }
          />

          {/* Profil kurulum anketi */}
          <Route
            path="/profile-survey"
            element={<ProfileSurvey />}
          />

          {/* Auth Portal (/auth) — AuthPage'e yönlendir */}
          <Route
            path="/auth"
            element={<Navigate to="/login" replace />}
          />

          {/* Giriş / Kayıt / Şifre sıfırlama */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />

          {/* Korumalı uygulama alanı — desktop: AppLayout, mobil: MobileLayout */}
          <Route
            element={
              <ProtectedRoute>
                {isMobile ? <MobileLayout /> : <AppLayout />}
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard"    element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="/whale-feed"   element={<ErrorBoundary><WhaleFeed /></ErrorBoundary>} />
            <Route path="/makro-analiz" element={<ErrorBoundary><MakroAnaliz /></ErrorBoundary>} />
            <Route path="/settings"     element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
            <Route path="/news"         element={<ErrorBoundary><News /></ErrorBoundary>} />
            {/* Sadece desktop rotalar */}
            {!isMobile && <>
              <Route path="/entry"        element={<ErrorBoundary><TradeTerminal /></ErrorBoundary>} />
              <Route path="/notebook"     element={<ErrorBoundary><Notebook /></ErrorBoundary>} />
              <Route path="/backtest"     element={<ErrorBoundary><BacktestLab /></ErrorBoundary>} />
              <Route path="/backtest-lab" element={<ErrorBoundary><ZekaSimulasyon /></ErrorBoundary>} />
              <Route path="/ai-chat"      element={<ErrorBoundary><AiChatPage /></ErrorBoundary>} />
            </>}
            {/* Mobilde desktop-only rotalara gelirse dashboard'a yönlendir */}
            {isMobile && <>
              <Route path="/entry"        element={<Navigate to="/dashboard" replace />} />
              <Route path="/notebook"     element={<Navigate to="/dashboard" replace />} />
              <Route path="/backtest"     element={<Navigate to="/dashboard" replace />} />
              <Route path="/backtest-lab" element={<Navigate to="/dashboard" replace />} />
            </>}
          </Route>

          {/* Bilinmeyen rotalar */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Kök ─────────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || 'placeholder'}>
    <ErrorBoundary>
      <Router>
        <PostHogProvider>
          <AppProviders>
            <AiChatProvider>
              <WalletAnalysisProvider>
                <AnimatedRoutes />
              </WalletAnalysisProvider>
            </AiChatProvider>
          </AppProviders>
        </PostHogProvider>
      </Router>
    </ErrorBoundary>
    </GoogleOAuthProvider>
  );
}