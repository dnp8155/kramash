import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import Logo from "@/components/common/Logo";
import { setPortalSession } from "@/lib/portalSession";
import { verifyClientPortalPassword } from "@/lib/clientPortalAccess";

export default function ClientPasswordLogin() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Client Portal — Sign in";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, follow";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !token) return;
    setError("");
    setLoading(true);
    try {
      const d = await verifyClientPortalPassword(token, password);
      if (!d?.session_token) throw new Error("Invalid response");
      setPortalSession(d.session_token, d.client_id);
      window.location.href = "/client-portal";
    } catch (err) {
      const msg = err?.message || "Unable to sign in. Please check your password.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Client Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your password to view your projects, quotations, and invoices</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-md p-6 space-y-4">
          {!token && (
            <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              This portal link is incomplete. Please use the full link your photographer shared with you.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  autoFocus
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

            {error && (
              <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !token}
              className="w-full h-11 text-sm font-semibold"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>
        </div>

        <div className="text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}