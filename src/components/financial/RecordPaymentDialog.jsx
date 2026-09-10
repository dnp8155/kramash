import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_LIST } from "@/constants/financeConfig";
import {
  verifyClientPaymentRefs, verifyTeamPaymentRefs
} from "@/lib/financeService";
import { resolveFYForDate } from "@/lib/financialYearService";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { formatMoney } from "@/utils/format";
import { todayISO } from "@/lib/dates";
import { isSelfMember } from "@/lib/teamService";
import { AlertTriangle, Crown } from "lucide-react";

// Unified dialog for recording a Client Payment or a Team Payment.
// mode = "client" | "team"
export default function RecordPaymentDialog({
  open, onClose, onSaved,
  mode = "client",
  workspaceId, currency = "INR",
  events = [],
  clientsById = {},
  assignments = [],
  membersById = {},
  preselectedEventId = "",
  preselectedClientId = "",
  preselectedAssignmentId = ""
}) {
  const [eventId, setEventId] = useState("");
  const [clientId, setClientId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { fiscalYears } = useFinancialYear();

  useEffect(() => {
    if (open) {
      setError("");
      setEventId(preselectedEventId || "");
      setClientId(preselectedClientId || "");
      setAssignmentId(preselectedAssignmentId || "");
      setAmount("");
      setDate(todayISO());
      setMethod("Cash");
      setReference("");
      setNotes("");
    }
  }, [open, preselectedEventId, preselectedClientId, preselectedAssignmentId]);

  // When event changes in client mode, derive client from the event.
  useEffect(() => {
    if (mode === "client" && eventId) {
      const ev = events.find((e) => e.id === eventId);
      setClientId(ev?.client_id || "");
    }
  }, [eventId, mode, events]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === eventId),
    [events, eventId]
  );

  // Team mode: assignments for the selected event (exclude Self/owner — no payment).
  const eventAssignments = useMemo(() => {
    if (mode !== "team" || !eventId) return [];
    return assignments.filter((a) => {
      if (a.event_id !== eventId || a.assignment_status === "removed") return false;
      const m = membersById[a.team_member_id];
      return !isSelfMember(m);
    });
  }, [mode, eventId, assignments, membersById]);

  const selectedAssignment = useMemo(
    () => eventAssignments.find((a) => a.id === assignmentId),
    [eventAssignments, assignmentId]
  );

  const validate = () => {
    if (!eventId) return "Please select an event.";
    if (mode === "client" && !clientId) return "This event has no client linked. Add a client first.";
    if (mode === "team" && !assignmentId) return "Please select a team assignment.";
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) return "Amount must be greater than zero.";
    if (!date) return "Please select a payment date.";
    if (!method) return "Please select a payment method.";
    // Validate FY exists for this date
    const fy = resolveFYForDate(date, fiscalYears);
    if (!fy) return "No Financial Year is available for this transaction date. Please create the applicable Financial Year first.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true);
    setError("");
    try {
      const amt = Number(amount);
      let ok = true;
      if (mode === "client") {
        ok = await verifyClientPaymentRefs(workspaceId, eventId, clientId);
      } else {
        const a = selectedAssignment;
        ok = await verifyTeamPaymentRefs(workspaceId, eventId, assignmentId, a.team_member_id);
      }
      if (!ok) {
        setError("This payment could not be linked to the selected event. Please verify your selection.");
        setSaving(false);
        return;
      }
      // Resolve and attach FY based on transaction date
      const fy = resolveFYForDate(date, fiscalYears);
      if (!fy) {
        setError("No Financial Year is available for this transaction date. Please create the applicable Financial Year first.");
        setSaving(false);
        return;
      }
      let saved;
      if (mode === "client") {
        saved = await base44.entities.FinancialTransaction.create({
          workspace_id: workspaceId,
          financial_year_id: fy.id,
          event_id: eventId,
          transaction_type: "CLIENT_RECEIPT",
          client_id: clientId,
          amount: amt,
          payment_method: method,
          transaction_date: date,
          reference_number: reference.trim(),
          notes: notes.trim(),
          status: "ACTIVE"
        });
      } else {
        // Team payments go through the backend for SELF guard protection
        const a = selectedAssignment;
        saved = await base44.functions.invoke("recordPayment", {
          kind: "team",
          workspace_id: workspaceId,
          event_id: eventId,
          assignment_id: assignmentId,
          team_member_id: a.team_member_id,
          amount: amt,
          payment_method: method,
          transaction_date: date,
          reference_number: reference.trim(),
          notes: notes.trim(),
          financial_year_id: fy.id
        });
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to record payment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "client" ? "Record Client Payment" : "Record Team Payment";
  const description = mode === "client"
    ? "Record money received from a client for an event."
    : "Record money paid to a team member for an assignment.";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Event <span className="text-destructive">*</span></Label>
            <Select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full">
              <option value="">Select an event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </Select>
          </div>

          {mode === "client" && (
            <div className="space-y-1.5">
              <Label>Client</Label>
              <div className="h-9 px-3 flex items-center rounded-md border border-input bg-muted/40 text-sm text-foreground">
                {clientId ? (clientsById[clientId]?.name || "Client") : "— derived from event —"}
              </div>
              {selectedEvent && !selectedEvent.client_id && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> This event has no client linked.
                </p>
              )}
            </div>
          )}

          {mode === "team" && (
            <div className="space-y-1.5">
              <Label>Team Assignment <span className="text-destructive">*</span></Label>
              <Select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className="w-full" disabled={!eventId}>
                <option value="">{eventId ? "Select an assignment" : "Select an event first"}</option>
                {eventAssignments.map((a) => {
                  const m = membersById[a.team_member_id];
                  return (
                    <option key={a.id} value={a.id}>
                      {m?.name || "Unknown"} — {a.role_name_snapshot || "—"} ({formatMoney(a.agreed_rate, currency)})
                    </option>
                  );
                })}
                {eventId && assignments.some((a) => a.event_id === eventId && a.assignment_status !== "removed" && isSelfMember(membersById[a.team_member_id])) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Crown className="w-3 h-3 text-primary" /> Owner (Self) assignments are excluded — owner share is not paid externally.
                  </p>
                )}
              </Select>
              {eventId && eventAssignments.length === 0 && (
                <p className="text-xs text-muted-foreground">No active team assignments for this event.</p>
              )}
              {selectedAssignment && (
                <p className="text-xs text-muted-foreground">
                  Agreed rate: {formatMoney(selectedAssignment.agreed_rate, currency)} · {selectedAssignment.rate_type}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount ({currency}) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment Method <span className="text-destructive">*</span></Label>
              <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full">
                {PAYMENT_METHOD_LIST.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference No.</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}