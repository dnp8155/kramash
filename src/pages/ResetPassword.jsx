import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";
import Logo from "@/components/common/Logo";
import AuthLightPanel from "@/components/AuthLightPanel";
import PasswordStrength from "@/components/common/PasswordStrength";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = "Kramashah — Reset Password";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      setSuccess(true);
    } catch {
      setError("Unable to reset your password. The link may have expired — please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  const hasTokenError = !resetToken || error?.includes("link may have expired");

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
          {hasTokenError ? (
            <>
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/10 mb-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h1 className="font-heading text-2xl sm:text-[1.75rem] font-bold tracking-tight text-foreground leading-tight">
                That password reset link is no longer valid
              </h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                The link may have expired or already been used. Please request a new password reset email.
              </p>
              <div className="mt-6">
                <Link to="/forgot-password">
                  <Button className="h-12 font-semibold">
                    Request a New Reset Link
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                >
                  <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </span>
                  Back to sign in
                </Link>
              </div>
            </>
          ) : success ? (
            <>
              <h1 className="font-heading text-2xl sm:text-[1.75rem] font-bold tracking-tight text-foreground leading-tight">
                Password updated successfully
              </h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                Your password has been changed. You can now sign in with your new password.
              </p>
              <div className="mt-6 inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div className="mt-8">
                <Link to="/login">
                  <Button className="h-12 font-semibold">
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-heading text-2xl sm:text-[1.75rem] font-bold tracking-tight text-foreground leading-tight">
                Set a new password
              </h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                Enter your new password below to regain access.
              </p>

              {error && (
                <div className="mt-5 p-3 rounded-lg bg-destructive/8 text-destructive text-sm border border-destructive/15">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    New Password
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
                      autoFocus
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  <PasswordStrength password={newPassword} />
                  <p className="text-xs text-muted-foreground">Use at least 6 characters.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-sm font-medium">
                    Confirm Password
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
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match.</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-12 font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
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