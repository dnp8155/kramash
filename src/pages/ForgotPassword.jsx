import React, { useState } from "react";
import { sanitizeEmailInput } from "@/lib/validation";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, ArrowRight, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import Logo from "@/components/common/Logo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Link to="/" className="flex items-center justify-center gap-2.5">
            <Logo size={40} className="rounded-xl" />
            <div>
              <div className="font-heading text-xl font-bold tracking-tight text-foreground leading-none">Kramasha</div>
              <div className="text-[11px] text-muted-foreground leading-none mt-1">Built for Creative Businesses</div>
            </div>
          </Link>

          <div className="text-center space-y-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground font-heading">Reset password</h1>
              <p className="text-sm text-muted-foreground mt-1">We'll send you a link to reset it</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-md p-6 space-y-4">
            {sent ? (
              <p className="text-sm text-foreground text-center">
                If an account exists with that email, you'll receive a password reset link shortly.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))} inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      className="pl-9 h-12 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-semibold"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                  ) : (
                    <>Send reset link <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </form>
            )}
          </div>

          <div className="text-center">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to log in
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 max-w-[640px] border-l border-border bg-[#F5F3EF] items-center justify-center p-10 overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-72 h-72 rounded-full bg-[#C8A95E]/10 blur-3xl" />
        </div>
        <div className="relative w-full max-w-[380px] bg-white border border-[#E8E3DB] rounded-3xl shadow-xl p-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#2D4899] flex items-center justify-center shadow-lg mb-6">
            <KeyRound className="w-10 h-10 text-white" strokeWidth={1.75} />
          </div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Forgot your password?</h3>
          <p className="text-sm text-[#8A8580] mt-2 max-w-[260px]">
            No worries — we'll email you a secure link so you can set a new one in seconds.
          </p>
          <div className="flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-[#F5F3EF] border border-[#E8E3DB]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-medium text-[#1A1A1A]">Your account stays secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
