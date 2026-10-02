import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldOff } from "lucide-react";
import Logo from "@/components/common/Logo";
import TeamPortalPreview from "@/components/landing/previews/TeamPortalPreview";
import { setTeamPortalSession } from "@/lib/teamPortalSession";
import { verifyTeamPortalPassword } from "@/lib/teamPortalAccess";

export default function TeamMemberPasswordLogin() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Team Portal — Sign in";
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
      const d = await verifyTeamPortalPassword(token, password);
      if (!d?.session_token) throw new Error("Invalid response");
      setTeamPortalSession(d.session_token, d.team_member_id);
      window.location.href = "/team-portal";
    } catch (err) {
      const msg = err?.message || "Unable to sign in. Please check your password.";
      // The business has disabled this link (or it was never valid) — this is
      // a dead end, not a wrong-password retry, so replace the form entirely
      // instead of leaving a password box up that can never actually work.
      if (msg.toLowerCase().includes("no longer active")) {
        setUnavailable(true);
      } else {
        setError(msg);
      }
      setLoading(false);
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
            <h1 className="text-2xl font-bold text-foreground font-heading">Team Portal</h1>
            {!unavailable && (
              <p className="text-sm text-muted-foreground mt-1">Enter your password to view your schedule, payments, and projects</p>
            )}
          </div>
        </div>

        {unavailable ? (
          <div className="bg-card border border-border rounded-2xl shadow-md p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <ShieldOff className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">This portal link is no longer active</h2>
            <p className="text-sm text-muted-foreground">
              Your service provider has disabled this link. Please reach out to them directly for an updated link or any information you need.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-md p-6 space-y-4">
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
        )}

        <div className="text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to home
          </Link>
        </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 max-w-[640px] border-l border-border bg-[#F5F3EF] items-center justify-center p-10 overflow-hidden relative">
        <div className="absolute -inset-4 bg-[#C8A95E]/5 rounded-3xl blur-3xl" />
        <div className="relative w-full max-w-[520px]">
          <TeamPortalPreview />
        </div>
      </div>
    </div>
  );
}