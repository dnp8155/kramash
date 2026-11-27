import { useState } from "react";
import Button from "@/components/common/Button";
import { LogOut, MonitorSmartphone, Loader2, Info } from "lucide-react";
import LogoutConfirmDialog from "@/components/common/LogoutConfirmDialog";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogFooter } from "@/components/ui/AppDialog";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase, ensureFreshSession } from "@/lib/supabaseClient";
import { forgetPushOnOtherDevices } from "@/lib/pushNotifications";

export default function SessionSection() {
  const [showLogout, setShowLogout] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Ends every other sign-in of this account (phones, computers, other browsers); this device stays signed in.
  // Supabase revokes their refresh tokens, so each one is sent to the login page when its current access
  // (up to an hour) runs out. Their push links are removed straight away.
  const logoutOthers = async () => {
    setBusy(true);
    try {
      // Always refresh first (force): if THIS device's own login was already ended (say another device pressed this
      // button), its token can still look valid while Supabase answers 403, which the library reports as success
      // without signing anything out. The forced refresh is refused for a gone login, so we stop with a clear message.
      const fresh = await ensureFreshSession({ force: true });
      if (!fresh.ok) throw new Error(fresh.reason === "network" ? "You seem to be offline. Please try again." : "Please sign in again and retry.");
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      try { await forgetPushOnOtherDevices(user?.id); } catch { /* the sign-outs already went through */ }
      setShowOthers(false);
      toast({ title: "Other devices logged out", description: "They'll be asked to sign in again within the hour. Their notifications have stopped, and come back if they sign in again." });
    } catch (e) {
      toast({ title: "Couldn't log out other devices", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-[15px] p-5 max-w-lg space-y-4">
      <h3 className="text-sm font-semibold">Session</h3>
      <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
      <Button variant="destructive" onClick={() => setShowLogout(true)}>
        <LogOut className="w-4 h-4" /> Log out
      </Button>
      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-sm text-muted-foreground">Signed in on a phone or computer you no longer use? Log out everywhere else. This device stays signed in.</p>
        <Button variant="reset" onClick={() => setShowOthers(true)}>
          <MonitorSmartphone className="w-4 h-4" /> Log out of all other devices
        </Button>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          Notifications stop on those devices at once, and come back by themselves if they sign in again.
        </p>
      </div>
      <LogoutConfirmDialog open={showLogout} onOpenChange={setShowLogout} />
      {/* Same look as the Log out confirm; stays open with a spinner until the sign-outs are done. */}
      <AppDialog open={showOthers} onOpenChange={(v) => { if (!busy) setShowOthers(v); }}>
        <AppDialogContent maxWidth="max-w-sm">
          <AppDialogHeader>
            <AppDialogTitle>Log out of all other devices?</AppDialogTitle>
            <AppDialogDescription>
              Every other phone, computer or browser signed in to your account will be logged out within the hour. This device stays signed in.
            </AppDialogDescription>
          </AppDialogHeader>
          <AppDialogFooter>
            <Button variant="outline" onClick={() => setShowOthers(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={logoutOthers} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MonitorSmartphone className="w-4 h-4" />}
              Log out others
            </Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
}
