import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import AboutHero from "@/components/landing/about/AboutHero";
import AboutStory from "@/components/landing/about/AboutStory";
import AboutValues from "@/components/landing/about/AboutValues";
import AboutForWho from "@/components/landing/about/AboutForWho";
import AboutCTA from "@/components/landing/about/AboutCTA";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <AboutHero />
        <AboutStory />
        <AboutValues />
        <AboutForWho />
        <AboutCTA />
      </main>
      <LandingFooter />
    </div>
  );
}