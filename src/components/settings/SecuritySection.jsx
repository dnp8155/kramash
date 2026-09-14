import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Toggle from "@/components/common/Toggle";
import Select from "@/components/common/Select";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  createCredential,
} from "@/lib/webauthnService";
import { Shield, Fingerprint, Plus, Trash2, Loader2, Lock, Unlock, Smartphone, Monitor } from "lucide-react";

function getUserField(user, field, defaultValue) {
  if (user && user[field] !== undefined && user[field] !== null) return user[field];
  if (user?.data && user.data[field] !== undefined && user.data[field] !== null) return user.data[field];
  return defaultValue;
}

export default function SecuritySection() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [supported] = useState(isWebAuthnSupported());
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [loadingCreds, setLoadingCreds] = useState(false);

  const appLockEnabled = getUserField(user, "app_lock_enabled", false);
  const relockAfter = Number(getUserField(user, "app_lock_relock_after", 0));

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setPlatformAvailable);
  }, []);

  const loadCredentials = useCallback(async () => {
    if (!user?.id) return;
    setLoadingCreds(true);
    try {
      const creds = await base44.entities.UserAuthCredential.filter({ user_id: user.id });
      setCredentials(creds || []);
    } catch {
      // ignore
    } finally {
      setLoadingCreds(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      // 1. Get registration challenge
      const challengeRes = await base44.functions.invoke("generateWebAuthnRegistrationChallenge", {});
      const challengeData = challengeRes?.data || challengeRes;
      if (!challengeData?.challenge) throw new Error("Failed to generate challenge");

      // 2. Browser creates credential
      const credential = await createCredential({
        challenge: challengeData.challenge,
        rp: challengeData.rp,
        user: challengeData.user,
        pubKeyCredParams: challengeData.pubKeyCredParams,
        authenticatorSelection: challengeData.authenticatorSelection,
        timeout: challengeData.timeout,
        attestation: challengeData.attestation,
        excludeCredentials: challengeData.excludeCredentials,
      });

      // 3. Verify and store
      const verifyRes = await base44.functions.invoke("verifyWebAuthnRegistration", {
        credential,
        challengeToken: challengeData.challengeToken,
        deviceLabel: getDeviceLabel(),
      });
      const verifyData = verifyRes?.data || verifyRes;
      if (!verifyData?.verified) throw new Error("Registration verification failed");

      await checkUserAuth();
      loadCredentials();
      toast({ title: "App Lock enabled", description: "Your passkey has been registered." });
    } catch (e) {
      toast({
        title: "Setup failed",
        description: e?.message || "Could not register passkey",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm("Disable App Lock? You can re-enable it anytime.")) return;
    setLoading(true);
    try {
      // Remove all credentials
      for (const cred of credentials) {
        await base44.entities.UserAuthCredential.delete(cred.id);
      }
      await base44.auth.updateMe({ app_lock_enabled: false });
      await checkUserAuth();
      setCredentials([]);
      toast({ title: "App Lock disabled" });
    } catch (e) {
      toast({ title: "Failed to disable", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCredential = async (cred) => {
    if (!window.confirm(`Remove "${cred.device_label || "this device"}"? You'll need to re-register to use App Lock on it.`)) return;
    try {
      await base44.entities.UserAuthCredential.delete(cred.id);
      setCredentials((prev) => prev.filter((c) => c.id !== cred.id));
      // If no credentials left, disable app lock
      if (credentials.length <= 1) {
        await base44.auth.updateMe({ app_lock_enabled: false });
        await checkUserAuth();
      }
      toast({ title: "Device removed" });
    } catch (e) {
      toast({ title: "Failed to remove", description: e?.message, variant: "destructive" });
    }
  };

  const handleRelockChange = async (val) => {
    try {
      await base44.auth.updateMe({ app_lock_relock_after: Number(val) });
      await checkUserAuth();
    } catch (e) {
      toast({ title: "Failed to save", description: e?.message, variant: "destructive" });
    }
  };

  if (!supported) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 max-w-lg">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-primary" /> App Lock
        </h3>
        <p className="text-sm text-muted-foreground">
          WebAuthn is not supported in this browser. App Lock requires a modern browser with
          passkey/biometric support (Chrome, Safari, Edge, or Firefox).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-primary" /> App Lock
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Require passkey or biometric authentication to open the app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {appLockEnabled && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-success/10 text-success px-1.5 py-0.5 rounded flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Active
            </span>
          )}
          <Toggle checked={appLockEnabled} onChange={appLockEnabled ? handleDisable : handleEnable} label="App Lock" disabled={loading} />
        </div>
      </div>

      {!appLockEnabled ? (
        <div className="space-y-3">
          {!platformAvailable && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-xs text-warning flex items-start gap-2">
              <Monitor className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                No platform authenticator detected. You can still set up a passkey with a
                hardware security key or a synced passkey from your phone.
              </span>
            </div>
          )}
          <Button variant="primary" size="md" disabled={loading} onClick={handleEnable} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</> : <><Fingerprint className="w-4 h-4" /> Set up passkey</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Re-lock timeout */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Re-lock after
            </label>
            <Select value={String(relockAfter)} onChange={(e) => handleRelockChange(e.target.value)} className="w-full">
              <option value="0">On tab close</option>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              The app will re-lock automatically after the selected period of inactivity.
            </p>
          </div>

          {/* Registered devices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Registered devices</span>
              <Button variant="outline" size="sm" disabled={loading} onClick={handleEnable}>
                <Plus className="w-3 h-3" /> Add device
              </Button>
            </div>
            {loadingCreds ? (
              <p className="text-sm text-muted-foreground py-2">Loading…</p>
            ) : credentials.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No devices registered.</p>
            ) : (
              <div className="space-y-1.5">
                {credentials.map((cred) => (
                  <div key={cred.id} className="flex items-center gap-2 px-2 py-2 rounded-md bg-muted/40">
                    <Smartphone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1 min-w-0 truncate">
                      {cred.device_label || "Unknown device"}
                    </span>
                    <button
                      onClick={() => handleRemoveCredential(cred)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Remove device"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="destructive" size="sm" disabled={loading} onClick={handleDisable} className="w-full">
            <Unlock className="w-3.5 h-3.5" /> Disable App Lock
          </Button>
        </div>
      )}
    </div>
  );
}

function getDeviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "Apple Device";
  if (/Android/.test(ua)) return "Android Device";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux PC";
  return "This Device";
}