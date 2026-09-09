import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, FileCheck, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useClients } from "@/hooks/useClients";
import { useEvents } from "@/hooks/useEvents";
import { useServices } from "@/hooks/useServices";
import { useTeamRoles } from "@/hooks/useTeamRoles";
import { useQuotations } from "@/hooks/useQuotations";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";
import { toast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import LoadingState from "@/components/common/LoadingState";
import QuotationItemEditor from "@/components/quotation/QuotationItemEditor";
import { computeQuotationTotals, nextQuotationNumber, lineTotal, isValidGstinFormat, buildClientSnapshot, buildBusinessSnapshot, buildEventSnapshot } from "@/utils/quotation";
import { formatCurrency } from "@/utils/format";

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function QuotationEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { currentWorkspace, workspaceId } = useWorkspace();
  const { clients, loading: clientsLoading } = useClients();
  const { events, loading: eventsLoading } = useEvents();
  const { services } = useServices();
  const { roles } = useTeamRoles();
  const { quotations, createQuotation, updateQuotation } = useQuotations();
  const t = useBusinessTerminology();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState(null);
  const [items, setItems] = useState([]);

  const gstEnabled = !!currentWorkspace?.gst_enabled;

  useEffect(() => {
    if (isEdit && workspaceId && quotations.length >= 0) {
      // Load quotation + items
      (async () => {
        setLoading(true);
        try {
          const q = await base44.entities.Quotation.get(id);
          if (!q || q.workspace_id !== workspaceId) {
            setErr("Quotation not found");
            setLoading(false);
            return;
          }
          const qItems = await base44.entities.QuotationItem.filter({
            workspace_id: workspaceId,
            quotation_id: id,
          }, "sort_order", 500);
          setForm({
            client_id: q.client_id || "",
            event_id: q.event_id || "",
            quotation_date: q.quotation_date || todayStr(),
            valid_until: q.valid_until || "",
            status: q.status,
            discount_type: q.discount_type || "percentage",
            discount_value: q.discount_value || 0,
            gst_applicable: !!q.gst_applicable,
            gst_mode: q.gst_mode || "cgst_sgst",
            terms_and_conditions: q.terms_and_conditions || "",
            notes: q.notes || "",
          });
          setItems(qItems || []);
        } catch (e) {
          setErr(e?.message || "Failed to load quotation");
        } finally {
          setLoading(false);
        }
      })();
    } else if (!isEdit && currentWorkspace) {
      // New quotation — pre-fill defaults
      const defaultTerms = currentWorkspace.default_quotation_terms || "";
      // Check for estimator items passed via sessionStorage (from Rate Estimator)
      let estimateItems = [];
      try {
        const stored = sessionStorage.getItem("estimateItems");
        if (stored) {
          estimateItems = JSON.parse(stored);
          sessionStorage.removeItem("estimateItems");
        }
      } catch {
        // ignore parse errors
      }
      setForm({
        client_id: "",
        event_id: "",
        quotation_date: todayStr(),
        valid_until: "",
        status: "Draft",
        discount_type: "percentage",
        discount_value: 0,
        gst_applicable: gstEnabled,
        gst_mode: "cgst_sgst",
        terms_and_conditions: defaultTerms,
        notes: "",
      });
      setItems(estimateItems);
    }
  }, [id, workspaceId, currentWorkspace?.id]);

  // Filter events by selected client (must be before early returns — rules of hooks)
  const clientEvents = useMemo(
    () => events.filter((e) => !form?.client_id || e.client_id === form?.client_id),
    [events, form?.client_id]
  );

  if (loading || !form) {
    return <LoadingState label="Loading quotation…" />;
  }

  if (err) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{err}</p>
        <Button variant="outline" onClick={() => navigate("/quotation")}>Back to Quotations</Button>
      </div>
    );
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const totals = computeQuotationTotals({
    items,
    discount_type: form.discount_type,
    discount_value: form.discount_value,
    gst_applicable: form.gst_applicable,
    gst_mode: form.gst_mode,
  });

  const validate = () => {
    if (!form.client_id) return "Please select a client";
    if (!form.quotation_date) return "Quotation date is required";
    if (items.length === 0) return "Add at least one line item";
    for (const item of items) {
      if (!item.name?.trim()) return "All items must have a name";
      if (Number(item.quantity) < 1) return "Quantity must be at least 1";
      if (Number(item.unit_rate) < 0) return "Rate cannot be negative";
    }
    if (form.gst_applicable && gstEnabled) {
      if (!currentWorkspace.gstin) {
        return "GST is enabled but your workspace has no GSTIN. Add it in Preferences or disable GST for this quotation.";
      }
    }
    return null;
  };

  const buildQuotationData = (status) => {
    const qNum = isEdit ? undefined : nextQuotationNumber(
      quotations.map((q) => q.quotation_number),
      form.quotation_date
    );
    const data = {
      client_id: form.client_id,
      event_id: form.event_id || null,
      quotation_date: form.quotation_date,
      valid_until: form.valid_until || null,
      status,
      subtotal: totals.subtotal,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value) || 0,
      discount_amount: totals.discount_amount,
      taxable_amount: totals.taxable_amount,
      gst_applicable: form.gst_applicable && gstEnabled,
      gst_mode: form.gst_mode,
      cgst_amount: totals.cgst_amount,
      sgst_amount: totals.sgst_amount,
      igst_amount: totals.igst_amount,
      gst_total: totals.gst_total,
      grand_total: totals.grand_total,
      terms_and_conditions: form.terms_and_conditions,
      notes: form.notes,
    };
    if (!isEdit) data.quotation_number = qNum;
    return data;
  };

  const saveItems = async (quotationId) => {
    // For edits: delete old items, then create new (simple approach for Beta)
    if (isEdit) {
      const oldItems = await base44.entities.QuotationItem.filter({
        workspace_id: workspaceId,
        quotation_id: quotationId,
      });
      if (oldItems.length > 0) {
        await base44.entities.QuotationItem.deleteMany({
          id: { $in: oldItems.map((i) => i.id) },
        });
      }
    }
    if (items.length > 0) {
      await base44.entities.QuotationItem.bulkCreate(
        items.map((item, idx) => ({
          workspace_id: workspaceId,
          quotation_id: quotationId,
          item_type: item.item_type,
          reference_id: item.reference_id || null,
          name: item.name,
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          days: Number(item.days) || 1,
          unit_rate: Number(item.unit_rate) || 0,
          line_total: lineTotal(item),
          gst_rate: item.gst_rate ?? null,
          sac_code: item.sac_code || "",
          sort_order: idx,
        }))
      );
    }
  };

  const handleSave = async (status) => {
    const validationErr = validate();
    if (validationErr) {
      toast({ title: validationErr, variant: "destructive" });
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const data = buildQuotationData(status);
      let q;
      if (isEdit) {
        q = await updateQuotation(id, data);
      } else {
        q = await createQuotation(data);
      }
      await saveItems(q.id);
      toast({ title: isEdit ? "Quotation updated" : "Quotation created" });
      navigate(`/quotation/${q.id}`);
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    const validationErr = validate();
    if (validationErr) {
      toast({ title: validationErr, variant: "destructive" });
      return;
    }
    setFinalizing(true);
    setErr("");
    try {
      const client = clients.find((c) => c.id === form.client_id);
      const event = form.event_id ? events.find((e) => e.id === form.event_id) : null;
      const data = buildQuotationData("Finalized");
      // Attach snapshots for historical integrity
      data.client_snapshot = buildClientSnapshot(client);
      data.business_snapshot = buildBusinessSnapshot(currentWorkspace);
      data.event_snapshot = buildEventSnapshot(event);

      let q;
      if (isEdit) {
        q = await updateQuotation(id, data);
      } else {
        q = await createQuotation(data);
      }
      await saveItems(q.id);
      toast({ title: "Quotation finalized", description: "Snapshots preserved for historical accuracy." });
      navigate(`/quotation/${q.id}`);
    } catch (e) {
      toast({ title: "Finalize failed", description: e?.message, variant: "destructive" });
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isEdit ? "Edit Quotation" : "New Quotation"}
        description={isEdit ? form.quotation_number || "Edit quotation" : "Create a quotation for your client"}
        actions={
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Client + Event + Dates */}
          <Card>
            <CardHeader><CardTitle>Quotation Details</CardTitle></CardHeader>
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Client"
                value={form.client_id}
                onChange={(e) => {
                  set("client_id", e.target.value);
                  set("event_id", "");
                }}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Select
                label={`${t.workItemSingular} (optional)`}
                value={form.event_id}
                onChange={(e) => set("event_id", e.target.value)}
                disabled={!form.client_id}
              >
                <option value="">No {t.workItemSingular.toLowerCase()}</option>
                {clientEvents.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </Select>
              <Input
                label="Quotation Date"
                type="date"
                value={form.quotation_date}
                onChange={(e) => set("quotation_date", e.target.value)}
              />
              <Input
                label="Valid Until (optional)"
                type="date"
                value={form.valid_until}
                onChange={(e) => set("valid_until", e.target.value)}
              />
            </CardBody>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader><CardTitle>Deliverables & Items</CardTitle></CardHeader>
            <CardBody>
              <QuotationItemEditor
                items={items}
                services={services}
                roles={roles}
                gstEnabled={gstEnabled}
                onChange={setItems}
              />
            </CardBody>
          </Card>

          {/* Terms & Notes */}
          <Card>
            <CardHeader><CardTitle>Terms & Notes</CardTitle></CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Terms & Conditions</label>
                <textarea
                  value={form.terms_and_conditions}
                  onChange={(e) => set("terms_and_conditions", e.target.value)}
                  rows={5}
                  placeholder="Payment terms, delivery timeline, cancellation policy…"
                  className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={2}
                  placeholder="Optional internal or client-facing notes"
                  className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar: Discount, GST, Totals */}
        <div className="flex flex-col gap-6">
          <Card className="h-fit">
            <CardHeader><CardTitle>Discount</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <Select
                label="Discount Type"
                value={form.discount_type}
                onChange={(e) => set("discount_type", e.target.value)}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </Select>
              <Input
                label={form.discount_type === "percentage" ? "Discount %" : "Discount Amount"}
                type="number"
                min="0"
                value={form.discount_value}
                onChange={(e) => set("discount_value", Number(e.target.value) || 0)}
              />
            </CardBody>
          </Card>

          {gstEnabled && (
            <Card className="h-fit">
              <CardHeader><CardTitle>GST</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                  <span className="font-medium text-foreground">Apply GST to this quotation</span>
                  <button
                    type="button"
                    onClick={() => set("gst_applicable", !form.gst_applicable)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${form.gst_applicable ? "bg-primary" : "bg-border"}`}
                    role="switch"
                    aria-checked={form.gst_applicable}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.gst_applicable ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </label>
                {form.gst_applicable && (
                  <Select
                    label="GST Mode"
                    value={form.gst_mode}
                    onChange={(e) => set("gst_mode", e.target.value)}
                  >
                    <option value="cgst_sgst">CGST + SGST (Same State)</option>
                    <option value="igst">IGST (Inter-State)</option>
                  </Select>
                )}
                {form.gst_applicable && !currentWorkspace.gstin && (
                  <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    No GSTIN configured. Add one in Preferences before sending a GST quotation.
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          <Card className="h-fit">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.discount_amount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-destructive">−{formatCurrency(totals.discount_amount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span className="font-medium text-foreground">{formatCurrency(totals.taxable_amount)}</span>
              </div>
              {form.gst_applicable && gstEnabled && (
                <>
                  {form.gst_mode === "igst" ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">IGST</span>
                      <span className="font-medium text-foreground">{formatCurrency(totals.igst_amount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">CGST</span>
                        <span className="font-medium text-foreground">{formatCurrency(totals.cgst_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">SGST</span>
                        <span className="font-medium text-foreground">{formatCurrency(totals.sgst_amount)}</span>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-foreground">Grand Total</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(totals.grand_total)}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-2">
            <Button onClick={() => handleSave("Draft")} disabled={saving || finalizing}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Save Changes" : "Save as Draft"}
            </Button>
            <Button variant="primary" onClick={handleFinalize} disabled={saving || finalizing}>
              {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
              Finalize Quotation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}