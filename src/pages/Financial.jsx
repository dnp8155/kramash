import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import SummaryCard from "@/components/financial/SummaryCard";
import { TrendingUp, TrendingDown, ArrowDownLeft } from "lucide-react";
import PaymentTable from "@/components/financial/PaymentTable";
import RecordPaymentDialog from "@/components/financial/RecordPaymentDialog";
import RecordExpenseDialog from "@/components/financial/RecordExpenseDialog";
import EditTransactionDialog from "@/components/financial/EditTransactionDialog";
import OutstandingReceivables from "@/components/financial/OutstandingReceivables";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import LoadingState from "@/components/common/LoadingState";
import { StatGridSkeleton, TableSkeleton } from "@/components/common/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Download, Plus, Wallet, Receipt, AlertTriangle, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportFinancialCsv } from "@/lib/exportUtils";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/hooks/useT";

const TAB_KEYS = ["Payment Activity", "Financial Years"];

export default function Financial() {
  const { workspace, workspaceId } = useWorkspace();
  const { toast } = useToast();
  const currency = workspace?.currency || "INR";
  const t = useT();
  const tabs = TAB_KEYS;

  const [tab, setTab] = useState("Payment Activity");
  const [method, setMethod] = useState("All");
  const [type, setType] = useState("All");
  const [fy, setFy] = useState(currentFinancialYearLabel());

  const [showClientPayment, setShowClientPayment] = useState(false);
  const [showTeamPayment, setShowTeamPayment] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [editing, setEditing] = useState(null);
  const [voiding, setVoiding] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["financial", workspaceId],
    queryFn: async () => {
      await ensureDefaultExpenseCategories(workspaceId);
      const [tx, evs, cls, membs, asgns, cats] = await Promise.all([
        loadAllTransactions(workspaceId),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
        loadExpenseCategories(workspaceId)
      ]);
      return { allTx: tx || [], events: evs || [], clients: cls || [], members: membs || [], assignments: asgns || [], categories: cats || [] };
    },
    enabled: !!workspaceId
  });
  const allTx = data?.allTx || [];
  const events = data?.events || [];
  const clients = data?.clients || [];
  const members = data?.members || [];
  const assignments = data?.assignments || [];
  const categories = data?.categories || [];
  const load = () => queryClient.invalidateQueries({ queryKey: ["financial", workspaceId] });

  useEffect(() => {
    if (error) toast({ title: t("Failed to load financial activity"), description: error?.message, variant: "destructive" });
  }, [error, toast]);

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
      toast({ title: t("Transaction voided"), description: t("It no longer counts in financial totals.") });
      setVoiding(null);
      load();
    } catch (e) {
      toast({ title: t("Failed to void transaction"), description: e?.message, variant: "destructive" });
    }
  };

  if (isLoading) return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title={t("Financial")} subtitle={t("Track payments, expenses, and profit across financial years.")} />
      <div className="h-10" />
      <StatGridSkeleton count={3} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      <TableSkeleton />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title={t("Financial")} subtitle={t("Track payments, expenses, and profit across financial years.")} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg w-full sm:w-auto">
          {tabs.map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 sm:flex-initial",
                tab === tabKey
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(tabKey)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowExpense(true)}>
            <Receipt className="w-3.5 h-3.5" /> {t("Record Expense")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTeamPayment(true)}>
            <Wallet className="w-3.5 h-3.5" /> {t("Team Payment")}
          </Button>
          <Button size="sm" onClick={() => setShowClientPayment(true)}>
            <Plus className="w-3.5 h-3.5" /> {t("Record Payment")}
          </Button>
        </div>
      </div>

      {tab === "Payment Activity" && (
        <>
          {/* Showing / export */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Showing")}</span>
            <Select value={fy} onChange={(e) => setFy(e.target.value)} size="sm">
              {financialYearLabels(6).map((l) => (
                <option key={l} value={l}>{l.replace("FY ", "April ")} - March {("20" + l.split("-")[1])}</option>
              ))}
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="sm:ml-auto"
              onClick={() => exportFinancialCsv(fyTx, { eventsById, clientsById, membersById }, currency, fy)}
              disabled={fyTx.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("Export to Excel")}</span>
              <span className="sm:hidden">{t("Export")}</span>
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard label={t("Received")} value={summary.received} tone="success" currency={currency} icon={ArrowDownLeft} />
            <SummaryCard label={t("Paid")} value={summary.paid} tone="destructive" currency={currency} icon={TrendingDown} />
            <SummaryCard label={t("Profit")} value={summary.profit} tone={summary.profit >= 0 ? "success" : "destructive"} currency={currency} icon={TrendingUp} />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Online")}</div>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{t("Received")}</span>
                <span className="font-medium text-success">{formatMoney(breakdown.online.received, currency)}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{t("Paid")}</span>
                <span className="font-medium text-destructive">{formatMoney(breakdown.online.paid, currency)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 mt-1 border-t border-border">
                <span className="font-medium text-foreground">{t("Net")}</span>
                <span className={cn("font-semibold", breakdown.online.received - breakdown.online.paid >= 0 ? "text-success" : "text-destructive")}>
                  {formatMoney(breakdown.online.received - breakdown.online.paid, currency)}
                </span>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Cash")}</div>
                <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-warning" />
                </div>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{t("Received")}</span>
                <span className="font-medium text-success">{formatMoney(breakdown.cash.received, currency)}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{t("Paid")}</span>
                <span className="font-medium text-destructive">{formatMoney(breakdown.cash.paid, currency)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 mt-1 border-t border-border">
                <span className="font-medium text-foreground">{t("Net")}</span>
                <span className={cn("font-semibold", breakdown.cash.received - breakdown.cash.paid >= 0 ? "text-success" : "text-destructive")}>
                  {formatMoney(breakdown.cash.received - breakdown.cash.paid, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">{t("Method")}</span>
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
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">{t("Type")}</span>
              <div className="flex gap-1 bg-muted p-0.5 rounded-md">
                {PAYMENT_TYPES.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setType(pt)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded transition-colors",
                      type === pt ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {pt}
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

          {/* Outstanding receivables across all events (not FY-filtered) */}
          <OutstandingReceivables
            events={events}
            transactions={allTx}
            clients={clients}
            currency={currency}
          />
        </>
      )}

      {tab === "Financial Years" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>{t("Financial Year")}</span>
            <span className="text-right">{t("Received")}</span>
            <span className="text-right">{t("Paid")}</span>
            <span className="text-right">{t("Profit")}</span>
          </div>
          {fyBreakdown.map((row) => {
            const profit = row.received - row.paid;
            return (
              <div
                key={row.label}
                className={cn(
                  "grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr] gap-2 sm:gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40",
                  row.label === fy && "bg-primary/5"
                )}
              >
                <button
                  onClick={() => { setFy(row.label); setTab("Payment Activity"); }}
                  className="text-sm font-medium text-primary text-left hover:underline col-span-2 sm:col-span-1"
                >
                  {row.label}
                </button>
                <div className="sm:contents">
                  <div className="flex sm:block justify-between">
                    <span className="sm:hidden text-xs text-muted-foreground">{t("Rec")}</span>
                    <span className="text-sm text-success sm:text-right">{formatMoney(row.received, currency)}</span>
                  </div>
                  <div className="flex sm:block justify-between">
                    <span className="sm:hidden text-xs text-muted-foreground">{t("Paid")}</span>
                    <span className="text-sm text-destructive sm:text-right">{formatMoney(row.paid, currency)}</span>
                  </div>
                  <div className="flex sm:block justify-between">
                    <span className="sm:hidden text-xs text-muted-foreground">{t("Profit")}</span>
                    <span className={cn("text-sm font-semibold sm:text-right", profit >= 0 ? "text-success" : "text-destructive")}>
                      {formatMoney(profit, currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {fyBreakdown.every((r) => r.received === 0 && r.paid === 0) && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {t("No financial activity recorded yet.")}
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
                <h3 className="text-sm font-semibold">{t("Void this transaction?")}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {TRANSACTION_TYPES[voiding.transaction_type]?.label} of {formatMoney(voiding.amount, currency)} on {voiding.transaction_date}.
                  {t("Voided transactions are excluded from all totals but remain in history.")}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setVoiding(null)}>{t("Cancel")}</Button>
              <Button variant="destructive" size="sm" onClick={handleVoid}>{t("Void")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}