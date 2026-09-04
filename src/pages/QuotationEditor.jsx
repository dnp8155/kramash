import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
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
import { computeTotals, subtotalsByType, includedDates } from "@/lib/quotationCalc";
import {
  loadServices, loadQuotation, loadTeamMembers, loadRoles,
  generateQuotationNumber, createQuotation, updateQuotation,
  duplicateQuotation, deleteQuotation, acceptQuotation,
  verifyQuotationRefs, buildClientSnapshot, buildBusinessSnapshot, buildEventSnapshot,
  buildBankDetailsSnapshot, buildSocialLinksSnapshot, parseSnapshot,
  deserializePackageStructure, generatePublicToken
} from "@/lib/quotationService";
import { createFromQuotation } from "@/lib/invoiceService";
import { syncAcceptedQuotation } from "@/lib/milestoneService";
import { generateQuotationPdf, generateJobSheetPdf } from "@/lib/quotationPdf";
import { DEFAULT_QUOTATION_TERMS, DEFAULT_FOOTER_MESSAGE, QUOTATION_STATUS_META } from "@/constants/quotationConfig";
import { ArrowLeft, AlertTriangle, FileText, Plus, Receipt, Package } from "lucide-react";
import PdfPreviewModal from "@/components/common/PdfPreviewModal";
import { cn } from "@/lib/utils";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import QuotationPricingPanel from "@/components/quotation/QuotationPricingPanel";
import QuotationActions from "@/components/quotation/QuotationActions";
import QuotationCategoryContext from "@/components/quotation/QuotationCategoryContext";
import QuotationDateEngine from "@/components/quotation/QuotationDateEngine";
import QuotationDayBuilder from "@/components/quotation/QuotationDayBuilder";
import QuotationPackageDialog from "@/components/quotation/QuotationPackageDialog";
import QuotationMilestonesEditor from "@/components/quotation/QuotationMilestonesEditor";
import QuotationPresentationSection from "@/components/quotation/QuotationPresentationSection";
import { Section, Field } from "@/components/quotation/QuotationParts";
import { QUOTATION_TEMPLATES, renderTemplate } from "@/constants/quotationTemplates";
import QuotationTemplatePreview from "@/components/quotation/QuotationTemplatePreview";
import QuotationTemplateSettings from "@/components/quotation/QuotationTemplateSettings";
import PublicLinkPanel from "@/components/quotation/PublicLinkPanel";
import { Textarea } from "@/components/ui/textarea";
import ClientForm from "@/components/clients/ClientForm";

const today = () => new Date().toISOString().slice(0, 10);

