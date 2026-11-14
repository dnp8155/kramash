import PortalPaymentCard from "@/components/portal/PortalPaymentCard";

// Same "Payment Instructions" card (bank + UPI + QR) as the public invoice. No amount on the QR —
// a quotation isn't a payment request.
export default function QuotationBankDetails({ bankDetails, currency }) {
  return <PortalPaymentCard bankDetails={bankDetails} currency={currency} />;
}
