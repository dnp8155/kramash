import { useState, useEffect, useCallback } from "react";
import { Type } from "lucide-react";
import Input from "@/components/common/Input";
import { processSignatureDataUrl } from "@/lib/esignUtils";

// Text-input signing mode: renders typed text to a canvas using the
// Caveat handwritten font, then normalizes + trims.
// `color` controls text color (hex string, default black).
export default function TextSignatureInput({ onChange, color = "#000000" }) {
  const [text, setText] = useState("");
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    // Ensure Caveat is loaded before rendering
    document.fonts.load('48px "Caveat"').then(() => setFontReady(true));
  }, []);

  const render = useCallback(async (value) => {
    if (!value.trim() || !fontReady) {
      onChange("");
      return;
    }
    const fontSize = 56;
    const fontStr = `${fontSize}px "Caveat", cursive`;
    // measure
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = fontStr;
    const metrics = measure.measureText(value);
    const w = Math.ceil(metrics.width) + 24;
    const h = Math.ceil(fontSize * 1.4);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.font = fontStr;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(value, 12, h / 2);
    const processed = await processSignatureDataUrl(canvas.toDataURL("image/png"));
    onChange(processed.dataUrl);
  }, [fontReady, onChange, color]);

  useEffect(() => { render(text); }, [text, render]);

  return (
    <div>
      <div className="relative border border-border rounded-lg bg-card overflow-hidden h-36 flex items-center justify-center">
        {text.trim() && fontReady ? (
          <span
            className="text-5xl leading-none"
            style={{ fontFamily: '"Caveat", cursive', color }}
          >
            {text}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Type className="w-4 h-4" /> Type your name, initials, or a short note
          </span>
        )}
      </div>
      <div className="mt-2">
        <Input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. John Doe, JD, 16/09/2026"
          maxLength={60}
          className="w-full"
        />
      </div>
    </div>
  );
}