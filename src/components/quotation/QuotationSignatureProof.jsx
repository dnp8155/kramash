import { PenLine } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { useT } from "@/hooks/useT";

// The client's e-signature on an accepted quotation — shown to the owner as proof of acceptance.
export default function QuotationSignatureProof({ quotation }) {
  const t = useT();
  if (!quotation?.signed_at && !quotation?.client_signature) return null;

  const signedAt = quotation.signed_at ? new Date(quotation.signed_at) : null;
  const validDate = signedAt && !Number.isNaN(signedAt.getTime());
  const dateText = validDate ? formatDate(String(quotation.signed_at).slice(0, 10)) : "";
  const timeText = validDate ? signedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <PenLine className="w-4 h-4 text-success" />
        <h3 className="text-sm font-semibold text-foreground">{t("Client Acceptance")}</h3>
        <span className="text-[11px] px-2 py-0.5 rounded bg-success/10 text-success font-medium uppercase tracking-wide">{t("Signed")}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
        {quotation.client_signature ? (
          <img src={quotation.client_signature} alt={t("Client signature")} className="border border-border rounded-lg bg-white max-h-32 max-w-full" />
        ) : (
          <div className="border border-border rounded-lg bg-white px-6 py-4 text-2xl italic text-black font-serif">{quotation.signed_by_name}</div>
        )}
        <div className="space-y-1 text-sm">
          {quotation.signed_by_name && (
            <div><span className="text-muted-foreground">{t("Signed by")}: </span><span className="font-medium text-foreground">{quotation.signed_by_name}</span></div>
          )}
          {validDate && (
            <div><span className="text-muted-foreground">{t("Accepted on")}: </span><span className="font-medium text-foreground">{dateText}{timeText ? ` · ${timeText}` : ""}</span></div>
          )}
          {quotation.quotation_number && (
            <div><span className="text-muted-foreground">{t("Quotation")}: </span><span className="font-medium text-foreground">{quotation.quotation_number}</span></div>
          )}
          {Number(quotation.grand_total) > 0 && (
            <div className="text-xs text-muted-foreground">{t("Accepted at the quoted total shown above.")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
