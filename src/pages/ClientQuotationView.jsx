import { useState, useEffect, useRef } from "react";
import { richHtmlToText } from "@/lib/richText";
import { foldAdjustmentIntoSubtotal, impliedAdjustment } from "@/lib/quotationCalc";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, FileText } from "lucide-react";
import PortalPageSkeleton from "@/components/common/PortalPageSkeleton";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney, setNumberFormat } from "@/utils/format";
import { setDateFormat } from "@/lib/dates";
import { generateClientQuotationPdf } from "@/lib/quotationClientView";
import QuotationActionBar from "@/components/quotation/public/QuotationActionBar";
import QuotationHeaderBlock from "@/components/quotation/public/QuotationHeaderBlock";
import PortalMilestoneCard from "@/components/portal/PortalMilestoneCard";
import QuotationItemsTable from "@/components/quotation/public/QuotationItemsTable";
import QuotationMilestones from "@/components/quotation/public/QuotationMilestones";
import QuotationBankDetails from "@/components/quotation/public/QuotationBankDetails";
import QuotationSocialLinks from "@/components/quotation/public/QuotationSocialLinks";
import QuotationTerms from "@/components/quotation/public/QuotationTerms";
import QuotationSignSection from "@/components/quotation/public/QuotationSignSection";
import useSEO from "@/hooks/useSEO";
import { getPortalSession } from "@/lib/portalSession";
import LinkPasswordGate from "@/components/portal/LinkPasswordGate";
import { rememberLinkPassword, recallLinkPassword } from "@/lib/portalShare";

function money(n, currency) {
  return formatMoney(n, currency);
}

function parseSnapshot(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

// Convert typed name into a signature image (data URL) via canvas
function typedNameToDataUrl(name) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "italic 42px 'Brush Script MT', cursive, serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
  } catch (e) {
    return null;
  }
}

