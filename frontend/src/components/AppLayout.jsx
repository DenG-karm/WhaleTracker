import React, { useState, useEffect, useContext } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, PenTool, Book, Globe, Settings, LogOut,
  Brain, Radio, ChevronLeft, ChevronRight, Menu, X,
  Eye, EyeOff, FlaskConical, Wallet, Zap, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AuthContext } from "../contexts/AuthContext";
import { useZen } from "../contexts/ZenContext";
import { useTilt } from "../contexts/TiltContext";
import { useTranslation } from "react-i18next";
import apiRequest from "../api/api";
import { apiClient } from "../api/client";
import OnboardingWizard from "./OnboardingWizard";
import WhaleLogo from "./common/WhaleLogo";

const NAV_MAIN = [
  { to: "/entry",        icon: LayoutDashboard, labelKey: "nav.terminal"      },
  { to: "/dashboard",    icon: Brain,            labelKey: "nav.dashboard"     },
  { to: "/whale-feed",   icon: Radio,            labelKey: "nav.whaleFeed"     },
  { to: "/notebook",     icon: Book,             labelKey: "nav.journal"       },
  { to: "/news",         icon: Globe,            labelKey: "nav.news"          },
  { to: "/makro-analiz", icon: Wallet,           labelKey: "nav.macroAnalysis" },
  { to: "/backtest",     icon: FlaskConical,   labelKey: "nav.backtestLab"   },
  { to: "/ai-chat",      icon: MessageSquare,  labelKey: "nav.aiAssistant"   },
  { to: "/settings",     icon: Settings,       labelKey: "nav.settings"      },
];

