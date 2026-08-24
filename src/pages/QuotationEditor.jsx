import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Toggle from "@/components/common/Toggle";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney } from "@/utils/format";
import { computeTotals, lineTotal } from "@/lib/quotationCalc";
import {
  loadServices, loadQuotation, loadQuotationItems,
  generateQuotationNumber, createQuotation, updateQuotation,
  duplicateQuotation, deleteQuotation, acceptQuotation,
  verifyQuotationRefs, buildClientSnapshot, buildBusinessSnapshot, buildEventSnapshot
} from "@/lib/quotationService";
import { generateQuotationPdf, generateJobSheetPdf } from "@/lib/quotationPdf";
import { DEFAULT_QUOTATION_TERMS, GST_MODES, QUOTATION_STATUS_META } from "@/constants/quotationConfig";
import { loadRoles } from "@/lib/teamService";
import {
  ArrowLeft, Plus, Trash2, FileDown, Save, CheckCircle2, Copy, AlertTriangle, FileText, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

export default function QuotationEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const currency = workspace?.currency || "INR";
  const gstWorkspaceEnabled = !!workspace?.gst_enabled;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState(today());
  const [validUntil, setValidUntil] = useState("");
  const [clientId, setClientId] = useState("");
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState([]);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstMode, setGstMode] = useState("cgst_sgst");
  const [terms, setTerms] = useState(DEFAULT_QUOTATION_TERMS);
  const [notes, setNotes] = useState("");

  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [services, setServices] = useState([]);
  const [roles, setRoles] = useState([]);
  const [existingQuotation, setExistingQuotation] = useState(null);

  const [addServiceId, setAddServiceId] = useState("");
  const [addRoleId, setAddRoleId] = useState("");

  const isFinalized = status === "finalized" || status === "accepted";
  const readOnly = isFinalized;

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [cl, ev, sv, rl] = await Promise.all([
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
        loadServices(workspaceId, { includeInactive: true }),
        loadRoles(workspaceId)
      ]);
      setClients(cl || []);
      setEvents(ev || []);
      setServices(sv || []);
      setRoles(rl || []);

      if (isNew) {
        const num = await generateQuotationNumber(workspaceId);
        setQuotationNumber(num);
        setGstApplicable(gstWorkspaceEnabled);
        // Pre-fill from estimator if provided.
        const estimateItems = location.state?.estimateItems;
        if (Array.isArray(estimateItems) && estimateItems.length) {
          setItems(estimateItems.map((it) => ({ ...it, id: undefined })));
        }
        // Pre-select event from query param (e.g. from EventDetails "Create Quotation").
        const qpEventId = new URLSearchParams(location.search).get("event_id");
        if (qpEventId) {
          const qpEvent = (ev || []).find((e) => e.id === qpEventId);
          if (qpEvent) {
            setEventId(qpEvent.id);
            if (qpEvent.client_id) setClientId(qpEvent.client_id);
          }
        }
      } else {
        const result = await loadQuotation(workspaceId, id);
        if (!result) { setNotFound(true); return; }
        const q = result.quotation;
        setExistingQuotation(q);
        setQuotationNumber(q.quotation_number);
        setQuotationDate(q.quotation_date || today());
        setValidUntil(q.valid_until || "");
        setClientId(q.client_id || "");
        setEventId(q.event_id || "");
        setStatus(q.status || "draft");
        setItems(result.items || []);
        setDiscountType(q.discount_type || "percent");
        setDiscountValue(q.discount_value || 0);
        setGstApplicable(!!q.gst_applicable);
        setGstMode(q.gst_mode || "cgst_sgst");
        setTerms(q.terms_and_conditions || "");
        setNotes(q.notes || "");
      }
    } catch (e) {
      setError(e?.message || "Failed to load quotation.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, id, isNew, location.state, gstWorkspaceEnabled]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(
    () => computeTotals(items, { discountType, discountValue, gstApplicable, gstMode }),
    [items, discountType, discountValue, gstApplicable, gstMode]
  );

  const client = clients.find((c) => c.id === clientId) || null;
  const event = events.find((e) => e.id === eventId) || null;

  // Filter events by selected client.
  const availableEvents = clientId
    ? events.filter((e) => !e.client_id || e.client_id === clientId)
    : events;

  const onClientChange = (val) => {
    setClientId(val);
    // Clear event if it doesn't belong to the chosen client.
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

  // ---- Items ----
  const addService = () => {
    const s = services.find((x) => x.id === addServiceId);
    if (!s) return;
    setItems((prev) => [...prev, {
      item_type: "service",
      reference_id: s.id,
      name: s.name,
      description: s.description || "",
      quantity: 1,
      days: s.rate_type === "Per Day" ? 1 : 1,
      unit_rate: s.default_rate || 0,
      rate_type: s.rate_type || "Fixed",
      gst_rate: s.gst_rate || 0,
      sac_code: s.sac_code || ""
    }]);
    setAddServiceId("");
  };

  const addRole = () => {
    const r = roles.find((x) => x.id === addRoleId);
    if (!r) return;
    setItems((prev) => [...prev, {
      item_type: "role",
      reference_id: r.id,
      name: r.name,
      description: "",
      quantity: 1,
      days: r.rate_type === "Per Day" ? 1 : 1,
      unit_rate: r.default_rate || 0,
      rate_type: r.rate_type || "Per Event",
      gst_rate: 0,
      sac_code: ""
    }]);
    setAddRoleId("");
  };

  const addCustom = () => {
    setItems((prev) => [...prev, {
      item_type: "custom",
      reference_id: "",
      name: "",
      description: "",
      quantity: 1,
      days: 1,
      unit_rate: 0,
      rate_type: "Fixed",
      gst_rate: 0,
      sac_code: ""
    }]);
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ---- Save ----
  const buildData = () => ({
    quotation_number: quotationNumber,
    client_id: clientId,
    event_id: eventId,
    quotation_date: quotationDate,
    valid_until: validUntil,
    discount_type: discountType,
    discount_value: Number(discountValue) || 0,
    gst_applicable: gstApplicable,
    gst_mode: gstMode,
    terms_and_conditions: terms,
    notes
  });

  const validate = () => {
    if (!quotationDate) return "Quotation date is required.";
    if (items.length === 0) return "Add at least one item.";
    for (const it of items) {
      if (!it.name?.trim()) return "Every item needs a name.";
      if (Number(it.quantity) < 0) return "Quantity cannot be negative.";
      if (Number(it.unit_rate) < 0) return "Unit rate cannot be negative.";
    }
    return "";
  };

  const saveDraft = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setError("");
    setSaving(true);
    try {
      const refCheck = await verifyQuotationRefs(workspaceId, clientId, eventId);
      if (!refCheck.ok) { setError(refCheck.error); setSaving(false); return; }
      const data = { ...buildData(), status: "draft" };
      if (isNew) {
        const q = await createQuotation(workspaceId, data, items);
        toast({ title: "Quotation saved as draft" });
        navigate(`/quotation/${q.id}`, { replace: true });
      } else {
        await updateQuotation(workspaceId, id, data, items);
        toast({ title: "Quotation updated" });
        load();
      }
    } catch (e) {
      setError(e?.message || "Failed to save quotation.");
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    if (gstApplicable && gstWorkspaceEnabled && !workspace.gstin) {
      setError("GST is enabled on this quotation but your workspace GSTIN is missing. Add it in Preferences or disable GST on this quotation.");
      return;
    }
    setError("");
    setFinalizing(true);
    try {
      const refCheck = await verifyQuotationRefs(workspaceId, clientId, eventId);
      if (!refCheck.ok) { setError(refCheck.error); setFinalizing(false); return; }
      const data = { ...buildData(), status: "finalized" };
      const snapshots = {
        client_snapshot: buildClientSnapshot(refCheck.client || client),
        business_snapshot: buildBusinessSnapshot(workspace),
        event_snapshot: buildEventSnapshot(refCheck.event || event)
      };
      if (isNew) {
        const q = await createQuotation(workspaceId, data, items, snapshots);
        toast({ title: "Quotation finalized" });
        navigate(`/quotation/${q.id}`, { replace: true });
      } else {
        await updateQuotation(workspaceId, id, data, items, snapshots);
        toast({ title: "Quotation finalized" });
        load();
      }
    } catch (e) {
      setError(e?.message || "Failed to finalize quotation.");
    } finally {
      setFinalizing(false);
    }
  };

  const accept = async () => {
    if (!existingQuotation) return;
    setAccepting(true);
    try {
      const ev = eventId ? await base44.entities.Event.get(eventId) : null;
      const prev = ev ? (Number(ev.contract_value) || 0) : 0;
      const proceed = window.confirm(
        ev
          ? `This event currently has a contract value of ${formatMoney(prev, currency)}.\n\nUpdate it to the accepted quotation total of ${formatMoney(existingQuotation.grand_total, currency)}?`
          : "Mark this quotation as Accepted? (No event linked, so contract value will not be updated.)"
      );
      if (!proceed) { setAccepting(false); return; }
      const { eventUpdated } = await acceptQuotation(workspaceId, id, { updateContractValue: !!ev });
      toast({ title: eventUpdated ? "Quotation accepted — contract value updated" : "Quotation accepted" });
      load();
    } catch (e) {
      setError(e?.message || "Failed to accept quotation.");
    } finally {
      setAccepting(false);
    }
  };

  const onDuplicate = async () => {
    if (!existingQuotation) return;
    try {
      const q = await duplicateQuotation(workspaceId, existingQuotation, items);
      toast({ title: "Quotation duplicated", description: q.quotation_number });
      navigate(`/quotation/${q.id}`);
    } catch (e) {
      setError(e?.message || "Failed to duplicate quotation.");
    }
  };

  const onDelete = async () => {
    if (!existingQuotation) return;
    if (!window.confirm("Delete this quotation? This cannot be undone.")) return;
    try {
      await deleteQuotation(workspaceId, id);
      toast({ title: "Quotation deleted" });
      navigate("/quotation");
    } catch (e) {
      setError(e?.message || "Failed to delete quotation.");
    }
  };

  const downloadPdf = async () => {
    if (!existingQuotation) return;
    setGenerating(true);
    try {
      await generateQuotationPdf({
        quotation: existingQuotation,
        items,
        workspace,
        client,
        event,
        currency
      });
      toast({ title: "PDF downloaded" });
    } catch (e) {
      toast({ title: "PDF generation failed", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const downloadJobSheet = async () => {
    if (!event) { toast({ title: "Select an event to generate a job sheet" }); return; }
    setGenerating(true);
    try {
      const [asgns, members] = await Promise.all([
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, event_id: event.id }, "created_date", 200),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 200)
      ]);
      await generateJobSheetPdf({
        event, assignments: asgns || [], members: members || [], roles, workspace, currency
      });
      toast({ title: "Job sheet downloaded" });
    } catch (e) {
      toast({ title: "Job sheet failed", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingState label="Loading quotation…" />;
  if (notFound) {
    return (
      <div className="p-6 max-w-[800px] mx-auto">
        <EmptyState title="Quotation not found" description="This quotation may not exist or belongs to another workspace." />
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/quotation")}><ArrowLeft className="w-4 h-4" />Back to Quotations</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate("/quotation")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Quotations
        </button>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs px-2 py-1 rounded font-medium uppercase tracking-wide", QUOTATION_STATUS_META[status]?.className)}>
            {QUOTATION_STATUS_META[status]?.label || status}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{quotationNumber}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Quotation meta + client/event */}
      <Section title="Quotation">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Quotation No">
            <Input value={quotationNumber} onChange={(e) => setQuotationNumber(e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Date">
            <Input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Client">
            <Select value={clientId} onChange={(e) => onClientChange(e.target.value)} disabled={readOnly} className="w-full">
              <option value="">— Select client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Event">
            <Select value={eventId} onChange={(e) => onEventChange(e.target.value)} disabled={readOnly} className="w-full">
              <option value="">— Select event —</option>
              {availableEvents.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
          </Field>
          <Field label="Valid Until">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={readOnly} />
          </Field>
        </div>
      </Section>

      {/* Items */}
      <Section title="Items & Deliverables">
        {!readOnly && (
          <div className="flex flex-wrap gap-3 items-end mb-3">
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <span className="text-xs font-medium text-muted-foreground">Add Service</span>
              <div className="flex gap-2">
                <Select value={addServiceId} onChange={(e) => setAddServiceId(e.target.value)} className="flex-1">
                  <option value="">— choose —</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Button size="sm" variant="outline" onClick={addService} disabled={!addServiceId}><Plus className="w-3.5 h-3.5" />Add</Button>
              </div>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <span className="text-xs font-medium text-muted-foreground">Add Role</span>
              <div className="flex gap-2">
                <Select value={addRoleId} onChange={(e) => setAddRoleId(e.target.value)} className="flex-1">
                  <option value="">— choose —</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
                <Button size="sm" variant="outline" onClick={addRole} disabled={!addRoleId}><Plus className="w-3.5 h-3.5" />Add</Button>
              </div>
            </div>
            <Button size="sm" variant="dark" onClick={addCustom} className="shrink-0"><Plus className="w-3.5 h-3.5" />Custom Item</Button>
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState title="No items yet" description="Add services, roles, or a custom item." />
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-2 pr-2 font-medium">Item</th>
                  <th className="text-right py-2 px-1 font-medium w-16">Qty</th>
                  <th className="text-right py-2 px-1 font-medium w-16">Days</th>
                  <th className="text-right py-2 px-1 font-medium w-28">Rate</th>
                  {gstApplicable && <th className="text-right py-2 px-1 font-medium w-20">GST%</th>}
                  <th className="text-right py-2 px-1 font-medium w-28">Amount</th>
                  {!readOnly && <th className="w-8"></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b border-border/60">
                    <td className="py-2 pr-2">
                      <Input
                        value={it.name}
                        onChange={(e) => updateItem(idx, "name", e.target.value)}
                        disabled={readOnly}
                        className="h-8"
                        placeholder="Item name"
                      />
                      <input
                        value={it.description || ""}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        disabled={readOnly}
                        placeholder="Description"
                        className="w-full text-xs text-muted-foreground bg-transparent border-0 focus:outline-none mt-0.5 placeholder:text-muted-foreground/60"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <Input type="number" min="0" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} disabled={readOnly} className="h-8 text-right" />
                    </td>
                    <td className="py-2 px-1">
                      <Input
                        type="number" min="0"
                        value={it.rate_type === "Per Day" ? it.days : 1}
                        onChange={(e) => updateItem(idx, "days", Number(e.target.value))}
                        disabled={readOnly || it.rate_type !== "Per Day"}
                        className="h-8 text-right"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <Input type="number" min="0" value={it.unit_rate} onChange={(e) => updateItem(idx, "unit_rate", Number(e.target.value))} disabled={readOnly} className="h-8 text-right" />
                    </td>
                    {gstApplicable && (
                      <td className="py-2 px-1">
                        <Input type="number" min="0" step="0.5" value={it.gst_rate} onChange={(e) => updateItem(idx, "gst_rate", Number(e.target.value))} disabled={readOnly} className="h-8 text-right" />
                      </td>
                    )}
                    <td className="py-2 px-1 text-right font-medium">{formatMoney(lineTotal(it), currency)}</td>
                    {!readOnly && (
                      <td className="py-2">
                        <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive" aria-label="Remove item">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Pricing + GST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Discount & GST">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount Type">
              <Select value={discountType} onChange={(e) => setDiscountType(e.target.value)} disabled={readOnly} className="w-full">
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </Select>
            </Field>
            <Field label="Discount Value">
              <Input type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} disabled={readOnly} />
            </Field>
          </div>

          {gstWorkspaceEnabled && (
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Apply GST to this quotation</span>
                <Toggle checked={gstApplicable} onChange={setGstApplicable} label="Apply GST" />
              </div>
              {gstApplicable && (
                <Field label="GST Mode">
                  <Select value={gstMode} onChange={(e) => setGstMode(e.target.value)} disabled={readOnly} className="w-full">
                    {GST_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select>
                </Field>
              )}
              {gstApplicable && !workspace.gstin && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Your workspace GSTIN is not set. Add it in Preferences before finalizing.
                </p>
              )}
            </div>
          )}
          {!gstWorkspaceEnabled && (
            <p className="text-xs text-muted-foreground mt-3">GST is not enabled for this workspace. Enable it in Preferences to use GST on quotations.</p>
          )}
        </Section>

        <Section title="Totals">
          <div className="space-y-1.5">
            <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
            {totals.discountAmount > 0 && (
              <Row label={`Discount (${discountType === "percent" ? discountValue + "%" : "Fixed"})`} value={"-" + formatMoney(totals.discountAmount, currency)} />
            )}
            <Row label="Taxable Amount" value={formatMoney(totals.taxableAmount, currency)} />
            {gstApplicable && gstMode === "cgst_sgst" && (
              <>
                <Row label="CGST" value={formatMoney(totals.cgstAmount, currency)} />
                <Row label="SGST" value={formatMoney(totals.sgstAmount, currency)} />
              </>
            )}
            {gstApplicable && gstMode === "igst" && (
              <Row label="IGST" value={formatMoney(totals.igstAmount, currency)} />
            )}
            <div className="flex justify-between text-sm py-2 mt-2 border-t border-border">
              <span className="font-semibold">Grand Total</span>
              <span className="font-bold text-primary">{formatMoney(totals.grandTotal, currency)}</span>
            </div>
          </div>
        </Section>
      </div>

      {/* Terms & notes */}
      <Section icon={FileText} title="Terms & Conditions">
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          disabled={readOnly}
          rows={4}
          className="w-full bg-card border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <Field label="Notes (internal)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={readOnly}
            rows={2}
            className="w-full bg-card border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </Field>
      </Section>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!readOnly && (
          <Button onClick={saveDraft} disabled={saving || finalizing}>
            <Save className="w-4 h-4" /> {saving ? "Saving…" : isNew ? "Save Draft" : "Save Changes"}
          </Button>
        )}
        {!readOnly && (
          <Button variant="dark" onClick={finalize} disabled={saving || finalizing}>
            {finalizing ? "Finalizing…" : <><CheckCircle2 className="w-4 h-4" /> Finalize</>}
          </Button>
        )}
        {isFinalized && status !== "accepted" && (
          <Button variant="success" onClick={accept} disabled={accepting}>
            {accepting ? "Accepting…" : <><CheckCircle2 className="w-4 h-4" /> Mark Accepted</>}
          </Button>
        )}
        {isFinalized && (
          <Button variant="outline" onClick={downloadPdf} disabled={generating}>
            <FileDown className="w-4 h-4" /> {generating ? "Generating…" : "Download PDF"}
          </Button>
        )}
        <Button variant="outline" onClick={downloadJobSheet} disabled={generating || !event}>
          <Users className="w-4 h-4" /> Job Sheet
        </Button>
        {existingQuotation && (
          <Button variant="outline" onClick={onDuplicate}><Copy className="w-4 h-4" /> Duplicate</Button>
        )}
        {existingQuotation && (
          <Button variant="destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /> Delete</Button>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}