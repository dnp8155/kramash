import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { verifyPassword } from "@/lib/appLockPassword";
import { isWebAuthnSupported, getCredential } from "@/lib/webauthnService";
import { base44 } from "@/api/base44Client";
import { Lock, Loader2, Eye, EyeOff, Fingerprint } from "lucide-react";
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

  const storedHash = getUserField(user, "app_lock_password_hash", "");
  const hasPassword = !!storedHash;

  useEffect(() => {
    setWebAuthnSupported(isWebAuthnSupported());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ok = await verifyPassword(password, storedHash);
      if (!ok) {
        setError("Incorrect password. Please try again.");
        setPassword("");
        return;
      }
      onUnlock();
    } catch (err) {
      setError("Unlock failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyUnlock = async () => {
    setPasskeyError("");
    setPasskeyLoading(true);
    try {
      const challengeRes = await base44.functions.invoke("generateWebAuthnAssertionChallenge", {});
      if (challengeRes.error) throw new Error(challengeRes.error);

      const credential = await getCredential({
        challenge: challengeRes.challenge,
        rpId: challengeRes.rpId,
        allowCredentials: challengeRes.allowCredentials,
        userVerification: challengeRes.userVerification,
        timeout: challengeRes.timeout,
      });

      const verifyRes = await base44.functions.invoke("verifyWebAuthnAssertion", {
        credential,
        challengeToken: challengeRes.challengeToken,
      });
      if (verifyRes.error || !verifyRes.verified) throw new Error(verifyRes.error || "Verification failed");

      onUnlock();
    } catch (err) {
      setPasskeyError(err?.message || "Passkey unlock failed.");
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-primary" />
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
                autoFocus
                autoComplete="off"
                placeholder="Password"
                className="w-full h-11 px-4 pr-11 rounded-lg border border-border bg-card text-foreground text-center text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={loading || !password} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking…</> : "Unlock"}
            </Button>
          </form>
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
            {passkeyError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                {passkeyError}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={passkeyLoading}
              onClick={handlePasskeyUnlock}
              className="w-full"
            >
              {passkeyLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</>
                : <><Fingerprint className="w-4 h-4" /> Use Passkey</>}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}