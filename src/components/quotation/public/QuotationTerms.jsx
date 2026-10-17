import PortalRichCard from "@/components/portal/PortalRichCard";

// Terms, payment terms and special notes as separate cards — the same ones the public invoice uses.
export default function QuotationTerms({ terms, specialNotes, paymentConditions, showTerms = true, showSpecialNotes = true, showPaymentConditions = true }) {
  const notesHtml = showSpecialNotes && specialNotes?.trim()
    ? specialNotes.trim().split(/\n{2,}/).map((para) => `<p>${para.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`).join("")
    : "";
  return (
    <>
      {showTerms && <PortalRichCard title="Terms & Conditions" html={terms} collapsible />}
      {showPaymentConditions && <PortalRichCard title="Payment Terms" html={paymentConditions} />}
      <PortalRichCard title="Special Notes" html={notesHtml} />
    </>
  );
}
