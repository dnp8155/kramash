import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntities } from "@/lib/queryInvalidation";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle,
  AppDialogDescription, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import {
  Share2, Users, User, Copy, CheckCircle2, Loader2, ArrowLeft, Link2, Lock
} from "lucide-react";

// Event share dialog — opens with two options:
// 1. Share to Team → enables password-protected portal for all assigned team members
// 2. Share to Client → enables password-protected portal for the event's client
// Generated links + passwords are shown for copying. Since portal access is stored
// on the TeamMember and Client entities, the Team page and Clients page reflect the
// changes automatically.
export default function EventShareDialog({
  open, onClose, event, client, assignments, membersById, workspaceId
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(null); // null | "team" | "client"
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const reset = () => {
    setMode(null);
    setResults([]);
    setBusy(false);
    setCopiedIdx(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const copy = (value, idx) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const shareToTeam = async () => {
    setBusy(true);
    setResults([]);
    try {
      const teamAssignments = (assignments || []).filter(
        (a) => a.assignment_status !== "removed" && a.event_id === event?.id
      );
      const members = teamAssignments
        .map((a) => membersById[a.team_member_id])
        .filter((m) => m && !m.is_self);

      if (members.length === 0) {
        toast({ title: "No team members to share with", description: "Assign team members to this project first.", variant: "destructive" });
        setBusy(false);
        return;
      }

      const resultsList = [];
      for (const m of members) {
        try {
          const res = await base44.functions.invoke("enableTeamPortalAccess", {
            team_member_id: m.id,
            workspace_id: workspaceId,
            action: "enable"
          });
          const d = res?.data || res;
          resultsList.push({
            name: m.name,
            loginUrl: d.login_url || `${window.location.origin}/team-login/${d.access_token || ""}`,
            password: d.password || "",
            alreadyEnabled: false
          });
        } catch (e) {
          // If already enabled, we still want to show the link
          if (m.portal_access_enabled && m.portal_access_token) {
            resultsList.push({
              name: m.name,
              loginUrl: `${window.location.origin}/team-login/${m.portal_access_token}`,
              password: "",
              alreadyEnabled: true
            });
          }
        }
      }

      setResults(resultsList);
      invalidateEntities(queryClient, ["TeamMember"]);
      toast({ title: `Portal access enabled for ${resultsList.length} team member(s)` });
    } catch (e) {
      toast({ title: "Failed to share", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const shareToClient = async () => {
    if (!client) {
      toast({ title: "No client", description: "This project has no client assigned.", variant: "destructive" });
      return;
    }
    setBusy(true);
    setResults([]);
    try {
      const res = await base44.functions.invoke("enableClientPortalAccess", {
        client_id: client.id,
        workspace_id: workspaceId,
        action: "enable"
      });
      const d = res?.data || res;
      setResults([{
        name: client.name,
        loginUrl: d.login_url || `${window.location.origin}/client-login/${d.access_token || ""}`,
        password: d.password || "",
        alreadyEnabled: false
      }]);
      invalidateEntities(queryClient, ["Client"]);
      toast({ title: "Portal access enabled for client" });
    } catch (e) {
      // If already enabled, show existing link
      if (client.portal_access_enabled && client.portal_access_token) {
        setResults([{
          name: client.name,
          loginUrl: `${window.location.origin}/client-login/${client.portal_access_token}`,
          password: "",
          alreadyEnabled: true
        }]);
      } else {
        toast({ title: "Failed to share", description: e?.data?.error || e?.message, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSelect = (selected) => {
    setMode(selected);
    if (selected === "team") shareToTeam();
    if (selected === "client") shareToClient();
  };

  return (
    <AppDialog open={open} onOpenChange={handleClose}>
      <AppDialogContent maxWidth="max-w-lg">
        <AppDialogHeader>
          <AppDialogTitle>Share Link</AppDialogTitle>
          <AppDialogDescription>
            Generate a password-protected portal link for your team or client.
          </AppDialogDescription>
        </AppDialogHeader>

        <AppDialogBody>
          {/* Step 1: Choose option */}
          {!mode && (
            <div className="space-y-3">
              <button
                onClick={() => handleSelect("team")}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">Share to Team</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generate password-protected portal links for all assigned team members.
                  </p>
                </div>
                <Share2 className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
              </button>

              <button
                onClick={() => handleSelect("client")}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-success" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">Share to Client</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generate a password-protected portal link for this client.
                  </p>
                </div>
                <Share2 className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
              </button>
            </div>
          )}

          {/* Step 2: Loading */}
          {mode && busy && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {mode === "team" ? "Generating team portal links…" : "Generating client portal link…"}
              </p>
            </div>
          )}

          {/* Step 3: Results */}
          {mode && !busy && results.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => { reset(); }}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to options
              </button>

              {results.map((r, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2.5 bg-muted/20">
                  <div className="flex items-center gap-2">
                    {mode === "team" ? <Users className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-success" />}
                    <span className="text-sm font-semibold text-foreground">{r.name}</span>
                    {r.alreadyEnabled && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">Already Active</span>
                    )}
                  </div>

                  {/* Link */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> Portal Link
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={r.loginUrl}
                        onClick={(e) => e.target.select()}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground font-mono truncate"
                      />
                      <Button size="sm" variant="outline" onClick={() => copy(r.loginUrl, `link-${i}`)} className="shrink-0 px-2.5">
                        {copiedIdx === `link-${i}` ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Password */}
                  {r.password && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Password
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={r.password}
                          onClick={(e) => e.target.select()}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground font-mono"
                        />
                        <Button size="sm" variant="outline" onClick={() => copy(r.password, `pw-${i}`)} className="shrink-0 px-2.5">
                          {copiedIdx === `pw-${i}` ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  {r.alreadyEnabled && (
                    <p className="text-[11px] text-muted-foreground">
                      Portal was already active. Password was shown when first generated — regenerate from the {mode === "team" ? "Team Member" : "Client"} details page if needed.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty result (no team members) */}
          {mode === "team" && !busy && results.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No assignable team members found for this project.</p>
              <button onClick={reset} className="mt-3 text-xs text-primary hover:underline">Back to options</button>
            </div>
          )}
        </AppDialogBody>

        <AppDialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}