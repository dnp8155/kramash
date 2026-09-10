import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, User } from "lucide-react";
import Logo from "@/components/common/Logo";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";

export default function ClientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isAuthenticated, authChecked, user, authError } = useAuth();

  useEffect(() => {
    document.title = "Client Portal — Sign in";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, follow";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  // Redirect authenticated clients to portal, workspace users to dashboard
  useEffect(() => {
    if (authChecked && isAuthenticated && !authError) {
      if (user?.role === "client") {
        window.location.href = "/client-portal";
      } else if (user?.role === "admin" || user?.role === "user") {
        window.location.href = "/dashboard";
      }
    }
  }, [authChecked, isAuthenticated, authError, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      // Ensure the SDK redirects to the client portal after setting the token
      const url = new URL(window.location.href);
      url.searchParams.set("returnTo", "/client-portal");
      window.history.replaceState(null, "", url.toString());
      await base44.auth.loginViaEmailPassword(email, password);
      // Fallback redirect if the SDK doesn't auto-redirect
      window.location.href = "/client-portal";
    } catch (err) {
      console.error("Client login error:", err);
      const msg = (err?.message || err?.data?.message || "").toLowerCase();
      if (msg.includes("network") || msg.includes("fetch")) {
        setError("Unable to sign in right now. Please check your connection.");
      } else {
        const serverMsg = err?.data?.message || err?.message || "";
        setError(serverMsg || "Incorrect email or password.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Client Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to view your projects, quotations, and invoices</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-2xl shadow-md p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-9 pr-9"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-semibold"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>

          {/* Info note */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
            <User className="w-3.5 h-3.5 inline mr-1" />
            Don't have an account? Ask your service provider to invite you.
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}