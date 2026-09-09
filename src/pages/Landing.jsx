import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import IndustrySection from "@/components/landing/IndustrySection";
import ProblemSolution from "@/components/landing/ProblemSolution";
import CoreFeatures from "@/components/landing/CoreFeatures";
import ProductShowcase from "@/components/landing/ProductShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import TrustSection from "@/components/landing/TrustSection";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white">
      <Navbar />
      <main>
        <Hero />
        <IndustrySection />
        <ProblemSolution />
        <CoreFeatures />
        <ProductShowcase />
        <HowItWorks />
        <TrustSection />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}