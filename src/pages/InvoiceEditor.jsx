import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { firstSocialLinkError } from "@/lib/validation";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import InvoiceEditorSkeleton from "@/components/invoice/InvoiceEditorSkeleton";
import EmptyState from "@/components/common/EmptyState";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AlertTriangle, ArrowLeft, Plus, Eye, Send, Wallet, Save, Trash2, GitBranch, X } from "lucide-react";
import ActionDock from "@/components/common/ActionDock";
import { reviseInvoice, supersedeInvoiceRevisions, canReviseInvoice, newerRevision } from "@/lib/revisions";
import InvoiceClientCard from "@/components/invoice/InvoiceClientCard";
import InvoiceProductsSection from "@/components/invoice/InvoiceProductsSection";
import InvoiceFinancials from "@/components/invoice/InvoiceFinancials";
import InvoicePrintView from "@/components/invoice/InvoicePrintView";
import RecordInvoicePaymentDialog from "@/components/invoice/RecordInvoicePaymentDialog";
import RichTextEditor from "@/components/common/RichTextEditor";
import WordCounterTextarea from "@/components/common/WordCounterTextarea";
import { isWithinLimit, countWords, WORD_LIMIT, WORD_LIMIT_WARN_THRESHOLD } from "@/lib/wordLimit";
import InvoicePublicLinkPanel from "@/components/invoice/InvoicePublicLinkPanel";
import Toggle from "@/components/common/Toggle";
import {
  generateInvoiceNumber, loadInvoice, loadInvoices,
  createInvoice, updateInvoice, deleteInvoice,
  verifyInvoiceRefs, buildClientSnapshot, buildBusinessSnapshot, buildEventSnapshot,
  computeInvoiceTotals, buildBankDetailsSnapshot, buildSocialLinksSnapshot, parseSnapshot, buildScopeText
} from "@/lib/invoiceService";
import InvoiceBankDetailsSection from "@/components/invoice/InvoiceBankDetailsSection";
import InvoiceSignatureSection from "@/components/invoice/InvoiceSignatureSection";
import { Section, SectionCollapseContext } from "@/components/quotation/QuotationParts";
import ClientForm from "@/components/clients/ClientForm";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useBackGuard } from "@/hooks/useBackGuard";
import { useInteractionDirty } from "@/hooks/useInteractionDirty";
import BackConfirmDialog from "@/components/common/BackConfirmDialog";
import { assertOnline } from "@/lib/offlineGuard";
import { useT } from "@/hooks/useT";

// Local calendar date (toISOString() is UTC, which is "yesterday" in India before 05:30).
const fmtLocalDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => fmtLocalDate(new Date());
const addDaysStr = (dateStr, n) => {
  const d = new Date((dateStr || today()) + "T00:00:00");
  d.setDate(d.getDate() + n);
  return fmtLocalDate(d);
};
const DUE_TERM_DAYS = { due_on_receipt: 0, net_15: 15, net_30: 30 };

