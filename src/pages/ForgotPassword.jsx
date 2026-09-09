import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import AuthLogo from "@/components/auth/AuthLogo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Reset password — Kramashah";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email.trim());
    } catch {
      // Always show success regardless — privacy-safe
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthShell showProduct={false}>
      <AuthLogo />

      <div className="mt-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Reset your password.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Enter your account email and we'll send you the available reset instructions.
        </p>
      </div>

      {sent ? (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Check your email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              If an account exists with that email, you'll receive password reset
              instructions shortly.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
              className="h-12"
              disabled={loading}
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}