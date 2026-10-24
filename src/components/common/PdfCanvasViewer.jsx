import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2 } from "lucide-react";
import { renderPdfPage } from "@/lib/pdfRender";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

// Long documents at full sharpness can exhaust a phone's canvas memory.
const MANY_PAGES = 8;

// Renders every page of a PDF onto stacked <canvas> elements inside one scrollable container
// — no native browser PDF-viewer chrome, which is unreliable to suppress across browsers.
//   • Pages are drawn at the device's real resolution (they looked blurry at 1×).
//   • Canvases are fluid (width 100%), re-drawn crisply only when the width really changes.
//   • This container is the ONLY scroller and fills its parent (absolute inset-0), so it scrolls
//     on phones even where the parent's height comes from a vh fallback.
export default function PdfCanvasViewer({ url }) {
  const scrollRef = useRef(null);
  const pagesRef = useRef([]);
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [width, setWidth] = useState(0);

  // Load (and free) the document.
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let task = null;
    setLoading(true);
    setError(false);
    setPdf(null);
    (async () => {
      try {
        task = pdfjsLib.getDocument(url);
        const doc = await task.promise;
        if (cancelled) { doc.destroy(); return; }
        setPdf(doc);
      } catch (err) {
        if (cancelled) return;
        console.error("PDF load failed:", err);
        setError(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; task?.destroy?.(); };
  }, [url]);

  // Width available to a page (inside 12px padding each side).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setWidth((prev) => {
      const next = Math.max(200, Math.round(el.clientWidth - 24));
      return Math.abs(next - prev) > 2 ? next : prev;
    });
    measure();
    let timer = null;
    const ro = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(measure, 150); });
    ro.observe(el);
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, []);

  // Draw the pages.
  useEffect(() => {
    if (!pdf || !width) return;
    let cancelled = false;
    const holder = {};
    (async () => {
      try {
        const maxDpr = pdf.numPages > MANY_PAGES ? 2 : 3;
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const canvas = pagesRef.current[i - 1];
          if (!canvas) continue;
          const page = await pdf.getPage(i);
          if (cancelled) return;
          await renderPdfPage(page, canvas, width, { maxDpr, fluid: true, holder });
          if (i === 1 && !cancelled) setLoading(false);
        }
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled || err?.name === "RenderingCancelledException") return;
        console.error("PDF render failed:", err);
        setError(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; holder.task?.cancel?.(); };
  }, [pdf, width]);

  return (
    <div
      ref={scrollRef}
      className="absolute inset-0 overflow-y-auto overscroll-contain bg-muted/30 p-3 [touch-action:pan-y_pinch-zoom]"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Failed to render preview.
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: pdf?.numPages || 0 }).map((_, i) => (
          <canvas
            key={i}
            ref={(el) => { pagesRef.current[i] = el; }}
            className="block w-full h-auto mx-auto shadow-sm bg-white"
          />
        ))}
      </div>
    </div>
  );
}
