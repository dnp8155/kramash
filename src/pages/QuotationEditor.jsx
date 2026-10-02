import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { assertOnline } from "@/lib/offlineGuard";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import EditorPageSkeleton from "@/components/common/EditorPageSkeleton";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney } from "@/utils/format";
import { computeTotals, subtotalsByType, includedDates } from "@/lib/quotationCalc";
import {
  loadServices, loadQuotation, loadTeamMembers, loadRoles,
  generateQuotationNumber, createQuotation, updateQuotation,
  duplicateQuotation, deleteQuotation, acceptQuotation, loadQuotations,
  verifyQuotationRefs, buildClientSnapshot, buildBusinessSnapshot, buildEventSnapshot,
  buildBankDetailsSnapshot, buildSocialLinksSnapshot, parseSnapshot,
  deserializePackageStructure, generatePublicToken, buildQuotationFromEvent
} from "@/lib/quotationService";
import { createFromQuotation } from "@/lib/invoiceService";
import CreateInvoiceDialog from "@/components/quotation/CreateInvoiceDialog";
import { syncAcceptedQuotation } from "@/lib/milestoneService";
import { generateQuotationPdf, generateJobSheetPdf } from "@/lib/quotationPdf";
import { DEFAULT_QUOTATION_TERMS, DEFAULT_FOOTER_MESSAGE, QUOTATION_STATUS_META, mapToQuotationCategory } from "@/constants/quotationConfig";
import { ArrowLeft, AlertTriangle, FileText, Plus, Receipt, Package } from "lucide-react";
import PdfPreviewModal from "@/components/common/PdfPreviewModal";
import { cn } from "@/lib/utils";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { usePageTitle } from "@/hooks/usePageTitle";
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
import QuotationPublicLinkPanel from "@/components/quotation/QuotationPublicLinkPanel";
import SectionVisibilityToggles from "@/components/quotation/SectionVisibilityToggles";
import RichTextEditor from "@/components/common/RichTextEditor";
import WordCounterTextarea from "@/components/common/WordCounterTextarea";
import { isWithinLimit } from "@/lib/wordLimit";
import ClientForm from "@/components/clients/ClientForm";
import { reviseQuotation, supersedeQuotationRevisions, newerRevision, revisionNumber } from "@/lib/revisions";
import { useT } from "@/hooks/useT";

// Local calendar date (toISOString() is UTC, which is "yesterday" in India before 05:30).
const fmtLocalDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => fmtLocalDate(new Date());
const addDaysStr = (dateStr, n) => {
  const d = new Date((dateStr || today()) + "T00:00:00");
  d.setDate(d.getDate() + n);
  return fmtLocalDate(d);
};
// A new quotation is valid for 3 days by default; the owner sets what suits the client.
const DEFAULT_VALID_DAYS = 3;

function inferCategoryFromEventType(eventType) {
  if (!eventType) return "";
  const et = eventType.toLowerCase();
  if (/(photo|videography|cinema|maternity|newborn|portrait|couple shoot|engagement shoot|album)/.test(et)) return "PHOTOGRAPHY";
  if (/(event management|event coord|birthday|corporate event|conference|party planner|decor|lighting|sound)/.test(et)) return "EVENT_MANAGEMENT";
  if (/(architect|interior design|site visit|construction|real estate|floor plan|3d walkthrough)/.test(et)) return "ARCHITECTURE";
  return "";
}

