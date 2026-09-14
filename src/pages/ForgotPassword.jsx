import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Logo from "@/components/common/Logo";
import AuthLightPanel from "@/components/AuthLightPanel";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Kramashah — Forgot Password";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, follow";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch (err) {
      console.error("Reset password request error:", err);
      // Always show success regardless — privacy-safe
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-background overflow-x-hidden">
      {/* Left: Content column */}
      <div className="flex-1 flex flex-col px-6 py-6 sm:px-10 lg:px-12 xl:px-16 lg:py-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 self-start relative z-50 cursor-pointer hover:opacity-80 transition-opacity">
          <Logo size={36} className="shadow-md" />
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">Kramasha</span>
        </Link>

        {/* Form area — vertically centered */}
        <div className="flex-1 flex flex-col justify-center max-w-[420px] w-full mx-auto lg:mx-0 py-12 lg:pb-20">
          {sent ? (
            <>
              <h1 className="font-heading text-2xl sm:text-[1.75rem] font-bold tracking-tight text-foreground leading-tight">
                Check your inbox
              </h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                If an account exists with that email, you'll receive password reset instructions shortly.
              </p>
              <div className="mt-6 inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div className="mt-8">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                >
                  <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center">
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </span>
                  Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-heading text-2xl sm:text-[1.75rem] font-bold tracking-tight text-foreground leading-tight">
                Forgot your password?
              </h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                Enter your email and we'll send you instructions to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                >
                  <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center">
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </span>
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground/40">© 2026 Kramasha</p>
      </div>

      {/* Right: Product visual — desktop only */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative bg-muted/25 border-l border-border/50 overflow-hidden">
        <AuthLightPanel />
      </div>
    </div>
  );
}