import { Building2, Smartphone } from "lucide-react";

export default function QuotationBankDetails({ bankDetails }) {
  if (!bankDetails) return null;

  const fields = [
    { label: "Account Name", value: bankDetails.account_name || bankDetails.name },
    { label: "Bank Name", value: bankDetails.bank_name || bankDetails.bank },
    { label: "Account Number", value: bankDetails.account_number },
    { label: "IFSC", value: bankDetails.ifsc },
    { label: "UPI ID", value: bankDetails.upi_id || bankDetails.upi }
  ].filter((f) => f.value);

  if (fields.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-foreground mb-3">Bank / UPI Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {fields.map((f, i) => (
          <div key={i} className="flex items-start justify-between gap-3 py-1 border-b border-border last:border-0">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="text-sm font-medium text-foreground text-right break-anywhere">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}