import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getCredential, isWebAuthnSupported } from "@/lib/webauthnService";
import { Lock, Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/common/Logo";

export default function AppLockScreen({ onUnlock }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoTriggered, setAutoTriggered] = useState(false);

  const unlock = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      // 1. Get assertion challenge
      const challengeRes = await base44.functions.invoke("generateWebAuthnAssertionChallenge", {});
      const challengeData = challengeRes?.data || challengeRes;
      if (!challengeData?.challenge) throw new Error("Failed to generate challenge");

      // 2. Browser authenticator
      const credential = await getCredential({
        challenge: challengeData.challenge,
        rpId: challengeData.rpId,
        allowCredentials: challengeData.allowCredentials,
        userVerification: challengeData.userVerification || "required",
        timeout: challengeData.timeout || 60000,
      });

      // 3. Verify assertion
      const verifyRes = await base44.functions.invoke("verifyWebAuthnAssertion", {
        credential,
        challengeToken: challengeData.challengeToken,
      });
      const verifyData = verifyRes?.data || verifyRes;
      if (!verifyData?.verified) throw new Error("Verification failed");

      onUnlock();
    } catch (e) {
      setError(e?.message || "Unlock failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onUnlock]);

  // Auto-trigger on mount
  useEffect(() => {
    if (!autoTriggered && isWebAuthnSupported()) {
      setAutoTriggered(true);
      unlock();
    }
  }, [autoTriggered, unlock]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          {loading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Lock className="w-8 h-8 text-primary" />
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold text-foreground">App Locked</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Authenticate with your passkey or biometric to unlock.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={unlock}
          disabled={loading}
          className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Unlocking…
            </>
          ) : (
            <>
              <Fingerprint className="w-5 h-5" /> Unlock with passkey
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Protected by WebAuthn</span>
        </div>
      </div>
    </div>
  );
}