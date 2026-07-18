import { useEffect } from 'react';
import LandingNavbar     from '../components/landing/Navbar';
import HeroSection       from '../components/landing/HeroSection';
import FeaturesSection   from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import CommunitySection  from '../components/landing/CommunitySection';
import ClimaxSection     from '../components/landing/ClimaxSection';
import LandingFooter     from '../components/landing/Footer';
import MobileLanding     from '../components/landing/mobile/MobileLanding';
import { useIsMobile }   from '../hooks/useIsMobile';
import '../styles/landing.css';

export default function LandingPage() {
  const isMobile = useIsMobile();

  /* Mobilde MobileLanding kendi useEffect'ini yönetir */
  useEffect(() => {
    if (isMobile) return;
    document.body.classList.add('wt-landing-active');
    return () => document.body.classList.remove('wt-landing-active');
  }, [isMobile]);

  /* Mobil → tamamen farklı layout */
  if (isMobile) return <MobileLanding />;

  return (
    <div className="wt-landing" id="top">
      {/* Cinematic film-grain noise */}
      <div className="noise" aria-hidden="true" />

      {/* Navigation */}
      <LandingNavbar />

      {/* 1. Hero — Full-screen video + GSAP entrance */}
      <HeroSection />

      {/* 2. Features — Scroll-triggered fade-in cards */}
      <FeaturesSection />

      {/* 3. How It Works — Alternating steps */}
      <HowItWorksSection />

      {/* 4. Community & Social Proof */}
      <CommunitySection />

      {/* 5. Climax — GSAP ScrollTrigger video pin */}
      <ClimaxSection />

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
