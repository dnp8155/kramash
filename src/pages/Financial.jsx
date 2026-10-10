import { useState, useEffect, useMemo } from "react";
import SegmentedTabs from "@/components/common/SegmentedTabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { txInFY, fyHasTransactions, setActiveFY, fyDisplayLabel, txInRange, eventInRange } from "@/lib/financialYearService";
import { formatEventDate } from "@/lib/dates";
import SummaryCard from "@/components/financial/SummaryCard";
import { TrendingUp, TrendingDown, ArrowDownLeft } from "lucide-react";
import PaymentTable from "@/components/financial/PaymentTable";
import RecordPaymentDialog from "@/components/financial/RecordPaymentDialog";
import RecordExpenseDialog from "@/components/financial/RecordExpenseDialog";
import ShareInvoiceDialog from "@/components/events/ShareInvoiceDialog";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import EditTransactionDialog from "@/components/financial/EditTransactionDialog";
import OutstandingReceivables from "@/components/financial/OutstandingReceivables";
import FinancialYearCard from "@/components/financial/FinancialYearCard";
import FinancialYearForm from "@/components/financial/FinancialYearForm";
import FiscalYearSelector from "@/components/dashboard/FiscalYearSelector";
import Button from "@/components/common/Button";
import FinancialPageSkeleton from "@/components/financial/FinancialPageSkeleton";
import { useToast } from "@/components/ui/use-toast";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import { PAYMENT_METHODS, PAYMENT_TYPES } from "@/constants/statusConfig";
import { TRANSACTION_TYPES } from "@/constants/financeConfig";
import {
  loadAllTransactions,
  ensureDefaultExpenseCategories,
  loadExpenseCategories,
  totalReceived,
  totalPaid,
  actualProfit,
  methodBreakdown,
  voidTransaction,
  deleteTransaction
} from "@/lib/financeService";
import { formatMoney } from "@/utils/format";
import { Download, Plus, Wallet, Receipt, AlertTriangle, Trash2, Lock } from "lucide-react";
import ActionSheetRow from "@/components/common/ActionSheetRow";
import { cn } from "@/lib/utils";
import { exportFinancialXlsx } from "@/lib/exportUtils";
import { showExportToast } from "@/lib/exportToast";
import { useFeatureGate } from "@/components/common/ProGate";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/hooks/useT";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePageCreateAction } from "@/lib/pageCreateAction";
import { useStayAtTopOnLoad } from "@/hooks/useStayAtTopOnLoad";
import { staggeredAllSettled } from "@/lib/staggeredLoader";
import { usePartialErrorToast } from "@/hooks/usePartialErrorToast";
import RetryState from "@/components/common/RetryState";
import TabTransition from "@/components/common/TabTransition";

const TAB_KEYS = ["Payment Activity", "Financial Years"];

