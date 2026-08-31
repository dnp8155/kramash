import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle2, ShieldCheck, FileText, Calendar, MapPin, PenLine, Loader2, Lock
} from "lucide-react";
import SignaturePad from "@/components/common/SignaturePad";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";

function money(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return `${sym}${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function parseSnapshot(json) {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

function dateShort(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function ClientQuotationView() {
  const { id } = useParams();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
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
      const payload = { quotation_id: id };
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
          setSignerName(res.data.quotation.signed_by_name || "");
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

  useEffect(() => { load(); }, [id]);

  const submit = async () => {
    if (!signature) {
      toast({ title: "Signature required", description: "Please draw your signature above.", variant: "destructive" });
      return;
    }
    if (!signerName.trim()) {
      toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const signPayload = {
        quotation_id: id,
        signature,
        signed_by_name: signerName.trim()
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

  if (loading && !authRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading quotation…
        </div>
      </div>
    );
  }

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

  const { quotation: q, items } = data;
  const client = parseSnapshot(q.client_snapshot);
  const business = parseSnapshot(q.business_snapshot);
  const event = parseSnapshot(q.event_snapshot);
  const currency = q.currency || "INR";
  const expired = q.valid_until && new Date(q.valid_until + "T00:00:00") < new Date();

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Top banner */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Quotation {q.quotation_number}</h1>
              <p className="text-xs text-muted-foreground">{dateShort(q.quotation_date)}</p>
            </div>
          </div>
          <StatusBadge status={q.status} expired={expired} />
        </div>

        {/* Business + client */}
        <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">From</div>
            <div className="font-semibold text-foreground">{business?.name || "—"}</div>
            {business?.address && <div className="text-sm text-muted-foreground mt-0.5">{business.address}</div>}
            <div className="text-sm text-muted-foreground">
              {[business?.city, business?.state, business?.country].filter(Boolean).join(", ")}
            </div>
            {business?.phone && <div className="text-sm text-muted-foreground mt-0.5">{business.phone}</div>}
            {business?.email && <div className="text-sm text-muted-foreground">{business.email}</div>}
            {business?.gstin && <div className="text-xs text-muted-foreground mt-1">GSTIN: {business.gstin}</div>}
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Billed To</div>
            <div className="font-semibold text-foreground">{client?.name || "—"}</div>
            {client?.phone && <div className="text-sm text-muted-foreground mt-0.5">{client.phone}</div>}
            {client?.email && <div className="text-sm text-muted-foreground">{client.email}</div>}
            {client?.address && <div className="text-sm text-muted-foreground mt-0.5">{client.address}</div>}
            <div className="text-sm text-muted-foreground">
              {[client?.city, client?.state].filter(Boolean).join(", ")}
            </div>
          </div>
        </div>

        {/* Event details */}
        {event && (event.title || event.venue) && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Event Details</div>
            <div className="font-semibold text-foreground">{event.title || "—"}</div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-1">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {event.start_date ? dateShort(event.start_date) : "—"}
                {event.end_date ? ` – ${dateShort(event.end_date)}` : ""}
              </span>
              {event.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {event.venue}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-3 py-2.5 font-medium text-right">Qty</th>
                  <th className="px-3 py-2.5 font-medium text-right">Rate</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{it.name}</div>
                      {it.description && <div className="text-xs text-muted-foreground mt-0.5">{it.description}</div>}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">
                      {it.quantity}{it.rate_type === "Per Day" && it.days ? ` × ${it.days}d` : ""}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">{money(it.unit_rate, currency)}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">{money(it.line_total, currency)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No items</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-card border border-border rounded-xl p-5">
          <Totals q={q} currency={currency} />
        </div>

        {/* Terms & notes */}
        {(q.terms_and_conditions || q.notes) && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            {q.terms_and_conditions && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Terms & Conditions</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{q.terms_and_conditions}</p>
              </div>
            )}
            {q.notes && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Signature section */}
        <div className="bg-card border border-border rounded-xl p-5">
          {signed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <div className="font-semibold text-foreground">Quotation Accepted</div>
                  <div className="text-xs text-muted-foreground">
                    Signed by {q.signed_by_name} on {q.signed_at ? dateShort(q.signed_at) : "—"}
                  </div>
                </div>
              </div>
              {q.client_signature && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Client Signature</div>
                  <img src={q.client_signature} alt="Client signature" className="border border-border rounded-lg bg-white max-h-32" />
                </div>
              )}
            </div>
          ) : expired ? (
            <div className="text-center py-4">
              <p className="text-sm text-destructive font-medium">This quotation has expired and can no longer be signed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Accept & Sign Online</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Review the quotation above, then sign below to accept. Your signature will be recorded and the quotation marked as accepted.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Your Full Name</label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Signature</label>
                <SignaturePad onChange={setSignature} disabled={submitting} />
              </div>
              <Button onClick={submit} disabled={submitting} className="w-full">
                {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Signing…</>) : (<><PenLine className="w-4 h-4" /> Accept & Sign</>)}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure online quotation powered by KRAMAS
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, expired }) {
  const map = {
    finalized: { label: "Awaiting your acceptance", cls: "bg-amber-100 text-amber-700" },
    accepted: { label: "Accepted", cls: "bg-success/10 text-success" },
  };
  const s = expired && status === "finalized"
    ? { label: "Expired", cls: "bg-destructive/10 text-destructive" }
    : (map[status] || { label: status, cls: "bg-muted text-muted-foreground" });
  return <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function Totals({ q, currency }) {
  return (
    <div className="space-y-1.5 max-w-xs ml-auto text-sm">
      <Row label="Subtotal" value={money(q.subtotal, currency)} />
      {q.discount_amount > 0 && <Row label="Discount" value={`– ${money(q.discount_amount, currency)}`} muted />}
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