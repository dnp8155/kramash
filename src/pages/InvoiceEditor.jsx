import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { ArrowLeft, Save, Loader2, Plus, Trash2, FileText } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { calculateInvoiceTotals, computeDueDate, lineItemTotal } from "@/utils/invoiceCalculations";
import { toast } from "@/components/ui/use-toast";
import LoadingState from "@/components/common/LoadingState";

export default function InvoiceEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { workspaceId, currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [quotation, setQuotation] = useState(null);
  const [existingMilestoneInvoices, setExistingMilestoneInvoices] = useState([]);

  const quotationId = searchParams.get("quotation");
  const invoiceType = searchParams.get("type") || "manual";
  const milestoneIndex = searchParams.get("index");

  const [form, setForm] = useState({
    client_id: "",
    event_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date_type: "due_on_receipt",
    due_date: "",
    show_itemized_rates: true,
    line_items: [{ description: "", deliverables: "", quantity: 1, unit_rate: 0, line_total: 0 }],
    discount_type: "percentage",
    discount_value: 0,
    tax_enabled: false,
    tax_rate: currentWorkspace?.default_gst_rate || 18,
    tax_mode: "CGST_SGST",
    payment_terms: currentWorkspace?.default_quotation_terms || "",
    notes: "",
    milestone_index: milestoneIndex ? parseInt(milestoneIndex, 10) : null,
  });

  const isFromQuotation = !!quotationId;

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      setLoading(true);
      try {
        const [clientList, eventList] = await Promise.all([
          base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
          base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
        ]);
        setClients(clientList || []);
        setEvents(eventList || []);

        if (quotationId) {
          const quot = await base44.entities.Quotation.get(quotationId);
          setQuotation(quot);
          setForm((f) => ({
            ...f,
            client_id: quot?.client_id || "",
            event_id: quot?.event_id || "",
          }));

          // Check existing milestone invoices
          const existing = await base44.entities.Invoice.filter({
            workspace_id: workspaceId,
            quotation_id: quotationId,
          });
          setExistingMilestoneInvoices(existing || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, quotationId]);

  const totals = useMemo(() => calculateInvoiceTotals(form), [form]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateItem = (idx, field, value) => {
    setForm((f) => {
      const items = [...f.line_items];
      items[idx] = { ...items[idx], [field]: value };
      items[idx].line_total = lineItemTotal(items[idx].quantity, items[idx].unit_rate);
      return { ...f, line_items: items };
    });
  };

  const addItem = () => setForm((f) => ({
    ...f,
    line_items: [...f.line_items, { description: "", deliverables: "", quantity: 1, unit_rate: 0, line_total: 0 }],
  }));

  const removeItem = (idx) => setForm((f) => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.client_id) { toast({ title: "Please select a client", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        client_id: form.client_id,
        event_id: form.event_id || null,
        issue_date: form.issue_date,
        due_date_type: form.due_date_type,
        due_date: form.due_date_type === "custom" ? form.due_date : undefined,
        show_itemized_rates: form.show_itemized_rates,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        tax_enabled: form.tax_enabled,
        tax_rate: Number(form.tax_rate) || 0,
        tax_mode: form.tax_mode,
        payment_terms: form.payment_terms,
        notes: form.notes,
        status: "Draft",
      };

      if (isFromQuotation) {
        payload.quotation_id = quotationId;
        payload.invoice_type = invoiceType;
        payload.milestone_index = form.milestone_index;
      } else {
        payload.invoice_type = "manual";
        payload.line_items = form.line_items.filter((i) => i.description.trim());
      }

      const res = await base44.functions.invoke("createInvoice", payload);
      if (res.status >= 200 && res.status < 300) {
        toast({ title: "Invoice created successfully" });
        navigate(`/invoices/${res.data.invoice.id}`);
      } else {
        toast({ title: res.data?.error || "Failed to create invoice", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: err?.response?.data?.error || err?.message || "Failed to create invoice", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isFromQuotation ? "Create Invoice from Quotation" : "New Invoice"}
        description={isFromQuotation ? quotation?.quotation_number : "Create a manual invoice for a client"}
        actions={<Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Back</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Quotation info or Client/Event selection */}
          {isFromQuotation ? (
            <Card>
              <CardHeader><CardTitle>Quotation Details</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                <div className="rounded-lg bg-muted/30 p-3 text-sm">
                  <p className="text-muted-foreground">Quotation</p>
                  <p className="font-semibold text-foreground">{quotation?.quotation_number}</p>
                  <p className="mt-1 text-muted-foreground">Total: <span className="font-semibold text-foreground">{formatCurrency(quotation?.grand_total || 0)}</span></p>
                  <p className="text-muted-foreground">Status: {quotation?.status}</p>
                </div>
                {invoiceType === "milestone" && form.milestone_index != null && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-sm font-medium text-primary">
                      Milestone: {quotation?.milestones?.[form.milestone_index]?.label || "Custom"}
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(quotation?.milestones?.[form.milestone_index]?.amount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {quotation?.milestones?.[form.milestone_index]?.percentage}% of quotation total
                    </p>
                  </div>
                )}
                {invoiceType === "full" && (
                  <p className="text-sm text-muted-foreground">
                    A full invoice will import all quotation items, discounts, and tax configuration.
                  </p>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>Client & Project</CardTitle></CardHeader>
              <CardBody className="space-y-4">
                <Select label="Client *" value={form.client_id} onChange={(e) => set("client_id", e.target.value)}>
                  <option value="">Select a client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select label="Event / Project (optional)" value={form.event_id} onChange={(e) => set("event_id", e.target.value)}>
                  <option value="">None</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </Select>
              </CardBody>
            </Card>
          )}

          {/* Line Items (manual only) */}
          {!isFromQuotation && (
            <Card>
              <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                {form.line_items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="Description"
                        className="min-w-0 flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                      <button onClick={() => removeItem(idx)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Qty</label>
                        <input type="number" min="1" value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Math.max(1, Number(e.target.value) || 1))}
                          className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Rate</label>
                        <input type="number" min="0" value={item.unit_rate}
                          onChange={(e) => updateItem(idx, "unit_rate", Math.max(0, Number(e.target.value) || 0))}
                          className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Total</label>
                        <p className="py-2 text-right text-sm font-semibold text-foreground">{formatCurrency(item.line_total || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4" /> Add Line Item</Button>
              </CardBody>
            </Card>
          )}

          {/* Notes & Terms */}
          <Card>
            <CardHeader><CardTitle>Notes & Terms</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Payment Terms (client-visible)</label>
                <textarea value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} rows={3}
                  placeholder="Payment terms shown on invoice and public URL…"
                  className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Internal Notes (never shown to client)</label>
                <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
                  placeholder="Internal notes…"
                  className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <Card className="h-fit">
            <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <Input label="Issue Date" type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
              <Select label="Due Date" value={form.due_date_type} onChange={(e) => set("due_date_type", e.target.value)}>
                <option value="due_on_receipt">Due on Receipt</option>
                <option value="net_15">Net 15</option>
                <option value="net_30">Net 30</option>
                <option value="custom">Custom Date</option>
              </Select>
              {form.due_date_type === "custom" && (
                <Input label="Custom Due Date" type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
              )}
              <label className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                <span className="font-medium text-foreground">Show Itemized Rates</span>
                <button type="button" onClick={() => set("show_itemized_rates", !form.show_itemized_rates)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${form.show_itemized_rates ? "bg-primary" : "bg-border"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.show_itemized_rates ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </label>
            </CardBody>
          </Card>

          {/* Discount & Tax (manual only) */}
          {!isFromQuotation && (
            <>
              <Card className="h-fit">
                <CardHeader><CardTitle>Discount</CardTitle></CardHeader>
                <CardBody className="space-y-3">
                  <Select label="Discount Type" value={form.discount_type} onChange={(e) => set("discount_type", e.target.value)}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount</option>
                  </Select>
                  <Input label={form.discount_type === "percentage" ? "Discount %" : "Discount Amount"} type="number" min="0"
                    value={form.discount_value} onChange={(e) => set("discount_value", Number(e.target.value) || 0)} />
                </CardBody>
              </Card>

              <Card className="h-fit">
                <CardHeader><CardTitle>GST / Tax</CardTitle></CardHeader>
                <CardBody className="space-y-3">
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                    <span className="font-medium text-foreground">Enable GST</span>
                    <button type="button" onClick={() => set("tax_enabled", !form.tax_enabled)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${form.tax_enabled ? "bg-primary" : "bg-border"}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.tax_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </label>
                  {form.tax_enabled && (
                    <>
                      <Select label="Tax Rate" value={form.tax_rate} onChange={(e) => set("tax_rate", Number(e.target.value))}>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </Select>
                      <Select label="Tax Mode" value={form.tax_mode} onChange={(e) => set("tax_mode", e.target.value)}>
                        <option value="CGST_SGST">CGST + SGST (Same State)</option>
                        <option value="IGST">IGST (Inter-State)</option>
                      </Select>
                    </>
                  )}
                </CardBody>
              </Card>
            </>
          )}

          {/* Summary */}
          <Card className="h-fit">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardBody className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{formatCurrency(totals.subtotal)}</span></div>
              {totals.discount_amount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount</span><span className="text-destructive">−{formatCurrency(totals.discount_amount)}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxable</span><span className="font-medium">{formatCurrency(totals.taxable_amount)}</span></div>
              {form.tax_enabled && form.tax_mode === "CGST_SGST" && (
                <>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">CGST</span><span>{formatCurrency(totals.cgst_amount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">SGST</span><span>{formatCurrency(totals.sgst_amount)}</span></div>
                </>
              )}
              {form.tax_enabled && form.tax_mode === "IGST" && <div className="flex justify-between text-sm"><span className="text-muted-foreground">IGST</span><span>{formatCurrency(totals.igst_amount)}</span></div>}
              <div className="border-t border-border pt-2">
                <div className="flex justify-between"><span className="font-semibold">Total</span><span className="text-lg font-bold text-primary">{formatCurrency(totals.total_amount)}</span></div>
              </div>
            </CardBody>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Create Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}