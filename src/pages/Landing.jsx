import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import ProductProof from "@/components/landing/ProductProof";
import IndustrySection from "@/components/landing/IndustrySection";
import ProblemSolution from "@/components/landing/ProblemSolution";
import Features from "@/components/landing/Features";
import Showcase from "@/components/landing/Showcase";
import HowItWorks from "@/components/landing/HowItWorks";
import TrustSection from "@/components/landing/TrustSection";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    base44.auth
      .isAuthenticated()
      .then((authed) => {
        if (active && authed) navigate("/events", { replace: true });
      })
      .catch(() => {})
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <Hero />
        <ProductProof />
        <IndustrySection />
        <ProblemSolution />
        <Features />
        <Showcase />
        <HowItWorks />
        <TrustSection />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <LandingFooter />
    </div>
  );
}