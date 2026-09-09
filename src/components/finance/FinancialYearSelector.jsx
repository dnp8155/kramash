import Select from "@/components/common/Select";
import { useFinancialYear } from "@/lib/FinancialYearContext";

// Reusable Financial Year selector — pulls options from the workspace's FY
// records via FinancialYearContext. Changing the selection updates the
// workspace's active/default FY (workspace-level, shared across all members).
export default function FinancialYearSelector({ className, showLabel = true }) {
  const { financialYears, activeFYId, selectActiveFY, loading } =
    useFinancialYear();

  if (loading) {
    return <div className={`h-9 w-40 animate-pulse rounded-md bg-muted ${className || ""}`} />;
  }
  if (!financialYears.length) return null;

  return (
    <Select
      label={showLabel ? "Financial Year" : undefined}
      value={activeFYId || ""}
      onChange={(e) => selectActiveFY(e.target.value)}
      className={className}
    >
      {financialYears.map((fy) => (
        <option key={fy.id} value={fy.id}>
          {fy.name} {fy.is_active ? "✓" : ""}
        </option>
      ))}
    </Select>
  );
}