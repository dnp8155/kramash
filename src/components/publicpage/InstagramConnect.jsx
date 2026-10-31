import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Instagram, Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import Button from "@/components/common/Button";
import { useToast } from "@/components/ui/use-toast";
import { askConfirm } from "@/lib/confirmDialog";
import { instagramStatus, startInstagramConnect, disconnectInstagram } from "@/lib/instagramService";
import { jumpBackAfterOAuth, takeOAuthResult, onOAuthPageShow } from "@/lib/oauthReturn";

const NO_PAGE_MESSAGE = "No Instagram account found. Use an Instagram Business or Creator (professional) account. If it still isn't found, link it to a Facebook Page in Instagram and try again.";
const RETURN_MESSAGES = {
  connected: "Instagram connected",
  denied: "Instagram was not connected. You can try again any time.",
  error: "Couldn't connect Instagram. Please try again.",
};

// My Profile → Instagram: connect (official Instagram login), see who is connected, disconnect. Photos are then
// shown by adding an "Instagram" section below. Only the owner can connect or disconnect.
export default function InstagramConnect({ workspaceId, isOwner, onStatus, children }) {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null); // { configured, connected, needs_reconnect, username }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    instagramStatus(workspaceId)
      .then((s) => { if (!cancelled) { setStatus(s); onStatus?.(s); } })
      .catch(() => { if (!cancelled) setStatus({ error: true }); });
    return () => { cancelled = true; };
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Say what happened: the person comes back with ?instagram=connected|denied|error (and maybe a reason).
  const showResult = (p) => {
    const result = p.get("instagram");
    const reason = p.get("reason");
    const known = reason === "no_page" ? NO_PAGE_MESSAGE : (RETURN_MESSAGES[result] || RETURN_MESSAGES.error);
    // Anything else in "reason" is Facebook's own message, shown so it can be fixed in the Meta app.
    const detail = result === "error" && reason && !["no_page", "server", "expired"].includes(reason) ? `${RETURN_MESSAGES.error} (${reason})` : known;
    toast({ title: detail, variant: result === "connected" ? undefined : "destructive" });
  };
  const tidyAddress = () => {
    const next = new URLSearchParams(window.location.search);
    next.delete("instagram");
    next.delete("reason");
    setSearchParams(next, { replace: true });
  };
  const refreshStatus = () => {
    if (!workspaceId) return;
    instagramStatus(workspaceId).then((s) => { setStatus(s); onStatus?.(s); }).catch(() => {});
  };

  // Coming back from the sign-in: jump back over the Instagram/Facebook pages to the page we left from (so the Back button
  // never lands on a sign-in screen) and show the result there. If no jump is possible, show it right here.
  useEffect(() => {
    if (searchParams.get("instagram")) {
      if (jumpBackAfterOAuth()) {
        // Safety net: if the jump did not happen, still show the result here after a moment.
        const t = setTimeout(() => {
          const saved = takeOAuthResult("instagram");
          if (saved) { showResult(new URLSearchParams(saved)); tidyAddress(); refreshStatus(); }
        }, 2000);
        return () => clearTimeout(t);
      }
      showResult(searchParams);
      tidyAddress();
      return undefined;
    }
    // The page we jumped back to (opened fresh): pick up the saved result.
    const saved = takeOAuthResult("instagram");
    if (saved) showResult(new URLSearchParams(saved));
    // Or restored as it was from the browser's cache: the page is not set up again, so check when it is shown.
    return onOAuthPageShow(() => {
      const again = takeOAuthResult("instagram");
      if (again) { showResult(new URLSearchParams(again)); refreshStatus(); }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async () => {
    setBusy(true);
    try { await startInstagramConnect(workspaceId); }
    catch (e) { toast({ title: e?.message || "Couldn't start the Instagram connection.", variant: "destructive" }); setBusy(false); }
  };
  const disconnect = async () => {
    if (!await askConfirm("Disconnect Instagram? Your Instagram photos will disappear from your public profile until you connect again.", { confirmLabel: "Disconnect", destructive: true })) return;
    setBusy(true);
    try {
      await disconnectInstagram(workspaceId);
      const s = { ...status, connected: false, needs_reconnect: false, username: null };
      setStatus(s); onStatus?.(s);
      toast({ title: "Instagram disconnected" });
    } catch (e) { toast({ title: e?.message || "Couldn't disconnect.", variant: "destructive" }); }
    setBusy(false);
  };

  if (!status) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</div>;
  if (status.error) return <p className="text-xs text-muted-foreground">Couldn't check the Instagram connection. Try again in a moment.</p>;
  if (status.configured === false) return <p className="text-xs text-muted-foreground">Instagram isn't available yet. It is being set up.</p>;

  return (
    <div className="space-y-3">
      {status.connected ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 min-w-0 text-sm text-foreground">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span className="truncate">Connected as <b>@{status.username}</b></span>
          </div>
          {isOwner && <Button variant="outline" size="sm" onClick={disconnect} disabled={busy}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Disconnect"}</Button>}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
            {status.needs_reconnect ? <AlertTriangle className="w-4 h-4 text-warning shrink-0" /> : <Instagram className="w-4 h-4 shrink-0" />}
            <span>{status.needs_reconnect ? `The connection to @${status.username || "your account"} has expired. Connect again.` : "Not connected"}</span>
          </div>
          {isOwner
            ? <Button size="sm" onClick={connect} disabled={busy}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Instagram className="w-3.5 h-3.5" /> {status.needs_reconnect ? "Reconnect" : "Connect"}</>}</Button>
            : <span className="text-[11px] text-muted-foreground shrink-0">Owner only</span>}
        </div>
      )}
      {status.connected && children}
      {!status.connected && (
        <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-[11px] text-muted-foreground leading-relaxed">
          <Info className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground mb-0.5">Can't connect? It's a Meta (Instagram) rule, not a Kramasha problem.</p>
            Sign in with Instagram and allow Kramasha to read your photos. Meta only allows this for an Instagram <b>Professional account</b>, which is Instagram's name for both <b>Business</b> and <b>Creator</b> accounts. A personal account won't connect. To switch, open Instagram → Settings → Account type and tools → switch to a professional account (it's free). If sign-in still says no account was found, link a Facebook Page to your Instagram account (Edit profile → Page) and try again.
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Business and Creator accounts are free to switch to. Kramasha can only read your photos; it can never post or change anything.
      </p>
    </div>
  );
}
