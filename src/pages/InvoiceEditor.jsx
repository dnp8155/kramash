import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { invalidateEntities } from "@/lib/queryInvalidation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney } from "@/utils/format";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { AlertTriangle, ArrowLeft, Plus, Eye, Send, Wallet } from "lucide-react";
import InvoiceClientCard from "@/components/invoice/InvoiceClientCard";
import InvoiceProductsSection from "@/components/invoice/InvoiceProductsSection";
import InvoiceFinancials from "@/components/invoice/InvoiceFinancials";
import InvoicePrintView from "@/components/invoice/InvoicePrintView";
import RecordInvoicePaymentDialog from "@/components/invoice/RecordInvoicePaymentDialog";
import InvoicePublicLinkPanel from "@/components/invoice/InvoicePublicLinkPanel";
import Toggle from "@/components/common/Toggle";
import {
  generateInvoiceNumber, loadInvoice,
  createInvoice, updateInvoice, deleteInvoice,
  verifyInvoiceRefs, buildClientSnapshot, buildBusinessSnapshot, buildEventSnapshot,
  computeInvoiceTotals
} from "@/lib/invoiceService";
import ClientForm from "@/components/clients/ClientForm";

const today = () => new Date().toISOString().slice(0, 10);

const INVOICE_STATUS_META = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", className: "bg-badge-upcoming-bg text-badge-upcoming-fg" },
  paid: { label: "Paid", className: "bg-badge-completed-bg text-badge-completed-fg" },
  partial: { label: "Partial", className: "bg-badge-progress-bg text-badge-progress-fg" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" }
};

