import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2 } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

// Renders every page of a PDF onto stacked <canvas> elements inside a plain
// scrollable container — no native browser PDF-viewer chrome (toolbar/nav
// panes), which is unreliable to suppress across browsers via iframe + URL
// fragments (#toolbar=0 etc.) and was causing a visible top gap/offset.
export default function PdfCanvasViewer({ url }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";
        const containerWidth = container.clientWidth;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / viewport.width;
          const scaledViewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;
          canvas.className = "block mx-auto shadow-sm bg-white mb-3 last:mb-0";
          container.appendChild(canvas);
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        }
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("PDF render failed:", err);
        setError(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="relative w-full h-full overflow-y-auto bg-muted/30 p-3">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Failed to render preview.
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
