import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Loader2, Lock, ArrowLeft, CheckCircle2, AlertCircle, FileText, ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/format";
import { Image } from "@/components/ui/image";

async function fetchPortalData(token) {
  try {
    const res = await base44.functions.invoke("getPortalData", { token });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data };
  } catch (err) {
    const status = err?.response?.status || 0;
    const data = err?.response?.data || {};
    return { ok: false, status, data };
  }
}

async function acceptQuotation(token) {
  try {
    const res = await base44.functions.invoke("acceptQuotationPublic", { token });
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
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const res = await fetchPortalData(token);
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

  const handleAccept = async () => {
    setAccepting(true);
    setAcceptError(null);
    const res = await acceptQuotation(token);
    if (res.ok) {
      navigate(`/portal/${token}`);
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
            This project link is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  const { quotation, items, workspace, event, client, is_expired } = data;
  const isAccepted = quotation.status === "Accepted";
  const isDraft = quotation.status === "Draft";

  // Group items by day/phase
  const itemsByDay = {};
  const ungroupedItems = [];
  (items || []).forEach((item) => {
    if (item.day_date) {
      const key = `${item.day_date}|||${item.phase_title || ""}`;
      if (!itemsByDay[key]) itemsByDay[key] = [];
      itemsByDay[key].push(item);
    } else {
      ungroupedItems.push(item);
    }
  });
  const dayKeys = Object.keys(itemsByDay).sort();

  return (
    <div className="min-h-[100dvh] bg-muted/20">
      {workspace && (
        <div className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
            {workspace.logo && (
              <Image src={workspace.logo} alt="" className="h-8 w-8 rounded-lg object-cover" fittingType="fill" />
            )}
            <span className="text-sm font-semibold text-foreground">{workspace.name}</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
        {/* Back to portal */}
        <button
          onClick={() => navigate(`/portal/${token}`)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Project Portal
        </button>

        {/* Status banner */}
        {isAccepted && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Quotation Accepted &amp; Signed</p>
              <p className="text-sm text-emerald-700">This quotation has been accepted and is now locked.</p>
            </div>
          </div>
        )}

        {is_expired && !isAccepted && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
            <AlertCircle className="h-6 w-6 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold text-red-900">Quotation Expired</p>
              <p className="text-sm text-red-600">
                This quotation was valid until {formatDate(quotation.valid_until)}. Please contact us for a new quotation.
              </p>
            </div>
          </div>
        )}

        {/* Quotation header */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">{quotation.quotation_number}</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prepared For</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{client?.name || "—"}</p>
              {client?.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
              {client?.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{event?.title || "—"}</p>
              {event?.start_date && <p className="text-xs text-muted-foreground">{formatDate(event.start_date)}</p>}
              {event?.venue && <p className="text-xs text-muted-foreground">{event.venue}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quotation Date</p>
              <p className="mt-1 text-sm text-foreground">{formatDate(quotation.quotation_date)}</p>
            </div>
            {quotation.valid_until && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valid Until</p>
                <p className="mt-1 text-sm text-foreground">{formatDate(quotation.valid_until)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Scope of Work</h3>
          <div className="mt-4 space-y-4">
            {dayKeys.map((key) => {
              const [date, phaseTitle] = key.split("|||");
              const dayItems = itemsByDay[key];
              return (
                <div key={key}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {formatDate(date)}
                    </span>
                    {phaseTitle && <span className="text-sm font-semibold text-foreground">{phaseTitle}</span>}
                  </div>
                  <div className="divide-y divide-border/50">
                    {dayItems.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between py-2.5">
                        <div className="min-w-0 pr-3">
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          {item.member_side && (
                            <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {item.member_side}
                            </span>
                          )}
                        </div>
                        {quotation.show_item_pricing && (
                          <p className="shrink-0 text-sm font-semibold text-foreground">{formatCurrency(item.line_total)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {ungroupedItems.length > 0 && (
              <div>
                {dayKeys.length > 0 && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Other Items</p>
                )}
                <div className="divide-y divide-border/50">
                  {ungroupedItems.map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between py-2.5">
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                      {quotation.show_item_pricing && (
                        <p className="shrink-0 text-sm font-semibold text-foreground">{formatCurrency(item.line_total)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {quotation.show_item_pricing && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatCurrency(quotation.subtotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-base font-semibold text-foreground">Grand Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(quotation.grand_total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Terms */}
        {quotation.terms_and_conditions && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Terms &amp; Conditions</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{quotation.terms_and_conditions}</p>
          </div>
        )}

        {/* Special Notes */}
        {quotation.special_notes && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Special Notes</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{quotation.special_notes}</p>
          </div>
        )}

        {/* Accept section — only for Finalized, non-expired quotations */}
        {!isAccepted && !is_expired && !isDraft && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Review &amp; Accept</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  By accepting, you agree to the quotation, terms, and scope of work outlined above.
                </p>
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-lg bg-muted/40 p-4">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">
                I have reviewed the quotation and agree to the terms &amp; conditions.
              </span>
            </label>
            {acceptError && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{acceptError}</p>
            )}
            <button
              onClick={handleAccept}
              disabled={!agreed || accepting}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {accepting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Accepting...
                </span>
              ) : (
                "Accept & Sign Quotation"
              )}
            </button>
          </div>
        )}

        {/* Draft state — can't be accepted yet */}
        {isDraft && !is_expired && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
            <p className="text-sm text-amber-700">
              This quotation is being prepared and is not yet ready for acceptance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}