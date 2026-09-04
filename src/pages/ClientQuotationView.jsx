import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, FileText, Loader2, Lock } from "lucide-react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { generateQuotationPdf } from "@/lib/quotationPdf";
import QuotationActionBar from "@/components/quotation/public/QuotationActionBar";
import QuotationHeaderBlock from "@/components/quotation/public/QuotationHeaderBlock";
import QuotationItemsTable from "@/components/quotation/public/QuotationItemsTable";
import QuotationMilestones from "@/components/quotation/public/QuotationMilestones";
import QuotationBankDetails from "@/components/quotation/public/QuotationBankDetails";
import QuotationSocialLinks from "@/components/quotation/public/QuotationSocialLinks";
import QuotationTerms from "@/components/quotation/public/QuotationTerms";
import QuotationSignSection from "@/components/quotation/public/QuotationSignSection";

function money(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return `${sym}${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
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

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
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
      if (creds?.email) payload.email = creds.email;
      if (creds?.password) payload.password = creds.password;
      const res = await base44.functions.invoke("clientViewQuotation", payload);
      if (res.data.requires_auth) {
        setAuthRequired(true);
        setData(null);
      } else {
        setAuthRequired(false);
        setData(res.data);
        if (res.data.quotation.status === "accepted" && res.data.quotation.client_signature) {
          setSigned(true);
        }
      }
    } catch (e) {
      if (isAuthAttempt) {
        setAuthError(e?.message || "Incorrect email or password");
      } else {
        setError(e?.message || "Failed to load quotation");
      }
    } finally {
      if (!isAuthAttempt) setLoading(false);
      else setAuthenticating(false);
    }
  };

  const handleLogin = () => load({ email: authEmail, password: authPassword });

  useEffect(() => { load(); }, [token]);

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
      if (authEmail) signPayload.email = authEmail;
      if (authPassword) signPayload.password = authPassword;
      const res = await base44.functions.invoke("signQuotation", signPayload);
      setSigned(true);
      setData((d) => ({ ...d, quotation: { ...d.quotation, ...res.data.quotation } }));
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
      await generateQuotationPdf({
        quotation: data.quotation,
        items: data.items,
        currency: data.quotation.currency
      });
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading quotation…
        </div>
      </div>
    );
  }

  // ---- Auth gate ----
  if (authRequired && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Login to view quotation</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-5">Enter your email and password to access this quotation.</p>
          {authError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2.5 text-sm text-destructive mb-3">{authError}</div>
          )}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email</label>
              <Input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="your@email.com" disabled={authenticating} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Password</label>
              <Input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" disabled={authenticating} onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} />
            </div>
            <Button onClick={handleLogin} disabled={authenticating} className="w-full">
              {authenticating ? (<><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>) : "Login"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
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
  const currency = q.currency || "INR";
  const expired = q.expired || (q.valid_until && new Date(q.valid_until + "T00:00:00") < new Date());

  return (
    <div className="min-h-screen bg-muted/30">
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
        <QuotationHeaderBlock quotation={q} client={client} business={business} event={event} />

        {/* Items */}
        <QuotationItemsTable items={items} showPricing={q.show_pricing} currency={currency} />

        {/* Totals */}
        <div className="bg-card border border-border rounded-xl p-5">
          <Totals q={q} currency={currency} />
        </div>

        {/* Milestones */}
        <QuotationMilestones milestones={q.milestones} grandTotal={q.grand_total} currency={currency} />

        {/* Bank details */}
        <QuotationBankDetails bankDetails={q.bank_details} />

        {/* Social links */}
        <QuotationSocialLinks socialLinks={q.social_links} />

        {/* Terms */}
        <QuotationTerms terms={q.terms_and_conditions} specialNotes={q.special_notes} />

        {/* Footer message */}
        {q.footer_message && (
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
            authEmail={authEmail}
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

function Totals({ q, currency }) {
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