import Select from "@/components/common/Select";
import { AlertTriangle } from "lucide-react";
import { useFinancialYear } from "@/lib/FinancialYearContext";

// Reusable Financial Year selector — pulls options from the workspace's FY
// records via FinancialYearContext. Changing the selection updates the
// workspace's active/default FY (workspace-level, shared across all members).
export default function FinancialYearSelector({ className, showLabel = true }) {
  const { financialYears, selectedFYId, selectFY, loading, error, refetch } =
    useFinancialYear();

  if (error) {
    return (
      <div
        className={`flex h-9 items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 text-xs text-destructive ${className || ""}`}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Unable to load FY</span>
        <button onClick={() => refetch()} className="font-medium underline">
          Retry
        </button>
      </div>
    );
  }
  if (loading) {
    return <div className={`h-9 w-40 animate-pulse rounded-md bg-muted ${className || ""}`} />;
  }
  if (!financialYears.length) return null;

  return (
    <Select
      label={showLabel ? "Financial Year" : undefined}
      value={selectedFYId || ""}
      onChange={(e) => selectFY(e.target.value)}
      className={className}
    >
      {financialYears.map((fy) => (
        <option key={fy.id} value={fy.id}>
          {fy.name} {fy.id === selectedFYId ? "✓" : ""}
        </option>
      ))}
    </Select>
  );
}