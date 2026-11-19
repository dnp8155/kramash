import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2 } from "lucide-react";
import { renderPdfPage } from "@/lib/pdfRender";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

// Long documents at full sharpness can exhaust a phone's canvas memory, so page
// sharpness steps down for big files.
const MANY_PAGES = 8;

// Renders every page of a PDF (from a blob: URL) as scaled-to-fit, scrollable
// canvases — avoids relying on the browser's built-in PDF viewer, which on
// mobile browsers and installed PWAs often shows only page 1, zoomed/cropped,
// inside a fixed-height <iframe>.
//
// Canvases are "fluid" (width 100%, height auto), so rotating the phone or a
// scrollbar appearing never distorts them; they are re-drawn crisply only when the
// available width really changes.
export default function PdfMultiPagePreview({ fileUrl }) {
  const containerRef = useRef(null);
  const pagesRef = useRef([]);
  const [pdf, setPdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [width, setWidth] = useState(0);

  // Load the document (and free it when the URL changes or the preview closes).
  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    let task = null;
    setLoading(true);
    setError(false);
    setPdf(null);
    (async () => {
      try {
        task = pdfjsLib.getDocument({ url: fileUrl });
        const doc = await task.promise;
        if (cancelled) { doc.destroy(); return; }
        setPdf(doc);
      } catch (err) {
        if (cancelled) return;
        console.error("pdf.js multi-page load failed:", err);
        setError(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      task?.destroy?.();
    };
  }, [fileUrl]);

  // Track the width available to a page (inside the 8px padding on each side).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth((prev) => {
      const next = Math.max(200, Math.round(el.clientWidth - 16));
      return Math.abs(next - prev) > 2 ? next : prev;
    });
    measure();
    let timer = null;
    const ro = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(measure, 150); });
    ro.observe(el);
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, []);

  // Draw the pages once the canvases exist and whenever the width really changes.
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
        console.error("pdf.js multi-page render failed:", err);
        setError(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; holder.task?.cancel?.(); };
  }, [pdf, width]);

  if (error) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Couldn't render a preview. Use Download to view the file.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative bg-muted/20">
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <div className="space-y-3 p-2">
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