export default function ClientQuotationView() {
  const { token } = useParams();
  const { toast } = useToast();
  const signRef = useRef(null);
  const isPreview = new URLSearchParams(window.location.search).has("preview");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  const load = async (creds) => {
    const isAuthAttempt = !!creds;
    if (!isAuthAttempt) setLoading(true);
    else setAuthenticating(true);
    setError("");
    setAuthError("");
    try {
      const payload = { public_token: token };
      const pw = creds?.password || recallLinkPassword(token);
      if (pw) payload.password = pw;
      if (isPreview) payload.skip_tracking = true;
      // Opened from the client portal: the signed-in portal session skips the password prompt.
      const portal = getPortalSession();
      if (portal) { payload.portal_session_token = portal.token; payload.portal_client_id = portal.client_id; }
      const res = await base44.functions.invoke("clientViewQuotation", payload);
      const d = res?.data || res;
      if (d.requires_auth) {
        setAuthRequired(true);
        setData(null);
      } else {
        setAuthRequired(false);
        if (pw) { rememberLinkPassword(token, pw); setAuthPassword(pw); }
        setData(d);
        if (d.quotation.status === "accepted" && d.quotation.client_signature) {
          setSigned(true);
        }
      }
    } catch (e) {
      if (isAuthAttempt) {
        setAuthError(e?.message || "Incorrect password. Please try again.");
      } else {
        setError(e?.message || "Failed to load quotation");
      }
    } finally {
      if (!isAuthAttempt) setLoading(false);
      else setAuthenticating(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  useEffect(() => {
    const business = parseSnapshot(data?.quotation?.business_snapshot);
    setDateFormat(business?.date_format);
    setNumberFormat(business?.number_format);
  }, [data]);

  const seoBusiness = parseSnapshot(data?.quotation?.business_snapshot);
  const seoTitle = seoBusiness?.name
    ? `Quotation from ${seoBusiness.name}`
    : "Your Quotation";
  useSEO({ noIndex: true, path: `/q/${token || ""}`, title: seoTitle });

  const handleSign = async ({ signature, signed_by_name, consent, typedName }) => {
    // If typed mode, convert typed name to signature image
    let sigData = signature;
    if (!sigData && typedName) {
      sigData = typedNameToDataUrl(typedName);
      if (!sigData) {
        toast({ title: "Could not create signature", description: "Please try drawing instead.", variant: "destructive" });
        return;
      }
    }
    if (!sigData) {
      toast({ title: "Signature required", description: "Please draw or type your signature.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const signPayload = {
        public_token: token,
        signature: sigData,
        signed_by_name,
        consent
      };
      if (authPassword) signPayload.password = authPassword;
      const portalSession = getPortalSession();
      if (portalSession) { signPayload.portal_session_token = portalSession.token; signPayload.portal_client_id = portalSession.client_id; }
      const res = await base44.functions.invoke("signQuotation", signPayload);
      const sd = res?.data || res;
      setSigned(true);
      setData((d) => ({ ...d, quotation: { ...d.quotation, ...sd.quotation } }));
      toast({ title: "Quotation accepted", description: "Your signature has been recorded." });
    } catch (e) {
      toast({ title: "Could not sign", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await generateClientQuotationPdf(data);
    } catch (e) {
      toast({ title: "PDF failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add("printing-quotation");
    window.print();
    window.onafterprint = () => {
      document.body.classList.remove("printing-quotation");
      window.onafterprint = null;
    };
  };

  const jumpToSign = () => {
    signRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // ---- Loading ----
  if (loading && !authRequired) {
    return <PortalPageSkeleton variant="document" />;
  }

  // ---- Auth gate ----
  if (authRequired && !data) {
    return <LinkPasswordGate title="Password required to view quotation" error={authError} busy={authenticating} onSubmit={(password) => load({ password })} />;
  }
  // ---- Error ----
  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-foreground">Quotation unavailable</h1>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { quotation: q, items } = data;
  const client = parseSnapshot(q.client_snapshot);
  const business = parseSnapshot(q.business_snapshot);
  const event = parseSnapshot(q.event_snapshot);
  const templateConfig = parseSnapshot(q.template_config) || {};
  const paymentMethod = templateConfig.payment?.method || "";
  const paymentInstructions = richHtmlToText(templateConfig.payment?.instructions || "");
  const currency = q.currency || "INR";
  const expired = q.expired || (q.valid_until && new Date(q.valid_until + "T23:59:59.999") < new Date());

  return (
    <div className="min-h-dvh bg-muted/30">
      {/* Action bar */}
      <QuotationActionBar
        validUntil={q.valid_until}
        onDownloadPdf={handleDownloadPdf}
        onPrint={handlePrint}
        onJumpToSign={jumpToSign}
        downloading={downloading}
        signed={signed}
        expired={expired}
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 print-area">
        {/* Header */}
        <QuotationHeaderBlock quotation={q} client={client} business={business} event={event} items={items} />

        {/* Items */}
        <QuotationItemsTable items={items} showPricing={q.show_pricing} currency={currency} hideTeamNames={q.hide_team_names} business={business} />

        {/* Totals */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <Totals q={q} currency={currency} />
        </div>

        {/* Milestones */}
        {q.status === "accepted" && data.payment_status?.milestones?.length > 0 ? (
          <PortalMilestoneCard milestones={data.payment_status.milestones} totalReceived={data.payment_status.total_received} grandTotal={q.grand_total} currency={currency} />
        ) : (
          <QuotationMilestones milestones={q.milestones} grandTotal={q.grand_total} currency={currency} />
        )}

        {/* Payment method */}
        {(paymentMethod || paymentInstructions) && !(q.visibility?.bank?.link !== false && q.bank_details && Object.values(q.bank_details).some(Boolean)) && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground mb-2">Payment Method</h2>
            {paymentMethod && <p className="text-sm text-foreground">{paymentMethod}</p>}
            {paymentInstructions && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{paymentInstructions}</p>}
          </div>
        )}

        {/* Bank details */}
        {q.visibility?.bank?.link !== false && <QuotationBankDetails bankDetails={q.bank_details} currency={currency} />}

        {/* Social links */}
        {q.visibility?.social?.link !== false && <QuotationSocialLinks socialLinks={q.social_links} />}

        {/* Terms */}
        <QuotationTerms
          terms={q.terms_and_conditions}
          specialNotes={q.special_notes}
          paymentConditions={q.payment_conditions}
          showTerms={q.visibility?.terms?.link !== false}
          showSpecialNotes={q.visibility?.special_notes?.link !== false}
          showPaymentConditions={q.visibility?.payment_conditions?.link !== false}
        />

        {/* Footer message */}
        {q.footer_message && q.visibility?.footer?.link !== false && (
          <div className="text-center text-sm text-muted-foreground py-2">{q.footer_message}</div>
        )}

        {/* Signature section */}
        <div ref={signRef}>
          <QuotationSignSection
            signed={signed}
            expired={expired}
            quotation={q}
            onSign={handleSign}
            submitting={submitting}
            authPassword={authPassword}
          />
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2 no-print">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure online quotation powered by Kramasha
        </div>
      </div>
    </div>
  );
}

function Totals({ q: rawQ, currency }) {
  const folded = foldAdjustmentIntoSubtotal({ subtotal: rawQ.subtotal, adjustmentAmount: impliedAdjustment(rawQ), discountType: rawQ.discount_type });
  const q = { ...rawQ, subtotal: folded.subtotal, adjustment_amount: 0, discount_type: folded.discountType };
  return (
    <div className="space-y-1.5 max-w-xs ml-auto text-sm">
      <Row label="Subtotal" value={money(q.subtotal, currency)} />
      {q.discount_amount > 0 && (
        <Row label={`Discount (${q.discount_type === "percent" ? q.discount_value + "%" : "Fixed"})`} value={`– ${money(q.discount_amount, currency)}`} muted />
      )}
      {q.gst_applicable && q.gst_total > 0 && (
        <>
          {q.gst_mode === "igst" ? (
            <Row label="IGST" value={money(q.igst_amount, currency)} muted />
          ) : (
            <>
              <Row label="CGST" value={money(q.cgst_amount, currency)} muted />
              <Row label="SGST" value={money(q.sgst_amount, currency)} muted />
            </>
          )}
        </>
      )}
      <div className="flex justify-between pt-2 mt-1 border-t border-border">
        <span className="font-semibold text-foreground">Grand Total</span>
        <span className="font-bold text-foreground">{money(q.grand_total, currency)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span className={muted ? "text-muted-foreground" : "font-medium text-foreground"}>{value}</span>
    </div>
  );
}