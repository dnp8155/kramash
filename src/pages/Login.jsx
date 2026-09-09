import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import AuthLogo from "@/components/auth/AuthLogo";
import LoginProductVisual from "@/components/auth/LoginProductVisual";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useAuth } from "@/lib/AuthContext";

function sanitizeLoginError(err) {
  const msg = (err?.message || "").toLowerCase();
  if (/invalid|wrong|incorrect|unauthorized|forbidden|401|403|not found/.test(msg)) {
    return "Incorrect email or password.";
  }
  return "Unable to sign in right now. Please try again.";
}

export default function Login() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);

  const returnTo = safeReturnTo();
  const hasCustomReturnTo = returnTo !== "/dashboard";
  const registerPath = hasCustomReturnTo
    ? `/register?returnTo=${encodeURIComponent(returnTo)}`
    : "/register";

  useEffect(() => {
    document.title = "Sign in — Kramashah";
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, follow");
    return () => {
      meta.setAttribute("content", "index, follow");
    };
  }, []);

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
    } catch (err) {
      setError(sanitizeLoginError(err));
      setLoading(false);
      return;
    }
    setOpening(true);
    setTimeout(() => {
      window.location.href = returnTo;
    }, 400);
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-background">
      {/* Left: Login content */}
      <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:px-20 lg:py-0">
        <div className="mx-auto w-full max-w-[420px] pb-6">
          <AuthLogo />

          <div className="mt-12">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sign in to continue to your workspace.
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

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                disabled={loading || opening}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.getModifierState) setCapsLock(e.getModifierState("CapsLock"));
                  }}
                  onKeyUp={(e) => {
                    if (e.getModifierState) setCapsLock(e.getModifierState("CapsLock"));
                  }}
                  className="h-11 pr-10"
                  disabled={loading || opening}
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
            </div>

            <Button
              type="submit"
              className="h-11 w-full font-medium"
              disabled={loading || opening}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full bg-card font-medium"
            onClick={handleGoogle}
            disabled={loading || opening}
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            New to Kramashah?{" "}
            <Link to={registerPath} className="font-medium text-primary hover:underline">
              Create account
            </Link>
          </p>

          <p className="mt-10 text-center text-xs text-muted-foreground/50">
            © 2026 Kramashah
          </p>
        </div>
      </div>

      {/* Right: Product visual */}
      <div className="relative hidden lg:block lg:w-[48%] xl:w-[50%]">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-muted/30 to-muted/20" />
        <div className="relative flex h-full min-h-screen items-center justify-center p-12 pl-8">
          <div className="w-full max-w-xl">
            <LoginProductVisual />
          </div>
        </div>
      </div>

      {opening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">
              Opening your workspace…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}