export default function QuotationEditor() {
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
  const [finalizing, setFinalizing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState({ url: "", filename: "", open: false, loading: false });
  const [error, setError] = useState("");
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [templatePreviewHtml, setTemplatePreviewHtml] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [customClientMode, setCustomClientMode] = useState(false);

  // Quotation meta
  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState(today());
  const [validUntil, setValidUntil] = useState("");
  const [clientId, setClientId] = useState("");
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState([]);

  // Category & context
  const [category, setCategory] = useState("PHOTOGRAPHY");
  const [contextType, setContextType] = useState("");

  // Date engine
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [excludedDates, setExcludedDates] = useState([]);

  // Pricing
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstMode, setGstMode] = useState("cgst_sgst");

  // Presentation
  const [showPricing, setShowPricing] = useState(true);
  const [bankDetails, setBankDetails] = useState({});
  const [socialLinks, setSocialLinks] = useState({});
  const [footerMessage, setFooterMessage] = useState(DEFAULT_FOOTER_MESSAGE);
  const [specialNotes, setSpecialNotes] = useState("");

  // Payment milestones
  const [milestones, setMilestones] = useState([]);

  // Terms & notes
  const [terms, setTerms] = useState(DEFAULT_QUOTATION_TERMS);
  const [notes, setNotes] = useState("");
  const [accessPassword, setAccessPassword] = useState("");

  // Template
  const [templateId, setTemplateId] = useState("gold_premium");
  const [templateConfig, setTemplateConfig] = useState({});
  const [projectTitle, setProjectTitle] = useState("");
  const [projectSummary, setProjectSummary] = useState("");

  // Data
  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [existingQuotation, setExistingQuotation] = useState(null);

  const isFinalized = status === "finalized" || status === "accepted";
  const readOnly = isFinalized;

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [cl, ev, sv, tm, rl] = await Promise.all([
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
        loadServices(workspaceId, { includeInactive: true }),
        loadTeamMembers(workspaceId),
        loadRoles(workspaceId)
      ]);
      setClients(cl || []);
      setEvents(ev || []);
      setServices(sv || []);
      setTeamMembers(tm || []);
      setRoles(rl || []);

      if (isNew) {
        const num = await generateQuotationNumber(workspaceId);
        setQuotationNumber(num);
        setGstApplicable(gstWorkspaceEnabled);
        const estimateItems = location.state?.estimateItems;
        if (Array.isArray(estimateItems) && estimateItems.length) {
          setItems(estimateItems.map((it) => ({ ...it, id: undefined })));
        }
        const qpEventId = new URLSearchParams(location.search).get("event_id");
        if (qpEventId) {
          const qpEvent = (ev || []).find((e) => e.id === qpEventId);
          if (qpEvent) {
            setEventId(qpEvent.id);
            if (qpEvent.client_id) setClientId(qpEvent.client_id);
            if (qpEvent.start_date) setStartDate(qpEvent.start_date);
            if (qpEvent.end_date) setEndDate(qpEvent.end_date);
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
        setCategory(q.category || "PHOTOGRAPHY");
        setContextType(q.context_type || "");
        setStartDate(q.start_date || "");
        setEndDate(q.end_date || "");
        setExcludedDates(q.excluded_dates || []);
        setShowPricing(q.show_pricing !== false);
        setDiscountType(q.discount_type || "percent");
        setDiscountValue(q.discount_value || 0);
        setGstApplicable(!!q.gst_applicable);
        setGstMode(q.gst_mode || "cgst_sgst");
        setTerms(q.terms_and_conditions || "");
        setSpecialNotes(q.special_notes || "");
        setNotes(q.notes || "");
        setFooterMessage(q.footer_message || DEFAULT_FOOTER_MESSAGE);
        setTemplateId(q.template_id || "gold_premium");
        try { setTemplateConfig(JSON.parse(q.template_config || "{}")); } catch { setTemplateConfig({}); }
        setProjectTitle(q.project_title || "");
        setProjectSummary(q.project_summary || "");
        setAccessPassword(q.client_access_password || "");
        try { setMilestones(JSON.parse(q.payment_schedule_json || "[]")); } catch { setMilestones([]); }
        setBankDetails(parseSnapshot(q.bank_details_snapshot) || {});
        setSocialLinks(parseSnapshot(q.social_links_snapshot) || {});
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

  const subtotals = useMemo(() => subtotalsByType(items), [items]);

  const client = clients.find((c) => c.id === clientId) || null;
  const event = events.find((e) => e.id === eventId) || null;
  const availableEvents = clientId
    ? events.filter((e) => !e.client_id || e.client_id === clientId)
    : events;

  const onClientChange = (val) => {
    setClientId(val);
    setCustomClientMode(false);
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
      if (ev?.start_date && !startDate) setStartDate(ev.start_date);
      if (ev?.end_date && !endDate) setEndDate(ev.end_date);
    }
  };

  // ---- Save ----
  const buildData = () => ({
    quotation_number: quotationNumber,
    client_id: clientId,
    event_id: eventId,
    quotation_date: quotationDate,
    valid_until: validUntil,
    category,
    context_type: contextType,
    start_date: startDate,
    end_date: endDate,
    excluded_dates: excludedDates,
    show_pricing: showPricing,
    discount_type: discountType,
    discount_value: Number(discountValue) || 0,
    gst_applicable: gstApplicable,
    gst_mode: gstMode,
    terms_and_conditions: terms,
    special_notes: specialNotes,
    notes,
    payment_schedule_json: JSON.stringify(milestones.filter((m) => m.name || m.value)),
    footer_message: footerMessage,
    template_id: templateId,
    template_config: JSON.stringify(templateConfig),
    project_title: projectTitle,
    project_summary: projectSummary,
    client_access_password: accessPassword || ""
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
        const q = await createQuotation(workspaceId, data, items, {
          bank_details_snapshot: buildBankDetailsSnapshot(bankDetails),
          social_links_snapshot: buildSocialLinksSnapshot(socialLinks)
        });
        invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event"]);
        toast({ title: "Quotation saved as draft" });
        navigate(`/quotation/${q.id}`, { replace: true });
      } else {
        await updateQuotation(workspaceId, id, data, items, {
          bank_details_snapshot: buildBankDetailsSnapshot(bankDetails),
          social_links_snapshot: buildSocialLinksSnapshot(socialLinks)
        });
        invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event"]);
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
      setError("GST is enabled but your workspace GSTIN is missing. Add it in Preferences or disable GST.");
      return;
    }
    setError("");
    setFinalizing(true);
    try {
      const refCheck = await verifyQuotationRefs(workspaceId, clientId, eventId);
      if (!refCheck.ok) { setError(refCheck.error); setFinalizing(false); return; }
      const data = { ...buildData(), status: "finalized" };
      // Ensure finalized quotations have a public_token for URL 2 (e-sign page)
      if (!existingQuotation?.public_token) {
        data.public_token = generatePublicToken();
      }
      const snapshots = {
        client_snapshot: buildClientSnapshot(refCheck.client || client),
        business_snapshot: buildBusinessSnapshot(workspace),
        event_snapshot: buildEventSnapshot(refCheck.event || event),
        bank_details_snapshot: buildBankDetailsSnapshot(bankDetails),
        social_links_snapshot: buildSocialLinksSnapshot(socialLinks)
      };
      let q;
      if (isNew) {
        q = await createQuotation(workspaceId, data, items, snapshots);
      } else {
        q = await updateQuotation(workspaceId, id, data, items, snapshots);
      }

      let inv = null;
      let invoiceError = false;
      try {
        const existingInvs = await base44.entities.Invoice.filter(
          { workspace_id: workspaceId, quotation_id: q.id }, "-invoice_date", 10
        );
        if (!existingInvs || existingInvs.length === 0) {
          inv = await createFromQuotation(workspaceId, q, items);
        }
      } catch (e) { invoiceError = true; }

      invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event", "Invoice", "InvoiceItem"]);
      if (inv) toast({ title: "Quotation finalized & invoice created", description: inv.invoice_number });
      else if (invoiceError) toast({ title: "Quotation finalized", description: "Invoice could not be created automatically.", variant: "destructive" });
      else toast({ title: "Quotation finalized" });

      if (isNew) navigate(`/quotation/${q.id}`, { replace: true });
      else load();
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
      const wl = term.workItemSingular.toLowerCase();
      const proceed = window.confirm(
        ev
          ? `This ${wl} currently has a contract value of ${formatMoney(prev, currency)}.\n\nUpdate it to the accepted quotation total of ${formatMoney(existingQuotation.grand_total, currency)}?`
          : `Mark this quotation as Accepted?`
      );
      if (!proceed) { setAccepting(false); return; }
      const { eventUpdated, syncResult } = await acceptQuotation(workspaceId, id, { updateContractValue: !!ev });
      invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event", "FinancialTransaction", "PaymentMilestone", "EventTeamAssignment", "EventServiceAssignment"]);
      const syncOk = syncResult?.ok;
      const eventCreated = syncResult?.event?.created;
      toast({
        title: eventUpdated ? "Quotation accepted — contract value updated" : "Quotation accepted",
        description: syncOk
          ? `${eventCreated ? "Event created" : "Event linked"} • ${syncResult.team_synced?.length || 0} team • ${syncResult.service_synced?.length || 0} services • ${syncResult.milestones_synced?.length || 0} milestones`
          : "Sync pending — click Sync to create event & milestones",
        variant: syncOk ? "default" : "destructive"
      });
      load();
    } catch (e) {
      setError(e?.message || "Failed to accept quotation.");
    } finally {
      setAccepting(false);
    }
  };

  // ---- Sync accepted quotation to Event + Financials ----
  const [syncing, setSyncing] = useState(false);

  const syncQuotation = async () => {
    if (!existingQuotation || existingQuotation.status !== "accepted") return;
    setSyncing(true);
    try {
      const result = await syncAcceptedQuotation(workspaceId, id);
      if (result?.ok) {
        invalidateEntities(queryClient, ["Quotation", "Event", "EventTeamAssignment", "EventServiceAssignment", "PaymentMilestone", "FinancialTransaction"]);
        toast({
          title: "Sync complete",
          description: `${result.event?.created ? "Event created" : "Event linked"} • ${result.team_synced?.length || 0} team • ${result.service_synced?.length || 0} services • ${result.milestones_synced?.length || 0} milestones • 0 payments`
        });
        load();
      } else {
        toast({ title: "Sync failed", description: result?.error || "Unknown error", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Sync failed", description: e?.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync: if quotation is accepted with sync_pending, trigger sync on load
  useEffect(() => {
    if (existingQuotation?.status === "accepted" && existingQuotation.sync_pending && !syncing) {
      syncQuotation();
    }
  }, [existingQuotation?.id, existingQuotation?.sync_pending]);

  const onDuplicate = async () => {
    if (!existingQuotation) return;
    try {
      const q = await duplicateQuotation(workspaceId, existingQuotation, items);
      invalidateEntities(queryClient, ["Quotation", "QuotationItem"]);
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
      invalidateEntities(queryClient, ["Quotation", "QuotationItem"]);
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
      await generateQuotationPdf({ quotation: existingQuotation, items, workspace, client, event, currency });
      toast({ title: "PDF downloaded" });
    } catch (e) {
      toast({ title: "PDF generation failed", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const previewPdf = async () => {
    if (!existingQuotation) return;
    setGenerating(true);
    setPreview({ url: "", filename: "", open: true, loading: true });
    try {
      const result = await generateQuotationPdf({ quotation: existingQuotation, items, workspace, client, event, currency, returnBlob: true });
      setPreview({ url: result.url, filename: result.filename, open: true, loading: false });
    } catch (e) {
      toast({ title: "Preview failed", description: e?.message, variant: "destructive" });
      setPreview({ url: "", filename: "", open: false, loading: false });
    } finally {
      setGenerating(false);
    }
  };

  const downloadJobSheet = async () => {
    if (!event) { toast({ title: `Select a ${term.workItemSingular.toLowerCase()} to generate a job sheet` }); return; }
    setGenerating(true);
    try {
      const [asgns, members] = await Promise.all([
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, event_id: event.id }, "created_date", 200),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 200)
      ]);
      await generateJobSheetPdf({ event, assignments: asgns || [], members: members || [], roles, workspace, currency });
      toast({ title: "Job sheet downloaded" });
    } catch (e) {
      toast({ title: "Job sheet failed", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const previewJobSheet = async () => {
    if (!event) { toast({ title: `Select a ${term.workItemSingular.toLowerCase()} to generate a job sheet` }); return; }
    setGenerating(true);
    setPreview({ url: "", filename: "", open: true, loading: true });
    try {
      const [asgns, members] = await Promise.all([
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, event_id: event.id }, "created_date", 200),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 200)
      ]);
      const result = await generateJobSheetPdf({ event, assignments: asgns || [], members: members || [], roles, workspace, currency, returnBlob: true });
      setPreview({ url: result.url, filename: result.filename, open: true, loading: false });
    } catch (e) {
      toast({ title: "Job sheet preview failed", description: e?.message, variant: "destructive" });
      setPreview({ url: "", filename: "", open: false, loading: false });
    } finally {
      setGenerating(false);
    }
  };

  const previewTemplate = () => {
    const html = renderTemplate(templateId, {
      workspace, quotation: { ...existingQuotation, ...buildData(), ...totals, project_title: projectTitle, project_summary: projectSummary },
      client, event, items, currency, templateConfig
    });
    setTemplatePreviewHtml(html);
    setShowTemplatePreview(true);
  };

  // ---- Package apply ----
  const applyPackage = (pkg) => {
    const incDates = includedDates(startDate, endDate, excludedDates);
    const newItems = deserializePackageStructure(pkg.structure_json, incDates);
    setItems(newItems);
    if (pkg.terms_and_conditions && !terms) setTerms(pkg.terms_and_conditions);
    if (pkg.footer_message && !footerMessage) setFooterMessage(pkg.footer_message);
    if (pkg.category) setCategory(pkg.category);
    toast({ title: "Package applied", description: pkg.name });
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate("/quotation")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Quotations
        </button>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs px-2 py-1 rounded font-medium uppercase tracking-wide", QUOTATION_STATUS_META[status]?.className)}>
            {QUOTATION_STATUS_META[status]?.label || status}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{quotationNumber}</span>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setShowPackageDialog(true)}>
              <Package className="w-3.5 h-3.5" /> Packages
            </Button>
          )}
          {status === "accepted" && existingQuotation && (
            <Button size="sm" onClick={async () => {
              try {
                const inv = await createFromQuotation(workspaceId, existingQuotation, items);
                invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
                toast({ title: "Invoice created", description: inv.invoice_number });
                navigate(`/invoices/${inv.id}`);
              } catch (e) { setError(e?.message || "Failed to create invoice."); }
            }}>
              <Receipt className="w-3.5 h-3.5" /> Create Invoice
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Quotation meta */}
      <Section title="Quotation">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Quotation No">
            <Input value={quotationNumber} onChange={(e) => setQuotationNumber(e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Date">
            <Input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Client">
            <div className="flex items-center gap-2">
              <Select value={clientId} onChange={(e) => onClientChange(e.target.value)} disabled={readOnly} className="flex-1">
                <option value="">— Select client —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {!readOnly && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowClientForm(true)} className="shrink-0">
                  <Plus className="w-3.5 h-3.5" /> New
                </Button>
              )}
            </div>
          </Field>
          <Field label={term.workItemSingular}>
            <Select value={eventId} onChange={(e) => onEventChange(e.target.value)} disabled={readOnly} className="w-full">
              <option value="">— Select {term.workItemSingular.toLowerCase()} —</option>
              {availableEvents.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
          </Field>
          <Field label="Valid Until">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="PDF Template">
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={readOnly} className="w-full">
              {QUOTATION_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Project Title">
            <Input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} disabled={readOnly} placeholder="e.g. Wedding Coverage" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Project Summary">
              <Textarea value={projectSummary} onChange={(e) => setProjectSummary(e.target.value)} disabled={readOnly} rows={2} placeholder="Brief project scope description" />
            </Field>
          </div>
        </div>
      </Section>

      {/* Category & Context */}
      <QuotationCategoryContext
        category={category}
        setCategory={setCategory}
        contextType={contextType}
        setContextType={setContextType}
        readOnly={readOnly}
      />

      {/* Date Engine */}
      <QuotationDateEngine
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        excludedDates={excludedDates}
        setExcludedDates={setExcludedDates}
        readOnly={readOnly}
      />

      {/* Day/Phase Builder */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Day / Phase Builder</h3>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setShowPackageDialog(true)}>
              <Package className="w-3.5 h-3.5" /> Apply Package
            </Button>
          )}
        </div>
        <QuotationDayBuilder
          items={items}
          setItems={setItems}
          startDate={startDate}
          endDate={endDate}
          excludedDates={excludedDates}
          teamMembers={teamMembers}
          roles={roles}
          services={services}
          currency={currency}
          readOnly={readOnly}
        />
      </div>

      {/* Pricing + GST */}
      <QuotationPricingPanel
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
        gstApplicable={gstApplicable}
        setGstApplicable={setGstApplicable}
        gstMode={gstMode}
        setGstMode={setGstMode}
        gstWorkspaceEnabled={gstWorkspaceEnabled}
        workspaceGstin={workspace?.gstin}
        totals={totals}
        subtotals={subtotals}
        currency={currency}
        readOnly={readOnly}
      />

      {/* Payment Milestones */}
      <QuotationMilestonesEditor
        schedule={milestones}
        setSchedule={setMilestones}
        grandTotal={totals.grandTotal}
        currency={currency}
        readOnly={readOnly}
      />

      {/* Presentation Settings */}
      <QuotationPresentationSection
        showPricing={showPricing}
        setShowPricing={setShowPricing}
        bankDetails={bankDetails}
        setBankDetails={setBankDetails}
        socialLinks={socialLinks}
        setSocialLinks={setSocialLinks}
        footerMessage={footerMessage}
        setFooterMessage={setFooterMessage}
        specialNotes={specialNotes}
        setSpecialNotes={setSpecialNotes}
        workspace={workspace}
        readOnly={readOnly}
      />

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
        <Field label="Client Access Password (optional)">
          <Input value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} disabled={readOnly} placeholder="Leave blank for public link" />
          <p className="text-xs text-muted-foreground mt-1">If set, the client must enter their email + this password to view and sign the quotation online.</p>
        </Field>
      </Section>

      {/* Template Settings */}
      <QuotationTemplateSettings templateConfig={templateConfig} onChange={setTemplateConfig} readOnly={readOnly} />

      {/* Actions */}
      <QuotationActions
        isNew={isNew}
        readOnly={readOnly}
        isFinalized={isFinalized}
        status={status}
        saving={saving}
        finalizing={finalizing}
        accepting={accepting}
        generating={generating}
        syncing={syncing}
        saveDraft={saveDraft}
        finalize={finalize}
        accept={accept}
        downloadPdf={downloadPdf}
        downloadJobSheet={downloadJobSheet}
        previewPdf={previewPdf}
        previewJobSheet={previewJobSheet}
        previewTemplate={previewTemplate}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        existingQuotation={existingQuotation}
        hasEvent={!!event}
        onSync={syncQuotation}
      />

      {/* Client Project Portal — public link control + view tracking */}
      {existingQuotation && (
        <PublicLinkPanel
          quotation={existingQuotation}
          onUpdated={(updated) => {
            setExistingQuotation((q) => ({ ...q, ...updated }));
          }}
        />
      )}

      <PdfPreviewModal
        url={preview.url}
        filename={preview.filename}
        open={preview.open}
        loading={preview.loading}
        onClose={() => setPreview((p) => ({ ...p, open: false }))}
      />

      <QuotationTemplatePreview
        open={showTemplatePreview}
        onClose={() => setShowTemplatePreview(false)}
        templateHtml={templatePreviewHtml}
        quotationNumber={quotationNumber}
        clientName={client?.name}
      />

      <QuotationPackageDialog
        open={showPackageDialog}
        onClose={() => setShowPackageDialog(false)}
        workspaceId={workspaceId}
        items={items}
        onApplyPackage={applyPackage}
        readOnly={readOnly}
      />

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
    </div>
  );
}