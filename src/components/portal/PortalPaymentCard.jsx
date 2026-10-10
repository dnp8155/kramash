import { formatMoney } from "@/utils/format";

// "Payment Instructions" card shared by the invoice and quotation public pages: bank details plus UPI with
// a scannable QR. `amount` (optional) is added to the QR/"Scan to pay" — the invoice passes its balance due.
export default function PortalPaymentCard({ bankDetails, amount = 0, currency }) {
  if (!bankDetails) return null;
  const accountName = bankDetails.account_name || bankDetails.name;
  const bankName = bankDetails.bank_name || bankDetails.bank;
  const accountNumber = bankDetails.account_number;
  const ifsc = bankDetails.ifsc;
  const upiId = bankDetails.upi_id || bankDetails.upi;
  if (!bankName && !accountNumber && !upiId) return null;

  const upiUri = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}${accountName ? `&pn=${encodeURIComponent(accountName)}` : ""}${amount > 0 ? `&am=${amount}&cu=INR` : ""}`
    : "";

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card">
      <h2 className="text-sm font-semibold text-foreground mb-3">Payment Instructions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {(bankName || accountNumber) && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bank Details</div>
            {accountName && <div><span className="text-muted-foreground">A/C Name: </span><span className="text-foreground">{accountName}</span></div>}
            {bankName && <div><span className="text-muted-foreground">Bank: </span><span className="text-foreground">{bankName}</span></div>}
            {accountNumber && <div><span className="text-muted-foreground">A/C No: </span><span className="font-mono text-foreground">{accountNumber}</span></div>}
            {ifsc && <div><span className="text-muted-foreground">IFSC: </span><span className="font-mono text-foreground">{ifsc}</span></div>}
          </div>
        )}
        {upiId && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">UPI</div>
            <div className="font-mono text-foreground break-all">{upiId}</div>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=${encodeURIComponent(upiUri)}`} alt="UPI QR Code" className="w-28 h-28 rounded-lg border border-border" />
            <div className="text-xs text-muted-foreground">Scan to pay{amount > 0 ? ` ${formatMoney(amount, currency)}` : ""}</div>
          </div>
        )}
      </div>
    </div>
  );
}