const INVOICE_STATUS_META = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  due: { label: "Due", className: "bg-badge-progress-bg text-badge-progress-fg" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
  sent: { label: "Sent", className: "bg-badge-upcoming-bg text-badge-upcoming-fg" },
  paid: { label: "Paid", className: "bg-badge-completed-bg text-badge-completed-fg" },
  partial: { label: "Partial", className: "bg-badge-progress-bg text-badge-progress-fg" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive" }
};

export default function InvoiceEditor() {
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
  usePageTitle(isNew ? t("New Invoice") : t("Edit Invoice"));

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { saving, start, stop } = useSubmitGuard();
  const [error, setError] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [clientId, setClientId] = useState("");
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState([]);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [finalTotal, setFinalTotal] = useState("");
  const [gstApplicable, setGstApplicable] = useState(false);
  const [gstRate, setGstRate] = useState(workspace?.default_gst_rate || 18);
  const [gstMode, setGstMode] = useState("cgst_sgst");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [terms, setTerms] = useState("");
  const [dueDateType, setDueDateType] = useState("due_on_receipt");
  const [milestoneTag, setMilestoneTag] = useState("Full Payment");
  const [showItemizedRates, setShowItemizedRates] = useState(true);
  const [authorizedSignatory, setAuthorizedSignatory] = useState("");
  const [signatureType, setSignatureType] = useState("none");
  const [signatureImage, setSignatureImage] = useState("");
  const [signatureColor, setSignatureColor] = useState("#000000");
  const [bankDetails, setBankDetails] = useState({});
  const [socialLinks, setSocialLinks] = useState({});

  const [clients, setClients] = useState([]);
  const [events, setEvents] = useState([]);
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [customClientMode, setCustomClientMode] = useState(false);
  const [customClientName, setCustomClientName] = useState("");
  const [customClientPhone, setCustomClientPhone] = useState("");
  const [showPrintView, setShowPrintView] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [publicLinkData, setPublicLinkData] = useState(null);

  const [newerRev, setNewerRev] = useState(null);
  const [revising, setRevising] = useState(false);

  const readOnly = status === "paid" || status === "cancelled" || !!newerRev;

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    savedSignature.current = null;
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
          setFinalTotal(prefill.final_total_override ?? "");
          setGstApplicable(!!prefill.gst_applicable);
        }
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
        try { setNewerRev(newerRevision(await loadInvoices(workspaceId), "invoice_number", inv)); } catch { setNewerRev(null); }
        setInvoiceNumber(inv.invoice_number);
        setInvoiceDate(inv.invoice_date || today());
        setDueDate(inv.due_date || "");
        setClientId(inv.client_id || "");
        setEventId(inv.event_id || "");
        if (!inv.client_id) {
          // Invoice for a custom (unsaved) client, e.g. from a custom-named quotation.
          const snap = parseSnapshot(inv.client_snapshot);
          if (snap?.name) {
            setCustomClientMode(true);
            setCustomClientName(snap.name || "");
            setCustomClientPhone(snap.phone || "");
          }
        }
        setStatus(inv.status || "draft");
        setItems(result.items || []);
        setDiscountType(inv.discount_type || "percent");
        setDiscountValue(inv.discount_value || 0);
        setFinalTotal(inv.final_total_override ?? "");
        setGstApplicable(!!inv.gst_applicable);
        setGstRate(Number(inv.gst_rate) || (workspace?.default_gst_rate || 18));
        setGstMode(inv.gst_mode || "cgst_sgst");
        setNotes(inv.notes || "");
        setPaymentTerms(inv.payment_terms || "");
        // Older invoices saved the same text in both fields — don't show it twice.
        setTerms(inv.terms_and_conditions && inv.terms_and_conditions !== inv.payment_terms ? inv.terms_and_conditions : "");
        setDueDateType(inv.due_date_type || "due_on_receipt");
        setMilestoneTag(inv.milestone_tag || "Full Payment");
        setShowItemizedRates(inv.show_itemized_rates !== false);
        setAuthorizedSignatory(inv.authorized_signatory || "");
        setSignatureType(inv.signature_type || "none");
        setSignatureImage(inv.signature_image || "");
        setSignatureColor(inv.signature_color || "#000000");
        setBankDetails(parseSnapshot(inv.bank_details_snapshot) || {});
        setSocialLinks(parseSnapshot(inv.social_links_snapshot) || {});
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

  useEffect(() => {
    if (!isNew || !workspace?.display_preferences) return;
    try {
      const raw = workspace.display_preferences;
      const prefs = typeof raw === "object" ? raw : JSON.parse(raw);
      if (prefs.defaultPaymentConditions) setPaymentTerms(prefs.defaultPaymentConditions);
      if (prefs.defaultTerms) setTerms(prefs.defaultTerms);
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

  const totals = useMemo(
    () => computeInvoiceTotals(items, { discountType, discountValue, gstApplicable, gstRate, gstMode, finalTotal }),
    [items, discountType, discountValue, gstApplicable, gstRate, gstMode, finalTotal]
  );

  const client = customClientMode
    ? { name: customClientName, phone: customClientPhone }
    : clients.find((c) => c.id === clientId) || null;
  const event = events.find((e) => e.id === eventId) || null;

  const availableEvents = clientId
    ? events.filter((e) => !e.client_id || e.client_id === clientId)
    : events;

  const enableCustomClient = () => {
    setClientId("");
    setCustomClientMode(true);
  };

  const disableCustomClient = () => {
    setCustomClientMode(false);
    setCustomClientName("");
    setCustomClientPhone("");
  };

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
    }
  };

  const onInvoiceDateChange = (next) => {
    setInvoiceDate(next);
    // Net-terms due dates follow the issue date; a custom date stays as the owner set it.
    if (next && dueDateType in DUE_TERM_DAYS) setDueDate(addDaysStr(next, DUE_TERM_DAYS[dueDateType]));
  };

  const onDueDateTypeChange = (type) => {
    setDueDateType(type);
    if (type in DUE_TERM_DAYS) setDueDate(addDaysStr(invoiceDate, DUE_TERM_DAYS[type]));
  };

  const dueBeforeIssue = !!(dueDate && invoiceDate && dueDate < invoiceDate);

  const getWorkspaceDefaults = () => {
    try {
      const raw = workspace?.display_preferences;
      if (!raw) return {};
      return typeof raw === "object" ? raw : JSON.parse(raw);
    } catch { return {}; }
  };

  // Rebuild a package's Scope of Work from the quotation this invoice came from (also for older invoices).
  const fillScopeFromQuotation = async (index) => {
    try {
      const [q, qItems] = await Promise.all([
        base44.entities.Quotation.get(existingInvoice.quotation_id),
        base44.entities.QuotationItem.filter({ workspace_id: workspaceId, quotation_id: existingInvoice.quotation_id }, "sort_order", 500)
      ]);
      const text = buildScopeText(q, qItems || []);
      if (!text) { toast({ title: t("The quotation has no team or services to list.") }); return; }
      setItems((prev) => prev.map((it, i) => (i === index ? { ...it, description: text } : it)));
    } catch (e) {
      toast({ title: t("Could not load the quotation"), description: e?.message, variant: "destructive" });
    }
  };

  const loadTermsFromWorkspace = () => {
    const prefs = getWorkspaceDefaults();
    if (prefs.defaultTerms) setTerms(prefs.defaultTerms);
    else toast({ title: t("No default terms & conditions set in your workspace preferences.") });
  };

  const loadPaymentTermsFromWorkspace = () => {
    const prefs = getWorkspaceDefaults();
    if (prefs.defaultPaymentConditions) setPaymentTerms(prefs.defaultPaymentConditions);
    else toast({ title: t("No default payment terms set in your workspace preferences.") });
  };

  async function uploadSignatureIfNeeded(img) {
    if (!img || !img.startsWith("data:")) return img;
    try {
      const res = await fetch(img);
      const blob = await res.blob();
      const file = new File([blob], "signature.png", { type: blob.type || "image/png" });
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      return file_url;
    } catch {
      return img;
    }
  }

  const buildData = (sigUrl) => ({
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
    final_total_override: finalTotal === "" ? null : Number(finalTotal),
    gst_applicable: gstApplicable,
    gst_rate: Number(gstRate) || 0,
    gst_mode: gstMode,
    notes,
    payment_terms: paymentTerms,
    terms_and_conditions: terms,
    authorized_signatory: authorizedSignatory,
    signature_type: signatureType,
    signature_image: sigUrl,
    signature_color: signatureColor
  });

  // "Unsaved changes": compare everything the editor saves against what was loaded/saved last.
  // A new invoice has nothing saved yet, so it never shows the indicator.
  const savedSignature = useRef(null);
  // Bumped after each save; collapsible sections (terms, signature, bank, social…) fold away on it.
  const [collapseKey, setCollapseKey] = useState(0);
  const currentSignature = JSON.stringify([
    buildData(signatureImage), items, bankDetails, socialLinks, customClientMode, customClientName, customClientPhone
  ]);
  useEffect(() => {
    if (!loading && !isNew && savedSignature.current === null) savedSignature.current = currentSignature;
  });
  const hasUnsavedChanges = !isNew && savedSignature.current !== null && currentSignature !== savedSignature.current;
  // Same rule as the quotation editor: Save is the primary button while there is something to save
  // (a new invoice always has), and a quiet disabled one otherwise.
  const canSave = isNew || hasUnsavedChanges;

  // "Leave this page?" guard: for a saved invoice, any unsaved edit; for a new one, once something
  // has been typed or picked. Covers browser/phone Back, the top-bar back arrow, reload/close, and
  // this page's own Cancel / back buttons.
  const touched = useInteractionDirty(isNew);
  const guardDirty = isNew ? touched : hasUnsavedChanges;
  const { showConfirm, confirmBack, stayHere, requestBack, markLeaving } = useBackGuard(guardDirty);
  const handleCancel = () => (guardDirty ? requestBack() : navigate("/invoices"));
  // Deliberate navigations (after saving, deleting…) must not trigger the prompt.
  const leaveTo = (path, opts) => { markLeaving(); navigate(path, opts); };

  const validate = () => {
    if (!invoiceDate) return "Invoice date is required.";
    if (customClientMode && !customClientName.trim()) return "Enter a name for the custom client.";
    if (dueBeforeIssue) return "Due date can't be before the issue date.";
    if (items.length === 0) return "Add at least one item.";
    for (const it of items) {
      if (!it.name?.trim()) return "Every item needs a name.";
    }
    if (!(totals.grandTotal > 0)) return "Add an amount — an invoice can't be saved with a total of 0.";
    if (!isWithinLimit(paymentTerms, 140)) return "Payment Terms exceed the 140-word limit.";
    if (!isWithinLimit(notes, 140)) return "Notes exceed the 140-word limit.";
    const socialErr = firstSocialLinkError(socialLinks);
    if (socialErr) return socialErr;
    return "";
  };

  const save = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setError("");
    if (!assertOnline()) return;
    if (!start()) return;
    try {
      const refCheck = await verifyInvoiceRefs(workspaceId, clientId, eventId);
      if (!refCheck.ok) { setError(refCheck.error); return; }
      const sigUrl = await uploadSignatureIfNeeded(signatureImage);
      if (sigUrl !== signatureImage) setSignatureImage(sigUrl);
      const data = { ...buildData(sigUrl), status: "draft" };
      const customClientOpts = customClientMode ? { client_snapshot: buildClientSnapshot(client) } : {};
      if (isNew) {
        const inv = await createInvoice(workspaceId, data, items, {
          client_snapshot: buildClientSnapshot(refCheck.client || client),
          business_snapshot: buildBusinessSnapshot(workspace),
          event_snapshot: buildEventSnapshot(refCheck.event || event),
          bank_details_snapshot: buildBankDetailsSnapshot(bankDetails),
          social_links_snapshot: buildSocialLinksSnapshot(socialLinks)
        });
        invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
        toast({ title: t("Invoice saved") });
        leaveTo(`/invoices/${inv.id}`, { replace: true });
      } else {
        // What this save captures (incl. the uploaded signature URL) — anything typed while it runs stays "unsaved".
        const savedSig = JSON.stringify([
          buildData(sigUrl), items, bankDetails, socialLinks, customClientMode, customClientName, customClientPhone
        ]);
        await updateInvoice(workspaceId, id, data, items, {
          bank_details_snapshot: buildBankDetailsSnapshot(bankDetails),
          social_links_snapshot: buildSocialLinksSnapshot(socialLinks),
          ...customClientOpts
        });
        invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
        toast({ title: t("Invoice updated") });
        // Saves happen in place: no reload, so the page keeps its scroll position and nothing flickers.
        savedSignature.current = savedSig;
        setCollapseKey((k) => k + 1);
        try {
          const fresh = await loadInvoice(workspaceId, id);
          if (fresh?.invoice) setExistingInvoice(fresh.invoice);
        } catch { /* the saved data is fine; the header just refreshes next time */ }
      }
    } catch (e) {
      setError(e?.message || "Failed to save invoice.");
    } finally {
      stop();
    }
  };

  // Issuing / sending a revision cancels the earlier ones and moves the client's public link here.
  const supersedeOlder = async () => {
    if (existingInvoice) await supersedeInvoiceRevisions(workspaceId, existingInvoice).catch(() => {});
  };

  const gstBlocked = gstApplicable && gstWorkspaceEnabled && !workspace?.gstin;
  const GSTIN_MISSING = "GST is enabled but your workspace GSTIN is missing. Add it in Preferences or turn GST off.";

  const issueInvoice = async () => {
    if (gstBlocked) { setError(GSTIN_MISSING); return; }
    try {
      await base44.entities.Invoice.update(id, { status: "due" });
      await supersedeOlder();
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: t("Invoice issued") });
      setStatus("due");
      load();
    } catch (e) { setError(e?.message || "Failed to issue invoice."); }
  };

  const onRevise = async () => {
    if (!existingInvoice) return;
    if (!window.confirm(`${t("Create a new revision of")} ${invoiceNumber}? ${t("It opens as a draft; the current invoice stays as is until you issue the revision.")}`)) return;
    setRevising(true);
    try {
      const inv = await reviseInvoice(workspaceId, existingInvoice, items);
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: t("Revision created"), description: inv.invoice_number });
      leaveTo(`/invoices/${inv.id}`);
    } catch (e) {
      setError(e?.message || "Failed to create revision.");
    } finally {
      setRevising(false);
    }
  };

  const sendInvoice = async () => {
    if (!existingInvoice) return;
    if (gstBlocked) { setError(GSTIN_MISSING); return; }
    try {
      await base44.entities.Invoice.update(id, { status: "sent" });
      await supersedeOlder();
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: t("Invoice marked as sent") });
      setStatus("sent");
      load();
    } catch (e) {
      setError(e?.message || "Failed to update status.");
    }
  };

  const onDelete = async () => {
    if (!existingInvoice) return;
    if (!window.confirm(`${t("Delete this invoice?")} ${t("This cannot be undone.")}`)) return;
    try {
      await deleteInvoice(workspaceId, id);
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: t("Invoice deleted") });
      leaveTo("/invoices");
    } catch (e) {
      setError(e?.message || "Failed to delete invoice.");
    }
  };

  // Compact bar that floats at the bottom of the screen until the full button row is reached.
  const canRecordPayment = !isNew && existingInvoice && ["due", "sent", "partial", "overdue"].includes(status);
  const dockItems = [
    !isNew && existingInvoice && { icon: Trash2, label: t("Delete"), onClick: onDelete, tone: "danger" },
    !isNew && existingInvoice && status === "draft" && !newerRev && { icon: Send, label: t("Issue"), onClick: issueInvoice, tone: "success" },
    canRecordPayment && { icon: Wallet, label: t("Record Payment"), onClick: () => setShowPaymentDialog(true), tone: "success" },
  ].filter(Boolean);
  const dockPrimary = {
    icon: Save,
    label: saving ? t("Saving…") : t("Save"),
    onClick: save,
    disabled: saving || readOnly || !canSave,
    active: canSave && !readOnly,
    dirty: !readOnly && hasUnsavedChanges,
  };

  if (loading) return <InvoiceEditorSkeleton />;
  if (notFound) {
    return (
      <div className="p-6 max-w-[800px] mx-auto">
        <EmptyState title={t("Invoice not found")} description={t("This invoice may not exist or belongs to another workspace.")} />
        <div className="mt-4">
          <button onClick={() => navigate("/invoices")} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground sm:hover:text-foreground transition-colors">
            <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </span>
            {t("Back to Invoices")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <SectionCollapseContext.Provider value={{ collapseKey, startCollapsed: !isNew }}>
    <div className="p-4 sm:p-6 space-y-4 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={handleCancel} className="hidden lg:flex text-sm text-muted-foreground sm:hover:text-foreground items-center gap-2">
          <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </span>
          {t("Invoices")}
        </button>
        <div className="flex items-center gap-2">
          {client?.name && <span className="text-sm text-muted-foreground truncate max-w-[10rem] sm:max-w-xs">{client.name}</span>}
          <span className={`text-xs px-2 py-1 rounded font-medium uppercase tracking-wide ${INVOICE_STATUS_META[status]?.className}`}>
            {INVOICE_STATUS_META[status]?.label ? t(INVOICE_STATUS_META[status].label) : status}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{invoiceNumber}</span>
        </div>
      </div>

      {newerRev && (
        <div className="flex items-start gap-2 bg-warning/10 border border-warning/40 rounded-lg p-3 text-sm text-foreground">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
          <span>
            {t("This invoice has been replaced by revision")} <strong>{newerRev.invoice_number}</strong>.{" "}
            <button type="button" onClick={() => navigate(`/invoices/${newerRev.id}`)} className="text-primary underline">{t("Open latest")}</button>
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t(error)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("Invoice ID")}</label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} disabled={readOnly} placeholder={t("Auto-generated if blank")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("Issue Date")}</label>
            <Input type="date" value={invoiceDate} onChange={(e) => onInvoiceDateChange(e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("Due Date Type")}</label>
            <Select value={dueDateType} onChange={(e) => onDueDateTypeChange(e.target.value)} disabled={readOnly} className="w-full">
              <option value="due_on_receipt">{t("Due on Receipt")}</option>
              <option value="net_15">{t("Net 15 Days")}</option>
              <option value="net_30">{t("Net 30 Days")}</option>
              <option value="custom">{t("Custom Date")}</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("Due Date")}</label>
            <Input
              type="date"
              value={dueDate}
              min={invoiceDate || undefined}
              onChange={(e) => { setDueDateType("custom"); setDueDate(e.target.value); }}
              disabled={readOnly}
              className={dueBeforeIssue ? "border-destructive bg-destructive/5" : ""}
            />
            <p className={`text-xs mt-1 ${dueBeforeIssue ? "text-destructive" : "text-muted-foreground"}`}>
              {dueBeforeIssue ? t("Due date can't be before the issue date.") : t("Follows the issue date for Net terms; pick a date yourself to set a custom due date.")}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("Milestone Tag")}</label>
            <Select value={milestoneTag} onChange={(e) => setMilestoneTag(e.target.value)} disabled={readOnly} className="w-full">
              <option value="Full Payment">{t("Full Payment")}</option>
              <option value="Advance">{t("Advance")}</option>
              <option value="Event Day">{t("Event Day")}</option>
              <option value="Final Handover">{t("Final Handover")}</option>
              <option value="Custom">{t("Custom")}</option>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">{customClientMode ? t("Custom Client") : t("Select Client")}</label>
              {!readOnly && !customClientMode && <Button type="button" variant="outline" size="sm" onClick={() => setShowClientForm(true)}><Plus className="w-3.5 h-3.5" /> {t("New")}</Button>}
            </div>
            {customClientMode ? (
              <div className="flex items-center gap-2">
                <Input value={customClientName} onChange={(e) => setCustomClientName(e.target.value)} placeholder={t("Client name")} disabled={readOnly} className="flex-1" />
                <Input value={customClientPhone} onChange={(e) => setCustomClientPhone(e.target.value)} placeholder={t("Phone (optional)")} disabled={readOnly} className="w-32 shrink-0" />
              </div>
            ) : (
              <Select value={clientId} onChange={(e) => onClientChange(e.target.value)} disabled={readOnly} className="w-full">
                <option value="">{t("— Select Client —")}</option>
                {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </Select>
            )}
            {!readOnly && (
              <button type="button" onClick={customClientMode ? disableCustomClient : enableCustomClient} className="text-xs text-muted-foreground sm:hover:text-foreground underline mt-1">
                {customClientMode ? t("Choose an existing client instead") : t("Not a saved client? Enter a custom name")}
              </button>
            )}
            <div className="mt-2">
              <label className="text-xs font-medium text-muted-foreground">{term.workItemSingular}</label>
              <Select value={eventId} onChange={(e) => onEventChange(e.target.value)} disabled={readOnly} className="w-full mt-1">
                <option value="">{t("— Optional —")}</option>
                {availableEvents.map((e) => (<option key={e.id} value={e.id}>{e.title}</option>))}
              </Select>
            </div>
          </div>
          <InvoiceClientCard client={client} />
        </div>
      </div>

      <InvoiceProductsSection items={items} setItems={setItems} readOnly={readOnly} currency={currency} onFillScope={existingInvoice?.quotation_id ? fillScopeFromQuotation : undefined} />

      <InvoiceFinancials
        discountType={discountType} setDiscountType={setDiscountType}
        discountValue={discountValue} setDiscountValue={setDiscountValue}
        finalTotal={finalTotal} setFinalTotal={setFinalTotal}
        gstApplicable={gstApplicable} setGstApplicable={setGstApplicable}
        gstRate={gstRate} setGstRate={setGstRate}
        gstMode={gstMode} setGstMode={setGstMode}
        gstWorkspaceEnabled={gstWorkspaceEnabled} workspaceGstin={workspace?.gstin}
        totals={totals} currency={currency} readOnly={readOnly}
      />

      <Section
        collapsible
        title={t("Payment Terms (client-visible)")}
        action={!readOnly && (
          <button type="button" onClick={loadPaymentTermsFromWorkspace} className="text-xs text-primary sm:hover:underline shrink-0">
            {t("Load from workspace")}
          </button>
        )}
      >
        <RichTextEditor value={paymentTerms} onChange={setPaymentTerms} readOnly={readOnly} placeholder={t("Payment terms shown to client on PDF and public link")} />
        <div className={`text-xs text-right tabular-nums mt-1 ${countWords(paymentTerms) > WORD_LIMIT ? "text-destructive font-medium" : countWords(paymentTerms) >= WORD_LIMIT_WARN_THRESHOLD ? "text-warning" : "text-muted-foreground"}`}>
          {countWords(paymentTerms)} / {WORD_LIMIT} {t("words")}
        </div>
      </Section>

      <Section
        collapsible
        title={t("Terms & Conditions (client-visible)")}
        action={!readOnly && (
          <button type="button" onClick={loadTermsFromWorkspace} className="text-xs text-primary sm:hover:underline shrink-0">
            {t("Load from workspace")}
          </button>
        )}
      >
        <RichTextEditor value={terms} onChange={setTerms} readOnly={readOnly} placeholder={t("Terms & conditions shown to client on PDF and public link")} />
      </Section>

      <Section collapsible title={t("Internal Notes (never shown to client)")}>
        <WordCounterTextarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={readOnly} rows={2} placeholder={t("Internal notes (optional)")} className="bg-card border border-border" />
      </Section>

      <InvoiceSignatureSection
        signatureType={signatureType} setSignatureType={setSignatureType}
        signatureImage={signatureImage} setSignatureImage={setSignatureImage}
        signatureColor={signatureColor} setSignatureColor={setSignatureColor}
        disabled={readOnly}
      />

      <InvoiceBankDetailsSection bankDetails={bankDetails} setBankDetails={setBankDetails} socialLinks={socialLinks} setSocialLinks={setSocialLinks} workspace={workspace} readOnly={readOnly} />

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-semibold text-foreground">{t("Show Itemized Rates")}</label>
            <p className="text-xs text-muted-foreground mt-0.5">{t("When off, PDF and public link show package/scope description only — no qty, rate, or line amounts.")}</p>
          </div>
          <Toggle checked={showItemizedRates} onChange={setShowItemizedRates} disabled={readOnly} />
        </div>
      </div>

      {!isNew && existingInvoice && (
        <InvoicePublicLinkPanel
          invoice={{ ...existingInvoice, ...publicLinkData }}
          onUpdate={(data) => { setPublicLinkData(data); setExistingInvoice({ ...existingInvoice, ...data }); }}
        />
      )}

      <ActionDock onCancel={handleCancel} cancelLabel={t("Cancel")} unsavedLabel={t("Unsaved changes")} items={dockItems} primary={dockPrimary}>
      <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-[15px] p-3">
        <Button variant={canSave ? "primary" : "outline"} onClick={save} disabled={saving || readOnly || !canSave}>
          <Save className="w-4 h-4" /> {saving ? t("Saving…") : isNew ? t("Save Invoice") : t("Save Changes")}
        </Button>
        {!isNew && existingInvoice && status === "draft" && !newerRev && (
          <Button variant="success" onClick={issueInvoice}>
            <Send className="w-4 h-4" /> {t("Issue Invoice")}
          </Button>
        )}
        {!isNew && existingInvoice && !newerRev && canReviseInvoice(existingInvoice) && (
          <Button variant="primary" onClick={onRevise} disabled={revising}>
            <GitBranch className="w-4 h-4" /> {revising ? t("Creating…") : t("Revise")}
          </Button>
        )}
        {!isNew && existingInvoice && (status === "due" || status === "sent" || status === "partial" || status === "overdue") && (
          <Button variant="success" onClick={() => setShowPaymentDialog(true)}><Wallet className="w-4 h-4" /> {t("Record Payment")}</Button>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {!isNew && existingInvoice && status === "draft" && <Button variant="outline" onClick={sendInvoice} disabled={readOnly}>{t("Mark as Sent")}</Button>}
          {!isNew && existingInvoice && (
            <Button variant="outline" onClick={() => setShowPrintView(true)}><Eye className="w-4 h-4" /> {t("View / Print")}</Button>
          )}
          <Button variant="outline" onClick={handleCancel}><X className="w-4 h-4" /> {t("Cancel")}</Button>
          {!isNew && existingInvoice && <Button variant="destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /> {t("Delete")}</Button>}
        </div>
      </div>
      </ActionDock>

      <BackConfirmDialog open={showConfirm} onStay={stayHere} onLeave={confirmBack} />

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
            final_total_override: finalTotal === "" ? null : Number(finalTotal),
            gst_applicable: gstApplicable,
            notes,
            signature_type: signatureType,
            signature_image: signatureImage,
            signature_color: signatureColor,
            client_snapshot: buildClientSnapshot(client),
            event_snapshot: buildEventSnapshot(event)
          }}
          items={items}
          workspace={workspace}
          currency={currency}
        />
      )}
    </div>
    </SectionCollapseContext.Provider>
  );
}
