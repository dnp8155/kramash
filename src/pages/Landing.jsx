import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import LandingNav from "@/components/landing/LandingNav";
import LandingBottomNav from "@/components/landing/LandingBottomNav";
import Hero from "@/components/landing/Hero";
import TrustStrip from "@/components/landing/TrustStrip";
import FeatureGroups from "@/components/landing/FeatureGroups";
import ProductShowcase from "@/components/landing/ProductShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import QuotationFlow from "@/components/landing/QuotationFlow";
import PhotographyShowcase from "@/components/landing/PhotographyShowcase";
import ClientPortalShowcase from "@/components/landing/ClientPortalShowcase";
import FinancialsShowcase from "@/components/landing/FinancialsShowcase";
import TeamShowcase from "@/components/landing/TeamShowcase";
import Industries from "@/components/landing/Industries";
import MobileSection from "@/components/landing/MobileSection";
import WorkflowTimeline from "@/components/landing/WorkflowTimeline";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import LandingFooter from "@/components/landing/LandingFooter";
import useSEO from "@/hooks/useSEO";
import { getLandingPageKeywords } from "@/constants/seoKeywords";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, authChecked, isLoadingAuth } = useAuth();

  useSEO({
    title: "Kramasha — Photography, Event & Creative Business Management Software India | Free CRM, Invoicing, Quotations",
    description: "Kramasha is the all-in-one business management platform for photographers, event managers, studios and creative businesses in India. Manage leads, clients, projects, teams, quotations, invoices, payments and finances — all in one place. Free plan available, built for Gujarat and India. GST invoicing, digital quotation signing, client portal, team scheduling, milestone billing.",
    keywords: getLandingPageKeywords(),
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Kramasha — Photography, Event & Creative Business Management Software",
      description: "All-in-one business management platform for photographers, event managers, studios and creative businesses in India.",
      url: "https://www.kramasha.com",
      isPartOf: { "@type": "WebSite", name: "Kramasha", url: "https://www.kramasha.com" },
      about: {
        "@type": "SoftwareApplication",
        name: "Kramasha",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: "https://www.kramasha.com/kramasha_logo_512x512.png"
      },
    },
    breadcrumbs: [{ name: "Home", url: "/" }],
  });

  useEffect(() => {
    if (authChecked && isAuthenticated) {
      navigate("/events", { replace: true });
    }
  }, [authChecked, isAuthenticated, navigate]);

  if (!authChecked || isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EF]">
        <div className="w-8 h-8 border-4 border-[#E8E3DB] border-t-[#C8A95E] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <LandingNav />
      <Hero />
      <TrustStrip />
      <FeatureGroups />
      <ProductShowcase />
      <HowItWorks />
      <QuotationFlow />
      <PhotographyShowcase />
      <ClientPortalShowcase />
      <FinancialsShowcase />
      <TeamShowcase />
      <Industries />
      <MobileSection />
      <WorkflowTimeline />
      <Pricing />
      <FAQ />
      <CTA />
      <LandingFooter />
      <LandingBottomNav />
    </div>
  );
}