export default function Financial() {
  const { workspace, workspaceId } = useWorkspace();
  const { toast } = useToast();
  const { checkFeature, FeatureGateDialog } = useFeatureGate();
  const currency = workspace?.currency || "INR";
  const t = useT();
  usePageTitle("Financial");
  const tabs = TAB_KEYS;

  const { fiscalYears, selectedFY, selectFY, selectDateRange, activeFY, refresh: refreshFY, dateRange } = useFinancialYear();

  const [tab, setTab] = useState("Payment Activity");
  const [method, setMethod] = useState("All");
  const [type, setType] = useState("All");

  const [showAddSheet, setShowAddSheet] = useState(false);
  usePageCreateAction(() => setShowAddSheet(true));
  const [showClientPayment, setShowClientPayment] = useState(false);
  const [showTeamPayment, setShowTeamPayment] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showMiscExpense, setShowMiscExpense] = useState(false);
  const [editing, setEditing] = useState(null);
  const [shareTx, setShareTx] = useState(null);
  const prefs = useDisplayPreferences();
  const [voiding, setVoiding] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showFYForm, setShowFYForm] = useState(false);
  const [editingFY, setEditingFY] = useState(null);
  const [deletingFY, setDeletingFY] = useState(null);
  const queryClient = useQueryClient();

  // Ensure default expense categories once on mount — not on every refetch.
  // Swallow errors (e.g. rate-limit) so the page never crashes on mount.
  useEffect(() => {
    if (workspaceId) ensureDefaultExpenseCategories(workspaceId).catch(() => {});
  }, [workspaceId]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["financial", workspaceId],
    queryFn: async () => {
      const results = await staggeredAllSettled(
        [
          () => loadAllTransactions(workspaceId),
          () => base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
          () => base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
          () => base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
          () => base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
          () => loadExpenseCategories(workspaceId)
        ],
        { waveSize: 3, waveDelay: 200 }
      );
      const [txR, evsR, clsR, membsR, asgnsR, catsR] = results;
      const partialError = results.some((r) => r.status === "rejected");
      return {
        allTx: txR.status === "fulfilled" ? (txR.value || []) : [],
        events: evsR.status === "fulfilled" ? (evsR.value || []) : [],
        clients: clsR.status === "fulfilled" ? (clsR.value || []) : [],
        members: membsR.status === "fulfilled" ? (membsR.value || []) : [],
        assignments: asgnsR.status === "fulfilled" ? (asgnsR.value || []) : [],
        categories: catsR.status === "fulfilled" ? (catsR.value || []) : [],
        partialError
      };
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev
  });
  const allTx = data?.allTx || [];
  const events = data?.events || [];
  const clients = data?.clients || [];
  const members = data?.members || [];
  const assignments = data?.assignments || [];
  const categories = data?.categories || [];
  const partialError = data?.partialError;
  const shareParticular = (tx) => {
    if (tx.transaction_type === "CLIENT_RECEIPT") {
      if (!tx.event_id && !tx.client_id) return tx.expense_category_name_snapshot || tx.notes || t("Misc Income");
      const ev = eventsById[tx.event_id];
      return `${t("Payment from")} ${clientsById[tx.client_id]?.name || ev?.title || t("Client")}`;
    }
    if (tx.transaction_type === "TEAM_PAYMENT") {
      const m = membersById[tx.team_member_id];
      return `${t("Payment to")} ${m?.name || t("Team member")}${m?.profession ? ` (${m.profession})` : ""}`;
    }
    return tx.expense_category_name_snapshot || tx.notes || t("Business Expense");
  };

  const load = () => {
    queryClient.invalidateQueries({ queryKey: ["financial"] });
    refreshFY();
  };

  // Set active FY: deactivate all others, activate selected.
  const handleSetActiveFY = async (fyRecord) => {
    try {
      await setActiveFY(workspaceId, fyRecord.id);
      selectFY(fyRecord.id);
      selectDateRange({
        type: "fy",
        label: fyDisplayLabel(fyRecord),
        startDate: fyRecord.start_date,
        endDate: fyRecord.end_date,
        fyId: fyRecord.id,
      });
      toast({ title: t("Financial year set active"), description: fyRecord.label });
      load();
    } catch (e) {
      toast({ title: t("Failed to set active"), description: e?.message, variant: "destructive" });
    }
  };

  const handleDeleteFY = async () => {
    if (!deletingFY) return;
    // Delete protection: block if FY has transactions
    if (fyHasTransactions(deletingFY, allTx)) {
      toast({
        title: t("Cannot delete"),
        description: t("This Financial Year contains financial records and cannot be deleted."),
        variant: "destructive"
      });
      setDeletingFY(null);
      return;
    }
    try {
      await base44.entities.FinancialYear.delete(deletingFY.id);
      toast({ title: t("Financial year deleted") });
      setDeletingFY(null);
      load();
    } catch (e) {
      toast({ title: t("Failed to delete"), description: e?.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (error) toast({ title: t("Failed to load financial activity"), description: error?.message, variant: "destructive" });
  }, [error, toast]);

  usePartialErrorToast(partialError, error, !!data, () => queryClient.invalidateQueries({ queryKey: ["financial", workspaceId] }));

  // FY-scoped events — only events in the selected financial year
  const fyEvents = useMemo(() => events.filter((e) => eventInRange(e, dateRange)), [events, dateRange]);

  const clientsById = useMemo(() => {
    const m = {}; clients.forEach((c) => { m[c.id] = c; }); return m;
  }, [clients]);
  const membersById = useMemo(() => {
    const m = {}; members.forEach((x) => { m[x.id] = x; }); return m;
  }, [members]);
  const eventsById = useMemo(() => {
    const m = {}; events.forEach((e) => { m[e.id] = e; }); return m;
  }, [events]);

  // FY-scoped active transactions — for summary cards and breakdown.
  // NOT affected by method/type filters — those only filter the table below.
  const fyActiveTx = useMemo(() => {
    return allTx.filter((t) => t.status === "ACTIVE" && txInRange(t, dateRange));
  }, [allTx, dateRange]);

  const summary = useMemo(() => ({
    received: totalReceived(fyActiveTx),
    paid: totalPaid(fyActiveTx),
    profit: actualProfit(fyActiveTx)
  }), [fyActiveTx]);

  // Previously-used misc expense category names — sourced from existing
  // BUSINESS_EXPENSE transactions' name snapshots, NOT pre-made defaults.
  const miscCategorySuggestions = useMemo(() => {
    const names = (allTx || [])
      .filter((t) => t.transaction_type === "BUSINESS_EXPENSE" && t.expense_category_name_snapshot)
      .map((t) => t.expense_category_name_snapshot);
    return [...new Set(names)];
  }, [allTx]);

  const breakdown = useMemo(() => methodBreakdown(fyActiveTx), [fyActiveTx]);

  // FY-scoped transactions with method/type filters — for the activity table only.
  const fyTx = useMemo(() => {
    return allTx.filter((t) => {
      if (!txInRange(t, dateRange)) return false;
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
  }, [allTx, dateRange, method, type]);

  // Per-FY summary map keyed by FY record id — derived from all active transactions.
  const fySummaryMap = useMemo(() => {
    const map = {};
    for (const fy of fiscalYears) {
      map[fy.id] = { received: 0, paid: 0 };
    }
    for (const t of allTx) {
      if (t.status !== "ACTIVE") continue;
      // Find the FY this transaction belongs to — try financial_year_id first,
      // then fall back to date-range matching for robustness.
      let fyId = t.financial_year_id;
      if (fyId && !map[fyId]) {
        // financial_year_id might be a stale/foreign key — try matching by fy_id string
        const fyByString = fiscalYears.find((f) => f.fy_id === fyId);
        fyId = fyByString?.id || null;
      }
      if (!fyId) {
        // Fallback: find by date range
        const fy = fiscalYears.find((f) => txInFY(t, f));
        fyId = fy?.id;
      }
      if (!fyId || !map[fyId]) continue;
      if (t.transaction_type === "CLIENT_RECEIPT") map[fyId].received += Number(t.amount) || 0;
      else map[fyId].paid += Number(t.amount) || 0;
    }
    return map;
  }, [allTx, fiscalYears]);

  const handleVoid = async () => {
    if (!voiding) return;
    try {
      const res = await voidTransaction(workspaceId, voiding.id);
      const data = res?.data || res;
      if (data?.error) {
        toast({ title: t("Failed to void transaction"), description: data.message || data.error, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      queryClient.invalidateQueries({ queryKey: ["event"] });
      toast({ title: t("Transaction voided"), description: t("Invoice and milestone balances recalculated.") });
      setVoiding(null);
      load();
    } catch (e) {
      const msg = e?.data?.message || e?.data?.error || e?.message;
      toast({ title: t("Failed to void transaction"), description: msg, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await deleteTransaction(workspaceId, deleting.id);
      const data = res?.data || res;
      if (data?.error) {
        toast({ title: t("Failed to delete transaction"), description: data.message || data.error, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      queryClient.invalidateQueries({ queryKey: ["event"] });
      toast({ title: t("Transaction deleted"), description: t("Invoice and milestone balances recalculated.") });
      setDeleting(null);
      load();
    } catch (e) {
      const msg = e?.data?.message || e?.data?.error || e?.message;
      toast({ title: t("Failed to delete transaction"), description: msg, variant: "destructive" });
    }
  };

  useStayAtTopOnLoad(!isLoading);
  if (isLoading) return <FinancialPageSkeleton />;

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <PageHeader title={t("Financial")} subtitle={t("Track payments, expenses, and profit across financial years.")} />
        <RetryState onRetry={load} />
      </div>
    );
  }

  // Exports exactly the rows shown below (range + method + type filters).
  const exportPayments = async () => {
    if (!checkFeature("excel_csv_export_enabled", "Excel Export")) return;
    try {
      const res = await exportFinancialXlsx(fyTx, { eventsById, clientsById, membersById }, currency, dateRange?.label, { shareSheet: true });
      showExportToast(toast, res, `${fyTx.length} transactions`);
    } catch (e) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title={t("Financial")} subtitle={t("Track payments, expenses, and profit across financial years.")} />

      <div className="flex flex-col gap-3">
        <SegmentedTabs items={tabs.map((k) => ({ value: k, label: t(k) }))} value={tab} onChange={setTab} layoutId="financial-tab-indicator" stretch />
        {tab === "Payment Activity" && (
          <Button size="sm" onClick={() => setShowAddSheet(true)} className="self-start max-lg:hidden">
            <Plus className="w-3.5 h-3.5" /> {t("Add Transaction")}
          </Button>
        )}
      </div>

      <TabTransition tabKey={tab} className="space-y-4">
      {tab === "Payment Activity" && (
        <>
          {/* Showing / export */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Showing")}</span>
            <FiscalYearSelector size="sm" align="left" />
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={exportPayments}
              disabled={fyTx.length === 0}
              aria-label={t("Export to Excel")}
            >
              <Download className="w-3.5 h-3.5" />
              {/* Icon only on mobile, with the words from sm up. */}
              <span className="hidden sm:inline">{t("Export to Excel")}</span>
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SummaryCard label={t("Received")} value={summary.received} tone="success" currency={currency} icon={ArrowDownLeft} />
            <SummaryCard label={t("Paid")} value={summary.paid} tone="destructive" currency={currency} icon={TrendingDown} />
            <SummaryCard label={t("Profit")} value={summary.profit} tone={summary.profit >= 0 ? "success" : "destructive"} currency={currency} icon={TrendingUp} className="col-span-2 sm:col-span-1" />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-[15px] p-4">
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
            <div className="bg-card border border-border rounded-[15px] p-4">
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
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">{t("Method")}</span>
              <SegmentedTabs items={PAYMENT_METHODS} value={method} onChange={setMethod} layoutId="financial-method-indicator" size="sm" scroll />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">{t("Type")}</span>
              <SegmentedTabs items={PAYMENT_TYPES} value={type} onChange={setType} layoutId="financial-type-indicator" size="sm" scroll />
            </div>
          </div>

          <PaymentTable
            transactions={fyTx}
            display={{ eventsById, clientsById, membersById }}
            currency={currency}
            onEdit={(t) => setEditing(t)}
            onVoid={(t) => setVoiding(t)}
            onDelete={(t) => setDeleting(t)}
            onShare={(t) => setShareTx(t)}
          />

          {/* Outstanding receivables — scoped to the selected financial year */}
          <OutstandingReceivables
            events={fyEvents}
            transactions={fyActiveTx}
            clients={clients}
            currency={currency}
          />
        </>
      )}

      {tab === "Financial Years" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fiscalYears.length === 0 && (
              <div className="col-span-full bg-card border border-border rounded-[15px] p-10 text-center text-sm text-muted-foreground">
                {t("No financial years set up yet.")}
                <br />
                <Button size="sm" className="mt-3" onClick={() => { setEditingFY(null); setShowFYForm(true); }}>
                  <Plus className="w-3.5 h-3.5" /> {t("Create Financial Year")}
                </Button>
              </div>
            )}
            {fiscalYears.map((fyRecord) => {
              const s = fySummaryMap[fyRecord.id] || { received: 0, paid: 0 };
              const summary = { ...s, profit: s.received - s.paid };
              const hasTx = fyHasTransactions(fyRecord, allTx);
              return (
                <FinancialYearCard
                  key={fyRecord.id}
                  fy={fyRecord}
                  summary={summary}
                  currency={currency}
                  onSetActive={handleSetActiveFY}
                  onEdit={(f) => { setEditingFY(f); setShowFYForm(true); }}
                  onDelete={(f) => setDeletingFY(f)}
                  hasTransactions={hasTx}
                />
              );
            })}
          </div>
          <div className="flex justify-center pt-2">
            <Button
              size="md"
              onClick={() => { setEditingFY(null); setShowFYForm(true); }}
            >
              <Plus className="w-4 h-4" /> {t("Add Financial Year")}
            </Button>
          </div>
        </>
      )}
      </TabTransition>

      {/* Add Transaction action sheet — one entry point, pick what to record */}
      <AppDialog open={showAddSheet} onOpenChange={setShowAddSheet}>
        <AppDialogContent maxWidth="max-w-sm">
          <AppDialogHeader>
            <AppDialogTitle>{t("Add Transaction")}</AppDialogTitle>
            <AppDialogDescription>{t("What would you like to record?")}</AppDialogDescription>
          </AppDialogHeader>
          <AppDialogBody className="space-y-2">
            <ActionSheetRow
              icon={ArrowDownLeft}
              iconClassName="bg-success/10 text-success"
              title={t("Record Payment")}
              description={t("Log a payment received from a client")}
              onClick={() => { setShowAddSheet(false); setShowClientPayment(true); }}
            />
            <ActionSheetRow
              icon={Wallet}
              iconClassName="bg-warning/10 text-warning"
              title={t("Team Payment")}
              description={t("Pay a team member for their work")}
              onClick={() => { setShowAddSheet(false); setShowTeamPayment(true); }}
            />
            <ActionSheetRow
              icon={Receipt}
              iconClassName="bg-muted text-foreground"
              title={t("Record Expense")}
              description={t("Log a business or event-related expense")}
              onClick={() => { setShowAddSheet(false); setShowExpense(true); }}
            />
            <ActionSheetRow
              icon={Receipt}
              iconClassName="bg-muted text-foreground"
              title={t("Misc Expense")}
              description={t("A one-off expense not tied to any event")}
              onClick={() => { setShowAddSheet(false); setShowMiscExpense(true); }}
            />
          </AppDialogBody>
        </AppDialogContent>
      </AppDialog>

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
        transactions={allTx}
        preselectedEventId=""
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
      <RecordExpenseDialog
        open={showMiscExpense}
        onClose={() => setShowMiscExpense(false)}
        onSaved={load}
        workspaceId={workspaceId}
        currency={currency}
        events={[]}
        categories={categories}
        miscCategorySuggestions={miscCategorySuggestions}
        miscMode
      />
      <ShareInvoiceDialog
        open={!!shareTx}
        onClose={() => setShareTx(null)}
        transaction={shareTx}
        event={shareTx?.event_id ? eventsById[shareTx.event_id] : null}
        workspace={workspace}
        currency={currency}
        particularFor={shareParticular}
        typeLabel={(tx) => (tx.transaction_type === "CLIENT_RECEIPT" ? t("Received") : t("Paid"))}
        defaultShowLogo={!!prefs.showLogo}
      />
      <EditTransactionDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={load}
        transaction={editing}
        currency={currency}
      />
      <FinancialYearForm
        open={showFYForm}
        onClose={() => { setShowFYForm(false); setEditingFY(null); }}
        onSaved={load}
        workspaceId={workspaceId}
        editing={editingFY}
      />

      {/* Delete FY confirmation */}
      <AppDialog open={!!deletingFY} onOpenChange={(o) => !o && setDeletingFY(null)}>
        <AppDialogContent maxWidth="max-w-sm">
          {deletingFY && (
            <>
              <AppDialogHeader>
                <AppDialogTitle className="flex items-center gap-2">
                  {fyHasTransactions(deletingFY, allTx) ? (
                    <Lock className="w-4 h-4 text-destructive shrink-0" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                  )}
                  {fyHasTransactions(deletingFY, allTx)
                    ? t("Cannot delete this financial year")
                    : t("Delete this financial year?")}
                </AppDialogTitle>
                <AppDialogDescription>
                  {fyHasTransactions(deletingFY, allTx) ? (
                    <>
                      {deletingFY.label} ({deletingFY.fy_id})
                      <br />
                      {t("This Financial Year contains financial records and cannot be deleted.")}
                    </>
                  ) : (
                    <>
                      {deletingFY.label} ({deletingFY.fy_id})
                      <br />
                      {t("This year has no transactions. Are you sure you want to remove it?")}
                    </>
                  )}
                </AppDialogDescription>
              </AppDialogHeader>
              <AppDialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDeletingFY(null)}>{t("Cancel")}</Button>
                {!fyHasTransactions(deletingFY, allTx) && (
                  <Button variant="destructive" size="sm" onClick={handleDeleteFY}>{t("Delete")}</Button>
                )}
              </AppDialogFooter>
            </>
          )}
        </AppDialogContent>
      </AppDialog>

      {/* Void confirmation */}
      <AppDialog open={!!voiding} onOpenChange={(o) => !o && setVoiding(null)}>
        <AppDialogContent maxWidth="max-w-sm">
          {voiding && (
            <>
              <AppDialogHeader>
                <AppDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  {t("Void this transaction?")}
                </AppDialogTitle>
                <AppDialogDescription>
                  {TRANSACTION_TYPES[voiding.transaction_type]?.label} of <span className="font-semibold text-foreground">{formatMoney(voiding.amount, currency)}</span> on <span className="font-semibold text-foreground">{formatEventDate(voiding.transaction_date)}</span>.
                  {" "}{t("Voided transactions are excluded from all totals but remain in history.")}
                </AppDialogDescription>
              </AppDialogHeader>
              <AppDialogFooter>
                <Button variant="outline" size="sm" onClick={() => setVoiding(null)}>{t("Cancel")}</Button>
                <Button variant="destructive" size="sm" onClick={handleVoid}>{t("Void")}</Button>
              </AppDialogFooter>
            </>
          )}
        </AppDialogContent>
      </AppDialog>

      {/* Delete confirmation */}
      <AppDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AppDialogContent maxWidth="max-w-sm">
          {deleting && (
            <>
              <AppDialogHeader>
                <AppDialogTitle className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                  {t("Delete this transaction?")}
                </AppDialogTitle>
                <AppDialogDescription>
                  {TRANSACTION_TYPES[deleting.transaction_type]?.label} of <span className="font-semibold text-foreground">{formatMoney(deleting.amount, currency)}</span> on <span className="font-semibold text-foreground">{formatEventDate(deleting.transaction_date)}</span>.
                  {" "}{t("This permanently removes the record. Linked invoice and milestone balances will be recalculated.")}
                </AppDialogDescription>
              </AppDialogHeader>
              <AppDialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>{t("Cancel")}</Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>{t("Delete")}</Button>
              </AppDialogFooter>
            </>
          )}
        </AppDialogContent>
      </AppDialog>
      {FeatureGateDialog}
    </div>
  );
}