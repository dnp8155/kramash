import React from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Button from "@/components/common/Button";
import { termsOfServiceContent } from "@/lib/legalContent";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-sm">K</div>
            Kramasha
          </Link>
          <Link to="/login">
            <Button size="sm" variant="outline">Sign in</Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Terms of Service</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Kramasha — Event &amp; Production Management Platform
        </p>

        <article className="prose-legal">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h2 className="text-xl font-heading font-bold text-foreground mt-10 mb-3 first:mt-0">{children}</h2>,
              h2: ({ children }) => <h3 className="text-lg font-heading font-semibold text-foreground mt-8 mb-2">{children}</h3>,
              h3: ({ children }) => <h4 className="text-base font-heading font-semibold text-foreground mt-6 mb-2">{children}</h4>,
              p: ({ children }) => <p className="text-sm leading-relaxed text-muted-foreground mb-4">{children}</p>,
              ul: ({ children }) => <ul className="text-sm leading-relaxed text-muted-foreground mb-4 ml-5 list-disc space-y-1.5">{children}</ul>,
              ol: ({ children }) => <ol className="text-sm leading-relaxed text-muted-foreground mb-4 ml-5 list-decimal space-y-1.5">{children}</ol>,
              li: ({ children }) => <li className="pl-1">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              hr: () => <hr className="border-border my-6" />,
              a: ({ children, href }) => <a href={href} className="text-primary underline underline-offset-2 hover:opacity-80">{children}</a>,
            }}
          >
            {termsOfServiceContent}
          </ReactMarkdown>
        </article>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Back to Kramasha</Link>
        </div>
      </main>
    </div>
  );
}