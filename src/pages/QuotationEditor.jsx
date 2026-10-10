import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { firstSocialLinkError, PAYMENT_METHOD_OPTIONS } from "@/lib/validation";
import { richHtmlToText } from "@/lib/richText";
import SyncEventDialog from "@/components/quotation/SyncEventDialog";
import QuotationSignatureProof from "@/components/quotation/QuotationSignatureProof";
import QuotationIncludesSection from "@/components/quotation/QuotationIncludesSection";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useBackGuard } from "@/hooks/useBackGuard";
import { useInteractionDirty } from "@/hooks/useInteractionDirty";
import BackConfirmDialog from "@/components/common/BackConfirmDialog";
import { assertOnline } from "@/lib/offlineGuard";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import QuotationEditorSkeleton from "@/components/quotation/QuotationEditorSkeleton";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney } from "@/utils/format";
import { computeTotals, subtotalsByType, includedDates, isIncludeItem, isRoleOnlyItem, formatDateChip } from "@/lib/quotationCalc";
import QuotationTeamServicesReview from "@/components/quotation/QuotationTeamServicesReview";
import MissingAssignmentsDialog from "@/components/quotation/MissingAssignmentsDialog";
import SaveNewEntriesDialog from "@/components/quotation/SaveNewEntriesDialog";
import { collectNewEntries, saveNewEntries } from "@/lib/quotationNewEntries";
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
import ItemsDateAssignDialog from "@/components/quotation/ItemsDateAssignDialog";
import QuotationDayBuilder from "@/components/quotation/QuotationDayBuilder";
import QuotationPackageDialog from "@/components/quotation/QuotationPackageDialog";
import QuotationMilestonesEditor from "@/components/quotation/QuotationMilestonesEditor";
import QuotationPresentationSection from "@/components/quotation/QuotationPresentationSection";
import { Section, Field, SectionCollapseContext } from "@/components/quotation/QuotationParts";
import { QUOTATION_TEMPLATES, getTemplate, renderTemplate } from "@/constants/quotationTemplates";
import { prepareTemplateImages } from "@/lib/templateImages";
import QuotationTemplatePreview from "@/components/quotation/QuotationTemplatePreview";
import QuotationTemplateSettings from "@/components/quotation/QuotationTemplateSettings";
import QuotationClientFacingPanel from "@/components/quotation/QuotationClientFacingPanel";
import QuotationPublicLinkPanel from "@/components/quotation/QuotationPublicLinkPanel";
import SectionVisibilityToggles from "@/components/quotation/SectionVisibilityToggles";
import RichTextEditor from "@/components/common/RichTextEditor";
import { Textarea } from "@/components/ui/textarea";
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
  const [hideTeamNames, setHideTeamNames] = useState(false);
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

  // Undated items carried over from the Rate Estimator: once a date range exists, ask where they belong
  // instead of leaving them under "General" beside the day cards.
  const askDatePlacement = useRef(false);
  const [showDateAssign, setShowDateAssign] = useState(false);
  const assignDates = useMemo(() => includedDates(startDate, endDate, excludedDates), [startDate, endDate, excludedDates]);
  const undatedCount = useMemo(() => items.filter((it) => !it.day_date && !isIncludeItem(it)).length, [items]);
  useEffect(() => {
    if (askDatePlacement.current && mode === "day_wise" && assignDates.length > 0 && undatedCount > 0) {
      askDatePlacement.current = false;
      setShowDateAssign(true);
    }
  }, [mode, assignDates, undatedCount]);

  const handleDateAssign = (choice) => {
    setShowDateAssign(false);
    if (choice === "keep") return;
    setItems((prev) => {
      const undated = prev.filter((it) => !it.day_date && !isIncludeItem(it));
      const dated = prev.filter((it) => it.day_date || isIncludeItem(it));
      if (choice === "first") return [...dated, ...undated.map((it) => ({ ...it, day_date: assignDates[0] }))];
      return [...dated, ...assignDates.flatMap((d) => undated.map((it) => ({ ...it, day_date: d })))];
    });
  };

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
    savedSignature.current = null;
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
          askDatePlacement.current = true;
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
        setHideTeamNames(!!q.hide_team_names);
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
        setTemplateId(getTemplate(q.template_id).id);
        try {
          const tc = JSON.parse(q.template_config || "{}");
          // Older quotations may hold HTML (<p>, &nbsp;) copied from Preferences — show it as plain text.
          if (tc.payment?.instructions) tc.payment = { ...tc.payment, instructions: richHtmlToText(tc.payment.instructions) };
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
            instructions: richHtmlToText(prefs.defaultPaymentInstructions) || prev.payment?.instructions || "",
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
        instructions: richHtmlToText(prefs.defaultPaymentInstructions) || prev.payment?.instructions || ""
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
    hide_team_names: hideTeamNames,
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

  // "Unsaved changes": compare everything the editor saves against what was loaded/saved last. A new quotation
  // has nothing saved yet, so its Save button is always available.
  const savedSignature = useRef(null);
  // Bumped after each save; collapsible sections (bank, social links, T&C, template…) fold away on it.
  const [collapseKey, setCollapseKey] = useState(0);
  const currentSignature = JSON.stringify([buildData(), items, bankDetails, socialLinks]);
  useEffect(() => {
    if (!loading && !isNew && savedSignature.current === null) savedSignature.current = currentSignature;
  });
  const hasUnsavedChanges = isNew || (savedSignature.current !== null && currentSignature !== savedSignature.current);

  // "Leave this page?" guard: for a saved quotation, any unsaved edit; for a new one, once something
  // has been typed or picked. Covers browser/phone Back, the top-bar back arrow, reload/close, and
  // this page's own Cancel / back buttons.
  const touched = useInteractionDirty(isNew);
  const { showConfirm, confirmBack, stayHere, requestBack, markLeaving } = useBackGuard(isNew ? touched : hasUnsavedChanges);
  const guardDirty = isNew ? touched : hasUnsavedChanges;
  const handleCancel = () => (guardDirty ? requestBack() : navigate("/quotation"));
  // Deliberate navigations (after saving, deleting, duplicating…) must not trigger the prompt.
  const leaveTo = (path, opts) => { markLeaving(); navigate(path, opts); };

  // Same team member twice on one day (or twice with no day) — packages and imports can bring these in.
  const duplicateTeamMember = () => {
    const seen = new Set();
    for (const it of items) {
      if (it.item_type !== "team" || !it.team_member_id) continue;
      const key = `${it.team_member_id}|${it.day_date || ""}`;
      if (seen.has(key)) return it.team_member_name_snapshot || it.name || t("A team member");
      seen.add(key);
    }
    return "";
  };

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

  const zeroAmountMsg = t("Add an amount — a quotation can't be saved with a total of 0.");
  const saveDraft = async () => {
    const dupName = duplicateTeamMember();
    if (dupName) { toast({ title: `${dupName} ${t("is added more than once on the same day.")}`, variant: "destructive" }); return; }
    if (!(totals.grandTotal > 0)) { toast({ title: zeroAmountMsg, variant: "destructive" }); return; }
    const socialErr = firstSocialLinkError(socialLinks);
    if (socialErr) { toast({ title: socialErr, variant: "destructive" }); return; }
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
        leaveTo(`/quotation/${q.id}`, { replace: true });
      } else {
        // What this save captures — anything typed while it runs stays "unsaved".
        const savedSig = currentSignature;
        await updateQuotation(workspaceId, id, data, items, {
          bank_details_snapshot: buildBankDetailsSnapshot(bankDetails),
          social_links_snapshot: buildSocialLinksSnapshot(socialLinks),
          ...customClientOpts
        });
        invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event"]);
        toast({ title: t("Quotation updated") });
        // Saves happen in place: no reload, so the page keeps its scroll position and nothing flickers.
        // (The form already holds exactly what was saved; items are rewritten on save, so their ids don't matter.)
        savedSignature.current = savedSig;
        setCollapseKey((k) => k + 1);
        try {
          const fresh = await loadQuotation(workspaceId, id);
          if (fresh?.quotation) setExistingQuotation(fresh.quotation);
        } catch { /* the saved data is fine; the header just refreshes next time */ }
      }
    } catch (e) {
      setError(e?.message || "Failed to save quotation.");
    } finally {
      stop();
    }
  };

  // Before finalizing: roles with no member, or no team / services at all, mean fewer event cards — ask once.
  const [missingPrompt, setMissingPrompt] = useState(null);
  const checkMissing = () => {
    const real = items.filter((it) => !isIncludeItem(it));
    const team = real.filter((it) => it.item_type === "team");
    const noTeam = team.length === 0;
    const noServices = !real.some((it) => it.item_type === "service");
    const roleOnly = team.filter(isRoleOnlyItem).map((it) => it.description || it.name || t("Role"));
    if (noTeam || noServices || roleOnly.length) setMissingPrompt({ noTeam, noServices, roleOnly });
    else finalize();
  };

  // First offer to save custom-added roles / members / services to Team and Services (so the event can get cards).
  const [newEntries, setNewEntries] = useState([]);
  const [savingEntries, setSavingEntries] = useState(false);
  const [resumeFinalize, setResumeFinalize] = useState(false);
  // Waits for the re-render that carries the linked items before moving on.
  useEffect(() => { if (resumeFinalize) { setResumeFinalize(false); checkMissing(); } });
  const requestFinalize = () => {
    const entries = collectNewEntries(items, roles, teamMembers, services);
    if (entries.length) setNewEntries(entries); else checkMissing();
  };
  const skipNewEntries = () => { setNewEntries([]); setResumeFinalize(true); };
  const saveEntries = async (chosen) => {
    setSavingEntries(true);
    try {
      const res = await saveNewEntries(workspaceId, chosen, items, roles);
      setItems(res.items);
      setRoles((p) => [...p, ...res.created.roles]);
      setTeamMembers((p) => [...p, ...res.created.members]);
      setServices((p) => [...p, ...res.created.services]);
      invalidateEntities(queryClient, ["TeamMember", "TeamRole", "Service"]);
      toast({ title: t("Saved to your lists"), description: [res.created.members.length && `${res.created.members.length} ${t("team")}`, res.created.services.length && `${res.created.services.length} ${t("services")}`, res.created.roles.length && `${res.created.roles.length} ${t("roles")}`].filter(Boolean).join(" • ") });
      setNewEntries([]);
      setResumeFinalize(true);
    } catch (e) {
      toast({ title: t("Couldn't save"), description: e?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setSavingEntries(false);
    }
  };

  const finalize = async () => {
    const dupName = duplicateTeamMember();
    if (dupName) { toast({ title: `${dupName} ${t("is added more than once on the same day.")}`, variant: "destructive" }); return; }
    if (!(totals.grandTotal > 0)) { toast({ title: zeroAmountMsg, variant: "destructive" }); return; }
    const socialErr = firstSocialLinkError(socialLinks);
    if (socialErr) { toast({ title: socialErr, variant: "destructive" }); return; }
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

      if (isNew) leaveTo(`/quotation/${q.id}`, { replace: true });
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
      const { eventUpdated, syncResult } = await acceptQuotation(workspaceId, id, { updateContractValue: !!ev, deferSync: true });
      invalidateEntities(queryClient, ["Quotation", "QuotationItem", "Event", "FinancialTransaction", "PaymentMilestone", "EventTeamAssignment", "EventServiceAssignment"]);
      toast({
        title: eventUpdated ? t("Quotation accepted — contract value updated") : t("Quotation accepted"),
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

  // Roles quoted without a person: they create no card on the event, so the sync prompt lists them.
  const openSlots = useMemo(() => {
    const slots = new Map();
    for (const it of items) {
      if (isIncludeItem(it) || !isRoleOnlyItem(it)) continue;
      const role = it.description || it.name || t("Role");
      const key = `${it.day_date || ""}|${role}`;
      slots.set(key, { role, date: it.day_date || "", count: (slots.get(key)?.count || 0) + 1 });
    }
    return [...slots.values()]
      .sort((a, b) => (a.date && b.date ? a.date.localeCompare(b.date) : a.date ? -1 : b.date ? 1 : 0))
      .map((x) => `${x.count} × ${x.role}${x.date ? ` · ${formatDateChip(x.date)}` : ""}`);
  }, [items, t]);

  // The Sync button also asks first when some roles have no person yet.
  const onSyncClick = () => {
    if (openSlots.length || existingQuotation?.event_id) setSyncPrompt(existingQuotation?.event_id ? "resync" : "create");
    else syncQuotation();
  };

  // An accepted quotation waiting to sync never touches the event on its own — ask first.
  const [syncPrompt, setSyncPrompt] = useState(null);
  const syncDismissKey = `quotation-sync-dismissed:${id}`;
  useEffect(() => {
    if (existingQuotation?.status !== "accepted" || !existingQuotation.sync_pending || syncing) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(syncDismissKey) === "1"; } catch { /* ignore */ }
    if (!dismissed) setSyncPrompt(existingQuotation.event_id ? "resync" : "create");
  }, [existingQuotation?.id, existingQuotation?.sync_pending, existingQuotation?.event_id]);

  const confirmSyncPrompt = async () => {
    await syncQuotation();
    setSyncPrompt(null);
  };
  const laterSyncPrompt = () => {
    try { sessionStorage.setItem(syncDismissKey, "1"); } catch { /* ignore */ }
    setSyncPrompt(null);
  };

  const onDuplicate = async () => {
    if (!existingQuotation) return;
    try {
      const q = await duplicateQuotation(workspaceId, existingQuotation, items);
      invalidateEntities(queryClient, ["Quotation", "QuotationItem"]);
      toast({ title: t("Quotation duplicated"), description: q.quotation_number });
      leaveTo(`/quotation/${q.id}`);
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
      leaveTo(`/quotation/${q.id}`);
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
      leaveTo("/quotation");
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

  // Job sheet data: the linked event's real assignments when it has them (after accept + sync);
  // otherwise the quotation's own team/service items, so it isn't blank before acceptance.
  const jobSheetData = async () => {
    const [asgns, svcAsgns, members] = await Promise.all([
      event ? base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, event_id: event.id }, "created_date", 200) : [],
      event ? base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId, event_id: event.id }, "created_date", 200) : [],
      base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 200)
    ]);
    const jobEvent = event || {
      title: projectTitle || quotationNumber || t("Quotation"),
      start_date: startDate, end_date: endDate, event_dates: assignDates,
    };
    return { event: jobEvent, assignments: asgns || [], serviceAssignments: svcAsgns || [], quotationItems: items, members: members || [], roles, workspace, currency };
  };

  const downloadJobSheet = async () => {
    if (!event && items.length === 0) { toast({ title: t("Add team or services to generate a job sheet") }); return; }
    setGenerating(true);
    try {
      await generateJobSheetPdf(await jobSheetData());
      toast({ title: t("Job sheet downloaded") });
    } catch (e) {
      toast({ title: t("Job sheet failed"), description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const previewJobSheet = async () => {
    if (!event && items.length === 0) { toast({ title: t("Add team or services to generate a job sheet") }); return; }
    setGenerating(true);
    setPreview({ url: "", filename: "", open: true, loading: true });
    try {
      const result = await generateJobSheetPdf({ ...(await jobSheetData()), returnBlob: true });
      setPreview({ url: result.url, filename: result.filename, open: true, loading: false });
    } catch (e) {
      toast({ title: t("Job sheet preview failed"), description: e?.message, variant: "destructive" });
      setPreview({ url: "", filename: "", open: false, loading: false });
    } finally {
      setGenerating(false);
    }
  };

  const previewTemplate = async () => {
    // Pictures from web links are loaded first; any that can't be loaded are left out and reported.
    const { templateConfig: preparedConfig, failed } = getTemplate(templateId).supportsImages
      ? await prepareTemplateImages(templateConfig)
      : { templateConfig, failed: [] };
    if (failed.length) toast({ title: t("Some pictures couldn't be loaded"), description: t("They are left out of the PDF. Check the links in Template Settings."), variant: "destructive" });
    const html = renderTemplate(templateId, {
      workspace, quotation: { ...existingQuotation, ...buildData(), ...totals, adjustment_amount: totals.adjustmentAmount, project_title: projectTitle, project_summary: projectSummary },
      client, event, items, currency, templateConfig: preparedConfig
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

  if (loading) return <QuotationEditorSkeleton />;
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
    <SectionCollapseContext.Provider value={{ collapseKey, startCollapsed: !isNew }}>
    <div className={cn("p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto", readOnly && "frozen-fields")}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={handleCancel} className="hidden lg:flex text-sm text-muted-foreground sm:hover:text-foreground items-center gap-2">
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

      <ItemsDateAssignDialog open={showDateAssign} itemCount={undatedCount} dates={assignDates} onChoose={handleDateAssign} />

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

      <QuotationIncludesSection items={items} setItems={setItems} services={services} currency={currency} readOnly={readOnly} />

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
        bankDetails={bankDetails} setBankDetails={setBankDetails}
        socialLinks={socialLinks} setSocialLinks={setSocialLinks}
        footerMessage={footerMessage} setFooterMessage={setFooterMessage}
        specialNotes={specialNotes} setSpecialNotes={setSpecialNotes}
        workspace={workspace} readOnly={readOnly}
        visibility={visibility} setVisibility={setVisibility}
      />

      <Section collapsible icon={FileText} title={t("Terms & Conditions")}>
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
              <Select value={templateConfig.payment?.method || ""} onChange={(e) => setTemplateConfig((prev) => ({ ...prev, payment: { ...(prev.payment || {}), method: e.target.value } }))} disabled={readOnly}>
                <option value="">{t("Select method")}</option>
                {[...PAYMENT_METHOD_OPTIONS, ...(templateConfig.payment?.method && !PAYMENT_METHOD_OPTIONS.includes(templateConfig.payment.method) ? [templateConfig.payment.method] : [])].map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label={t("Payment Instructions")}>
              <Textarea value={templateConfig.payment?.instructions || ""} onChange={(e) => setTemplateConfig((prev) => ({ ...prev, payment: { ...(prev.payment || {}), instructions: e.target.value } }))} disabled={readOnly} rows={1} ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }} className="min-h-9 h-9 py-2 resize-none overflow-hidden" placeholder={t("Payment details will be shared upon confirmation.")} />
            </Field>
          </div>
        </div>
        <Field label={t("Notes (internal)")}>
          <WordCounterTextarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={readOnly} rows={2} className="bg-card border border-border" />
        </Field>
      </Section>

      <QuotationTemplateSettings templateConfig={templateConfig} onChange={setTemplateConfig} readOnly={readOnly} templateId={templateId} visibility={visibility} setVisibility={setVisibility} />

      <QuotationTeamServicesReview items={items} mode={mode} currency={currency} />

      <SaveNewEntriesDialog key={newEntries.map((e) => e.key).join("|")} entries={newEntries} busy={savingEntries} onSave={saveEntries} onSkip={skipNewEntries} />

      <MissingAssignmentsDialog
        open={!!missingPrompt}
        {...(missingPrompt || {})}
        onBack={() => setMissingPrompt(null)}
        onContinue={() => { setMissingPrompt(null); finalize(); }}
      />

      <SyncEventDialog mode={syncPrompt} busy={syncing} onConfirm={confirmSyncPrompt} onLater={laterSyncPrompt} openSlots={openSlots} />

      <QuotationSignatureProof quotation={existingQuotation} />

      <QuotationActions
        isNew={isNew} hasUnsavedChanges={hasUnsavedChanges} readOnly={readOnly} isFinalized={isFinalized} status={status}
        saving={saving} finalizing={finalizing} accepting={accepting} generating={generating} syncing={syncing}
        saveDraft={saveDraft} finalize={requestFinalize} accept={accept}
        downloadPdf={downloadPdf} downloadJobSheet={downloadJobSheet}
        previewJobSheet={previewJobSheet} previewTemplate={previewTemplate}
        onDuplicate={onDuplicate} onDelete={onDelete} onCancel={handleCancel}
        onRevise={isFinalized && existingQuotation && !newerRev ? onRevise : undefined} revising={revising}
        existingQuotation={existingQuotation} hasEvent={!!event || items.length > 0} onSync={onSyncClick}
      />

      <QuotationClientFacingPanel
        quotationId={existingQuotation?.id}
        showPricing={showPricing} setShowPricing={setShowPricing}
        hideTeamNames={hideTeamNames} setHideTeamNames={setHideTeamNames}
      />

      {existingQuotation && (
        <QuotationPublicLinkPanel quotation={existingQuotation} onUpdated={(updated) => { setExistingQuotation((q) => ({ ...q, ...updated })); }} />
      )}

      <BackConfirmDialog open={showConfirm} onStay={stayHere} onLeave={confirmBack} />

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
          leaveTo(`/invoices/${invId}`);
        }}
      />
    </div>
    </SectionCollapseContext.Provider>
  );
}