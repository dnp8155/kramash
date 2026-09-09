import { useMemo, useState } from "react";
import {
  Wallet,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Receipt,
  Banknote,
  CreditCard,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import SearchInput from "@/components/common/SearchInput";
import FilterControl from "@/components/common/FilterControl";
import Button from "@/components/common/Button";
import StatCard from "@/components/common/StatCard";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useEvents } from "@/hooks/useEvents";
import { useClients } from "@/hooks/useClients";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useEventTeamAssignments } from "@/hooks/useEventTeamAssignments";
import {
  computeWorkspaceSummary,
  financialYearOptions,
  isInFinancialYear,
  currentFinancialYear,
} from "@/utils/finance";
import { transactionTypeLabels, paymentMethods } from "@/constants/finance";
import { formatCurrency } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";
import { exportFinancialCSV } from "@/utils/exports";
import TransactionActivityTable from "@/components/finance/TransactionActivityTable";
import RecordClientPaymentModal from "@/components/finance/RecordClientPaymentModal";
import RecordTeamPaymentModal from "@/components/finance/RecordTeamPaymentModal";
import RecordExpenseModal from "@/components/finance/RecordExpenseModal";
import EditTransactionModal from "@/components/finance/EditTransactionModal";

export default function Financial() {
  const {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    voidTransaction,
    unvoidTransaction,
  } = useFinancialTransactions();
  const { events } = useEvents();
  const { clients } = useClients();
  const { members } = useTeamMembers();
  const { categories } = useExpenseCategories();
  const { assignments } = useEventTeamAssignments();

  const [fy, setFy] = useState(currentFinancialYear()?.label || "all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [clientOpen, setClientOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fyOptions = useMemo(
    () => financialYearOptions(transactions),
    [transactions]
  );

  const summary = useMemo(
    () => computeWorkspaceSummary(transactions, fy === "all" ? null : fy),
    [transactions, fy]
  );

  // All-time client pending across events (outstanding dues to follow up).
  const pendingAll = useMemo(() => {
    const receivedByEvent = {};
    transactions
      .filter((t) => t.status === "ACTIVE" && t.transaction_type === "CLIENT_RECEIPT")
      .forEach((t) => {
        receivedByEvent[t.event_id] =
          (receivedByEvent[t.event_id] || 0) + (Number(t.amount) || 0);
      });
    return events.reduce((s, e) => {
      const cv = Number(e.contract_value) || 0;
      if (cv <= 0) return s;
      return s + Math.max(0, cv - (receivedByEvent[e.id] || 0));
    }, 0);
  }, [transactions, events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (fy !== "all" && !isInFinancialYear(t.transaction_date, fy)) return false;
      if (typeFilter !== "all" && t.transaction_type !== typeFilter) return false;
      if (methodFilter !== "all" && t.payment_method !== methodFilter) return false;
      if (q) {
        const ev = events.find((e) => e.id === t.event_id);
        const party =
          t.transaction_type === "CLIENT_RECEIPT"
            ? clients.find((c) => c.id === t.client_id)?.name
            : t.transaction_type === "TEAM_PAYMENT"
            ? members.find((m) => m.id === t.team_member_id)?.name
            : categories.find((c) => c.id === t.expense_category_id)?.name;
        const hay = [ev?.title, party].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, fy, typeFilter, methodFilter, search, events, clients, members, categories]);

  const handleCreate = async (data) => {
    await createTransaction(data);
    toast({ title: "Transaction recorded" });
  };

  const handleEdit = async (data) => {
    await updateTransaction(editing.id, data);
    toast({ title: "Transaction updated" });
  };

  const handleVoid = async (t) => {
    await voidTransaction(t.id);
    toast({ title: "Transaction voided", description: "Excluded from totals." });
  };

  const handleUnvoid = async (t) => {
    await unvoidTransaction(t.id);
    toast({ title: "Transaction restored" });
  };

  const profitPositive = summary.profit >= 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Financial"
        description="Track payments, dues, and revenue across events."
        actions={
          <Button variant="outline" onClick={() => { exportFinancialCSV(filtered, events, clients, members, categories, fy); toast({ title: "Financial activity exported" }); }}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setClientOpen(true)}>
          <Wallet className="h-4 w-4" /> Record Client Payment
        </Button>
        <Button variant="outline" onClick={() => setTeamOpen(true)}>
          <Users className="h-4 w-4" /> Record Team Payment
        </Button>
        <Button variant="outline" onClick={() => setExpenseOpen(true)}>
          <Receipt className="h-4 w-4" /> Record Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Received"
          value={summary.received}
          isCurrency
          icon={TrendingUp}
          accent="success"
          trend="Client payments in"
        />
        <StatCard
          label="Total Paid"
          value={summary.totalPaid}
          isCurrency
          icon={TrendingDown}
          accent="destructive"
          trend="Team + expenses"
        />
        <StatCard
          label="Profit"
          value={summary.profit}
          isCurrency
          icon={profitPositive ? TrendingUp : TrendingDown}
          accent={profitPositive ? "success" : "destructive"}
          trend="Received − paid"
        />
        <StatCard
          label="Pending"
          value={pendingAll}
          isCurrency
          icon={Clock}
          accent="warning"
          trend="Outstanding client dues"
        />
        <StatCard
          label="Cash Received"
          value={summary.cashReceived}
          isCurrency
          icon={Banknote}
          accent="info"
          trend="Client cash payments"
        />
        <StatCard
          label="Online Received"
          value={summary.onlineReceived}
          isCurrency
          icon={CreditCard}
          accent="info"
          trend="UPI · Bank · Card"
        />
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event or party…"
            className="flex-1 sm:min-w-[200px]"
          />
          <FilterControl
            label="Financial Year"
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            options={fyOptions}
          />
          <FilterControl
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={Object.entries(transactionTypeLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <FilterControl
            label="Method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            options={paymentMethods}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Activity</CardTitle>
        </CardHeader>
        {loading ? (
          <LoadingState label="Loading transactions…" />
        ) : error ? (
          <ErrorState title="Failed to load" message={error} />
        ) : (
          <CardBody className="p-0">
            <TransactionActivityTable
              transactions={filtered}
              events={events}
              clients={clients}
              members={members}
              categories={categories}
              onEdit={(t) => setEditing(t)}
              onVoid={handleVoid}
              onUnvoid={handleUnvoid}
            />
          </CardBody>
        )}
      </Card>

      <RecordClientPaymentModal
        open={clientOpen}
        onClose={() => setClientOpen(false)}
        events={events}
        clients={clients}
        onSubmit={handleCreate}
      />
      <RecordTeamPaymentModal
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        events={events}
        assignments={assignments}
        members={members}
        onSubmit={handleCreate}
      />
      <RecordExpenseModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        events={events}
        categories={categories}
        onSubmit={handleCreate}
      />
      <EditTransactionModal
        open={!!editing}
        onClose={() => setEditing(null)}
        transaction={editing}
        onSubmit={handleEdit}
      />
    </div>
  );
}