import { useState } from "react";
import { CheckCircle2, PenLine, Loader2, Lock, AlertTriangle, Keyboard, PenTool } from "lucide-react";
import SignaturePad from "@/components/common/SignaturePad";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";

function dateShort(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function timeShort(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

export default function QuotationSignSection({ signed, expired, quotation, onSign, submitting, authEmail, authPassword }) {
  const [signature, setSignature] = useState("");
  const [signerName, setSignerName] = useState("");
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState("draw"); // "draw" | "type"
  const [typedSignature, setTypedSignature] = useState("");

  const canSubmit = consent && signerName.trim().length > 1 && (mode === "draw" ? !!signature : typedSignature.trim().length > 1);

  const handleSubmit = () => {
    const sigData = mode === "draw" ? signature : null;
    onSign({ signature: sigData, signed_by_name: signerName.trim(), consent, typedName: mode === "type" ? typedSignature.trim() : null });
  };

  // --- Already signed ---
  if (signed) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <div>
            <div className="font-semibold text-foreground">Accepted & Signed</div>
            <div className="text-xs text-muted-foreground">
              Signed by {quotation.signed_by_name} on {dateShort(quotation.signed_at)} at {timeShort(quotation.signed_at)}
            </div>
          </div>
        </div>
        {quotation.client_signature && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Client Signature</div>
            <img src={quotation.client_signature} alt="Client signature" className="border border-border rounded-lg bg-white max-h-32" />
          </div>
        )}
      </div>
    );
  }

  // --- Expired ---
  if (expired) {
    return (
      <div className="bg-card border border-destructive/30 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <div className="font-semibold text-foreground">Quotation Expired</div>
            <div className="text-xs text-muted-foreground">
              This quotation expired on {dateShort(quotation.valid_until)} and can no longer be signed.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Ready to sign ---
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <PenLine className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Accept & Sign Online</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Review the quotation above, then sign below to accept. Your signature will be recorded and the quotation marked as accepted.
      </p>

      {/* Consent checkbox */}
      <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-ring/40 shrink-0"
        />
        <span className="text-sm text-foreground leading-relaxed">
          I have read and agree to the scope of work, milestone schedule, terms and conditions.
        </span>
      </label>

      {/* Signer name */}
      <div className="space-y-1.5 mb-4">
        <label className="text-xs font-medium text-foreground">Your Full Legal Name</label>
        <Input
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Enter your full name"
          disabled={submitting}
        />
      </div>

      {/* Signature mode toggle */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground">Signature</label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMode("draw")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${mode === "draw" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}
            >
              <PenTool className="w-3 h-3" /> Draw
            </button>
            <button
              type="button"
              onClick={() => setMode("type")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${mode === "type" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}
            >
              <Keyboard className="w-3 h-3" /> Type
            </button>
          </div>
        </div>
        {mode === "draw" ? (
          <SignaturePad onChange={setSignature} disabled={submitting} />
        ) : (
          <div>
            <Input
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Type your full name as signature"
              disabled={submitting}
              className="text-lg italic font-serif"
              style={{ fontFamily: "'Brush Script MT', cursive" }}
            />
            <p className="text-xs text-muted-foreground mt-1">By typing your name above, you confirm this is your legal signature.</p>
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full"
      >
        {submitting
          ? (<><Loader2 className="w-4 h-4 animate-spin" /> Signing…</>)
          : (<><PenLine className="w-4 h-4" /> Accept & Sign</>)
        }
      </Button>
      {!canSubmit && !submitting && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          {!consent ? "Please agree to the terms above" : "Enter your name and signature to continue"}
        </p>
      )}
    </div>
  );
}