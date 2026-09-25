import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2, Move, Maximize2 } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

export default function PdfPreview({
  file, pageNumber, overlay, onOverlayChange, onRendered, onFallback, signatureDataUrl
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [renderedSize, setRenderedSize] = useState(null);
  const [dragMode, setDragMode] = useState(null);
  const dragStart = useRef(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        const page = await pdf.getPage(pageNumber);
        const container = containerRef.current;
        if (!container || cancelled) return;
        const containerWidth = container.clientWidth;
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / viewport.width, 1.5);
        const scaledViewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext("2d");
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = `${scaledViewport.width}px`;
        canvas.style.height = `${scaledViewport.height}px`;
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        if (cancelled) return;
        const size = { width: scaledViewport.width, height: scaledViewport.height };
        setRenderedSize(size);
        onRendered?.(size, { width: viewport.width, height: viewport.height });
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("pdf.js render failed:", err);
        onFallback?.();
      }
    })();
    return () => { cancelled = true; };
  }, [file, pageNumber]);

  const onPointerDown = (e, mode) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode(mode);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: overlay.x, oy: overlay.y, ow: overlay.width, oh: overlay.height };
  };

  useEffect(() => {
    if (!dragMode) return;
    const onMove = (ev) => {
      const s = dragStart.current;
      if (!s || !renderedSize) return;
      const dx = ev.clientX - s.x;
      const dy = ev.clientY - s.y;
      if (dragMode === "drag") {
        onOverlayChange({ ...overlay, x: Math.max(0, Math.min(s.ox + dx, renderedSize.width - s.ow)), y: Math.max(0, Math.min(s.oy + dy, renderedSize.height - s.oh)) });
      } else {
        onOverlayChange({ ...overlay, width: Math.max(60, Math.min(s.ow + dx, renderedSize.width - overlay.x)), height: Math.max(30, Math.min(s.oh + dy, renderedSize.height - overlay.y)) });
      }
    };
    const onUp = () => setDragMode(null);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [dragMode, overlay, renderedSize, onOverlayChange]);

  return (
    <div ref={containerRef} className="relative w-full flex justify-center bg-muted/20 border border-border rounded-lg overflow-hidden p-2">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/60 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <canvas ref={canvasRef} className="max-w-full h-auto shadow-sm" />
      {renderedSize && (
        <div
          className="absolute border-2 border-primary bg-primary/10 cursor-move touch-none"
          style={{ left: `calc(50% - ${renderedSize.width / 2}px + ${overlay.x}px)`, top: `${overlay.y + 8}px`, width: `${overlay.width}px`, height: `${overlay.height}px` }}
          onPointerDown={(e) => onPointerDown(e, "drag")}
        >
          {signatureDataUrl && (
            <img
              src={signatureDataUrl}
              alt="Signature preview"
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            />
          )}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-primary bg-card px-1.5 py-0.5 rounded border border-border flex items-center gap-1 whitespace-nowrap">
            <Move className="w-2.5 h-2.5" /> drag
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-sm cursor-nwse-resize touch-none flex items-center justify-center" onPointerDown={(e) => onPointerDown(e, "resize")}>
            <Maximize2 className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}