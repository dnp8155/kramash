import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AboutHero from "@/components/landing/about/AboutHero";
import AboutStory from "@/components/landing/about/AboutStory";
import AboutValues from "@/components/landing/about/AboutValues";
import AboutForWho from "@/components/landing/about/AboutForWho";
import AboutCTA from "@/components/landing/about/AboutCTA";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center">
              <ArrowLeft className="w-3.5 h-3.5" />
            </span>
            Back to home
          </Link>
        </div>
        <AboutHero />
        <AboutStory />
        <AboutValues />
        <AboutForWho />
        <AboutCTA />
      </main>
    </div>
  );
}