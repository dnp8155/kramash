import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import { isWebAuthnSupported, isPlatformAuthenticatorAvailable, createCredential } from "@/lib/webauthnService";
import { Fingerprint, Loader2, Plus, Trash2, KeyRound } from "lucide-react";

function getUserField(user, field, defaultValue) {
  if (user && user[field] !== undefined && user[field] !== null) return user[field];
  if (user?.data && user.data[field] !== undefined && user.data[field] !== null) return user.data[field];
  return defaultValue;
}

export default function PasskeySection() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState(false);

  const loadCredentials = useCallback(async () => {
    if (!user) return;
    try {
      const list = await base44.entities.UserAuthCredential.filter({ user_id: user.id });
      setCredentials(list || []);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    setSupported(isWebAuthnSupported());
    isPlatformAuthenticatorAvailable().then(setPlatformAvailable);
    loadCredentials();
  }, [loadCredentials]);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const challengeRes = await base44.functions.invoke("generateWebAuthnRegistrationChallenge", {});
      if (challengeRes.error) throw new Error(challengeRes.error);

      const credential = await createCredential({
        challenge: challengeRes.challenge,
        rp: challengeRes.rp,
        user: challengeRes.user,
        pubKeyCredParams: challengeRes.pubKeyCredParams,
        authenticatorSelection: challengeRes.authenticatorSelection,
        timeout: challengeRes.timeout,
        excludeCredentials: challengeRes.excludeCredentials,
        attestation: challengeRes.attestation || "none",
      });

      const deviceLabel = platformAvailable ? "This Device" : "Security Key";
      const verifyRes = await base44.functions.invoke("verifyWebAuthnRegistration", {
        credential,
        challengeToken: challengeRes.challengeToken,
        deviceLabel,
      });
      if (verifyRes.error) throw new Error(verifyRes.error);

      await checkUserAuth();
      toast({ title: "Passkey registered", description: "You can now use this passkey to unlock the app." });
      loadCredentials();
    } catch (err) {
      toast({ title: "Registration failed", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (cred) => {
    if (!window.confirm(`Remove "${cred.device_label || "this passkey"}"?`)) return;
    try {
      await base44.entities.UserAuthCredential.delete(cred.id);
      // If this was the last passkey and no password is set, disable app lock
      if (credentials.length === 1) {
        const hasPwd = !!getUserField(user, "app_lock_password_hash", "");
        if (!hasPwd) {
          await base44.auth.updateMe({ app_lock_enabled: false });
          await checkUserAuth();
        }
      }
      toast({ title: "Passkey removed" });
      loadCredentials();
    } catch (err) {
      toast({ title: "Failed to remove", description: err?.message, variant: "destructive" });
    }
  };

  if (!supported) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Fingerprint className="w-4 h-4 text-primary" /> Passkey
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Passkeys aren't supported on this device. Use password-based App Lock instead.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Fingerprint className="w-4 h-4 text-primary" /> Passkey
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use biometrics or a security key to unlock the app.
          </p>
        </div>
        {credentials.length > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-success/10 text-success px-1.5 py-0.5 rounded flex items-center gap-1">
            <KeyRound className="w-2.5 h-2.5" /> {credentials.length} registered
          </span>
        )}
      </div>

      {credentials.length > 0 && (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <div key={cred.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{cred.device_label || "Passkey"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {cred.created_date ? new Date(cred.created_date).toLocaleDateString() : ""}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(cred)} className="text-destructive hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" disabled={loading} onClick={handleRegister} className="w-full">
        {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering…</> : <><Plus className="w-3.5 h-3.5" /> Register Passkey</>}
      </Button>
    </div>
  );
}