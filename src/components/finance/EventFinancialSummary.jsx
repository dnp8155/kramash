import { useState } from "react";
import {
  Wallet,
  Pencil,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";
import { formatCurrency } from "@/utils/format";

function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${accent || "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function ContractValueEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">Contract Value</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {value ? formatCurrency(value) : "—"}
          <button
            onClick={() => {
              setVal(value || "");
              setEditing(true);
            }}
            className="text-muted-foreground hover:text-foreground"
            title="Edit contract value"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await onSave(val === "" ? null : Number(val));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-2">
      <p className="mb-1.5 text-sm text-muted-foreground">Contract Value</p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button size="icon" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setEditing(false)}
          disabled={saving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function EventFinancialSummary({
  fin,
  onEditContractValue,
  onRecordClientPayment,
  onRecordExpense,
}) {
  const t = useBusinessTerminology();
  const profitPositive = fin.profit >= 0;
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{t.financialSummaryLabel}</CardTitle>
        <div
          className={`flex items-center gap-1.5 text-sm font-semibold ${
            profitPositive ? "text-success" : "text-destructive"
          }`}
        >
          {profitPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {formatCurrency(fin.profit)} profit
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="divide-y divide-border">
          <ContractValueEditor
            value={fin.contractValue}
            onSave={onEditContractValue}
          />
          <Row label="Client Received" value={formatCurrency(fin.received)} accent="text-success" />
          <Row
            label="Client Pending"
            value={formatCurrency(fin.clientPending)}
            accent={fin.clientPending > 0 ? "text-warning" : "text-foreground"}
          />
          {fin.clientOverpaid > 0 && (
            <Row label="Overpaid" value={formatCurrency(fin.clientOverpaid)} accent="text-info" />
          )}
          <Row label="Team Agreed" value={formatCurrency(fin.teamAgreed)} />
          <Row label="Team Paid" value={formatCurrency(fin.teamPaid)} accent="text-destructive" />
          <Row
            label="Team Remaining"
            value={formatCurrency(fin.teamRemaining)}
            accent={fin.teamRemaining > 0 ? "text-warning" : "text-foreground"}
          />
          <Row label="Expenses" value={formatCurrency(fin.expenses)} accent="text-destructive" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onRecordClientPayment}>
            <Wallet className="h-4 w-4" /> Client Payment
          </Button>
          <Button size="sm" variant="outline" onClick={onRecordExpense}>
            <Plus className="h-4 w-4" /> Expense
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}