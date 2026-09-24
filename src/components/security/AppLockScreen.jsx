import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { verifyPassword } from "@/lib/appLockPassword";
import { isWebAuthnSupported, getCredential } from "@/lib/webauthnService";
import { base44 } from "@/api/base44Client";
import { Lock, Loader2, Eye, EyeOff, Fingerprint, AlertCircle } from "lucide-react";
import Logo from "@/components/common/Logo";
import Button from "@/components/common/Button";

function getUserField(user, field, defaultValue) {
  if (user && user[field] !== undefined && user[field] !== null) return user[field];
  if (user?.data && user.data[field] !== undefined && user.data[field] !== null) return user.data[field];
  return defaultValue;
}

export default function AppLockScreen({ onUnlock }) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const storedHash = getUserField(user, "app_lock_password_hash", "");
  const hasPassword = !!storedHash;

  useEffect(() => { setWebAuthnSupported(isWebAuthnSupported()); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await verifyPassword(password, storedHash);
      if (!ok) { setError("Incorrect password. Please try again."); setPassword(""); return; }
      onUnlock();
    } catch (err) {
      setError("Unlock failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotLoading(true);
    try {
      await base44.auth.updateMe({ app_lock_enabled: false, app_lock_password_hash: "" });
      sessionStorage.removeItem("kramasha_app_unlocked");
      sessionStorage.removeItem("kramasha_last_activity");
      await base44.auth.logout();
    } catch (err) {
      setForgotLoading(false);
      setShowForgot(false);
    }
  };

  const handlePasskeyUnlock = async () => {
    setPasskeyError("");
    setPasskeyLoading(true);
    try {
      const challengeRes = await base44.functions.invoke("generateWebAuthnAssertionChallenge", {});
      if (challengeRes.error) throw new Error(challengeRes.error);
      const credential = await getCredential({
        challenge: challengeRes.challenge, rpId: challengeRes.rpId,
        allowCredentials: challengeRes.allowCredentials, userVerification: challengeRes.userVerification, timeout: challengeRes.timeout,
      });
      const verifyRes = await base44.functions.invoke("verifyWebAuthnAssertion", { credential, challengeToken: challengeRes.challengeToken });
      if (verifyRes.error || !verifyRes.verified) throw new Error(verifyRes.error || "Verification failed");
      onUnlock();
    } catch (err) {
      setPasskeyError(err?.message || "Passkey unlock failed.");
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-3 sm:space-y-4 py-4 sm:py-6">
          <div className="flex justify-center"><Logo size={64} /></div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">App Locked</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {hasPassword ? "Enter your password or use passkey to unlock." : "Use your passkey to unlock."}
            </p>
          </div>

          {hasPassword && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus autoComplete="off" placeholder="Password"
                  className="w-full h-11 px-4 pr-11 rounded-lg border border-border bg-card text-foreground text-center text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">{error}</div>}
              <Button type="submit" variant="primary" size="md" disabled={loading || !password} className="w-full">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking…</> : "Unlock"}
              </Button>
              <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-muted-foreground hover:text-primary transition-colors w-full text-center">
                Forgot password?
              </button>
            </form>
          )}

          {showForgot && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-left space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Forgot App Lock Password?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will disable App Lock and log you out. You'll need to log in again, then you can re-enable App Lock with a new password from Settings.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="destructive" size="sm" disabled={forgotLoading} onClick={handleForgotPassword} className="flex-1">
                  {forgotLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Resetting…</> : "Reset & Log out"}
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={forgotLoading} onClick={() => setShowForgot(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {webAuthnSupported && (
            <>
              {hasPassword && (
                <div className="flex items-center gap-3">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px bg-border flex-1" />
                </div>
              )}
              {passkeyError && <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">{passkeyError}</div>}
              <Button type="button" variant="outline" size="md" disabled={passkeyLoading} onClick={handlePasskeyUnlock} className="w-full">
                {passkeyLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</> : <><Fingerprint className="w-4 h-4" /> Use Passkey</>}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}