import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { invalidateEntities } from "@/lib/queryInvalidation";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import Input from "@/components/common/Input";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function DataDeletionSection() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const { fiscalYears } = useFinancialYear();
  const queryClient = useQueryClient();

  const [rangeType, setRangeType] = useState("fy");
  const [selectedFY, setSelectedFY] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [deleteTx, setDeleteTx] = useState(true);
  const [deleteEvents, setDeleteEvents] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return [now - 2, now - 1, now, now + 1];
  }, []);

  const dateRange = useMemo(() => {
    if (rangeType === "fy") {
      const fy = fiscalYears.find((f) => f.id === selectedFY);
      if (!fy) return null;
      return { start: fy.start_date, end: fy.end_date, label: fy.label };
    }
    if (rangeType === "month") {
      const start = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
      const end = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`;
      return { start, end, label: `${MONTHS[selectedMonth]} ${selectedYear}` };
    }
    if (rangeType === "year") {
      return { start: `${selectedYear}-01-01`, end: `${selectedYear}-12-31`, label: `Year ${selectedYear}` };
    }
    if (rangeType === "custom") {
      if (!customStart || !customEnd) return null;
      return { start: customStart, end: customEnd, label: `${customStart} to ${customEnd}` };
    }
    return null;
  }, [rangeType, selectedFY, selectedMonth, selectedYear, customStart, customEnd, fiscalYears]);

  const handleDelete = async () => {
    if (!dateRange) {
      toast({ title: "Please select a valid date range", variant: "destructive" });
      return;
    }
    if (confirmText !== "DELETE") {
      toast({ title: 'Type DELETE to confirm', variant: "destructive" });
      return;
    }
    setDeleting(true);
    try {
      let txCount = 0;
      let eventCount = 0;

      if (deleteTx) {
        const txs = await base44.entities.FinancialTransaction.filter({
          workspace_id: workspaceId,
          transaction_date: { $gte: dateRange.start, $lte: dateRange.end }
        });
        if (txs.length > 0) {
          await base44.entities.FinancialTransaction.deleteMany({
            id: { $in: txs.map((t) => t.id) }
          });
          txCount = txs.length;
        }
      }

      if (deleteEvents) {
        const events = await base44.entities.Event.filter({
          workspace_id: workspaceId,
          start_date: { $gte: dateRange.start, $lte: dateRange.end }
        });
        if (events.length > 0) {
          await base44.entities.Event.deleteMany({
            id: { $in: events.map((e) => e.id) }
          });
          eventCount = events.length;
        }
      }

      const parts = [];
      if (txCount > 0) parts.push(`${txCount} transactions`);
      if (eventCount > 0) parts.push(`${eventCount} events`);
      toast({
        title: "Data deleted",
        description: parts.length > 0 ? `Deleted ${parts.join(" and ")} for ${dateRange.label}.` : "No records found in this range."
      });
      invalidateEntities(queryClient, ["FinancialTransaction", "Event", "EventTeamAssignment", "EventDayAssignment", "EventServiceAssignment", "PaymentMilestone"]);
      setConfirming(false);
      setConfirmText("");
    } catch (err) {
      toast({ title: "Deletion failed", description: err?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-card border border-destructive/30 rounded-lg p-5 max-w-lg">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <h3 className="text-sm font-semibold text-destructive">Data Deletion</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Permanently delete records within a date range. This action cannot be undone.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Select Range Type</label>
          <Select value={rangeType} onChange={(e) => setRangeType(e.target.value)} className="w-full">
            <option value="fy">By Financial Year</option>
            <option value="month">By Month</option>
            <option value="year">By Year</option>
            <option value="custom">Custom Range</option>
          </Select>
        </div>

        {rangeType === "fy" && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Financial Year</label>
            <Select value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)} className="w-full">
              <option value="">Select FY…</option>
              {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </Select>
          </div>
        )}

        {rangeType === "month" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Month</label>
              <Select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="w-full">
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Year</label>
              <Select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-full">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
          </div>
        )}

        {rangeType === "year" && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Year</label>
            <Select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-full">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        )}

        {rangeType === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">From Date</label>
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">To Date</label>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        {dateRange && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            Range: <span className="font-medium text-foreground">{dateRange.label}</span>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={deleteTx} onChange={(e) => setDeleteTx(e.target.checked)} className="rounded" />
            <span className="text-sm">Delete financial transactions in this range</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={deleteEvents} onChange={(e) => setDeleteEvents(e.target.checked)} className="rounded" />
            <span className="text-sm text-destructive">Delete events in this range (irreversible)</span>
          </label>
        </div>

        {!confirming ? (
          <Button variant="destructive" size="sm" onClick={() => setConfirming(true)} disabled={!dateRange || (!deleteTx && !deleteEvents)}>
            <Trash2 className="w-3.5 h-3.5" /> Delete Data
          </Button>
        ) : (
          <div className="space-y-3 p-3 bg-destructive/5 border border-destructive/30 rounded-lg">
            <p className="text-xs text-destructive font-medium">
              ⚠ This will permanently delete the selected data for {dateRange?.label}. Type DELETE to confirm.
            </p>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" className="max-w-[160px]" />
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting || confirmText !== "DELETE"}>
                {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting…</> : "Confirm Delete"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setConfirming(false); setConfirmText(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}