export default function InvoiceEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currency = workspace?.currency || "INR";
  const gstWorkspaceEnabled = !!workspace?.gst_enabled;
  const term = useBusinessTerminology();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState([]);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstRate, setGstRate] = useState(workspace?.default_gst_rate || 18);
  const [gstMode, setGstMode] = useState("cgst_sgst");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [dueDateType, setDueDateType] = useState("due_on_receipt");
  const [milestoneTag, setMilestoneTag] = useState("Full Payment");
  const [showItemizedRates, setShowItemizedRates] = useState(true);
  const [authorizedSignatory, setAuthorizedSignatory] = useState("");

  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [publicLinkData, setPublicLinkData] = useState(null);

  const readOnly = status === "paid" || status === "cancelled";

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [cl, ev] = await Promise.all([
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500)
      ]);
      setClients(cl || []);
      setEvents(ev || []);

      if (isNew) {
        const num = await generateInvoiceNumber(workspaceId);
        setInvoiceNumber(num);
        setGstApplicable(gstWorkspaceEnabled);
        // Pre-fill from quotation if provided via navigation state
        const prefill = location.state?.fromQuotation;
        if (prefill) {
          setClientId(prefill.client_id || "");
          setEventId(prefill.event_id || "");
          if (prefill.items?.length) {
            setItems(prefill.items.map((it) => ({
              item_type: "line_item",
              name: it.name || "",
              description: it.description || "",
              quantity: Math.max(1, Number(it.quantity) || 1),
              unit_rate: Number(it.unit_rate) || 0
            })));
          }
          setDiscountType(prefill.discount_type || "percent");
          setDiscountValue(prefill.discount_value || 0);
          setGstApplicable(!!prefill.gst_applicable);
        }
        // Pre-select event from query param
        const qpEventId = new URLSearchParams(location.search).get("event_id");
        if (qpEventId) {
          const qpEvent = (ev || []).find((e) => e.id === qpEventId);
          if (qpEvent) {
            setEventId(qpEvent.id);
            if (qpEvent.client_id) setClientId(qpEvent.client_id);
          }
        }
      } else {
        const result = await loadInvoice(workspaceId, id);
        if (!result) { setNotFound(true); return; }
        const inv = result.invoice;
        setExistingInvoice(inv);
        setInvoiceNumber(inv.invoice_number);
        setInvoiceDate(inv.invoice_date || today());
        setDueDate(inv.due_date || "");
        setClientId(inv.client_id || "");
        setEventId(inv.event_id || "");
        setStatus(inv.status || "draft");
        setItems(result.items || []);
        setDiscountType(inv.discount_type || "percent");
        setDiscountValue(inv.discount_value || 0);
        setGstApplicable(!!inv.gst_applicable);
        setGstRate(Number(inv.gst_rate) || (workspace?.default_gst_rate || 18));
        setGstMode(inv.gst_mode || "cgst_sgst");
        setNotes(inv.notes || "");
        setPaymentTerms(inv.payment_terms || "");
        setDueDateType(inv.due_date_type || "due_on_receipt");
        setMilestoneTag(inv.milestone_tag || "Full Payment");
        setShowItemizedRates(inv.show_itemized_rates !== false);
        setAuthorizedSignatory(inv.authorized_signatory || "");
        setPublicLinkData({
          public_link_enabled: !!inv.public_link_enabled,
          public_token: inv.public_token || "",
          portal_view_count: Number(inv.portal_view_count) || 0
        });
      }
    } catch (e) {
      setError(e?.message || "Failed to load invoice.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, id, isNew, location.state, gstWorkspaceEnabled]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(
    () => computeInvoiceTotals(items, { discountType, discountValue, gstApplicable, gstRate, gstMode }),
    [items, discountType, discountValue, gstApplicable, gstRate, gstMode]
  );

  const client = clients.find((c) => c.id === clientId) || null;
  const event = events.find((e) => e.id === eventId) || null;

  const availableEvents = clientId
    ? events.filter((e) => !e.client_id || e.client_id === clientId)
    : events;

  const onClientChange = (val) => {
    setClientId(val);
    if (eventId) {
      const ev = events.find((e) => e.id === eventId);
      if (ev && ev.client_id && ev.client_id !== val) setEventId("");
    }
  };

  const onEventChange = (val) => {
    setEventId(val);
    if (val) {
      const ev = events.find((e) => e.id === val);
      if (ev?.client_id && !clientId) setClientId(ev.client_id);
    }
  };

  const buildData = () => ({
    invoice_number: invoiceNumber,
    client_id: clientId,
    event_id: eventId,
    invoice_date: invoiceDate,
    due_date: dueDate,
    due_date_type: dueDateType,
    milestone_tag: milestoneTag,
    show_itemized_rates: showItemizedRates,
    discount_type: discountType,
    discount_value: Number(discountValue) || 0,
    gst_applicable: gstApplicable,
    gst_rate: Number(gstRate) || 0,
    gst_mode: gstMode,
    notes,
    payment_terms: paymentTerms,
    terms_and_conditions: paymentTerms,
    authorized_signatory: authorizedSignatory
  });

  const validate = () => {
    if (!invoiceDate) return "Invoice date is required.";
    if (items.length === 0) return "Add at least one item.";
    for (const it of items) {
      if (!it.name?.trim()) return "Every item needs a name.";
    }
    return "";
  };

  const save = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setError("");
    setSaving(true);
    try {
      const refCheck = await verifyInvoiceRefs(workspaceId, clientId, eventId);
      if (!refCheck.ok) { setError(refCheck.error); setSaving(false); return; }
      const data = { ...buildData(), status: "draft" };
      if (isNew) {
        const inv = await createInvoice(workspaceId, data, items, {
          client_snapshot: buildClientSnapshot(refCheck.client || client),
          business_snapshot: buildBusinessSnapshot(workspace),
          event_snapshot: buildEventSnapshot(refCheck.event || event)
        });
        invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
        toast({ title: "Invoice saved" });
        navigate(`/invoices/${inv.id}`, { replace: true });
      } else {
        await updateInvoice(workspaceId, id, data, items);
        invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
        toast({ title: "Invoice updated" });
        load();
      }
    } catch (e) {
      setError(e?.message || "Failed to save invoice.");
    } finally {
      setSaving(false);
    }
  };

  const sendInvoice = async () => {
    if (!existingInvoice) return;
    try {
      await base44.entities.Invoice.update(id, { status: "sent" });
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: "Invoice marked as sent" });
      setStatus("sent");
      load();
    } catch (e) {
      setError(e?.message || "Failed to update status.");
    }
  };

  const onDelete = async () => {
    if (!existingInvoice) return;
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    try {
      await deleteInvoice(workspaceId, id);
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: "Invoice deleted" });
      navigate("/invoices");
    } catch (e) {
      setError(e?.message || "Failed to delete invoice.");
    }
  };

  if (loading) return <LoadingState label="Loading invoice…" />;
  if (notFound) {
    return (
      <div className="p-6 max-w-[800px] mx-auto">
        <EmptyState title="Invoice not found" description="This invoice may not exist or belongs to another workspace." />
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/invoices")}><ArrowLeft className="w-4 h-4" />Back to Invoices</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => navigate("/invoices")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1">
            <ArrowLeft className="w-4 h-4" /> Invoices
          </button>
          <h1 className="text-xl font-bold text-foreground">
            {isNew ? "New Invoice" : `Invoice ${invoiceNumber}`}
          </h1>
          {client && <p className="text-sm text-muted-foreground mt-0.5">{client.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && existingInvoice && (
            <span className={`text-xs px-2.5 py-1 rounded-md font-medium uppercase tracking-wide ${INVOICE_STATUS_META[status]?.className}`}>
              {INVOICE_STATUS_META[status]?.label || status}
            </span>
          )}
          <Button variant="outline" onClick={() => navigate("/invoices")}>Cancel</Button>
          {!isNew && existingInvoice && (
            <Button variant="outline" onClick={() => setShowPrintView(true)}>
              <Eye className="w-4 h-4" /> View / Print
            </Button>
          )}
          <Button onClick={save} disabled={saving || readOnly}>
            {saving ? "Saving…" : "Save Invoice"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Top: Invoice ID + Issue Date + Client Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Invoice ID</label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={readOnly}
              placeholder="Auto-generated if blank"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Issue Date</label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Due Date Type</label>
            <Select
              value={dueDateType}
              onChange={(e) => {
                setDueDateType(e.target.value);
                if (e.target.value === "due_on_receipt") setDueDate(invoiceDate);
                else if (e.target.value === "net_15") {
                  const d = new Date(invoiceDate + "T00:00:00"); d.setDate(d.getDate() + 15);
                  setDueDate(d.toISOString().slice(0, 10));
                } else if (e.target.value === "net_30") {
                  const d = new Date(invoiceDate + "T00:00:00"); d.setDate(d.getDate() + 30);
                  setDueDate(d.toISOString().slice(0, 10));
                }
              }}
              disabled={readOnly}
              className="w-full"
            >
              <option value="due_on_receipt">Due on Receipt</option>
              <option value="net_15">Net 15 Days</option>
              <option value="net_30">Net 30 Days</option>
              <option value="custom">Custom Date</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={readOnly || dueDateType !== "custom"}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Milestone Tag</label>
            <Select
              value={milestoneTag}
              onChange={(e) => setMilestoneTag(e.target.value)}
              disabled={readOnly}
              className="w-full"
            >
              <option value="Full Payment">Full Payment</option>
              <option value="Advance">Advance</option>
              <option value="Event Day">Event Day</option>
              <option value="Final Handover">Final Handover</option>
              <option value="Custom">Custom</option>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          {/* Client selector */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Select Client</label>
              {!readOnly && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowClientForm(true)}>
                  <Plus className="w-3.5 h-3.5" /> New
                </Button>
              )}
            </div>
            <Select
              value={clientId}
              onChange={(e) => onClientChange(e.target.value)}
              disabled={readOnly}
              className="w-full"
            >
              <option value="">— Select client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <div className="mt-2">
              <label className="text-xs font-medium text-muted-foreground">{term.workItemSingular}</label>
              <Select
                value={eventId}
                onChange={(e) => onEventChange(e.target.value)}
                disabled={readOnly}
                className="w-full mt-1"
              >
                <option value="">— Optional —</option>
                {availableEvents.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </Select>
            </div>
          </div>
          <InvoiceClientCard client={client} />
        </div>
      </div>

      {/* Products & Packages */}
      <InvoiceProductsSection
        items={items}
        setItems={setItems}
        readOnly={readOnly}
        currency={currency}
      />

      {/* Financials */}
      <InvoiceFinancials
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
        gstApplicable={gstApplicable}
        setGstApplicable={setGstApplicable}
        gstRate={gstRate}
        setGstRate={setGstRate}
        gstMode={gstMode}
        totals={totals}
        currency={currency}
        readOnly={readOnly}
      />

      {/* Pricing Display Toggle */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-semibold text-foreground">Show Itemized Rates</label>
            <p className="text-xs text-muted-foreground mt-0.5">When off, PDF and public link show package/scope description only — no qty, rate, or line amounts.</p>
          </div>
          <Toggle checked={showItemizedRates} onChange={setShowItemizedRates} disabled={readOnly} />
        </div>
      </div>

      {/* Payment Terms (client-visible) */}
      <div className="bg-card border border-border rounded-lg p-4">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Terms (client-visible)</label>
        <textarea
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          disabled={readOnly}
          rows={3}
          placeholder="Payment terms shown to client on PDF and public link"
          className="w-full bg-card border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {/* Internal Notes (never shown to client) */}
      <div className="bg-card border border-border rounded-lg p-4">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Internal Notes (never shown to client)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly}
          rows={2}
          placeholder="Internal notes (optional)"
          className="w-full bg-card border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {/* Authorized Signatory */}
      <div className="bg-card border border-border rounded-lg p-4">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Authorized Signatory</label>
        <Input
          value={authorizedSignatory}
          onChange={(e) => setAuthorizedSignatory(e.target.value)}
          disabled={readOnly}
          placeholder="Name of authorized signatory"
        />
      </div>

      {/* Public Link Panel */}
      {!isNew && existingInvoice && (
        <InvoicePublicLinkPanel
          invoice={{ ...existingInvoice, ...publicLinkData }}
          onUpdate={(data) => {
            setPublicLinkData(data);
            setExistingInvoice({ ...existingInvoice, ...data });
          }}
        />
      )}

      {/* Status actions for existing invoices */}
      {!isNew && existingInvoice && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {status === "draft" && (
            <Button variant="dark" onClick={async () => {
              try {
                await base44.entities.Invoice.update(id, { status: "due" });
                invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
                toast({ title: "Invoice issued" });
                setStatus("due");
                load();
              } catch (e) { setError(e?.message || "Failed to issue invoice."); }
            }}>
              <Send className="w-4 h-4" /> Issue Invoice
            </Button>
          )}
          {(status === "due" || status === "sent" || status === "partial" || status === "overdue") && (
            <Button variant="success" onClick={() => setShowPaymentDialog(true)}>
              <Wallet className="w-4 h-4" /> Record Payment
            </Button>
          )}
          {status === "draft" && (
            <Button variant="outline" onClick={sendInvoice} disabled={readOnly}>Mark as Sent</Button>
          )}
          <Button variant="destructive" onClick={onDelete}>Delete</Button>
        </div>
      )}

      {showPaymentDialog && (
        <RecordInvoicePaymentDialog
          open={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          invoice={{ ...existingInvoice, invoice_number: invoiceNumber, grand_total: totals.grandTotal, amount_paid: existingInvoice?.amount_paid || 0 }}
          onRecorded={() => load()}
        />
      )}

      <ClientForm
        open={showClientForm}
        onClose={() => setShowClientForm(false)}
        workspaceId={workspaceId}
        onSaved={async (savedClient) => {
          const list = await base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500);
          setClients(list || []);
          setClientId(savedClient.id);
        }}
      />

      {!isNew && existingInvoice && (
        <InvoicePrintView
          open={showPrintView}
          onClose={() => setShowPrintView(false)}
          invoice={{
            ...existingInvoice,
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            due_date: dueDate,
            client_id: clientId,
            event_id: eventId,
            status,
            discount_type: discountType,
            discount_value: Number(discountValue) || 0,
            gst_applicable: gstApplicable,
            notes
          }}
          items={items}
          workspace={workspace}
          currency={currency}
        />
      )}
    </div>
  );
}