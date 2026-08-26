import { useRef, useState, useEffect } from "react";
import { Eraser } from "lucide-react";
import Button from "@/components/common/Button";

// Simple canvas-based signature pad. Calls onChange(dataUrl) whenever strokes
// change; exposes a clear button. Returns null (empty) when the canvas is blank.
export default function SignaturePad({ onChange, disabled }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "hsl(var(--foreground))";
  }, []);

  const pos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (onChange) onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    if (onChange) onChange("");
  };

  return (
    <div>
      <div className="relative border border-border rounded-lg bg-card overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-36 touch-none cursor-crosshair"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {!hasInk && !disabled && (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
            Sign here with your finger or mouse
          </span>
        )}
      </div>
      <div className="flex justify-end mt-2">
        <Button variant="outline" size="sm" onClick={clear} disabled={disabled || !hasInk}>
          <Eraser className="w-3.5 h-3.5" /> Clear
        </Button>
      </div>
    </div>
  );
}