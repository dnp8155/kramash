import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/common/Logo";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Showcase from "@/components/landing/Showcase";
import HowItWorks from "@/components/landing/HowItWorks";
import Industries from "@/components/landing/Industries";
import ComparisonTable from "@/components/landing/ComparisonTable";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import LandingFooter from "@/components/landing/LandingFooter";
import FloatingDock from "@/components/landing/FloatingDock";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, authChecked, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (authChecked && isAuthenticated) {
      navigate("/events", { replace: true });
    }
  }, [authChecked, isAuthenticated, navigate]);

  if (!authChecked || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-[#E5E5E5] border-t-[#F58220] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-[#E5E5E5]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">Kramasha</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="h-9 px-4 sm:px-5 inline-flex items-center justify-center text-sm font-medium text-foreground hover:bg-[#F9F9F9] rounded-full transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="h-9 px-4 sm:px-5 inline-flex items-center justify-center text-sm font-semibold bg-[#F58220] text-white hover:bg-[#E0741F] rounded-full shadow-sm transition-all"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>
      <main>
        <Hero />
        <Features />
        <Showcase />
        <HowItWorks />
        <Industries />
        <ComparisonTable />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <LandingFooter />
      <FloatingDock />
    </div>
  );
}