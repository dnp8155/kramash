import { useRef, useEffect, useState, useCallback } from "react";
import { Eraser } from "lucide-react";

export default function SignaturePad({ onChange, disabled }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasStrokes, setHasStrokes] = useState(false);

  // Initialize canvas + handle resize (orientation change, viewport, keyboard)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const setupCanvas = () => {
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Save existing drawing before resize
      let savedImage = null;
      if (canvas.width > 0 && canvas.height > 0) {
        try {
          savedImage = canvas.toDataURL("image/png");
        } catch {}
      }

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1a1a2e";

      // Restore drawing after resize
      if (savedImage) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = savedImage;
      }
    };

    setupCanvas();

    const ro = new ResizeObserver(setupCanvas);
    ro.observe(container);

    // Re-setup after orientation change (with delay for layout to settle)
    const handleOrientation = () => setTimeout(setupCanvas, 250);
    window.addEventListener("orientationchange", handleOrientation);

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", handleOrientation);
    };
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  };

  const emitChange = useCallback(() => {
    if (onChange && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }, [onChange]);

  const start = (e) => {
    if (disabled) return;
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
  };

  const move = (e) => {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    const last = lastPointRef.current;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPointRef.current = pos;
    if (!hasStrokes) setHasStrokes(true);
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    emitChange();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasStrokes(false);
    if (onChange) onChange("");
  };

  return (
    <div>
      <div className="relative rounded-lg border-2 border-dashed border-border bg-white">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none rounded-lg"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {!hasStrokes && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Draw your signature here
          </p>
        )}
      </div>
      {hasStrokes && !disabled && (
        <button
          type="button"
          onClick={clear}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Eraser className="h-3.5 w-3.5" /> Clear signature
        </button>
      )}
    </div>
  );
}