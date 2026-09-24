import { Type, PenLine } from "lucide-react";
import SignaturePad from "@/components/common/SignaturePad";
import TextSignatureInput from "@/components/esign/TextSignatureInput";

const INK_COLORS = [
  { hex: "#000000", label: "Black" },
  { hex: "#1e3a8a", label: "Blue" }
];

export default function InvoiceSignatureSection({
  signatureType, setSignatureType,
  signatureImage, setSignatureImage,
  signatureColor, setSignatureColor,
  disabled
}) {
  const selectType = (type) => {
    if (disabled) return;
    setSignatureType(type);
    setSignatureImage("");
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Authorized Signature</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => selectType("text")}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              signatureType === "text" ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Type className="w-4 h-4" /> Text Sign
          </button>
          <button
            type="button"
            onClick={() => selectType("esign")}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              signatureType === "esign" ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenLine className="w-4 h-4" /> E-Sign
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Ink color:</span>
        {INK_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => !disabled && setSignatureColor(c.hex)}
            disabled={disabled}
            className={`w-6 h-6 rounded-full border-2 transition-all ${signatureColor === c.hex ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
            style={{ backgroundColor: c.hex }}
            aria-label={c.label}
          />
        ))}
      </div>

      {signatureType === "text" && <TextSignatureInput onChange={(url) => setSignatureImage(url)} color={signatureColor} />}
      {signatureType === "esign" && <SignaturePad onChange={(url) => setSignatureImage(url)} color={signatureColor} disabled={disabled} />}

      {signatureImage && (
        <div className="border border-border rounded-lg p-3 bg-muted/20">
          <div className="text-xs text-muted-foreground mb-1.5">Signature Preview</div>
          <img src={signatureImage} alt="Signature preview" className="max-h-20 w-auto" />
        </div>
      )}
    </div>
  );
}