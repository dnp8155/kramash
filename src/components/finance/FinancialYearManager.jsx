import { useState, useMemo } from "react";
import {
  Plus,
  Check,
  Lock,
  Unlock,
  Trash2,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Modal from "@/components/common/Modal";
import StatusBadge from "@/components/common/StatusBadge";
import { useFinancialYear } from "@/lib/FinancialYearContext";
import { filterTransactionsByFY, computeWorkspaceSummary } from "@/utils/finance";
import { formatCurrency } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";

// Maps FY status to StatusBadge-compatible status strings.
const fyStatusMap = {
  open: "Active",
  closed: "Closed",
};

function CreateFYModal({ open, onClose }) {
  const { createFY } = useFinancialYear();
  const [startYear, setStartYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const endYear = startYear ? Number(startYear) + 1 : "";
  const fyName = startYear ? `FY ${startYear}–${String(endYear).slice(-2)}` : "";
  const startDate = startYear ? `${startYear}-04-01` : "";
  const endDate = endYear ? `${endYear}-03-31` : "";

  const handleSubmit = async () => {
    setError("");
    if (!startYear || Number.isNaN(Number(startYear))) {
      setError("Enter a valid start year (e.g. 2026).");
      return;
    }
    setSaving(true);
    try {
      await createFY({
        name: fyName,
        start_date: startDate,
        end_date: endDate,
        status: "open",
        is_active: false,
      });
      toast({ title: "Financial Year created", description: fyName });
      setStartYear("");
      onClose();
    } catch (e) {
      setError(e.message || "Failed to create Financial Year.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Financial Year"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <Input
          label="Start Year"
          type="number"
          value={startYear}
          onChange={(e) => setStartYear(e.target.value)}
          placeholder="e.g. 2026"
          autoFocus
        />
        {fyName && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground">{fyName}</p>
            <p className="text-muted-foreground">
              {startDate} → {endDate}
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Indian Financial Year runs from April 1 to March 31. Enter the start
          year to generate the FY.
        </p>
      </div>
    </Modal>
  );
}

function FYCard({ fy, summary, isActive, onActivate, onClose, onReopen, onDelete }) {
  const profitPositive = summary.profit >= 0;
  return (
    <div
      className={`rounded-xl border p-4 ${
        isActive ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{fy.name}</p>
          <p className="text-xs text-muted-foreground">
            {fy.start_date} → {fy.end_date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Active
            </span>
          )}
          <StatusBadge status={fyStatusMap[fy.status] || "Active"} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Received</p>
          <p className="font-semibold text-success">
            {formatCurrency(summary.received)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Paid</p>
          <p className="font-semibold text-destructive">
            {formatCurrency(summary.totalPaid)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Profit</p>
          <p
            className={`font-semibold ${
              profitPositive ? "text-success" : "text-destructive"
            }`}
          >
            {formatCurrency(summary.profit)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {!isActive && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onActivate(fy.id)}
          >
            <Check className="h-3.5 w-3.5" /> Set Active
          </Button>
        )}
        {fy.status === "open" ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onClose(fy.id)}
            title="Close FY (read-only for reporting)"
          >
            <Lock className="h-3.5 w-3.5" /> Close
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onReopen(fy.id)}
            title="Reopen FY"
          >
            <Unlock className="h-3.5 w-3.5" /> Reopen
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(fy)}
          title="Delete FY"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function FinancialYearManager({ transactions }) {
  const {
    financialYears,
    activeFYId,
    selectActiveFY,
    closeFY,
    reopenFY,
    deleteFY,
    loading,
  } = useFinancialYear();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Compute Received/Paid/Profit for each FY from actual transactions.
  const fyTotals = useMemo(() => {
    return financialYears.map((fy) => {
      const fyTxns = filterTransactionsByFY(transactions, fy.id, financialYears);
      const summary = computeWorkspaceSummary(fyTxns);
      return { fy, summary };
    });
  }, [financialYears, transactions]);

  const handleActivate = async (fyId) => {
    try {
      await selectActiveFY(fyId);
      toast({ title: "Financial Year activated" });
    } catch (e) {
      toast({ title: "Failed to activate", description: e.message, variant: "destructive" });
    }
  };

  const handleClose = async (fyId) => {
    try {
      await closeFY(fyId);
      toast({ title: "Financial Year closed" });
    } catch (e) {
      toast({ title: "Failed to close", description: e.message, variant: "destructive" });
    }
  };

  const handleReopen = async (fyId) => {
    try {
      await reopenFY(fyId);
      toast({ title: "Financial Year reopened" });
    } catch (e) {
      toast({ title: "Failed to reopen", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (fy) => {
    setDeleting(fy.id);
    try {
      await deleteFY(fy.id);
      toast({ title: "Financial Year deleted" });
    } catch (e) {
      toast({ title: "Cannot delete", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Years</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </CardBody>
      </Card>
    );
  }

  if (!financialYears.length) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Financial Years</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </CardHeader>
        <CardBody>
          <div className="py-8 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-foreground">
              No Financial Year set up yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a Financial Year to start tracking payments and expenses.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Financial Year
            </Button>
          </div>
        </CardBody>
        <CreateFYModal open={createOpen} onClose={() => setCreateOpen(false)} />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Financial Years</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create
        </Button>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fyTotals.map(({ fy, summary }) => (
            <FYCard
              key={fy.id}
              fy={fy}
              summary={summary}
              isActive={fy.id === activeFYId}
              onActivate={handleActivate}
              onClose={handleClose}
              onReopen={handleReopen}
              onDelete={handleDelete}
            />
          ))}
        </div>
        <CreateFYModal open={createOpen} onClose={() => setCreateOpen(false)} />
      </CardBody>
    </Card>
  );
}