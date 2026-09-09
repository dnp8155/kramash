import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Pencil, Download, FileCheck, Check, Copy, Loader2, FileText, AlertCircle,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useClients } from "@/hooks/useClients";
import { useEvents } from "@/hooks/useEvents";
import { useQuotations } from "@/hooks/useQuotations";
import { usePlan } from "@/lib/PlanContext";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";
import { toast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import { formatCurrency, formatDate } from "@/utils/format";
import { generateQuotationPDF } from "@/utils/quotationPdf";
import { nextQuotationNumber } from "@/utils/quotation";

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace, workspaceId } = useWorkspace();
  const { clients } = useClients();
  const { events, updateEvent } = useEvents();
  const { quotations, createQuotation, updateQuotation } = useQuotations();
  const { canUseFeature } = usePlan();
  const t = useBusinessTerminology();

  const [quotation, setQuotation] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      if (!workspaceId || !id) return;
      setLoading(true);
      try {
        const q = await base44.entities.Quotation.get(id);
        if (!q || q.workspace_id !== workspaceId) {
          setQuotation(null);
          setLoading(false);
          return;
        }
        setQuotation(q);
        const qItems = await base44.entities.QuotationItem.filter(
          { workspace_id: workspaceId, quotation_id: id },
          "sort_order", 500
        );
        setItems(qItems || []);
      } catch {
        setQuotation(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, workspaceId]);

  if (loading) return <LoadingState label="Loading quotation…" />;

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Quotation not found</p>
        <Button variant="outline" onClick={() => navigate("/quotation")}>Back to Quotations</Button>
      </div>
    );
  }

  const client = clients.find((c) => c.id === quotation.client_id);
  const event = quotation.event_id ? events.find((e) => e.id === quotation.event_id) : null;

  // Use snapshots for finalized quotations, live data for drafts
  const isFinalized = ["Finalized", "Accepted", "Rejected"].includes(quotation.status);
  const displayClient = isFinalized && quotation.client_snapshot
    ? { ...client, name: quotation.client_snapshot.name || client?.name }
    : client;
  const displayEvent = isFinalized && quotation.event_snapshot
    ? { ...event, title: quotation.event_snapshot.title || event?.title }
    : event;

  const handleDownloadPDF = async () => {
    if (!canUseFeature("pdf_export_enabled")) {
      toast({ title: "PDF export is a Pro feature", description: "Upgrade to Kramashah Pro to export branded PDFs.", variant: "destructive" });
      return;
    }
    setPdfLoading(true);
    try {
      await generateQuotationPDF({
        quotation,
        items,
        workspace: currentWorkspace,
        client: displayClient,
        event: displayEvent,
        terminology: t,
      });
    } catch (e) {
      toast({ title: "PDF generation failed", description: e?.message, variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  const handleFinalize = async () => {
    try {
      const updated = await updateQuotation(quotation.id, {
        status: "Finalized",
        client_snapshot: quotation.client_snapshot || (client ? {
          name: client.name, phone: client.phone, email: client.email,
          address: [client.address, client.city, client.state].filter(Boolean).join(", "),
        } : null),
        business_snapshot: quotation.business_snapshot || {
          name: currentWorkspace.name, logo: currentWorkspace.logo,
          address: [currentWorkspace.address, currentWorkspace.city, currentWorkspace.state].filter(Boolean).join(", "),
          phone: currentWorkspace.phone, email: currentWorkspace.email,
          gst_business_name: currentWorkspace.gst_business_name,
          gstin: currentWorkspace.gstin,
          gst_billing_address: currentWorkspace.gst_billing_address,
          gst_state: currentWorkspace.gst_state,
        },
        event_snapshot: quotation.event_snapshot || (event ? {
          title: event.title, start_date: event.start_date, end_date: event.end_date,
          venue: event.venue, venue_address: event.venue_address,
        } : null),
      });
      setQuotation(updated);
      toast({ title: "Quotation finalized" });
    } catch (e) {
      toast({ title: "Finalize failed", description: e?.message, variant: "destructive" });
    }
  };

  const handleAccept = async () => {
    if (!event) {
      toast({ title: "No event linked", description: "Link an event before accepting.", variant: "destructive" });
      return;
    }
    const currentCV = Number(event.contract_value) || 0;
    const newCV = Number(quotation.grand_total) || 0;
    if (currentCV > 0 && currentCV !== newCV) {
      setShowAcceptConfirm(true);
      return;
    }
    await doAccept();
  };

  const doAccept = async () => {
    setAccepting(true);
    setShowAcceptConfirm(false);
    try {
      const newCV = Number(quotation.grand_total) || 0;
      await updateEvent(event.id, { contract_value: newCV });
      const updated = await updateQuotation(quotation.id, { status: "Accepted" });
      setQuotation(updated);
      toast({ title: "Quotation accepted", description: `${t.workItemSingular} contract value updated to ${formatCurrency(newCV)}.` });
    } catch (e) {
      toast({ title: "Accept failed", description: e?.message, variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const newNum = nextQuotationNumber(
        quotations.map((q) => q.quotation_number),
        quotation.quotation_date
      );
      const dup = await createQuotation({
        quotation_number: newNum,
        client_id: quotation.client_id,
        event_id: quotation.event_id || null,
        quotation_date: quotation.quotation_date,
        valid_until: quotation.valid_until || null,
        status: "Draft",
        subtotal: quotation.subtotal,
        discount_type: quotation.discount_type,
        discount_value: quotation.discount_value,
        discount_amount: quotation.discount_amount,
        taxable_amount: quotation.taxable_amount,
        gst_applicable: quotation.gst_applicable,
        gst_mode: quotation.gst_mode,
        cgst_amount: quotation.cgst_amount,
        sgst_amount: quotation.sgst_amount,
        igst_amount: quotation.igst_amount,
        gst_total: quotation.gst_total,
        grand_total: quotation.grand_total,
        terms_and_conditions: quotation.terms_and_conditions,
        notes: quotation.notes,
      });
      if (items.length > 0) {
        await base44.entities.QuotationItem.bulkCreate(
          items.map((item, idx) => ({
            workspace_id: workspaceId,
            quotation_id: dup.id,
            item_type: item.item_type,
            reference_id: item.reference_id || null,
            name: item.name,
            description: item.description || "",
            quantity: item.quantity,
            days: item.days,
            unit_rate: item.unit_rate,
            line_total: item.line_total,
            gst_rate: item.gst_rate ?? null,
            sac_code: item.sac_code || "",
            sort_order: idx,
          }))
        );
      }
      toast({ title: "Quotation duplicated", description: newNum });
      navigate(`/quotation/${dup.id}`);
    } catch (e) {
      toast({ title: "Duplicate failed", description: e?.message, variant: "destructive" });
    }
  };

  const canEdit = quotation.status === "Draft";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={quotation.quotation_number}
        description={`${quotation.status} · ${formatDate(quotation.quotation_date)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/quotation")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => navigate(`/quotation/${quotation.id}/edit`)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="h-4 w-4" /> Duplicate
            </Button>
            <Button onClick={handleDownloadPDF} disabled={pdfLoading}>
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Client + Event */}
          <Card>
            <CardHeader><CardTitle>Quotation Details</CardTitle></CardHeader>
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill To</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{displayClient?.name || "—"}</p>
                {displayClient?.phone && <p className="text-xs text-muted-foreground">{displayClient.phone}</p>}
                {displayClient?.email && <p className="text-xs text-muted-foreground">{displayClient.email}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.workItemSingular}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{displayEvent?.title || "—"}</p>
                {displayEvent?.start_date && <p className="text-xs text-muted-foreground">{formatDate(displayEvent.start_date)}</p>}
                {displayEvent?.venue && <p className="text-xs text-muted-foreground">{displayEvent.venue}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quotation Date</p>
                <p className="mt-1 text-sm text-foreground">{formatDate(quotation.quotation_date)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valid Until</p>
                <p className="mt-1 text-sm text-foreground">{quotation.valid_until ? formatDate(quotation.valid_until) : "—"}</p>
              </div>
            </CardBody>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardBody className="p-0">
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No items</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-5 py-3 font-semibold">#</th>
                        <th className="px-5 py-3 font-semibold">Description</th>
                        <th className="px-5 py-3 font-semibold">Qty</th>
                        <th className="px-5 py-3 font-semibold">Days</th>
                        <th className="px-5 py-3 font-semibold text-right">Rate</th>
                        <th className="px-5 py-3 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-muted/30">
                          <td className="px-5 py-3 text-muted-foreground">{idx + 1}</td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-foreground">{item.name}</p>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{item.quantity}</td>
                          <td className="px-5 py-3 text-muted-foreground">{item.days && item.days > 1 ? item.days : "—"}</td>
                          <td className="px-5 py-3 text-right text-muted-foreground">{formatCurrency(item.unit_rate)}</td>
                          <td className="px-5 py-3 text-right font-semibold text-foreground">{formatCurrency(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Terms */}
          {quotation.terms_and_conditions && (
            <Card>
              <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quotation.terms_and_conditions}</p>
              </CardBody>
            </Card>
          )}

          {quotation.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quotation.notes}</p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <Card className="h-fit">
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current</span>
                <StatusBadge status={quotation.status} />
              </div>
              {quotation.status === "Draft" && (
                <Button className="w-full" onClick={handleFinalize} disabled={accepting}>
                  <FileCheck className="h-4 w-4" /> Finalize
                </Button>
              )}
              {quotation.status === "Finalized" && (
                <Button className="w-full" onClick={handleAccept} disabled={accepting}>
                  {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Mark as Accepted
                </Button>
              )}
              {quotation.status === "Accepted" && (
                <p className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
                  Accepted — {t.workItemSingular.toLowerCase()} contract value synced.
                </p>
              )}
            </CardBody>
          </Card>

          <Card className="h-fit">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatCurrency(quotation.subtotal)}</span>
              </div>
              {quotation.discount_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount{quotation.discount_type === "percentage" ? ` (${quotation.discount_value}%)` : ""}
                  </span>
                  <span className="font-medium text-destructive">−{formatCurrency(quotation.discount_amount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span className="font-medium text-foreground">{formatCurrency(quotation.taxable_amount)}</span>
              </div>
              {quotation.gst_applicable && (
                <>
                  {quotation.gst_mode === "igst" ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">IGST</span>
                      <span className="font-medium text-foreground">{formatCurrency(quotation.igst_amount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">CGST</span>
                        <span className="font-medium text-foreground">{formatCurrency(quotation.cgst_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">SGST</span>
                        <span className="font-medium text-foreground">{formatCurrency(quotation.sgst_amount)}</span>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-foreground">Grand Total</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(quotation.grand_total)}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Accept confirmation modal */}
      {showAcceptConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">Update Contract Value?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This {t.workItemSingular.toLowerCase()} currently has a contract value of{" "}
              <span className="font-semibold text-foreground">{formatCurrency(Number(event.contract_value) || 0)}</span>.
              Update it to the accepted quotation total of{" "}
              <span className="font-semibold text-foreground">{formatCurrency(quotation.grand_total)}</span>?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAcceptConfirm(false)}>Cancel</Button>
              <Button onClick={doAccept}>Update & Accept</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}