import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import Input from "@/components/common/Input";
import { useToast } from "@/components/ui/use-toast";
import { Ban } from "lucide-react";
import { todayISO } from "@/lib/dates";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";

const REASONS = ["Leave", "Sick", "Personal", "Holiday", "Other"];

export default function BlockDateDialog({ open, onClose, onSaved, workspaceId, members, preselectedMemberId = null, preselectedDate = null }) {
  const [memberId, setMemberId] = useState(preselectedMemberId || "");
  const [startDate, setStartDate] = useState(preselectedDate || todayISO());
  const [endDate, setEndDate] = useState(preselectedDate || todayISO());
  const [reason, setReason] = useState("Leave");
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setMemberId(preselectedMemberId || "");
      setStartDate(preselectedDate || todayISO());
      setEndDate(preselectedDate || todayISO());
      setReason("Leave");
      setError("");
    }
  }, [open, preselectedMemberId, preselectedDate]);

  const activeMembers = members.filter((m) => m.status === "active");

  const submit = async () => {
    setError("");
    if (!memberId) { setError("Please select a team member."); return; }
    if (!startDate) { setError("Start date is required."); return; }
    if (endDate && endDate < startDate) { setError("End date cannot be before start date."); return; }
    if (!start()) return;
    try {
      await base44.entities.TeamBlockDate.create({
        workspace_id: workspaceId,
        team_member_id: memberId,
        start_date: startDate,
        end_date: endDate || startDate,
        reason,
        status: "active"
      });
      invalidateEntity(queryClient, "TeamBlockDate");
      toast({ title: "Dates blocked", description: "Team member marked unavailable." });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e?.message || "Failed to block dates.");
    } finally {
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-warning" /> Block Dates
          </AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Team Member *</label>
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full">
              <option value="">Select member…</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.profession ? ` — ${m.profession}` : ""}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">From *</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">To</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Reason</label>
            <Select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full">
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Blocking…" : "Block Dates"}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}