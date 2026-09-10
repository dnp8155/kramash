import { Building, Smartphone } from "lucide-react";

export default function QuotationBankSection({ workspace }) {
  if (!workspace) return null;
  const hasBank = workspace.bank_account_name || workspace.bank_name || workspace.bank_account_number || workspace.bank_ifsc;
  const hasUpi = workspace.bank_upi_id;
  if (!hasBank && !hasUpi) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment Details</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {hasBank && (
          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bank Transfer</p>
            </div>
            <dl className="mt-2 space-y-1 text-sm">
              {workspace.bank_account_name && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Account Name</dt>
                  <dd className="text-right font-medium text-foreground">{workspace.bank_account_name}</dd>
                </div>
              )}
              {workspace.bank_name && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Bank Name</dt>
                  <dd className="text-right font-medium text-foreground">{workspace.bank_name}</dd>
                </div>
              )}
              {workspace.bank_account_number && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Account No.</dt>
                  <dd className="text-right font-medium text-foreground">{workspace.bank_account_number}</dd>
                </div>
              )}
              {workspace.bank_ifsc && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">IFSC</dt>
                  <dd className="text-right font-medium text-foreground">{workspace.bank_ifsc}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
        {hasUpi && (
          <div className="rounded-lg bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">UPI</p>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{workspace.bank_upi_id}</p>
          </div>
        )}
      </div>
    </div>
  );
}