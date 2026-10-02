import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";
import { useT } from "@/hooks/useT";

const COLORS = {
  bg: "#FFFFFF",
  border: "#E8E5DD",
  text: "#2D2D2D",
  muted: "#8A8580",
  teal: "#1A4B4B",
  tealLight: "#F0F5F5",
  received: "#2E7D5B",
  receivedBg: "#EEF7F2",
  paid: "#B24F3A",
  paidBg: "#FBF0ED",
  label: "#9B9690",
};

const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", padding: "9px 0", borderBottom: `1px dashed ${COLORS.border}` }}>
      <div style={{ fontSize: "11px", fontWeight: 600, color: COLORS.label, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: "18px", flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text, textAlign: "right", lineHeight: "18px", wordBreak: "break-word", minWidth: 0 }}>{children}</div>
    </div>
  );
}

// Fixed 380px receipt rendered to PNG by ShareInvoiceDialog. `logoSrc` is
// already-resolved (data URL) so html2canvas never has to fetch it.
export default function TransactionShareCard({
  transaction,
  event,
  workspace,
  currency = "INR",
  particularFor,
  typeLabel,
  logoSrc = null,
}) {
  const tr = useT();
  const t = transaction;
  if (!t) return null;

  const isOut = t.transaction_type !== "CLIENT_RECEIPT";
  const typeColor = isOut ? COLORS.paid : COLORS.received;
  const typeBg = isOut ? COLORS.paidBg : COLORS.receivedBg;
  const bizName = workspace?.name || "Kramasha";
  const sign = isOut ? "-" : "+";
  // Skip the note when it's already the particular (expenses fall back to their note).
  const noteText = (t.notes || "").trim();
  const note = noteText && noteText !== String(particularFor(t) || "").trim() ? noteText : "";

  return (
    <div
      style={{
        width: "380px",
        background: COLORS.bg,
        borderRadius: "16px",
        border: `1px solid ${COLORS.border}`,
        padding: "22px 22px 18px",
        fontFamily: FONT,
        boxSizing: "border-box",
        color: COLORS.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "16px", borderBottom: `1px solid ${COLORS.border}` }}>
        {logoSrc && (
          <img
            src={logoSrc}
            alt=""
            style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "10px", border: `1px solid ${COLORS.border}`, background: "#fff", flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: COLORS.teal, lineHeight: "20px", wordBreak: "break-word" }}>{bizName}</div>
          <div style={{ fontSize: "11px", color: COLORS.muted, lineHeight: "16px" }}>{tr("Payment Receipt")}</div>
        </div>
      </div>

      <div style={{ margin: "16px 0 6px", padding: "16px", borderRadius: "12px", background: typeBg, textAlign: "center" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: typeColor, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: "16px" }}>
          {tr("Amount")} {typeLabel(t)}
        </div>
        <div style={{ fontSize: "30px", fontWeight: 800, color: typeColor, lineHeight: "40px", marginTop: "2px" }}>
          {sign}{formatMoney(t.amount, currency)}
        </div>
        <div style={{ fontSize: "12px", color: COLORS.muted, lineHeight: "18px" }}>{formatEventDate(t.transaction_date)}</div>
      </div>

      <div>
        {event?.title && <Row label={tr("Project")}>{event.title}</Row>}
        <Row label={tr("Particular")}>{particularFor(t)}</Row>
        <Row label={tr("Method")}>{t.payment_method || "—"}</Row>
        {t.reference_number && <Row label={tr("Reference")}>{t.reference_number}</Row>}
        {note && <Row label={tr("Note")}>{note}</Row>}
      </div>

      <div style={{ marginTop: "16px", fontSize: "10px", color: COLORS.muted, textAlign: "center", lineHeight: "14px" }}>
        {tr("Invoice generated with Kramasha!")}
      </div>
    </div>
  );
}
