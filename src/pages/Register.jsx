import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Eye, EyeOff, Smartphone } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import GoogleIcon from "@/components/GoogleIcon";
import RegisterProductVisual from "@/components/RegisterProductVisual";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

function PasswordStrength({ password }) {
  if (!password || password.length < 3) return null;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const level = score <= 2 ? "Weak" : score === 3 ? "Good" : "Strong";
  const color = score <= 2 ? "text-destructive" : score === 3 ? "text-warning" : "text-success";
  const barColor = score <= 2 ? "bg-destructive" : score === 3 ? "bg-warning" : "bg-success";
  const bars = score <= 2 ? 1 : score === 3 ? 2 : 3;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 w-8 rounded-full transition-colors ${i <= bars ? barColor : "bg-muted"}`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${color}`}>{level}</span>
    </div>
  );
}

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [searchParams] = useSearchParams();
  const phoneFromOtp = searchParams.get("phone");

  useEffect(() => {
    document.title = "Create Account — Kramashah";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, follow";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  useEffect(() => {
    let active = true;
    base44.auth
      .isAuthenticated()
      .then((authed) => {
        if (active && authed) {
          const dest = safeReturnTo() !== "/" ? safeReturnTo() : "/events";
          window.location.href = dest;
        }
      })
      .catch(() => {})
      .finally(() => active && setCheckingAuth(false));
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("exists")) {
        setError("An account with this email already exists. Try signing in.");
      } else {
        setError("Unable to create your account right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      const updates = {};
      if (fullName.trim()) updates.full_name = fullName.trim();
      if (phoneFromOtp) updates.phone = phoneFromOtp;
      if (Object.keys(updates).length > 0) {
        try {
          await base44.auth.updateMe(updates);
        } catch {}
      }
      window.location.href = safeReturnTo();
    } catch {
      setError("That verification code is incorrect or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "A new code has been sent to your email.",
      });
    } catch {
      setError("Unable to resend the code right now. Please try again.");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left: Content column */}
      <div className="flex-1 flex flex-col px-6 py-6 sm:px-10 lg:px-12 xl:px-16 lg:py-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 self-start">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
            K
          </div>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">Kramashah</span>
        </Link>

        {/* Form area — vertically centered, slightly above center */}
        <div className="flex-1 flex flex-col justify-center max-w-[420px] w-full mx-auto lg:mx-0 py-10 lg:pb-16">
          {showOtp ? (
            <>
              <h1 className="font-heading text-2xl sm:text-[1.75rem] font-bold tracking-tight text-foreground leading-tight">
                Check your email
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Enter the verification code sent to{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>

              {error && (
                <div className="mt-5 p-3 rounded-lg bg-destructive/8 text-destructive text-sm border border-destructive/15">
                  {error}
                </div>
              )}

              <div className="flex justify-center mt-6 mb-5">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  autoFocus
                  autoComplete="one-time-code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full h-12 font-semibold"
                onClick={handleVerify}
                disabled={loading || otpCode.length < 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify email"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4">
                Didn't receive the code?{" "}
                <button onClick={handleResend} className="text-primary font-medium hover:underline">
                  Resend
                </button>
              </p>

              <button
                onClick={() => {
                  setShowOtp(false);
                  setOtpCode("");
                  setError("");
                }}
                className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Change email
              </button>
            </>
          ) : (
            <>
              <h1 className="font-heading text-2xl sm:text-[1.75rem] font-bold tracking-tight text-foreground leading-tight">
                Create your Kramashah account.
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Start with your account. We'll set up your business workspace next.
              </p>

              {phoneFromOtp && (
                <div className="mt-4 p-3 rounded-lg bg-primary/8 text-primary text-sm flex items-center gap-2 border border-primary/15">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>
                    Phone verified: <strong>{phoneFromOtp}</strong> — complete your account below.
                  </span>
                </div>
              )}

              {error && (
                <div className="mt-5 p-3 rounded-lg bg-destructive/8 text-destructive text-sm border border-destructive/15">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12"
                  />
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                  <p className="text-xs text-muted-foreground">Use at least 6 characters.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-sm font-medium">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match.</p>
                  )}
                </div>

                <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border accent-primary shrink-0"
                  />
                  <span>I agree to the Terms of Service and Privacy Policy.</span>
                </label>

                <Button type="submit" className="w-full h-12 font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground/50">No credit card required</p>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">or</span>
                </div>
              </div>

              <Button variant="outline" className="w-full h-12 text-sm font-medium" onClick={handleGoogle}>
                <GoogleIcon className="w-5 h-5 mr-2" />
                Continue with Google
              </Button>

              <p className="text-sm text-muted-foreground text-center mt-5">
                Already have an account?{" "}
                <Link
                  to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground/40">© 2026 Kramashah</p>
      </div>

      {/* Right: Product visual — desktop only */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative bg-muted/25 border-l border-border/50">
        <RegisterProductVisual />
      </div>
    </div>
  );
}