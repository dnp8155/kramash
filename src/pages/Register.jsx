import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2, AlertCircle, Check } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthShell from "@/components/auth/AuthShell";
import AuthLogo from "@/components/auth/AuthLogo";
import SignupProductPanel from "@/components/auth/SignupProductPanel";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useAuth } from "@/lib/AuthContext";

function getPasswordStrength(pwd) {
  if (!pwd) return null;
  if (pwd.length < 6) return { label: "Too short", bars: 0, color: "text-muted-foreground", barColor: "bg-border" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { label: "Weak", bars: 1, color: "text-destructive", barColor: "bg-destructive" };
  if (score <= 2) return { label: "Good", bars: 2, color: "text-warning", barColor: "bg-warning" };
  return { label: "Strong", bars: 3, color: "text-success", barColor: "bg-success" };
}

export default function Register() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [opening, setOpening] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendInfo, setResendInfo] = useState("");

  const returnTo = safeReturnTo();
  const hasCustomReturnTo = returnTo !== "/dashboard";
  const loginPath = hasCustomReturnTo
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/login";

  const strength = getPasswordStrength(password);

  useEffect(() => {
    document.title = "Create Account — Kramashah";
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.register({ email: email.trim(), password });
      setShowOtp(true);
      setResendTimer(30);
    } catch (err) {
      const msg = (err?.message || "").toLowerCase();
      if (/already|exists|registered/.test(msg)) {
        setError("An account with this email already exists. Try signing in instead.");
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
      const result = await base44.auth.verifyOtp({ email: email.trim(), otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      if (fullName.trim()) {
        try {
          await base44.auth.updateMe({ full_name: fullName.trim() });
        } catch {
          /* non-blocking */
        }
      }
      setOpening(true);
      setTimeout(() => {
        window.location.href = returnTo;
      }, 800);
    } catch {
      setError("That verification code is incorrect or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResendInfo("");
    try {
      await base44.auth.resendOtp(email.trim());
      setResendTimer(30);
      setResendInfo("A new code has been sent.");
    } catch {
      setResendInfo("Unable to resend right now. Please try again in a moment.");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  // OTP verification step
  if (showOtp) {
    return (
      <AuthShell>
        <AuthLogo />

        <div className="mt-10">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Verify your email
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We sent a verification code to{" "}
            <span className="font-medium text-foreground">{email}</span>. Enter it below
            to activate your account.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resendInfo && !error && (
          <div className="mt-6 rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
            {resendInfo}
          </div>
        )}

        <div className="mt-6 flex justify-center">
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
          className="mt-6 h-12 w-full font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6 || opening}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify email"
          )}
        </Button>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setShowOtp(false);
              setOtpCode("");
              setError("");
              setResendInfo("");
            }}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            Change email
          </button>
          {resendTimer > 0 ? (
            <span className="text-muted-foreground">
              Resend code in 0:{resendTimer.toString().padStart(2, "0")}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="font-medium text-primary hover:underline"
            >
              Resend code
            </button>
          )}
        </div>

        {opening && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <Check className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-foreground">
                Account created. Let's set up your workspace…
              </span>
            </div>
          </div>
        )}
      </AuthShell>
    );
  }

  // Registration form
  return (
    <AuthShell panel={<SignupProductPanel />}>
      <AuthLogo />

      <div className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Get started
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Create your Kramashah account.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Set up your account now. You'll configure your business, team and workflow in
          the next step.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="fullname">Full name</Label>
          <Input
            id="fullname"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-12"
            disabled={loading}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
            disabled={loading}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.getModifierState) setCapsLock(e.getModifierState("CapsLock"));
              }}
              onKeyUp={(e) => {
                if (e.getModifierState) setCapsLock(e.getModifierState("CapsLock"));
              }}
              className="h-12 pr-10"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {capsLock && (
            <p className="flex items-center gap-1 text-xs text-warning">
              <AlertCircle className="h-3 w-3" /> Caps Lock is on
            </p>
          )}
          {password && strength.bars > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`h-1 w-8 rounded-full ${
                      strength.bars >= n ? strength.barColor : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <span className={`text-xs font-medium ${strength.color}`}>
                {strength.label}
              </span>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 pr-10"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={setTermsAccepted}
            className="mt-0.5"
          />
          <Label
            htmlFor="terms"
            className="text-xs leading-relaxed text-muted-foreground font-normal cursor-pointer"
          >
            I agree to the Terms of Service and Privacy Policy.
          </Label>
        </div>

        <Button type="submit" className="h-12 w-full font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          No credit card required
        </p>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full bg-card font-medium"
        onClick={handleGoogle}
        disabled={loading}
      >
        <GoogleIcon className="mr-2 h-5 w-5" />
        Continue with Google
      </Button>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have a Kramashah account?{" "}
        <Link to={loginPath} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}