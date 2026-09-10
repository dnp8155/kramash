import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Lock, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { generateQuotationPDF } from "@/utils/quotationPdf";
import QuotationActionBar from "@/components/portal/QuotationActionBar";
import QuotationHeaderBlock from "@/components/portal/QuotationHeaderBlock";
import QuotationScopeSection from "@/components/portal/QuotationScopeSection";
import QuotationMilestoneSection from "@/components/portal/QuotationMilestoneSection";
import QuotationBankSection from "@/components/portal/QuotationBankSection";
import QuotationSocialSection from "@/components/portal/QuotationSocialSection";
import QuotationTermsSection from "@/components/portal/QuotationTermsSection";
import QuotationSignSection from "@/components/portal/QuotationSignSection";

async function fetchPortalData(token, preview = false) {
  try {
    const res = await base44.functions.invoke("getPortalData", { token, preview });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data };
  } catch (err) {
    const status = err?.response?.status || 0;
    const data = err?.response?.data || {};
    return { ok: false, status, data };
  }
}

async function acceptQuotation(token, signature) {
  try {
    const res = await base44.functions.invoke("acceptQuotationPublic", {
      token,
      signed_by_name: signature.signed_by_name,
      signature_data: signature.signature_data,
      signature_type: signature.signature_type,
    });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data };
  } catch (err) {
    const status = err?.response?.status || 0;
    const data = err?.response?.data || {};
    return { ok: false, status, data };
  }
}

export default function ClientPortalSign() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const signRef = useRef(null);
  const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const res = await fetchPortalData(token, isPreview);
      if (res.ok) {
        setData(res.data);
      } else if (res.status === 403) {
        setDisabled(true);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleDownloadPDF = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await generateQuotationPDF({
        quotation: data.quotation,
        items: data.items,
        workspace: data.workspace,
        client: data.client,
        event: data.event,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAccept = async (signature) => {
    setAccepting(true);
    setAcceptError(null);
    const res = await acceptQuotation(token, signature);
    if (res.ok) {
      // Refresh data to show the accepted/locked state
      const refreshRes = await fetchPortalData(token, isPreview);
      if (refreshRes.ok) setData(refreshRes.data);
    } else {
      setAcceptError(res.data?.error || res.data?.message || "Failed to accept quotation. Please try again or contact your service provider.");
    }
    setAccepting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (disabled || notFound) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20 p-4">
        <div className="max-w-md text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold text-foreground">
            This quotation link is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  const { quotation, items, workspace, event, client, is_expired } = data;
  const isAccepted = quotation.status === "Accepted";
  const showPricing = !quotation.is_package && quotation.show_item_pricing !== false;

  return (
    <div className="min-h-[100dvh] bg-muted/20 pb-safe-bottom">
      <QuotationActionBar
        quotation={quotation}
        onDownload={handleDownloadPDF}
        onPrint={handlePrint}
        signRef={signRef}
      />

      {downloading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-card px-6 py-4 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">Generating PDF…</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:py-8">
        {/* Back to portal */}
        <button
          onClick={() => navigate(`/portal/${token}`)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground print:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Project Portal
        </button>

        {/* Quotation header */}
        <QuotationHeaderBlock quotation={quotation} workspace={workspace} client={client} event={event} />

        {/* Scope & items */}
        <QuotationScopeSection quotation={quotation} items={items} />

        {/* Summary */}
        {showPricing ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatCurrency(quotation.subtotal)}</span>
              </div>
              {quotation.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount{quotation.discount_type === "percentage" ? ` (${quotation.discount_value}%)` : ""}
                  </span>
                  <span className="font-medium text-destructive">−{formatCurrency(quotation.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span className="font-medium text-foreground">{formatCurrency(quotation.taxable_amount)}</span>
              </div>
              {quotation.gst_applicable && (
                <>
                  {quotation.gst_mode === "igst" ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IGST</span>
                      <span className="font-medium text-foreground">{formatCurrency(quotation.igst_amount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">CGST</span>
                        <span className="font-medium text-foreground">{formatCurrency(quotation.cgst_amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SGST</span>
                        <span className="font-medium text-foreground">{formatCurrency(quotation.sgst_amount)}</span>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-base font-semibold text-foreground">Grand Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(quotation.grand_total)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center sm:p-6">
            <p className="text-sm text-muted-foreground">
              {quotation.is_package ? "Package Total" : "Total Amount Payable"}
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">{formatCurrency(quotation.grand_total)}</p>
            {quotation.gst_applicable && (
              <p className="mt-1 text-xs text-muted-foreground">
                (Includes {quotation.gst_mode === "igst" ? "IGST" : "CGST + SGST"}: {formatCurrency(quotation.gst_total)})
              </p>
            )}
          </div>
        )}

        {/* Milestone breakdown */}
        <QuotationMilestoneSection quotation={quotation} />

        {/* Bank / UPI */}
        <QuotationBankSection workspace={workspace} />

        {/* Social links */}
        <QuotationSocialSection workspace={workspace} />

        {/* Terms */}
        <QuotationTermsSection quotation={quotation} />

        {/* Sign section */}
        <div ref={signRef} className="scroll-mt-20">
          <QuotationSignSection
            quotation={quotation}
            isExpired={is_expired}
            onAccept={handleAccept}
            accepting={accepting}
            acceptError={acceptError}
          />
        </div>

        {/* Footer */}
        {workspace && (
          <div className="pb-8 pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              This is an electronic quotation generated by {workspace.name}.
              {isAccepted && " The quotation is now locked and cannot be modified."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}