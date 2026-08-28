import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { toast } from "@/components/ui/use-toast";

function isUnverifiedError(err) {
  if (!err) return false;
  const status = err.status || err.code;
  const reason = err.data?.extra_data?.reason || err.reason;
  const msg = (err.message || err.data?.message || "").toLowerCase();
  if (reason && String(reason).toLowerCase().includes("verif")) return true;
  if (status === 403 && msg.includes("verif")) return true;
  return /not verified|unverified|email not verified|verify your email|verification required/.test(msg);
}

function sanitizeLoginError(err) {
  if (!err) return "Unable to sign in right now. Please try again.";
  const msg = (err.message || err.data?.message || "").toLowerCase();
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection") || msg.includes("timeout")) {
    return "Unable to sign in right now. Please try again.";
  }
  return "Incorrect email or password.";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const returnTo = safeReturnTo();

  useEffect(() => {
    document.title = "Sign in — Kramashah";
  }, []);

  useEffect(() => {
    let active = true;
    base44.auth
      .isAuthenticated()
      .then((authed) => {
        if (active && authed) {
          const dest = returnTo !== "/" ? returnTo : "/events";
          window.location.href = dest;
        }
      })
      .catch(() => {})
      .finally(() => active && setCheckingAuth(false));
    return () => {
      active = false;
    };
  }, [returnTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      if (isUnverifiedError(err)) {
        setVerifyMode(true);
        setError("");
        handleSendOtp();
      } else {
        setError(sanitizeLoginError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      setError("Enter your email first");
      return;
    }
    setSendingOtp(true);
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the verification code.",
      });
    } catch {
      setError("Unable to send code right now. Please try again.");
    } finally {
      setSendingOtp(false);
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
      window.location.href = returnTo;
    } catch {
      setError("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (verifyMode) {
    return (
      <AuthLayout
        icon={ShieldCheck}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
        footer={
          <button
            onClick={() => {
              setVerifyMode(false);
              setOtpCode("");
              setError("");
            }}
            className="text-primary font-medium hover:underline"
          >
            Back to sign in
          </button>
        }
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        <div className="flex justify-center mb-6">
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
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify & continue"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button
            onClick={handleSendOtp}
            disabled={sendingOtp}
            className="text-primary font-medium hover:underline disabled:opacity-50"
          >
            {sendingOtp ? "Sending..." : "Resend"}
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Welcome back to Kramashah."
      subtitle="Sign in to manage your clients, projects, team, quotations and finances."
      footer={
        <>
          New to Kramashah?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            Create your account
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/8 text-destructive text-sm border border-destructive/15">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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
        </div>
        <Button
          type="submit"
          className="w-full h-12 font-semibold"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">or continue with</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="mt-4 text-center">
        <button
          onClick={() => {
            setVerifyMode(true);
            setError("");
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Didn't verify your email? Verify now
        </button>
      </div>
    </AuthLayout>
  );
}