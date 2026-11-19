import { useEffect, useState } from "react";
import { Receipt, Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter,
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import PdfPreviewModal from "@/components/common/PdfPreviewModal";
import { generateSubscriptionReceiptPdf, receiptNumber } from "@/lib/subscriptionReceiptPdf";
import { useToast } from "@/components/ui/use-toast";

const CYCLES = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Yearly" };
const STATUS = {
  SUCCESS: { label: "Paid", cls: "bg-success/10 text-success" },
  FAILED: { label: "Failed", cls: "bg-destructive/10 text-destructive" },
  CREATED: { label: "Not completed", cls: "bg-muted text-muted-foreground" },
  REFUNDED: { label: "Refunded", cls: "bg-[#2563eb]/10 text-[#2563eb]" },
};

const money = (amount, currency) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 2 }).format(Number(amount) || 0);
// The day of payment in this device's time zone (same as on the receipt PDF).
const dayOf = (p) => {
  const iso = p.verified_at || p.created_at || "";
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
// workspace: the paying business, printed as "Billed to" on the receipt PDF.
export default function PaymentHistory({ workspaceId, workspace, refreshKey }) {
  const { toast } = useToast();
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  // Subscriptions by id, so the receipt can say which period the payment paid for.
  const [subs, setSubs] = useState({});
  const [pdf, setPdf] = useState({ open: false, url: "", filename: "", loading: false });

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
    base44.entities.WorkspaceSubscription.filter({ workspace_id: workspaceId })
      .then((list) => { if (!cancelled) setSubs(Object.fromEntries((list || []).map((x) => [x.id, x]))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [workspaceId, refreshKey]);

  const downloadPdf = async (p) => {
    setPdf({ open: true, url: "", filename: "", loading: true });
    try {
      const out = await generateSubscriptionReceiptPdf({ payment: p, subscription: subs[p.subscription_id], workspace });
      setPdf({ open: true, ...out, loading: false });
    } catch (e) {
      setPdf({ open: false, url: "", filename: "", loading: false });
      toast({ title: "Couldn't make the PDF", description: e?.message, variant: "destructive" });
    }
  };

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
                  ["Receipt no.", receiptNumber(open)],
                  ["Date", formatDate(dayOf(open))],
                  ["Plan", `Pro · ${CYCLES[open.billing_cycle_snapshot] || open.billing_cycle_snapshot || "—"}`],
                  ...(subs[open.subscription_id]?.expires_at ? [["Valid", `${formatDate(String(subs[open.subscription_id].started_at || "").slice(0, 10))} to ${formatDate(String(subs[open.subscription_id].expires_at).slice(0, 10))}`]] : []),
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
            <Button onClick={() => downloadPdf(open)} disabled={pdf.loading}>{pdf.loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />} Download PDF</Button>
            <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
      <PdfPreviewModal url={pdf.url} filename={pdf.filename} open={pdf.open} loading={pdf.loading} onClose={() => setPdf((x) => { if (x.url) setTimeout(() => URL.revokeObjectURL(x.url), 1000); return { ...x, open: false, url: "" }; })} />
    </div>
  );
}
