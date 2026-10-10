import { useState, useMemo } from "react";
import { Pencil, Upload, Trash2, Ban, Wallet, Receipt, Plus, Tag } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntity } from "@/lib/queryInvalidation";
import { voidTransaction, deleteTransaction } from "@/lib/financeService";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import EditTransactionDialog from "@/components/financial/EditTransactionDialog";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import ActionSheetRow from "@/components/common/ActionSheetRow";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody } from "@/components/ui/AppDialog";
import AddOnDialog from "@/components/events/AddOnDialog";
import ShareInvoiceDialog from "@/components/events/ShareInvoiceDialog";
import { parseMiscExpenses, miscExpensesTotal } from "@/components/events/EventMiscExpenseEditor";
import { base44 } from "@/api/base44Client";
import { useT } from "@/hooks/useT";

const OUT_COLOR = "#B24F3A";
const NAVY = "#2D4F75";

export default function EventPaymentsTab({
  event,
  transactions,
  membersById = {},
  client,
  assignments = [],
  currency = "INR",
  onAddClientPayment,
  onAddExpense,
  onRefresh,
}) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspaceId, workspace } = useWorkspace();
  const prefs = useDisplayPreferences();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editing, setEditing] = useState(null);
  const [voiding, setVoiding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddOn, setShowAddOn] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState(null);
  const [shareTx, setShareTx] = useState(null);

  const miscItems = useMemo(() => parseMiscExpenses(event?.misc_expenses_json), [event?.misc_expenses_json]);
  const miscTotal = miscExpensesTotal(miscItems);

  const removeAddOn = async (item) => {
    if (!confirm(`${t("Remove add-on")} "${item.name}"?`)) return;
    try {
      const items = parseMiscExpenses(event?.misc_expenses_json).filter((it) => it.id !== item.id);
      await base44.entities.Event.update(event.id, { misc_expenses_json: JSON.stringify(items) });
      toast({ title: t("Add-on removed") });
      onRefresh?.();
    } catch (e) {
      toast({ title: e?.message || t("Failed to remove"), variant: "destructive" });
    }
  };

  const activeTx = transactions.filter((tx) => tx.status === "ACTIVE");

  const particularFor = (tx) => {
    if (tx.transaction_type === "CLIENT_RECEIPT") {
      return `${t("Payment from")} ${client?.name || t("Client")}`;
    }
    if (tx.transaction_type === "TEAM_PAYMENT") {
      const m = membersById[tx.team_member_id];
      const asg = assignments.find((a) => a.id === tx.team_assignment_id);
      const role = asg?.role_name_snapshot || m?.profession || t("Team");
      return `${t("Payment to")} ${m?.name || t("Team member")} (${role})`;
    }
    return tx.expense_category_name_snapshot || tx.notes || t("Business Expense");
  };

  const typeLabel = (tx) => (tx.transaction_type === "CLIENT_RECEIPT" ? t("Received") : t("Paid"));

  const handleDelete = async (tx) => {
    if (!confirm(t("Delete this transaction? This will recalculate invoice and milestone balances."))) return;
    setVoiding(true);
    try {
      const res = await voidTransaction(workspaceId, tx.id);
      const data = res?.data || res;
      if (data?.error) {
        toast({ title: data.message || data.error, variant: "destructive" });
        return;
      }
      invalidateEntity(queryClient, "FinancialTransaction");
      invalidateEntity(queryClient, "Invoice");
      invalidateEntity(queryClient, "PaymentMilestone");
      toast({ title: t("Transaction voided"), description: t("Invoice and milestone balances recalculated.") });
      onRefresh?.();
    } catch (e) {
      const msg = e?.data?.message || e?.data?.error || e?.message || t("Failed to void transaction.");
      toast({ title: msg, variant: "destructive" });
    } finally {
      setVoiding(false);
    }
  };

  const handleHardDelete = async (tx) => {
    if (!confirm(t("Permanently delete this transaction? This removes the record and recalculates invoice and milestone balances."))) return;
    setDeleting(true);
    try {
      const res = await deleteTransaction(workspaceId, tx.id);
      const data = res?.data || res;
      if (data?.error) {
        toast({ title: data.message || data.error, variant: "destructive" });
        return;
      }
      invalidateEntity(queryClient, "FinancialTransaction");
      invalidateEntity(queryClient, "Invoice");
      invalidateEntity(queryClient, "PaymentMilestone");
      toast({ title: t("Transaction deleted"), description: t("Invoice and milestone balances recalculated.") });
      onRefresh?.();
    } catch (e) {
      const msg = e?.data?.message || e?.data?.error || e?.message || t("Failed to delete transaction.");
      toast({ title: msg, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{t("Transactions")}</span>
          <span className="text-xs text-muted-foreground">({activeTx.length})</span>
        </div>
        <Button size="sm" onClick={() => setShowAddSheet(true)}>
          <Plus className="w-3.5 h-3.5" /> {t("Add")}
        </Button>
      </div>

      {miscItems.length > 0 && (
        <div className="bg-card border border-border rounded-[15px] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{t("Add-ons")}</span>
              <span className="text-xs text-muted-foreground">({miscItems.length})</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums text-foreground">+{formatMoney(miscTotal, currency)}</div>
              <div className="text-[11px] text-muted-foreground">{t("Added to contract")}</div>
            </div>
          </div>
          <div className="space-y-2">
            {miscItems.map((it) => (
              <div key={it.id || it.name} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-muted/30">
                <div className="text-sm font-medium text-foreground truncate">{it.name || t("Unnamed")}</div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(Number(it.amount) || 0, currency)}</div>
                  <button onClick={() => { setEditingAddOn(it); setShowAddOn(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label={t("Edit add-on")}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeAddOn(it)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors" aria-label={t("Remove add-on")}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTx.length === 0 ? (
        <div className="bg-card border border-border rounded-[15px] p-5">
          <EmptyState title={t("No transactions yet")} description={t("Record client payments or expenses for this entry.")} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeTx.map((tx) => {
            const isOut = tx.transaction_type !== "CLIENT_RECEIPT";
            return (
              <div
                key={tx.id}
                className="bg-card border border-border rounded-[15px] p-4"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">{t("Date")}</div>
                    <div className="text-sm font-medium text-foreground">{formatEventDate(tx.transaction_date)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">{t("Type")}</div>
                    <div className="text-sm font-semibold" style={{ color: OUT_COLOR }}>{typeLabel(tx)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">{t("Amount")}</div>
                    <div className="text-sm font-semibold" style={{ color: OUT_COLOR }}>
                      {isOut ? "-" : "+"}{formatMoney(tx.amount, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground">{t("Method")}</div>
                    <div className="text-sm font-medium text-foreground">{tx.payment_method || "—"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[11px] font-medium text-muted-foreground">{t("Particular")}</div>
                    <div className="text-sm font-medium text-foreground break-anywhere">{particularFor(tx)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3.5">
                  <button
                    onClick={() => setEditing(tx)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> {t("Edit")}
                  </button>
                  <button
                    onClick={() => setShareTx(tx)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: NAVY }}
                  >
                    <Upload className="w-3.5 h-3.5" /> {t("Share Invoice")}
                  </button>
                  <button
                    onClick={() => handleDelete(tx)}
                    disabled={voiding}
                    className="ml-auto w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    aria-label={t("Void transaction")}
                    title={t("Void")}
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleHardDelete(tx)}
                    disabled={deleting}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                    aria-label={t("Delete transaction")}
                    title={t("Delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add action sheet — one entry point, pick what to record for this event */}
      <AppDialog open={showAddSheet} onOpenChange={setShowAddSheet}>
        <AppDialogContent maxWidth="max-w-sm">
          <AppDialogHeader>
            <AppDialogTitle>{t("Add to this event")}</AppDialogTitle>
            <AppDialogDescription>{t("What would you like to record?")}</AppDialogDescription>
          </AppDialogHeader>
          <AppDialogBody className="space-y-2">
            <ActionSheetRow
              icon={Wallet}
              iconClassName="bg-success/10 text-success"
              title={t("Client Payment")}
              description={t("Log a payment received from the client")}
              onClick={() => { setShowAddSheet(false); onAddClientPayment?.(); }}
            />
            <ActionSheetRow
              icon={Plus}
              iconClassName="bg-muted text-foreground"
              title={t("Add-on")}
              description={t("Add an extra billable item to the package")}
              onClick={() => { setShowAddSheet(false); setEditingAddOn(null); setShowAddOn(true); }}
            />
            <ActionSheetRow
              icon={Receipt}
              iconClassName="bg-warning/10 text-warning"
              title={t("Expense")}
              description={t("Log a cost incurred for this event")}
              onClick={() => { setShowAddSheet(false); onAddExpense?.(); }}
            />
          </AppDialogBody>
        </AppDialogContent>
      </AppDialog>

      <EditTransactionDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); onRefresh?.(); }}
        transaction={editing}
        currency={currency}
      />

      <AddOnDialog
        open={showAddOn}
        onClose={() => { setShowAddOn(false); setEditingAddOn(null); }}
        onSaved={() => { setShowAddOn(false); setEditingAddOn(null); onRefresh?.(); }}
        event={event}
        currency={currency}
        editingItem={editingAddOn}
      />

      <ShareInvoiceDialog
        open={!!shareTx}
        onClose={() => setShareTx(null)}
        transaction={shareTx}
        event={event}
        workspace={workspace}
        currency={currency}
        particularFor={particularFor}
        typeLabel={typeLabel}
        defaultShowLogo={!!prefs.showLogo}
      />
    </div>
  );
}