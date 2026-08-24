import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import SummaryCard from "@/components/financial/SummaryCard";
import PaymentTable from "@/components/financial/PaymentTable";
import RecordPaymentDialog from "@/components/financial/RecordPaymentDialog";
import RecordExpenseDialog from "@/components/financial/RecordExpenseDialog";
import EditTransactionDialog from "@/components/financial/EditTransactionDialog";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import LoadingState from "@/components/common/LoadingState";
import { useToast } from "@/components/ui/use-toast";
import { PAYMENT_METHODS, PAYMENT_TYPES } from "@/constants/statusConfig";
import {
  currentFinancialYearLabel,
  financialYearLabels,
  fyLabelForDate,
  TRANSACTION_TYPES
} from "@/constants/financeConfig";
import {
  loadAllTransactions,
  ensureDefaultExpenseCategories,
  loadExpenseCategories,
  totalReceived,
  totalPaid,
  actualProfit,
  methodBreakdown
} from "@/lib/financeService";
import { formatMoney } from "@/utils/format";
import { Download, Plus, Wallet, Receipt, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = ["Payment Activity", "Financial Years"];

export default function Financial() {
  const { workspace, workspaceId } = useWorkspace();
  const { toast } = useToast();
  const currency = workspace?.currency || "INR";

  const [tab, setTab] = useState("Payment Activity");
  const [method, setMethod] = useState("All");
  const [type, setType] = useState("All");
  const [fy, setFy] = useState(currentFinancialYearLabel());

  const [allTx, setAllTx] = useState([]);
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showClientPayment, setShowClientPayment] = useState(false);
  const [showTeamPayment, setShowTeamPayment] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [editing, setEditing] = useState(null);
  const [voiding, setVoiding] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      await ensureDefaultExpenseCategories(workspaceId);
      const [tx, evs, cls, membs, asgns, cats] = await Promise.all([
        loadAllTransactions(workspaceId),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
        loadExpenseCategories(workspaceId)
      ]);
      setAllTx(tx);
      setEvents(evs || []);
      setClients(cls || []);
      setMembers(membs || []);
      setAssignments(asgns || []);
      setCategories(cats);
    } catch (e) {
      setAllTx([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const clientsById = useMemo(() => {
    const m = {}; clients.forEach((c) => { m[c.id] = c; }); return m;
  }, [clients]);
  const membersById = useMemo(() => {
    const m = {}; members.forEach((x) => { m[x.id] = x; }); return m;
  }, [members]);
  const eventsById = useMemo(() => {
    const m = {}; events.forEach((e) => { m[e.id] = e; }); return m;
  }, [events]);

  // FY-filtered transactions (active + void, for the activity list; totals use active only).
  const fyTx = useMemo(() => {
    const r = financialYearLabels(6).find((l) => l === fy) ? fy : null;
    return allTx.filter((t) => {
      if (r && fyLabelForDate(t.transaction_date) !== r) return false;
      if (method !== "All") {
        const cat = t.payment_method === "Cash" ? "Cash" : "Online";
        if (cat !== method) return false;
      }
      if (type !== "All") {
        if (type === "Received" && t.transaction_type !== "CLIENT_RECEIPT") return false;
        if (type === "Paid" && t.transaction_type === "CLIENT_RECEIPT") return false;
      }
      return true;
    });
  }, [allTx, fy, method, type]);

  // Active transactions within the selected FY for totals.
  const activeFyTx = useMemo(() => fyTx.filter((t) => t.status === "ACTIVE"), [fyTx]);

  const summary = useMemo(() => ({
    received: totalReceived(activeFyTx),
    paid: totalPaid(activeFyTx),
    profit: actualProfit(activeFyTx)
  }), [activeFyTx]);

  const breakdown = useMemo(() => methodBreakdown(activeFyTx), [activeFyTx]);

  // Per-FY breakdown for the Financial Years tab.
  const fyBreakdown = useMemo(() => {
    const map = {};
    for (const t of allTx) {
      if (t.status !== "ACTIVE") continue;
      const label = fyLabelForDate(t.transaction_date);
      if (!label) continue;
      if (!map[label]) map[label] = { received: 0, paid: 0 };
      if (t.transaction_type === "CLIENT_RECEIPT") map[label].received += Number(t.amount) || 0;
      else map[label].paid += Number(t.amount) || 0;
    }
    return financialYearLabels(6).map((label) => ({
      label,
      ...(map[label] || { received: 0, paid: 0 })
    }));
  }, [allTx]);

  const handleVoid = async () => {
    if (!voiding) return;
    try {
      await base44.entities.FinancialTransaction.update(voiding.id, { status: "VOID" });
      toast({ title: "Transaction voided", description: "It no longer counts in financial totals." });
      setVoiding(null);
      load();
    } catch (e) {
      toast({ title: "Failed to void transaction", description: e?.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="p-6"><LoadingState label="Loading financial activity…" /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 border-b border-border w-full sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowExpense(true)}>
            <Receipt className="w-3.5 h-3.5" /> Record Expense
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTeamPayment(true)}>
            <Wallet className="w-3.5 h-3.5" /> Team Payment
          </Button>
          <Button size="sm" onClick={() => setShowClientPayment(true)}>
            <Plus className="w-3.5 h-3.5" /> Record Payment
          </Button>
        </div>
      </div>

      {tab === "Payment Activity" && (
        <>
          {/* Showing / export */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Showing</span>
            <Select value={fy} onChange={(e) => setFy(e.target.value)} size="sm">
              {financialYearLabels(6).map((l) => (
                <option key={l} value={l}>{l.replace("FY ", "April ")} - March {("20" + l.split("-")[1])}</option>
              ))}
            </Select>
            <Button variant="outline" size="sm" className="ml-auto" disabled>
              <Download className="w-3.5 h-3.5" />
              Export to Excel
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard label="Received" value={summary.received} tone="success" currency={currency} />
            <SummaryCard label="Paid" value={summary.paid} tone="destructive" currency={currency} />
            <SummaryCard label="Profit" value={summary.profit} tone={summary.profit >= 0 ? "success" : "destructive"} currency={currency} />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Online</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rcvd</span>
                <span className="font-medium text-success">{formatMoney(breakdown.online.received, currency)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-destructive">{formatMoney(breakdown.online.paid, currency)}</span>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cash</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rcvd</span>
                <span className="font-medium text-success">{formatMoney(breakdown.cash.received, currency)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-destructive">{formatMoney(breakdown.cash.paid, currency)}</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">Method</span>
              <div className="flex gap-1 bg-muted p-0.5 rounded-md">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-colors",
                      method === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">Type</span>
              <div className="flex gap-1 bg-muted p-0.5 rounded-md">
                {PAYMENT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-colors",
                      type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <PaymentTable
            transactions={fyTx}
            display={{ eventsById, clientsById, membersById }}
            currency={currency}
            onEdit={(t) => setEditing(t)}
            onVoid={(t) => setVoiding(t)}
          />
        </>
      )}

      {tab === "Financial Years" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Financial Year</span>
            <span className="text-right">Received</span>
            <span className="text-right">Paid</span>
            <span className="text-right">Profit</span>
          </div>
          {fyBreakdown.map((row) => {
            const profit = row.received - row.paid;
            return (
              <div
                key={row.label}
                className={cn(
                  "grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40",
                  row.label === fy && "bg-primary/5"
                )}
              >
                <button
                  onClick={() => { setFy(row.label); setTab("Payment Activity"); }}
                  className="text-sm font-medium text-primary text-left hover:underline"
                >
                  {row.label}
                </button>
                <span className="text-sm text-success text-right">{formatMoney(row.received, currency)}</span>
                <span className="text-sm text-destructive text-right">{formatMoney(row.paid, currency)}</span>
                <span className={cn("text-sm font-semibold text-right", profit >= 0 ? "text-success" : "text-destructive")}>
                  {formatMoney(profit, currency)}
                </span>
              </div>
            );
          })}
          {fyBreakdown.every((r) => r.received === 0 && r.paid === 0) && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No financial activity recorded yet.
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <RecordPaymentDialog
        open={showClientPayment}
        onClose={() => setShowClientPayment(false)}
        onSaved={load}
        mode="client"
        workspaceId={workspaceId}
        currency={currency}
        events={events}
        clientsById={clientsById}
      />
      <RecordPaymentDialog
        open={showTeamPayment}
        onClose={() => setShowTeamPayment(false)}
        onSaved={load}
        mode="team"
        workspaceId={workspaceId}
        currency={currency}
        events={events}
        assignments={assignments}
        membersById={membersById}
      />
      <RecordExpenseDialog
        open={showExpense}
        onClose={() => setShowExpense(false)}
        onSaved={load}
        workspaceId={workspaceId}
        currency={currency}
        events={events}
        categories={categories}
      />
      <EditTransactionDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={load}
        transaction={editing}
        currency={currency}
      />

      {/* Void confirmation */}
      {voiding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setVoiding(null)}>
          <div className="bg-card border border-border rounded-lg max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold">Void this transaction?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {TRANSACTION_TYPES[voiding.transaction_type]?.label} of {formatMoney(voiding.amount, currency)} on {voiding.transaction_date}.
                  Voided transactions are excluded from all totals but remain in history.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setVoiding(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleVoid}>Void</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}