// A self-contained transaction receipt card for html2canvas capture.
// Uses ONLY literal hex colors (no CSS variables / Tailwind color tokens)
// because html2canvas cannot resolve hsl(var(--token)) patterns.

import { formatMoney } from "@/utils/format";
import { formatEventDate } from "@/lib/dates";

const COLORS = {
  bg: "#FFFFFF",
  border: "#E8E5DD",
  text: "#2D2D2D",
  muted: "#8A8580",
  teal: "#1A4B4B",
  tealLight: "#F0F5F5",
  received: "#2E7D5B",
  paid: "#B24F3A",
  label: "#9B9690",
};

export default function TransactionShareCard({
  transaction,
  event,
  client,
  workspace,
  currency = "INR",
  particularFor,
  typeLabel,
}) {
  const t = transaction;
  if (!t) return null;

  const isOut = t.transaction_type !== "CLIENT_RECEIPT";
  const typeColor = isOut ? COLORS.paid : COLORS.received;
  const bizName = workspace?.name || "Kramasha";
  const sign = isOut ? "-" : "+";

  return (
    <div
      style={{
        width: "380px",
        background: COLORS.bg,
        borderRadius: "16px",
        border: `1px solid ${COLORS.border}`,
        padding: "20px",
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Header — business name + receipt label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "14px",
          borderBottom: `1px solid ${COLORS.border}`,
          marginBottom: "16px",
        }}
      >
        <div style={{ fontSize: "15px", fontWeight: 700, color: COLORS.teal }}>
          {bizName}
        </div>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: COLORS.teal,
            background: COLORS.tealLight,
            padding: "4px 10px",
            borderRadius: "20px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Receipt
        </div>
      </div>

      {/* Event / project title */}
      {event?.title && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: COLORS.label,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "3px",
            }}
          >
            Project
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: COLORS.text }}>
            {event.title}
          </div>
        </div>
      )}

      {/* Fields grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
        <div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: COLORS.label,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "3px",
            }}
          >
            Date
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: COLORS.text }}>
            {formatEventDate(t.transaction_date)}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: COLORS.label,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "3px",
            }}
          >
            Type
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: typeColor }}>
            {typeLabel(t)}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: COLORS.label,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "3px",
            }}
          >
            Amount
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: typeColor }}>
            {sign}
            {formatMoney(t.amount, currency)}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: COLORS.label,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "3px",
            }}
          >
            Method
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: COLORS.text }}>
            {t.payment_method || "—"}
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: COLORS.label,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "3px",
            }}
          >
            Particular
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: COLORS.text,
              wordBreak: "break-word",
              lineHeight: 1.4,
            }}
          >
            {particularFor(t)}
          </div>
        </div>

        {t.reference_number && (
          <div style={{ gridColumn: "1 / -1" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: COLORS.label,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "3px",
              }}
            >
              Reference
            </div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: COLORS.text }}>
              {t.reference_number}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "18px",
          paddingTop: "14px",
          borderTop: `1px solid ${COLORS.border}`,
          fontSize: "10px",
          color: COLORS.muted,
          textAlign: "center",
        }}
      >
        Generated by Kramasha · {formatEventDate(new Date().toISOString())}
      </div>
    </div>
  );
}