export default function AppLayout() {
  const { user, logout, updateUser }        = useContext(AuthContext);
  const { t }                              = useTranslation();
  const { isZenMode, toggleZenMode }       = useZen();
  const { checkTrades }                    = useTilt();
  const shouldReduceMotion                 = useReducedMotion();
  const [trades, setTrades]                = useState([]);
  const [isLoading, setIsLoading]          = useState(true);
  const [isCollapsed, setIsCollapsed]      = useState(() => localStorage.getItem('wt_sidebar_collapsed') === 'true');
  const [isMobileOpen, setIsMobileOpen]    = useState(false);
  const [isMobile, setIsMobile]            = useState(window.innerWidth < 768);
  const [showOnboarding, setShowOnboarding]= useState(false);
  const [isUpgrading, setIsUpgrading]      = useState(false);
  const location                           = useLocation();

  useEffect(() => {
    const h = () => { const m = window.innerWidth < 768; setIsMobile(m); if (!m) setIsMobileOpen(false); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const toggleSidebar = () => setIsCollapsed(c => {
    const next = !c;
    localStorage.setItem('wt_sidebar_collapsed', String(next));
    return next;
  });

  const fetchTrades = async () => {
    setIsLoading(true);
    const { ok, data } = await apiRequest("/trades", null, "GET");
    if (ok) { setTrades(data); checkTrades(data); }
    setTimeout(() => setIsLoading(false), 300);
  };

  useEffect(() => {
    fetchTrades();
    // Abonelik durumunu her oturum açışında senkronize et
    apiClient("/users/me")
      .then(me => { if (me && me.subscription_status) updateUser({ subscription_status: me.subscription_status }); })
      .catch(() => {});
    apiClient("/users/onboarding-status")
      .then(r => { if (!r.has_profile) setShowOnboarding(true); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async () => {
    if (isUpgrading) return;
    setIsUpgrading(true);
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${API_URL}/api/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error('[AppLayout] JSON parse hatası:', jsonErr);
        setIsUpgrading(false);
        return;
      }

      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        console.error('[AppLayout] Checkout hatası — detail:', data.detail);
        setIsUpgrading(false);
      }
    } catch (e) {
      console.error('[AppLayout] Checkout fetch hatası:', e.message);
      setIsUpgrading(false);
    }
  };

  const closeMobile = () => setIsMobileOpen(false);

  const SidebarContent = ({ mobile }) => (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header */}
      <div style={{ padding:"0 20px", marginBottom:28, display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:8, background:"rgba(39,42,49,1)", border:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <WhaleLogo size="sm" showText={false} />
          </div>
          {(!isCollapsed || mobile) && (
            <div>
              <div style={{ fontWeight:700, fontSize:"0.75rem", color:"#00dbe7", letterSpacing:"0.08em", textTransform:"uppercase" }}>{t('nav.commandCenter')}</div>
              <div style={{ fontSize:"0.62rem", color:"#849495", letterSpacing:"0.1em", textTransform:"uppercase" }}>{t('nav.institutionalTier')}</div>
            </div>
          )}
        </div>
        {mobile ? (
          <button onClick={closeMobile} style={{ background:"none", border:"none", color:"#849495", cursor:"pointer", padding:4 }}><X size={18}/></button>
        ) : (
          <button onClick={toggleSidebar} style={{ position:"absolute", right:-12, top:8, width:22, height:22, borderRadius:"50%", background:"#00dbe7", border:"3px solid #10131a", color:"#00363a", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:0 }}>
            {isCollapsed ? <ChevronRight size={11} strokeWidth={3}/> : <ChevronLeft size={11} strokeWidth={3}/>}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:"auto", padding:"0 8px", display:"flex", flexDirection:"column", gap:2 }}>
        {NAV_MAIN.map(item => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} onClick={mobile ? closeMobile : undefined} title={isCollapsed && !mobile ? t(item.labelKey) : undefined} style={{ textDecoration:"none" }}>
              {({ isActive }) => (
                <div style={{
                  display:"flex", alignItems:"center",
                  gap: isCollapsed && !mobile ? 0 : 12,
                  padding: isCollapsed && !mobile ? "10px 0" : "10px 12px",
                  justifyContent: isCollapsed && !mobile ? "center" : "flex-start",
                  borderRadius:8,
                  background: isActive ? "rgba(0,219,231,0.08)" : "transparent",
                  borderRight: isActive ? "2px solid #00dbe7" : "2px solid transparent",
                  boxShadow: isActive ? "0 0 12px rgba(0,219,231,0.1)" : "none",
                  color: isActive ? "#00dbe7" : "#849495",
                  transition:"all 0.15s", cursor:"pointer",
                }}>
                  <Icon size={18} style={{ flexShrink:0 }} />
                  {(!isCollapsed || mobile) && (
                    <span style={{ fontSize:"0.88rem", fontWeight:500, whiteSpace:"nowrap" }}>
                      {t(item.labelKey)}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:"12px 8px", borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", flexDirection:"column", gap:2 }}>
        {/* BETA rozeti — upgrade butonu yerine gösterilir */}
        {(!isCollapsed || mobile) && (
          <div style={{ margin:"0 4px 8px", padding:"10px 14px", borderRadius:8, background:"linear-gradient(135deg,rgba(34,211,238,0.08) 0%,rgba(168,85,247,0.06) 100%)", border:"1px solid rgba(34,211,238,0.2)", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:"0.6rem", fontWeight:900, letterSpacing:"0.14em", color:"#22d3ee", background:"rgba(34,211,238,0.15)", border:"1px solid rgba(34,211,238,0.3)", borderRadius:4, padding:"2px 7px", textTransform:"uppercase", flexShrink:0 }}>BETA</span>
            <span style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.45)", lineHeight:1.3 }}>{t('nav.betaLabel')}</span>
          </div>
        )}
        <button onClick={toggleZenMode} style={{ display:"flex", alignItems:"center", gap: isCollapsed && !mobile ? 0:12, padding: isCollapsed && !mobile ? "10px 0":"10px 12px", justifyContent: isCollapsed && !mobile ? "center":"flex-start", background: isZenMode ? "rgba(139,92,246,0.1)":"transparent", border:"none", cursor:"pointer", color: isZenMode ? "#a78bfa":"#849495", borderRadius:8, width:"100%", transition:"all 0.15s" }}>
          {isZenMode ? <EyeOff size={17}/> : <Eye size={17}/>}
          {(!isCollapsed || mobile) && <span style={{ fontSize:"0.72rem", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>{t("nav.zenMode")}</span>}
        </button>
        <button onClick={logout} style={{ display:"flex", alignItems:"center", gap: isCollapsed && !mobile ? 0:12, padding: isCollapsed && !mobile ? "10px 0":"10px 12px", justifyContent: isCollapsed && !mobile ? "center":"flex-start", background:"transparent", border:"none", cursor:"pointer", color:"#849495", borderRadius:8, width:"100%", transition:"all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color="#ffb4ab"}
          onMouseLeave={e => e.currentTarget.style.color="#849495"}
        >
          <LogOut size={17}/>
          {(!isCollapsed || mobile) && <span style={{ fontSize:"0.72rem", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>{t("nav.logout")}</span>}
        </button>
      </div>
    </div>
  );

  const pageVariants = shouldReduceMotion ? {} : {
    initial: { opacity:0, y:10 },
    animate: { opacity:1, y:0, transition:{ duration:0.26, ease:[0.4,0,0.2,1] } },
    exit:    { opacity:0, y:-6, transition:{ duration:0.16 } },
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:"#10131a", color:"#e1e2eb", overflow:"hidden" }}>

      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{ width: isCollapsed ? 68 : 256, flexShrink:0, background:"rgba(11,14,20,0.9)", backdropFilter:"blur(20px)", borderRight:"1px solid rgba(255,255,255,0.05)", paddingTop:22, transition:"width 0.3s cubic-bezier(0.4,0,0.2,1)", position:"relative", zIndex:50, display:"flex", flexDirection:"column" }}>
          <SidebarContent mobile={false} />
        </div>
      )}

      {/* Mobile overlay + drawer */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <>
            <motion.div key="ov" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={closeMobile} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100 }}/>
            <motion.div key="dr" initial={shouldReduceMotion ? {} : {x:-268}} animate={{x:0}} exit={shouldReduceMotion ? {} : {x:-268}} transition={{ type:"spring", stiffness:340, damping:32 }} style={{ position:"fixed", top:0, left:0, bottom:0, width:256, background:"rgba(11,14,20,0.98)", backdropFilter:"blur(20px)", borderRight:"1px solid rgba(255,255,255,0.05)", zIndex:101, paddingTop:22 }}>
              <SidebarContent mobile={true} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* Mobile topbar */}
        {isMobile && (
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"rgba(11,14,20,0.92)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.05)", position:"sticky", top:0, zIndex:40 }}>
            <button onClick={() => setIsMobileOpen(true)} style={{ background:"none", border:"none", color:"#e1e2eb", cursor:"pointer", display:"flex" }}><Menu size={22}/></button>
            <WhaleLogo size="sm" showText={true} />
            <button onClick={toggleZenMode} style={{ marginLeft:"auto", background: isZenMode ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)", border:`1px solid ${isZenMode ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}`, color: isZenMode ? "#a78bfa":"#849495", cursor:"pointer", padding:"6px 10px", borderRadius:8, display:"flex" }}>
              {isZenMode ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
        )}

        {/* Page */}
        <div style={{ flex:1, overflow:"auto", padding: isMobile ? "16px 14px 32px" : "32px 36px" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ width:"100%", height:"100%" }}>
              <Outlet context={{ trades, fetchTrades, isLoading }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
    </div>
  );
}