import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import Input from "@/components/common/Input";
import { useToast } from "@/components/ui/use-toast";
import { X, Ban } from "lucide-react";

const REASONS = ["Leave", "Sick", "Personal", "Holiday", "Other"];

export default function BlockDateDialog({ open, onClose, onSaved, workspaceId, members, preselectedMemberId = null, preselectedDate = null }) {
  const [memberId, setMemberId] = useState(preselectedMemberId || "");
  const [startDate, setStartDate] = useState(preselectedDate || "");
  const [endDate, setEndDate] = useState(preselectedDate || "");
  const [reason, setReason] = useState("Leave");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setMemberId(preselectedMemberId || "");
      setStartDate(preselectedDate || "");
      setEndDate(preselectedDate || "");
      setReason("Leave");
      setError("");
    }
  }, [open, preselectedMemberId, preselectedDate]);

  if (!open) return null;

  const activeMembers = members.filter((m) => m.status === "active");

  const submit = async () => {
    setError("");
    if (!memberId) { setError("Please select a team member."); return; }
    if (!startDate) { setError("Start date is required."); return; }
    if (endDate && endDate < startDate) { setError("End date cannot be before start date."); return; }
    setSaving(true);
    try {
      await base44.entities.TeamBlockDate.create({
        workspace_id: workspaceId,
        team_member_id: memberId,
        start_date: startDate,
        end_date: endDate || startDate,
        reason,
        status: "active"
      });
      toast({ title: "Dates blocked", description: "Team member marked unavailable." });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e?.message || "Failed to block dates.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-warning" />
            <h2 className="text-base font-bold text-foreground">Block Dates</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
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
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
            {saving ? "Blocking…" : "Block Dates"}
          </Button>
        </div>
      </div>
    </div>
  );
}