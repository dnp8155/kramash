import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Toggle from "@/components/common/Toggle";
import Select from "@/components/common/Select";
import Input from "@/components/common/Input";
import { hashPassword } from "@/lib/appLockPassword";
import PasskeySection from "@/components/settings/PasskeySection";
import { Shield, Lock, Unlock, Loader2, Eye, EyeOff } from "lucide-react";

function getUserField(user, field, defaultValue) {
  if (user && user[field] !== undefined && user[field] !== null) return user[field];
  if (user?.data && user.data[field] !== undefined && user.data[field] !== null) return user.data[field];
  return defaultValue;
}

export default function SecuritySection() {
  const { user, checkUserAuth } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const appLockEnabled = getUserField(user, "app_lock_enabled", false);
  const hasPassword = !!getUserField(user, "app_lock_password_hash", "");
  const relockAfter = Number(getUserField(user, "app_lock_relock_after", 0));

  const handleEnable = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast({ title: "Password too short", description: "Use at least 4 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const hash = await hashPassword(newPassword);
      await base44.auth.updateMe({ app_lock_enabled: true, app_lock_password_hash: hash });
      await checkUserAuth();
      setNewPassword(""); setConfirmPassword(""); setShowSetup(false);
      toast({ title: "App Lock enabled", description: "Your password has been set." });
    } catch (e) {
      toast({ title: "Setup failed", description: e?.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleDisable = async () => {
    if (!window.confirm("Disable App Lock? You can re-enable it anytime.")) return;
    setLoading(true);
    try {
      await base44.auth.updateMe({ app_lock_enabled: false, app_lock_password_hash: "" });
      await checkUserAuth();
      toast({ title: "App Lock disabled" });
    } catch (e) {
      toast({ title: "Failed to disable", description: e?.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast({ title: "Password too short", description: "Use at least 4 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const hash = await hashPassword(newPassword);
      await base44.auth.updateMe({ app_lock_password_hash: hash });
      await checkUserAuth();
      setNewPassword(""); setConfirmPassword(""); setShowSetup(false);
      toast({ title: "Password updated" });
    } catch (e) {
      toast({ title: "Failed to update", description: e?.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleRelockChange = async (val) => {
    try {
      await base44.auth.updateMe({ app_lock_relock_after: Number(val) });
      await checkUserAuth();
    } catch (e) {
      toast({ title: "Failed to save", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-card border border-border rounded-lg p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" /> App Lock
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Require a password to open the app.</p>
          </div>
          <div className="flex items-center gap-2">
            {appLockEnabled && hasPassword && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-success/10 text-success px-1.5 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Active
              </span>
            )}
            <Toggle checked={appLockEnabled && hasPassword} onChange={appLockEnabled && hasPassword ? handleDisable : () => setShowSetup(true)} label="App Lock" disabled={loading} />
          </div>
        </div>

        {appLockEnabled && hasPassword ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Re-lock after</label>
              <Select value={String(relockAfter)} onChange={(e) => handleRelockChange(e.target.value)} className="w-full">
                <option value="0">On tab close</option>
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">The app will re-lock automatically after the selected period of inactivity.</p>
            </div>

            {!showSetup ? (
              <Button variant="outline" size="sm" onClick={() => setShowSetup(true)} className="w-full">Change password</Button>
            ) : (
              <div className="space-y-3 p-3 rounded-lg bg-muted/40">
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" disabled={loading} onClick={handleChangePassword} className="flex-1">
                    {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : "Save password"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowSetup(false); setNewPassword(""); setConfirmPassword(""); }}>Cancel</Button>
                </div>
              </div>
            )}

            <Button variant="destructive" size="sm" disabled={loading} onClick={handleDisable} className="w-full">
              <Unlock className="w-3.5 h-3.5" /> Disable App Lock
            </Button>
          </div>
        ) : showSetup ? (
          <div className="space-y-3 p-3 rounded-lg bg-muted/40">
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set password" className="pr-10" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" />
            <p className="text-xs text-muted-foreground">Use at least 4 characters. You'll need this password every time you open the app.</p>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={loading} onClick={handleEnable} className="flex-1">
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enabling…</> : "Enable App Lock"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowSetup(false); setNewPassword(""); setConfirmPassword(""); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enable App Lock to require a password when opening the app. This protects your data on shared devices.
          </p>
        )}
      </div>
      <PasskeySection />
    </div>
  );
}