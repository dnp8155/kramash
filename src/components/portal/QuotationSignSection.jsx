import { useState } from "react";
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle, PenTool, Type } from "lucide-react";
import { formatDate } from "@/utils/format";
import SignaturePad from "./SignaturePad";

export default function QuotationSignSection({
  quotation,
  isExpired,
  onAccept,
  accepting,
  acceptError,
}) {
  const isAccepted = quotation.status === "Accepted";
  const isDraft = quotation.status === "Draft";
  const [agreed, setAgreed] = useState(false);
  const [signMode, setSignMode] = useState("draw");
  const [drawnSignature, setDrawnSignature] = useState("");
  const [legalName, setLegalName] = useState("");

  // In typed mode, the typed name IS the signature; in draw mode, need both
  const hasSignature = signMode === "draw" ? !!drawnSignature : legalName.trim().length >= 2;
  const hasName = legalName.trim().length >= 2;
  const canSign = agreed && hasSignature && hasName && !accepting;

  const handleAccept = () => {
    if (!canSign) return;
    const name = legalName.trim();
    const signatureData = signMode === "draw" ? drawnSignature : name;
    onAccept({
      signed_by_name: name,
      signature_data: signatureData,
      signature_type: signMode,
    });
  };

  // Already accepted — show locked state
  if (isAccepted) {
    const signedDate = quotation.signed_at ? new Date(quotation.signed_at) : null;
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-900">Accepted & Signed</p>
            <p className="mt-0.5 text-sm text-emerald-700">
              {signedDate ? `Signed on ${formatDate(quotation.signed_at)}` : "This quotation has been accepted."}
            </p>
            {quotation.signed_by_name && (
              <p className="mt-1 text-sm text-emerald-700">Signed by: <span className="font-medium">{quotation.signed_by_name}</span></p>
            )}
          </div>
        </div>
        {quotation.signature_data && quotation.signature_type === "drawn" && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3">
            <img src={quotation.signature_data} alt="Signature" className="h-20 object-contain" />
          </div>
        )}
        {quotation.signature_data && quotation.signature_type === "typed" && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3">
            <p className="text-lg italic text-foreground" style={{ fontFamily: "cursive" }}>{quotation.signature_data}</p>
          </div>
        )}
      </div>
    );
  }

  // Expired — can't sign
  if (isExpired) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center sm:p-6">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-2 font-semibold text-red-900">Quotation Expired</p>
        <p className="mt-1 text-sm text-red-600">
          This quotation was valid until {formatDate(quotation.valid_until)}. Please contact us for a new quotation.
        </p>
      </div>
    );
  }

  // Draft — not ready
  if (isDraft) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center sm:p-6">
        <p className="text-sm text-amber-700">This quotation is being prepared and is not yet ready for acceptance.</p>
      </div>
    );
  }

  // Finalized — show sign form
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 print:hidden">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-foreground">Review & Sign</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Review the quotation above, then sign below to accept the scope of work and terms.
          </p>
        </div>
      </div>

      {/* Consent checkbox */}
      <label className="mt-4 flex items-start gap-3 rounded-lg bg-muted/40 p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
        />
        <span className="text-sm text-muted-foreground">
          I have read and agree to the scope of work, milestone schedule, terms and conditions.
        </span>
      </label>

      {/* Signature mode toggle */}
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-foreground">Signature</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSignMode("draw")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              signMode === "draw" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <PenTool className="h-3.5 w-3.5" /> Draw Signature
          </button>
          <button
            type="button"
            onClick={() => setSignMode("typed")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              signMode === "typed" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Type className="h-3.5 w-3.5" /> Type Legal Name
          </button>
        </div>

        {/* Signature input */}
        <div className="mt-3">
          {signMode === "draw" ? (
            <>
              <SignaturePad onChange={setDrawnSignature} />
              <div className="mt-3">
                <label className="text-sm font-medium text-foreground">Legal Name <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="text-sm font-medium text-foreground">Type your full legal name <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Enter your full legal name"
                className="mt-1.5 h-12 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                style={{ fontFamily: "cursive", fontSize: "18px" }}
              />
              <p className="mt-1 text-xs text-muted-foreground">Your typed name serves as your electronic signature.</p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {acceptError && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{acceptError}</p>
      )}

      {/* Accept button */}
      <button
        onClick={handleAccept}
        disabled={!canSign}
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
  );
}