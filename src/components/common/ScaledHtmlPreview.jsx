import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Loader2 } from "lucide-react";
import { renderTemplatePages } from "@/lib/quotationTemplatePdf";

// Paged A4 preview of a quotation / invoice template. The template is laid out and split into A4 sheets by the
// same engine that builds the PDF (running header with the logo on every page, "Page n of N"), so what you see
// here is what you download. Pages are shown as images that scale to the screen width; this component is the
// only scroller (vertical scroll, native pinch-zoom works).
const ScaledHtmlPreview = forwardRef(function ScaledHtmlPreview({ html, title }, ref) {
  const [pages, setPages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pagesRef = useRef([]);

  useEffect(() => {
    if (!html) return;
    let cancelled = false;
    setBusy(true);
    setFailed(false);
    renderTemplatePages(html)
      .then((canvases) => {
        if (cancelled) return;
        const urls = canvases.map((c) => c.toDataURL("image/jpeg", 0.92));
        pagesRef.current = urls;
        setPages(urls);
      })
      .catch((e) => { console.error("Preview render failed:", e); if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [html]);

  useImperativeHandle(ref, () => ({
    print: () => {
      if (!pagesRef.current.length) return;
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;";
      document.body.appendChild(frame);
      const d = frame.contentDocument;
      d.open();
      d.write(`<!DOCTYPE html><html><head><style>@page{size:A4;margin:0}html,body{margin:0}img{display:block;width:210mm;height:297mm;page-break-after:always}img:last-child{page-break-after:auto}</style></head><body>${pagesRef.current.map((u) => `<img src="${u}">`).join("")}</body></html>`);
      d.close();
      const imgs = [...d.images];
      Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; })))).then(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => frame.remove(), 1000);
      });
    },
  }));

  return (
    <div className="flex-1 min-h-0 overflow-auto overscroll-contain bg-gray-200 p-3 [touch-action:pan-x_pan-y_pinch-zoom]" aria-label={title}>
      {busy && pages.length === 0 && (
        <div className="h-full flex items-center justify-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
      )}
      {failed && <div className="text-center text-sm text-destructive py-10">Could not render the preview.</div>}
      <div className={`mx-auto max-w-[900px] space-y-3 transition-opacity ${busy ? "opacity-60" : ""}`}>
        {pages.map((src, i) => (
          <img key={i} src={src} alt={`${title || "Preview"} — page ${i + 1}`} className="block w-full h-auto bg-white shadow-lg" />
        ))}
      </div>
    </div>
  );
});

export default ScaledHtmlPreview;
