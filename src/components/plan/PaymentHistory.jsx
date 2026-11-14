import { useEffect, useState } from "react";
import { Receipt, Printer } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter,
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";

const CYCLES = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Yearly" };
const STATUS = {
  SUCCESS: { label: "Paid", cls: "bg-success/10 text-success" },
  FAILED: { label: "Failed", cls: "bg-destructive/10 text-destructive" },
  CREATED: { label: "Not completed", cls: "bg-muted text-muted-foreground" },
  REFUNDED: { label: "Refunded", cls: "bg-[#2563eb]/10 text-[#2563eb]" },
};

const money = (amount, currency) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 2 }).format(Number(amount) || 0);
const dayOf = (p) => String(p.verified_at || p.created_at || "").slice(0, 10);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// A plain printable page (the browser's Print dialog also offers "Save as PDF").
function printReceipt(p, businessName) {
  const rows = [
    ["Receipt for", businessName || "—"],
    ["Date", formatDate(dayOf(p))],
    ["Plan", `Pro · ${CYCLES[p.billing_cycle_snapshot] || p.billing_cycle_snapshot || "—"}`],
    ["Amount paid", money(p.amount, p.currency)],
    ["Payment ID", p.gateway_payment_id || "—"],
    ["Order ID", p.gateway_order_id || "—"],
    ["Paid through", "Razorpay"],
  ].map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
  const w = window.open("", "_blank", "width=720,height=800");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payment receipt</title><style>
    body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a;margin:48px;max-width:560px}
    h1{font-size:20px;margin:0 0 4px}p{margin:0 0 20px;color:#5a5650;font-size:13px}
    table{width:100%;border-collapse:collapse;font-size:14px}td{padding:10px 0;border-bottom:1px solid #e8e3db;vertical-align:top}
    td.k{color:#8a8580;width:38%}.foot{margin-top:28px;font-size:12px;color:#8a8580;line-height:1.6}
  </style></head><body>
    <h1>Payment receipt</h1><p>Kramasha Pro subscription</p>
    <table>${rows}</table>
    <div class="foot">Kramasha · 1-2, Basement, Lad Apartment, V K Marg, Vadodara, Gujarat 390001<br>kramashaofficial@gmail.com<br>This is a payment receipt for your records.</div>
  </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export default function PaymentHistory({ workspaceId, businessName, refreshKey }) {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    base44.entities.SubscriptionPayment.filter({ workspace_id: workspaceId })
      .then((list) => {
        if (cancelled) return;
        const sorted = (list || []).slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
        // An order that was opened and never paid is noise, so only attempts that reached a result are listed.
        setRows(sorted.filter((p) => p.status !== "CREATED"));
      })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [workspaceId, refreshKey]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-[15px] p-5">
      <h3 className="text-sm font-semibold mb-3">Payment history</h3>
      <div className="divide-y divide-border">
        {rows.map((p) => {
          const st = STATUS[p.status] || STATUS.CREATED;
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Pro · {CYCLES[p.billing_cycle_snapshot] || p.billing_cycle_snapshot || "—"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{formatDate(dayOf(p))}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-foreground">{money(p.amount, p.currency)}</div>
                  <span className={cn("inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded", st.cls)}>{st.label}</span>
                </div>
                {p.status === "SUCCESS" && (
                  <button type="button" onClick={() => setOpen(p)} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="View receipt" title="Receipt">
                    <Receipt className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AppDialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <AppDialogContent maxWidth="max-w-md">
          <AppDialogHeader>
            <AppDialogTitle>Payment receipt</AppDialogTitle>
            <AppDialogDescription>Kramasha Pro subscription</AppDialogDescription>
          </AppDialogHeader>
          {open && (
            <AppDialogBody>
              <div className="rounded-xl border border-border divide-y divide-border">
                {[
                  ["Date", formatDate(dayOf(open))],
                  ["Plan", `Pro · ${CYCLES[open.billing_cycle_snapshot] || open.billing_cycle_snapshot || "—"}`],
                  ["Amount paid", money(open.amount, open.currency)],
                  ["Payment ID", open.gateway_payment_id || "—"],
                  ["Order ID", open.gateway_order_id || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-4 px-4 py-2.5">
                    <span className="text-sm text-muted-foreground shrink-0">{k}</span>
                    <span className="text-sm font-medium text-foreground text-right break-all">{v}</span>
                  </div>
                ))}
              </div>
            </AppDialogBody>
          )}
          <AppDialogFooter>
            <Button onClick={() => printReceipt(open, businessName)}><Printer className="w-4 h-4 mr-1.5" /> Print / Save as PDF</Button>
            <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
}
