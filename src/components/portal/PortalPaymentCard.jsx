import { formatMoney } from "@/utils/format";
import { paymentPreset } from "@/constants/paymentRegions";

// "Payment Instructions" card shared by the invoice and quotation public pages: bank details plus UPI with
// a scannable QR. `amount` (optional) is added to the QR/"Scan to pay" — the invoice passes its balance due.
// Labels follow the workspace currency (constants/paymentRegions.js): INR shows exactly what it always did
// (IFSC, UPI + QR); USD shows Routing number + Zelle (no QR); IBAN currencies show IBAN + BIC / SWIFT and no wallet…
export default function PortalPaymentCard({ bankDetails, amount = 0, currency }) {
  if (!bankDetails) return null;
  const preset = paymentPreset(currency);
  const accountName = bankDetails.account_name || bankDetails.name;
  const bankName = bankDetails.bank_name || bankDetails.bank;
  const accountNumber = bankDetails.account_number;
  const ifsc = bankDetails.ifsc;
  const upiId = preset.wallet ? bankDetails.upi_id || bankDetails.upi : "";
  if (!bankName && !accountNumber && !upiId) return null;

  const upiUri = upiId && preset.showUpiQr
    ? `upi://pay?pa=${encodeURIComponent(upiId)}${accountName ? `&pn=${encodeURIComponent(accountName)}` : ""}${amount > 0 ? `&am=${amount}&cu=INR` : ""}`
    : "";

  return (
    <div className="bg-card border border-border rounded-[15px] p-5 shadow-card">
      <h2 className="text-sm font-semibold text-foreground mb-3">Payment Instructions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {(bankName || accountNumber) && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bank Details</div>
            {accountName && <div><span className="text-muted-foreground">A/C Name: </span><span className="text-foreground">{accountName}</span></div>}
            {bankName && <div><span className="text-muted-foreground">Bank: </span><span className="text-foreground">{bankName}</span></div>}
            {accountNumber && <div><span className="text-muted-foreground">{preset.accountLabel === "Account Number" ? "A/C No" : preset.accountLabel}: </span><span className="font-mono text-foreground">{accountNumber}</span></div>}
            {ifsc && <div><span className="text-muted-foreground">{preset.codeLabel === "IFSC Code" ? "IFSC" : preset.codeLabel}: </span><span className="font-mono text-foreground">{ifsc}</span></div>}
          </div>
        )}
        {upiId && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{preset.wallet}</div>
            <div className="font-mono text-foreground break-all">{upiId}</div>
            {upiUri && (
              <>
                <img loading="lazy" decoding="async" src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=${encodeURIComponent(upiUri)}`} alt="UPI QR Code" className="w-28 h-28 rounded-lg border border-border" />
                <div className="text-xs text-muted-foreground">Scan to pay{amount > 0 ? ` ${formatMoney(amount, currency)}` : ""}</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