export default function QuotationEditor() {
  const t = useT();
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
  usePageTitle(isNew ? t("New Quotation") : t("Edit Quotation"));

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { saving, start, stop } = useSubmitGuard();
  const [finalizing, setFinalizing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState({ url: "", filename: "", open: false, loading: false });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [templatePreviewHtml, setTemplatePreviewHtml] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [customClientMode, setCustomClientMode] = useState(false);
  const [customClientName, setCustomClientName] = useState("");
  const [customClientPhone, setCustomClientPhone] = useState("");
  const [showCreateInvoiceDialog, setShowCreateInvoiceDialog] = useState(false);
  const [eventPrefill, setEventPrefill] = useState(null);
  const [newerRev, setNewerRev] = useState(null);
  const [revising, setRevising] = useState(false);

  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationDate, setQuotationDate] = useState(today());
  const [validUntil, setValidUntil] = useState(addDaysStr(today(), DEFAULT_VALID_DAYS));
  // Once the owner picks a Valid Until themselves we stop auto-adjusting it to the quotation date.
  const validUntilTouched = useRef(false);
  const [clientId, setClientId] = useState("");
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState([]);

  const [category, setCategory] = useState("OTHER");
  const [contextType, setContextType] = useState("");

  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [excludedDates, setExcludedDates] = useState([]);

  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [finalTotal, setFinalTotal] = useState("");
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstMode, setGstMode] = useState("cgst_sgst");

  const [showPricing, setShowPricing] = useState(true);
  const [bankDetails, setBankDetails] = useState({});
  const [socialLinks, setSocialLinks] = useState({});
  const [footerMessage, setFooterMessage] = useState(DEFAULT_FOOTER_MESSAGE);
  const [specialNotes, setSpecialNotes] = useState("");
  const [paymentConditions, setPaymentConditions] = useState("");

  const [milestones, setMilestones] = useState([]);

  const [terms, setTerms] = useState(DEFAULT_QUOTATION_TERMS);
  const [notes, setNotes] = useState("");

  const [templateId, setTemplateId] = useState("black_premium");
  const [templateConfig, setTemplateConfig] = useState({});
  const [projectSummary, setProjectSummary] = useState("");

  const [mode, setMode] = useState("day_wise");
  const [visibility, setVisibility] = useState({});

  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [existingQuotation, setExistingQuotation] = useState(null);

  const isFinalized = status === "finalized" || status === "accepted";
  const readOnly = isFinalized || !!newerRev;

  // Fill dates, team (per working day), services, add-ons and misc extras from the event.
  const prefillFromEvent = useCallback(async (ev) => {
    try {
      const built = await buildQuotationFromEvent(workspaceId, ev);
      if (built.startDate) setStartDate(built.startDate);
      if (built.endDate) setEndDate(built.endDate);
      setExcludedDates(built.excludedDates);
      setMode("day_wise");
      if (built.items.length) setItems(built.items);
      setEventPrefill({
        title: ev.title, counts: built.counts,
        contractValue: Number(ev.contract_value) || 0
      });
    } catch { /* non-fatal: the quotation can still be built by hand */ }
  }, [workspaceId]);

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
        setCategory(mapToQuotationCategory(workspace?.business_category) || "OTHER");
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
            if (qpEvent.description) setProjectSummary(qpEvent.description);
            const inferredCat = inferCategoryFromEventType(qpEvent.event_type);
            setCategory(inferredCat || mapToQuotationCategory(workspace?.business_category) || "OTHER");
            if (!Array.isArray(estimateItems) || !estimateItems.length) {
              await prefillFromEvent(qpEvent);
            }
          }
        }
      } else {
        const result = await loadQuotation(workspaceId, id);
        if (!result) { setNotFound(true); return; }
        const q = result.quotation;
        setExistingQuotation(q);
        try { setNewerRev(newerRevision(await loadQuotations(workspaceId), "quotation_number", q)); } catch { setNewerRev(null); }
        setQuotationNumber(q.quotation_number);
        setQuotationDate(q.quotation_date || today());
        setValidUntil(q.valid_until || "");
        validUntilTouched.current = true;
        setClientId(q.client_id || "");
        setEventId(q.event_id || "");
        if (!q.client_id) {
          const snap = parseSnapshot(q.client_snapshot);
          if (snap?.name) {
            setCustomClientMode(true);
            setCustomClientName(snap.name || "");
            setCustomClientPhone(snap.phone || "");
          }
        }
        setStatus(q.status || "draft");
        setItems(result.items || []);
        setCategory(q.category || mapToQuotationCategory(workspace?.business_category) || "OTHER");
        setContextType(q.context_type || "");
        setStartDate(q.start_date || "");
        setEndDate(q.end_date || "");
        setExcludedDates(q.excluded_dates || []);
        setShowPricing(q.show_pricing !== false);
        setDiscountType(q.discount_type || "percent");
        setDiscountValue(q.discount_value || 0);
        setFinalTotal(q.final_total_override ?? "");
        setGstApplicable(!!q.gst_applicable);
        setGstMode(q.gst_mode || "cgst_sgst");
        setTerms(q.terms_and_conditions || "");
        setSpecialNotes(q.special_notes || "");
        setPaymentConditions(q.payment_conditions || "");
        setNotes(q.notes || "");
        setFooterMessage(q.footer_message || DEFAULT_FOOTER_MESSAGE);
        setTemplateId(q.template_id || "black_premium");
        try {
          const tc = JSON.parse(q.template_config || "{}");
          setTemplateConfig(tc);
          setVisibility(tc.visibility || {});
          setMode(tc.mode || "day_wise");
        } catch { setTemplateConfig({}); }
        setProjectSummary(q.project_summary || "");
        try { setMilestones(JSON.parse(q.payment_schedule_json || "[]")); } catch { setMilestones([]); }
        setBankDetails(parseSnapshot(q.bank_details_snapshot) || {});
        setSocialLinks(parseSnapshot(q.social_links_snapshot) || {});
      }
    } catch (e) {
      setError(e?.message || "Failed to load quotation.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, id, isNew, location.state, gstWorkspaceEnabled, workspace?.business_category, prefillFromEvent]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isNew || !workspace?.display_preferences) return;
    try {
      const raw = workspace.display_preferences;
      const prefs = typeof raw === "object" ? raw : JSON.parse(raw);
      if (prefs.defaultTerms) setTerms(prefs.defaultTerms);
      if (prefs.defaultPaymentConditions) setPaymentConditions(prefs.defaultPaymentConditions);
      if (prefs.defaultPaymentMethod || prefs.defaultPaymentInstructions) {
        setTemplateConfig((prev) => ({
          ...prev,
          payment: {
            ...(prev.payment || {}),
            method: prefs.defaultPaymentMethod || prev.payment?.method || "",
            instructions: prefs.defaultPaymentInstructions || prev.payment?.instructions || "",
          },
        }));
      }
      if (prefs.bank_account_name || prefs.bank_name || prefs.bank_account_number || prefs.bank_ifsc || prefs.bank_upi_id) {
        setBankDetails({
          account_name: prefs.bank_account_name || "",
          bank_name: prefs.bank_name || "",
          account_number: prefs.bank_account_number || "",
          ifsc: prefs.bank_ifsc || "",
          upi_id: prefs.bank_upi_id || ""
        });
      }
      if (prefs.social_instagram || prefs.social_youtube || workspace?.website || prefs.social_twitter || prefs.social_portfolio) {
        setSocialLinks({
          instagram: prefs.social_instagram || "",
          youtube: prefs.social_youtube || "",
          website: workspace?.website || "",
          twitter: prefs.social_twitter || prefs.social_portfolio || "",
          extra: Array.isArray(prefs.social_extra) ? prefs.social_extra.slice(0, 2) : [],
        });
      }
    } catch { /* ignore */ }
  }, [isNew, workspace?.display_preferences]);

  const getWorkspaceDefaults = () => {
    try {
      const raw = workspace?.display_preferences;
      if (!raw) return {};
      return typeof raw === "object" ? raw : JSON.parse(raw);
    } catch { return {}; }
  };

  const loadTermsFromWorkspace = () => {
    const prefs = getWorkspaceDefaults();
    if (prefs.defaultTerms) setTerms(prefs.defaultTerms);
  };

  const loadPaymentConditionsFromWorkspace = () => {
    const prefs = getWorkspaceDefaults();
    if (prefs.defaultPaymentConditions) setPaymentConditions(prefs.defaultPaymentConditions);
  };

  const loadPaymentMethodFromWorkspace = () => {
    const prefs = getWorkspaceDefaults();
    setTemplateConfig((prev) => ({
      ...prev,
      payment: {
        ...(prev.payment || {}),
        method: prefs.defaultPaymentMethod || prev.payment?.method || "",
        instructions: prefs.defaultPaymentInstructions || prev.payment?.instructions || ""
      }
    }));
  };

  const totals = useMemo(
    () => computeTotals(items, { discountType, discountValue, gstApplicable, gstMode, finalTotal }),
    [items, discountType, discountValue, gstApplicable, gstMode, finalTotal]
  );

  const subtotals = useMemo(() => subtotalsByType(items), [items]);

  const client = customClientMode
    ? { name: customClientName, phone: customClientPhone }
    : clients.find((c) => c.id === clientId) || null;
  const event = events.find((e) => e.id === eventId) || null;
  const projectTitle = event?.title || "";
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
      if (ev?.client_id && !clientId && !customClientMode) setClientId(ev.client_id);
      if (isNew && ev && items.length === 0) prefillFromEvent(ev);
      else {
        if (ev?.start_date && !startDate) setStartDate(ev.start_date);
        if (ev?.end_date && !endDate) setEndDate(ev.end_date);
      }
    } else setEventPrefill(null);
  };

  const enableCustomClient = () => {
    setClientId("");
    setCustomClientMode(true);
  };

  const disableCustomClient = () => {
    setCustomClientMode(false);
    setCustomClientName("");
    setCustomClientPhone("");
  };

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
    final_total_override: finalTotal === "" ? null : Number(finalTotal),
    gst_applicable: gstApplicable,
    gst_mode: gstMode,
    terms_and_conditions: terms,
    special_notes: specialNotes,
    payment_conditions: paymentConditions,
    notes,
    payment_schedule_json: JSON.stringify(milestones.filter((m) => m.name || m.value)),
    footer_message: footerMessage,
    template_id: templateId,
    template_config: JSON.stringify({ ...templateConfig, visibility, mode }),
    project_title: projectTitle,
    project_summary: projectSummary
  });

  const validate = () => {
    const errors = { items: {} };
    if (!quotationDate) errors.quotationDate = true;
    if (validUntil && quotationDate && validUntil <= quotationDate) errors.validUntil = true;
    if (items.length === 0) errors.noItems = true;
    if (customClientMode && !customClientName.trim()) errors.customClientName = true;
    items.forEach((it, idx) => {
      if (!it.name?.trim()) errors.items[idx] = { name: true };
    });
    const hasErrors = errors.quotationDate || errors.validUntil || errors.noItems || errors.customClientName || Object.keys(errors.items).length > 0;
    if (!isWithinLimit(projectSummary, 140)) return { ok: false, errors: { ...errors, projectSummary: true } };
    if (!isWithinLimit(specialNotes, 140)) return { ok: false, errors: { ...errors, specialNotes: true } };
    if (!isWithinLimit(notes, 140)) return { ok: false, errors: { ...errors, notes: true } };
    return { ok: !hasErrors, errors };
  };

  useEffect(() => { setFieldErrors({}); }, [items]);

  const saveDraft = async () => {
    const v = validate();
    if (!v.ok) {
      setFieldErrors(v.errors);
      if (v.errors.noItems) toast({ title: t("Add at least one item."), variant: "destructive" });
      else if (v.errors.customClientName) toast({ title: t("Enter a name for the custom client."), variant: "destructive" });
      return;
    }
    setFieldErrors({});
    setError("");
    if (!assertOnline()) return;
    if (!start()) return;
    try {
      const refCheck = await verifyQuotationRefs(workspaceId, clientId, eventId);
      if (!refCheck.ok) { setError(refCheck.error); return; }
      const data = { ...buildData(), status: "draft" };
      const customClientOpts = customClientMode
        ? { client_snapshot: buildClientSnapshot(client) }
        : {};
      if (isNew) {
        const q = await createQuotation(workspaceId, data, items, {
          bank_details_snapshot: buildBankDetailsSnapshot(bankDetails),
          social_links_snapshot: buildSocialLinksSnapshot(socialLinks),
          ...customClientOpts
        });
        invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event"]);
        toast({ title: t("Quotation saved as draft") });
        navigate(`/quotation/${q.id}`, { replace: true });
      } else {
        await updateQuotation(workspaceId, id, data, items, {
          bank_details_snapshot: buildBankDetailsSnapshot(bankDetails),
          social_links_snapshot: buildSocialLinksSnapshot(socialLinks),
          ...customClientOpts
        });
        invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event"]);
        toast({ title: t("Quotation updated") });
        load();
      }
    } catch (e) {
      setError(e?.message || "Failed to save quotation.");
    } finally {
      stop();
    }
  };

  const finalize = async () => {
    const v = validate();
    if (!v.ok) {
      setFieldErrors(v.errors);
      if (v.errors.noItems) toast({ title: t("Add at least one item."), variant: "destructive" });
      else if (v.errors.customClientName) toast({ title: t("Enter a name for the custom client."), variant: "destructive" });
      return;
    }
    if (gstApplicable && gstWorkspaceEnabled && !workspace.gstin) {
      setError("GST is enabled but your workspace GSTIN is missing. Add it in Preferences or disable GST.");
      return;
    }
    setFieldErrors({});
    setError("");
    setFinalizing(true);
    try {
      const refCheck = await verifyQuotationRefs(workspaceId, clientId, eventId);
      if (!refCheck.ok) { setError(refCheck.error); setFinalizing(false); return; }
      const data = { ...buildData(), status: "finalized" };
      if (!existingQuotation?.public_token) { data.public_token = generatePublicToken(); }
      const snapshots = {
        client_snapshot: buildClientSnapshot(refCheck.client || client),
        business_snapshot: buildBusinessSnapshot(workspace),
        event_snapshot: buildEventSnapshot(refCheck.event || event),
        bank_details_snapshot: buildBankDetailsSnapshot(bankDetails),
        social_links_snapshot: buildSocialLinksSnapshot(socialLinks)
      };
      let q;
      if (isNew) { q = await createQuotation(workspaceId, data, items, snapshots); }
      else { q = await updateQuotation(workspaceId, id, data, items, snapshots); }

      // A revision replaces the earlier ones: they are cancelled and the client's link moves here.
      let previousInvoiceCount = 0;
      if (revisionNumber(q.quotation_number) > 1) {
        try {
          const { superseded } = await supersedeQuotationRevisions(workspaceId, q);
          for (const old of superseded) {
            const olds = await base44.entities.Invoice.filter({ workspace_id: workspaceId, quotation_id: old.id }, "-invoice_date", 10);
            previousInvoiceCount += (olds || []).filter((i) => i.status !== "cancelled").length;
          }
        } catch { /* non-fatal */ }
      }

      let inv = null;
      let invoiceError = false;
      try {
        const existingInvs = await base44.entities.Invoice.filter({ workspace_id: workspaceId, quotation_id: q.id }, "-invoice_date", 10);
        // The previous revision's invoice is revised on the invoice page, not duplicated here.
        if ((!existingInvs || existingInvs.length === 0) && previousInvoiceCount === 0) { inv = await createFromQuotation(workspaceId, q, items); }
      } catch (e) { invoiceError = true; }

      invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event", "Invoice", "InvoiceItem"]);
      if (inv) toast({ title: t("Quotation finalized & invoice created"), description: inv.invoice_number });
      else if (previousInvoiceCount > 0) toast({ title: t("Revision finalized"), description: t("An invoice exists for the previous revision — open it and use Revise to update it.") });
      else if (invoiceError) toast({ title: t("Quotation finalized"), description: t("Invoice could not be created automatically."), variant: "destructive" });
      else toast({ title: t("Quotation finalized") });

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
      const proceed = window.confirm(
        ev
          ? `${t("Current contract value")}: ${formatMoney(prev, currency)}\n${t("Accepted quotation total")}: ${formatMoney(existingQuotation.grand_total, currency)}\n\n${t("Update the contract value to the accepted quotation total?")}`
          : t("Mark this quotation as Accepted?")
      );
      if (!proceed) { setAccepting(false); return; }
      const { eventUpdated, syncResult } = await acceptQuotation(workspaceId, id, { updateContractValue: !!ev });
      invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event", "FinancialTransaction", "PaymentMilestone", "EventTeamAssignment", "EventServiceAssignment"]);
      const syncOk = syncResult?.ok;
      const eventCreated = syncResult?.event?.created;
      toast({
        title: eventUpdated ? t("Quotation accepted — contract value updated") : t("Quotation accepted"),
        description: syncOk
          ? `${eventCreated ? t("Event created") : t("Event linked")} • ${syncResult.team_synced?.length || 0} ${t("team")} • ${syncResult.service_synced?.length || 0} ${t("services")} • ${syncResult.milestones_synced?.length || 0} ${t("milestones")}`
          : t("Sync pending — click Sync to create event & milestones"),
        variant: syncOk ? "default" : "destructive"
      });
      load();
    } catch (e) {
      setError(e?.message || "Failed to accept quotation.");
    } finally {
      setAccepting(false);
    }
  };

  const [syncing, setSyncing] = useState(false);

  const syncQuotation = async () => {
    if (!existingQuotation || existingQuotation.status !== "accepted") return;
    setSyncing(true);
    try {
      const result = await syncAcceptedQuotation(workspaceId, id);
      if (result?.ok) {
        invalidateEntities(queryClient, ["Quotation", "Event", "EventTeamAssignment", "EventServiceAssignment", "PaymentMilestone", "FinancialTransaction"]);
        toast({
          title: t("Sync complete"),
          description: `${result.event?.created ? t("Event created") : t("Event linked")} • ${result.team_synced?.length || 0} ${t("team")} • ${result.service_synced?.length || 0} ${t("services")} • ${result.milestones_synced?.length || 0} ${t("milestones")} • 0 ${t("payments")}`
        });
        load();
      } else {
        toast({ title: t("Sync failed"), description: result?.error || t("Unknown error"), variant: "destructive" });
      }
    } catch (e) {
      toast({ title: t("Sync failed"), description: e?.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

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
      toast({ title: t("Quotation duplicated"), description: q.quotation_number });
      navigate(`/quotation/${q.id}`);
    } catch (e) {
      setError(e?.message || "Failed to duplicate quotation.");
    }
  };

  const onRevise = async () => {
    if (!existingQuotation) return;
    if (!window.confirm(`${t("Create a new revision of")} ${quotationNumber}? ${t("It opens as a draft; the current one stays as is until you finalize the revision.")}`)) return;
    setRevising(true);
    try {
      const q = await reviseQuotation(workspaceId, existingQuotation, items);
      invalidateEntities(queryClient, ["Quotation", "QuotationItem"]);
      toast({ title: t("Revision created"), description: q.quotation_number });
      navigate(`/quotation/${q.id}`);
    } catch (e) {
      setError(e?.message || "Failed to create revision.");
    } finally {
      setRevising(false);
    }
  };

  const onDelete = async () => {
    if (!existingQuotation) return;
    if (!window.confirm(`${t("Delete this quotation?")} ${t("This cannot be undone.")}`)) return;
    try {
      await deleteQuotation(workspaceId, id);
      invalidateEntities(queryClient, ["Quotation", "QuotationItem"]);
      toast({ title: t("Quotation deleted") });
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
      toast({ title: t("PDF downloaded") });
    } catch (e) {
      toast({ title: t("PDF generation failed"), description: e?.message, variant: "destructive" });
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
      toast({ title: t("Preview failed"), description: e?.message, variant: "destructive" });
      setPreview({ url: "", filename: "", open: false, loading: false });
    } finally {
      setGenerating(false);
    }
  };

  const downloadJobSheet = async () => {
    if (!event) { toast({ title: t("Select a linked item to generate a job sheet") }); return; }
    setGenerating(true);
    try {
      const [asgns, members] = await Promise.all([
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, event_id: event.id }, "created_date", 200),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 200)
      ]);
      await generateJobSheetPdf({ event, assignments: asgns || [], members: members || [], roles, workspace, currency });
      toast({ title: t("Job sheet downloaded") });
    } catch (e) {
      toast({ title: t("Job sheet failed"), description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const previewJobSheet = async () => {
    if (!event) { toast({ title: t("Select a linked item to generate a job sheet") }); return; }
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
      toast({ title: t("Job sheet preview failed"), description: e?.message, variant: "destructive" });
      setPreview({ url: "", filename: "", open: false, loading: false });
    } finally {
      setGenerating(false);
    }
  };

  const previewTemplate = () => {
    const html = renderTemplate(templateId, {
      workspace, quotation: { ...existingQuotation, ...buildData(), ...totals, adjustment_amount: totals.adjustmentAmount, project_title: projectTitle, project_summary: projectSummary },
      client, event, items, currency, templateConfig
    });
    setTemplatePreviewHtml(html);
    setShowTemplatePreview(true);
  };

  const applyPackage = (pkg) => {
    const incDates = includedDates(startDate, endDate, excludedDates);
    const newItems = deserializePackageStructure(pkg.structure_json, incDates);
    if (!newItems.length) {
      toast({ title: t("Package is empty"), description: t("This package has no items."), variant: "destructive" });
      return;
    }
    if (items.length > 0) {
      const replace = window.confirm(`${t("Replace current items with the items from this package?")} (${items.length} → ${newItems.length}) "${pkg.name}"`);
      if (!replace) return;
    }
    setItems(newItems);
    if (pkg.terms_and_conditions && !terms) setTerms(pkg.terms_and_conditions);
    if (pkg.footer_message && !footerMessage) setFooterMessage(pkg.footer_message);
    if (pkg.category) setCategory(pkg.category);
    toast({ title: t("Package applied"), description: `${pkg.name} — ${newItems.length} ${t("items with saved prices")}` });
  };

  if (loading) return <EditorPageSkeleton />;
  if (notFound) {
    return (
      <div className="p-6 max-w-[800px] mx-auto">
        <EmptyState title={t("Quotation not found")} description={t("This quotation may not exist or belongs to another workspace.")} />
        <div className="mt-4">
          <button onClick={() => navigate("/quotation")} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground sm:hover:text-foreground transition-colors">
            <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </span>
            {t("Back to Quotations")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate("/quotation")} className="hidden lg:flex text-sm text-muted-foreground sm:hover:text-foreground items-center gap-2">
          <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </span>
          {t("Quotations")}
        </button>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs px-2 py-1 rounded font-medium uppercase tracking-wide", QUOTATION_STATUS_META[status]?.className)}>
            {QUOTATION_STATUS_META[status]?.label ? t(QUOTATION_STATUS_META[status].label) : status}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{quotationNumber}</span>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setShowPackageDialog(true)}>
              <Package className="w-3.5 h-3.5" /> {t("Packages")}
            </Button>
          )}
          {status === "accepted" && existingQuotation && (
            <Button size="sm" onClick={() => setShowCreateInvoiceDialog(true)}>
              <Receipt className="w-3.5 h-3.5" /> {t("Create Invoice")}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t(error)}</span>
        </div>
      )}

      {newerRev && (
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/40 rounded-lg p-3 text-sm text-foreground">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
          <span>
            {t("This quotation has been replaced by revision")} <strong>{newerRev.quotation_number}</strong>.{" "}
            <button type="button" onClick={() => navigate(`/quotation/${newerRev.id}`)} className="text-primary underline">{t("Open latest")}</button>
          </span>
        </div>
      )}

      {eventPrefill && !readOnly && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-foreground">
          <FileText className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          <span>
            {t("Filled from")} <strong>{eventPrefill.title}</strong>: {eventPrefill.counts.team} {t("team")}, {eventPrefill.counts.services} {eventPrefill.counts.services === 1 ? t("service") : t("services")}, {eventPrefill.counts.addons} {eventPrefill.counts.addons === 1 ? t("add-on") : t("add-ons")}
            {eventPrefill.counts.misc ? `, ${eventPrefill.counts.misc} ${eventPrefill.counts.misc === 1 ? t("extra") : t("extras")}` : ""} — {t("total")} {formatMoney(totals.grandTotal, currency)}
            {eventPrefill.contractValue > 0 ? ` (${t("current contract value")} ${formatMoney(eventPrefill.contractValue, currency)})` : ""}. {t("Accepting this quotation updates the contract value.")}
          </span>
        </div>
      )}

      <Section title={t("Quotation")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("Quotation No")}>
            <Input value={quotationNumber} onChange={(e) => setQuotationNumber(e.target.value)} disabled={readOnly} />
          </Field>
          <Field label={t("Date")}>
            <Input type="date" value={quotationDate} onChange={(e) => {
              const next = e.target.value;
              setQuotationDate(next);
              // Keep the default 3-day validity following the date until the owner sets their own.
              if (next && (!validUntilTouched.current || (validUntil && validUntil <= next))) setValidUntil(addDaysStr(next, DEFAULT_VALID_DAYS));
            }} disabled={readOnly} className={cn(fieldErrors.quotationDate && "border-destructive bg-destructive/5")} />
          </Field>
          <Field label={t("Client")}>
            {customClientMode ? (
              <div className="flex items-center gap-2">
                <Input
                  value={customClientName}
                  onChange={(e) => setCustomClientName(e.target.value)}
                  placeholder={t("Client name")}
                  disabled={readOnly}
                  className={cn("flex-1", fieldErrors.customClientName && "border-destructive bg-destructive/5")}
                />
                <Input
                  value={customClientPhone}
                  onChange={(e) => setCustomClientPhone(e.target.value)}
                  placeholder={t("Phone (optional)")}
                  disabled={readOnly}
                  className="w-32 shrink-0"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={clientId} onChange={(e) => onClientChange(e.target.value)} disabled={readOnly} className="flex-1">
                  <option value="">{t("— Select client —")}</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                {!readOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowClientForm(true)} className="shrink-0">
                    <Plus className="w-3.5 h-3.5" /> {t("New")}
                  </Button>
                )}
              </div>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={customClientMode ? disableCustomClient : enableCustomClient}
                className="text-xs text-muted-foreground sm:hover:text-foreground underline mt-1"
              >
                {customClientMode ? t("Choose an existing client instead") : t("Not a saved client? Enter a custom name")}
              </button>
            )}
          </Field>
          <Field label={term.workItemSingular}>
            <Select value={eventId} onChange={(e) => onEventChange(e.target.value)} disabled={readOnly} className="w-full">
              <option value="">— {t("Select")} {term.workItemSingular.toLowerCase()} —</option>
              {availableEvents.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
          </Field>
          <Field
            label={t("Valid Until")}
            error={!!(validUntil && quotationDate && validUntil <= quotationDate)}
            hint={validUntil && quotationDate && validUntil <= quotationDate
              ? t("Valid Until must be after the quotation date — the two can't be the same day.")
              : t("Can't be the same as the quotation date. Defaults to 3 days after; change it to what suits your client.")}
          >
            <Input
              type="date"
              value={validUntil}
              min={quotationDate ? addDaysStr(quotationDate, 1) : undefined}
              onChange={(e) => { validUntilTouched.current = true; setValidUntil(e.target.value); }}
              disabled={readOnly}
              className={cn(validUntil && quotationDate && validUntil <= quotationDate && "border-destructive bg-destructive/5")}
            />
          </Field>
          <Field label={t("PDF Template")}>
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={readOnly} className="w-full">
              {QUOTATION_TEMPLATES.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("Project Summary")}>
              <WordCounterTextarea value={projectSummary} onChange={(e) => setProjectSummary(e.target.value)} disabled={readOnly} rows={2} placeholder={t("Brief project scope description")} />
            </Field>
          </div>
        </div>
      </Section>

      <QuotationCategoryContext category={category} setCategory={setCategory} contextType={contextType} setContextType={setContextType} readOnly={readOnly} />

      <QuotationDateEngine
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        excludedDates={excludedDates} setExcludedDates={setExcludedDates}
        mode={mode} setMode={setMode}
        readOnly={readOnly}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">{t("Day / Phase Builder")}</h3>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setShowPackageDialog(true)}>
              <Package className="w-3.5 h-3.5" /> {t("Apply Package")}
            </Button>
          )}
        </div>
        <QuotationDayBuilder
          items={items} setItems={setItems}
          startDate={startDate} endDate={endDate} excludedDates={excludedDates}
          teamMembers={teamMembers} roles={roles} services={services}
          currency={currency} readOnly={readOnly} workspace={workspace}
          itemErrors={fieldErrors.items || {}} mode={mode}
        />
      </div>

      <QuotationPricingPanel
        discountType={discountType} setDiscountType={setDiscountType}
        discountValue={discountValue} setDiscountValue={setDiscountValue}
        finalTotal={finalTotal} setFinalTotal={setFinalTotal}
        gstApplicable={gstApplicable} setGstApplicable={setGstApplicable}
        gstMode={gstMode} setGstMode={setGstMode}
        gstWorkspaceEnabled={gstWorkspaceEnabled} workspaceGstin={workspace?.gstin}
        totals={totals} subtotals={subtotals} currency={currency} readOnly={readOnly}
      />

      <QuotationMilestonesEditor
        schedule={milestones} setSchedule={setMilestones}
        grandTotal={totals.grandTotal} currency={currency} readOnly={readOnly}
        eventStartDate={startDate} eventEndDate={endDate}
      />

      <QuotationPresentationSection
        showPricing={showPricing} setShowPricing={setShowPricing}
        bankDetails={bankDetails} setBankDetails={setBankDetails}
        socialLinks={socialLinks} setSocialLinks={setSocialLinks}
        footerMessage={footerMessage} setFooterMessage={setFooterMessage}
        specialNotes={specialNotes} setSpecialNotes={setSpecialNotes}
        workspace={workspace} readOnly={readOnly}
        visibility={visibility} setVisibility={setVisibility}
      />

      <Section icon={FileText} title={t("Terms & Conditions")}>
        <div className="flex items-center justify-between mb-2">
          <SectionVisibilityToggles sectionKey="terms" visibility={visibility} setVisibility={setVisibility} readOnly={readOnly} />
          {!readOnly && (
            <button type="button" onClick={loadTermsFromWorkspace} className="text-xs text-primary sm:hover:underline shrink-0">
              {t("Load from workspace")}
            </button>
          )}
        </div>
        <RichTextEditor value={terms} onChange={setTerms} readOnly={readOnly} placeholder={t("Enter terms & conditions…")} />
        <div className="mt-4">
          <Field label={t("Payment Conditions (shown on PDF)")}>
            <div className="flex items-center justify-between mb-2">
              <SectionVisibilityToggles sectionKey="payment_conditions" visibility={visibility} setVisibility={setVisibility} readOnly={readOnly} />
              {!readOnly && (
                <button type="button" onClick={loadPaymentConditionsFromWorkspace} className="text-xs text-primary sm:hover:underline shrink-0">
                  {t("Load from workspace")}
                </button>
              )}
            </div>
            <RichTextEditor value={paymentConditions} onChange={setPaymentConditions} readOnly={readOnly} placeholder={t("e.g. 50% advance to confirm booking. Balance due on or before event day.")} />
          </Field>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">{t("Payment Method")}</label>
            {!readOnly && (
              <button type="button" onClick={loadPaymentMethodFromWorkspace} className="text-xs text-primary sm:hover:underline shrink-0">
                {t("Load from workspace")}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("Payment Method")}>
              <Input value={templateConfig.payment?.method || ""} onChange={(e) => setTemplateConfig((prev) => ({ ...prev, payment: { ...(prev.payment || {}), method: e.target.value } }))} disabled={readOnly} placeholder={t("Bank Transfer / UPI / Cheque")} />
            </Field>
            <Field label={t("Payment Instructions")}>
              <Input value={templateConfig.payment?.instructions || ""} onChange={(e) => setTemplateConfig((prev) => ({ ...prev, payment: { ...(prev.payment || {}), instructions: e.target.value } }))} disabled={readOnly} placeholder={t("Payment details will be shared upon confirmation.")} />
            </Field>
          </div>
        </div>
        <Field label={t("Notes (internal)")}>
          <WordCounterTextarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={readOnly} rows={2} className="bg-card border border-border" />
        </Field>
      </Section>

      <QuotationTemplateSettings templateConfig={templateConfig} onChange={setTemplateConfig} readOnly={readOnly} />

      <QuotationActions
        isNew={isNew} readOnly={readOnly} isFinalized={isFinalized} status={status}
        saving={saving} finalizing={finalizing} accepting={accepting} generating={generating} syncing={syncing}
        saveDraft={saveDraft} finalize={finalize} accept={accept}
        downloadPdf={downloadPdf} downloadJobSheet={downloadJobSheet}
        previewPdf={previewPdf} previewJobSheet={previewJobSheet} previewTemplate={previewTemplate}
        onDuplicate={onDuplicate} onDelete={onDelete}
        onRevise={isFinalized && existingQuotation && !newerRev ? onRevise : undefined} revising={revising}
        existingQuotation={existingQuotation} hasEvent={!!event} onSync={syncQuotation}
      />

      {existingQuotation && (
        <QuotationPublicLinkPanel quotation={existingQuotation} onUpdated={(updated) => { setExistingQuotation((q) => ({ ...q, ...updated })); }} />
      )}

      <PdfPreviewModal url={preview.url} filename={preview.filename} open={preview.open} loading={preview.loading} onClose={() => setPreview((p) => ({ ...p, open: false }))} />

      <QuotationTemplatePreview open={showTemplatePreview} onClose={() => setShowTemplatePreview(false)} templateHtml={templatePreviewHtml} quotationNumber={quotationNumber} clientName={client?.name} />

      <QuotationPackageDialog open={showPackageDialog} onClose={() => setShowPackageDialog(false)} workspaceId={workspaceId} items={items} roles={roles} onApplyPackage={applyPackage} readOnly={readOnly} currency={currency} />

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

      <CreateInvoiceDialog
        open={showCreateInvoiceDialog}
        quotation={existingQuotation}
        onClose={() => setShowCreateInvoiceDialog(false)}
        workspaceId={workspaceId}
        currency={currency}
        onCreated={(invId) => {
          setShowCreateInvoiceDialog(false);
          invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
          navigate(`/invoices/${invId}`);
        }}
      />
    </div>
  );
}