import { jsPDF } from "jspdf";
import { formatDate } from "@/lib/dates";

// The Pro subscription payment receipt (Your Plan → Payment history), as a real PDF in the app's look:
// brand blue, soft warm panels, rounded cards. Opened in the app's PDF preview (download / print).
// It is a payment receipt, not a GST tax invoice (Kramasha's GST registration is not on it).

const PRIMARY = [55, 83, 154];      // --primary hsl(223 47% 41%)
const INK = [28, 34, 48];
const MUTED = [98, 106, 122];
const SOFT = [248, 246, 241];       // --background warm
const BORDER = [235, 229, 218];
const SUCCESS = [31, 143, 95];
const WHITE = [255, 255, 255];

const CYCLES = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Yearly" };
const SELLER = {
  name: "Kramasha",
  address: "1-2, Basement, Lad Apartment, V K Marg, Vadodara, Gujarat 390001",
  email: "kramashaofficial@gmail.com",
  web: "www.kramasha.com",
};

const money = (amount, currency) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 2 })
    .format(Number(amount) || 0).replace("₹", "Rs. "); // jsPDF's built-in fonts have no ₹ glyph
// The day of payment in this device's time zone (the stored time is UTC: a 2 AM IST payment is the same day here).
const dayOf = (p) => {
  const iso = p?.verified_at || p?.created_at || "";
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// KRM-20261119-4F9C2A: date of payment + the end of the Razorpay payment id. Stable for the same payment.
export function receiptNumber(p) {
  const d = dayOf(p).replace(/-/g, "") || "00000000";
  const tail = String(p?.gateway_payment_id || p?.id || "").replace(/^pay_/, "").slice(-6).toUpperCase() || "000000";
  return `KRM-${d}-${tail}`;
}
export const receiptFilename = (p) => `Kramasha_Receipt_${receiptNumber(p)}.pdf`;

// The Kramasha logo (public/kramasha_logo_512x512.png) as PNG bytes; null if it can't be loaded (the receipt still works).
export const RECEIPT_LOGO_PATH = "/kramasha_logo_512x512.png";
async function loadLogo() {
  try {
    const res = await fetch(RECEIPT_LOGO_PATH);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// payment: subscription_payments row (SUCCESS). subscription: its workspace_subscriptions row (for the period), optional.
// workspace: the paying business (name, email, phone, address, city, state, gstin).
// output: "bloburl" (the app's PDF preview) or "arraybuffer" (tests).
export async function generateSubscriptionReceiptPdf({ payment, subscription, workspace, output = "bloburl", logo: logoBytes }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 18, CW = W - M * 2;
  const number = receiptNumber(payment);
  doc.setProperties({ title: `Payment Receipt ${number}`, subject: "Kramasha Pro subscription", author: "Kramasha", creator: "Kramasha" });

  // ---- Header band ----
  doc.setFillColor(...SOFT);
  doc.rect(0, 0, W, 46, "F");
  const logo = logoBytes || (await loadLogo());
  let logoDrawn = false;
  if (logo) {
    // A small brand mark beside the name (about the height of the two text lines), not a hero image.
    try { doc.addImage(logo, "PNG", M, 15.2, 11, 11); logoDrawn = true; } catch { /* a broken image never stops the receipt */ }
  }
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(SELLER.name, M + (logoDrawn ? 13.5 : 0), 20.6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(SELLER.web, M + (logoDrawn ? 13.5 : 0), 25.6);

  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PAYMENT RECEIPT", W - M, 20, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text(`Receipt no. ${number}`, W - M, 26.5, { align: "right" });
  doc.text(`Date ${formatDate(dayOf(payment))}`, W - M, 31.5, { align: "right" });

  // Paid stamp
  doc.setFillColor(...SUCCESS);
  doc.roundedRect(W - M - 22, 35, 22, 6.5, 3.2, 3.2, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PAID", W - M - 11, 39.4, { align: "center" });

  // ---- From / Billed to ----
  let y = 58;
  const colW = (CW - 8) / 2;
  const block = (x, title, lines) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(title.toUpperCase(), x, y);
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    let yy = y + 6;
    lines.filter(Boolean).forEach((l, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setFontSize(i === 0 ? 10.5 : 9);
      if (i > 0) doc.setTextColor(...MUTED);
      const wrapped = doc.splitTextToSize(String(l), colW);
      doc.text(wrapped, x, yy);
      yy += wrapped.length * (i === 0 ? 5.2 : 4.4);
    });
    return yy;
  };
  const place = [workspace?.address, workspace?.city, workspace?.state].filter(Boolean).join(", ");
  const endA = block(M, "From", [SELLER.name, SELLER.address, SELLER.email]);
  const endB = block(M + colW + 8, "Billed to", [workspace?.name || "—", place, workspace?.email, workspace?.phone, workspace?.gstin ? `GSTIN ${workspace.gstin}` : ""]);
  y = Math.max(endA, endB) + 8;

  // ---- Item table ----
  const cycle = CYCLES[payment?.billing_cycle_snapshot] || payment?.billing_cycle_snapshot || "";
  const period = subscription?.started_at && subscription?.expires_at
    ? `${formatDate(String(subscription.started_at).slice(0, 10))} to ${formatDate(String(subscription.expires_at).slice(0, 10))}`
    : "";
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(M, y, CW, 9, 2, 2, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("DESCRIPTION", M + 4, y + 6);
  doc.text("AMOUNT", W - M - 4, y + 6, { align: "right" });
  y += 9;

  const rowH = period ? 17 : 12;
  doc.setDrawColor(...BORDER);
  doc.setFillColor(...WHITE);
  doc.rect(M, y, CW, rowH, "S");
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(`Kramasha Pro${cycle ? ` · ${cycle}` : ""}`, M + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  if (period) doc.text(`Valid ${period}`, M + 4, y + 12.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(money(payment?.amount, payment?.currency), W - M - 4, y + 7, { align: "right" });
  y += rowH + 4;

  // Total
  const totW = 78;
  doc.setFillColor(...SOFT);
  doc.roundedRect(W - M - totW, y, totW, 13, 2.5, 2.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Total paid", W - M - totW + 5, y + 8.3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY);
  doc.text(money(payment?.amount, payment?.currency), W - M - 5, y + 8.6, { align: "right" });
  y += 24;

  // ---- Payment details ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("PAYMENT DETAILS", M, y);
  y += 4;
  const details = [
    ["Paid on", formatDate(dayOf(payment))],
    ["Paid through", "Razorpay"],
    ["Payment ID", payment?.gateway_payment_id || "—"],
    ["Order ID", payment?.gateway_order_id || "—"],
  ];
  doc.setDrawColor(...BORDER);
  doc.roundedRect(M, y, CW, details.length * 8 + 2, 2.5, 2.5, "S");
  details.forEach(([k, v], i) => {
    const ry = y + 6.5 + i * 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(k, M + 4, ry);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.text(String(v), W - M - 4, ry, { align: "right" });
    if (i < details.length - 1) { doc.setDrawColor(...BORDER); doc.line(M + 4, ry + 3, W - M - 4, ry + 3); }
  });

  // ---- Footer ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Thank you for choosing Kramasha Pro.", W / 2, 270, { align: "center" });
  doc.text("This is a computer-generated payment receipt for your records and needs no signature.", W / 2, 275, { align: "center" });
  doc.text(`${SELLER.name} · ${SELLER.email} · ${SELLER.web}`, W / 2, 280, { align: "center" });

  if (output === "arraybuffer") return { data: doc.output("arraybuffer"), filename: receiptFilename(payment) };
  return { url: doc.output("bloburl"), filename: receiptFilename(payment) };
}
