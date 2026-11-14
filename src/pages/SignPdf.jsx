import { useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import {
  UploadCloud, FileText, Loader2, PenLine, PencilLine, Type,
  Plus, Eye, RotateCcw, Trash2, ChevronLeft, ChevronRight, BookmarkPlus, Check,
} from "lucide-react";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import SignaturePad from "@/components/common/SignaturePad";
import TextSignatureInput from "@/components/esign/TextSignatureInput";
import PdfPreview from "@/components/esign/PdfPreview";
import PendingQueue from "@/components/esign/PendingQueue";
import ExportPreviewModal from "@/components/esign/ExportPreviewModal";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogFooter } from "@/components/ui/AppDialog";
import { useToast } from "@/components/ui/use-toast";
import { processSignatureDataUrl, overlayToPdfRect, presetToPdfRect } from "@/lib/esignUtils";
import { usePageTitle } from "@/hooks/usePageTitle";

// The signature is kept only in this browser (localStorage), never uploaded.
const SAVED_SIG_KEY = "kramasha:savedSignature";
// The first time someone signs we ask once whether to keep it; after any answer we stop asking.
const SAVE_ASKED_KEY = "kramasha:savedSignatureAsked";
const readSaveAsked = () => { try { return localStorage.getItem(SAVE_ASKED_KEY) === "1"; } catch { return false; } };
const markSaveAsked = () => { try { localStorage.setItem(SAVE_ASKED_KEY, "1"); } catch { /* ignore */ } };
const readSavedSignature = () => { try { return JSON.parse(localStorage.getItem(SAVED_SIG_KEY) || "null"); } catch { return null; } };

function PageNav({ page, pageCount, onChange }) {
  if (pageCount < 1) return null;
  return (
    <div className="flex items-center justify-center gap-3">
      <Button variant="outline" size="icon" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></Button>
      <span className="text-sm font-medium text-foreground min-w-24 text-center">Page {page} of {pageCount}</span>
      <Button variant="outline" size="icon" onClick={() => onChange(page + 1)} disabled={page >= pageCount} aria-label="Next page"><ChevronRight className="w-4 h-4" /></Button>
    </div>
  );
}

export default function SignPdf() {
  usePageTitle("Sign PDF");
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [signingMethod, setSigningMethod] = useState("draw");
  const [sigColor, setSigColor] = useState("#000000");
  const [currentSignature, setCurrentSignature] = useState("");
  const [savedSignature, setSavedSignature] = useState(readSavedSignature);
  const [saveAsked, setSaveAsked] = useState(readSaveAsked);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [previewPage, setPreviewPage] = useState(1);
  const [overlay, setOverlay] = useState({ x: 50, y: 50, width: 180, height: 80 });
  const [renderedSize, setRenderedSize] = useState(null);
  const [, setPdfPageSizes] = useState({});
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackPage, setFallbackPage] = useState(1);
  const [fallbackCorner, setFallbackCorner] = useState("bottom-right");
  const [showExportModal, setShowExportModal] = useState(false);
  const [signedBlobUrl, setSignedBlobUrl] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef(null);
  const sigColorRef = useRef(sigColor);
  sigColorRef.current = sigColor;

  const onFileChange = async (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") { toast({ title: "Please upload a PDF file", variant: "destructive" }); return; }
    if (f.size > 10 * 1024 * 1024) { toast({ title: "File too large (max 10MB)", variant: "destructive" }); return; }
    setFile(f); setPendingQueue([]); setCurrentSignature(""); setFallbackMode(false);
    try { const bytes = await f.arrayBuffer(); const pdfDoc = await PDFDocument.load(bytes); setPageCount(pdfDoc.getPageCount()); setPreviewPage(1); setFallbackPage(1); }
    catch (e) { toast({ title: "Failed to read PDF", description: e?.message, variant: "destructive" }); setPageCount(0); }
  };

  const saveSignature = () => {
    const entry = { dataUrl: currentSignature, type: signingMethod };
    try { localStorage.setItem(SAVED_SIG_KEY, JSON.stringify(entry)); setSavedSignature(entry); markSaveAsked(); setSaveAsked(true); toast({ title: "Signature saved on this device" }); }
    catch { toast({ title: "Couldn't save signature", description: "Browser storage is unavailable.", variant: "destructive" }); }
  };
  const dismissSavePrompt = () => { markSaveAsked(); setSaveAsked(true); };
  const useSavedSignature = () => { setSigningMethod(savedSignature.type || "draw"); setCurrentSignature(savedSignature.dataUrl); };
  const deleteSavedSignature = () => {
    try { localStorage.removeItem(SAVED_SIG_KEY); } catch { /* ignore */ }
    setSavedSignature(null);
    toast({ title: "Saved signature removed" });
  };

  const onSignatureChange = useCallback(async (rawDataUrl) => {
    if (!rawDataUrl) { setCurrentSignature(""); return; }
    try {
      const processed = await processSignatureDataUrl(rawDataUrl, sigColorRef.current);
      setCurrentSignature(processed.dataUrl);
      if (processed.width && processed.height) { const targetW = 180; const targetH = Math.round(targetW * (processed.height / processed.width)); setOverlay((prev) => ({ ...prev, width: targetW, height: Math.max(40, targetH) })); }
    } catch { setCurrentSignature(rawDataUrl); }
  }, []);

  const onPdfRendered = useCallback((rSize, pdfSize) => {
    setRenderedSize(rSize);
    setPdfPageSizes((prev) => ({ ...prev, [previewPage]: pdfSize }));
    setOverlay((prev) => ({ ...prev, x: Math.max(10, rSize.width - prev.width - 40), y: Math.max(10, rSize.height - prev.height - 40) }));
  }, [previewPage]);

  const addToPdf = () => {
    if (!currentSignature) { toast({ title: "Create a signature or text first", variant: "destructive" }); return; }
    const entry = { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, type: signingMethod, pngDataUrl: currentSignature };
    if (fallbackMode) { entry.page = fallbackPage; entry.preset = fallbackCorner; }
    else { entry.page = previewPage; entry.overlay = { ...overlay }; entry.renderedSize = { ...renderedSize }; }
    setPendingQueue((prev) => [...prev, entry]); setCurrentSignature("");
    toast({ title: "Added to PDF", description: `${pendingQueue.length + 1} stamp(s) pending` });
  };

  const onQueueEdit = (entry) => {
    setPendingQueue((prev) => prev.filter((e) => e.id !== entry.id));
    setCurrentSignature(entry.pngDataUrl); setSigningMethod(entry.type);
    if (entry.preset) { setFallbackMode(true); setFallbackPage(entry.page); setFallbackCorner(entry.preset); }
    else { setFallbackMode(false); setPreviewPage(entry.page); if (entry.overlay) setOverlay(entry.overlay); }
    toast({ title: "Loaded for editing — adjust and re-add" });
  };

  const onQueueRemove = (id) => setPendingQueue((prev) => prev.filter((e) => e.id !== id));

  const previewAndShare = async () => {
    if (!pendingQueue.length) { toast({ title: "Add at least one signature first", variant: "destructive" }); return; }
    setExporting(true);
    try {
      const originalBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(originalBytes);
      const pages = pdfDoc.getPages();
      const pngCache = {};
      for (const entry of pendingQueue) {
        if (pngCache[entry.pngDataUrl]) continue;
        const base64 = entry.pngDataUrl.split(",")[1];
        const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        pngCache[entry.pngDataUrl] = await pdfDoc.embedPng(sigBytes);
      }
      for (const entry of pendingQueue) {
        const page = pages[entry.page - 1]; if (!page) continue;
        const pdfSize = page.getSize(); const png = pngCache[entry.pngDataUrl];
        let rect;
        if (entry.preset) rect = presetToPdfRect(entry.preset, pdfSize);
        else rect = overlayToPdfRect(entry.overlay, entry.renderedSize, pdfSize);
        page.drawImage(png, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      }
      const signedBytes = await pdfDoc.save();
      const blob = new Blob([signedBytes], { type: "application/pdf" });
      if (signedBlobUrl) URL.revokeObjectURL(signedBlobUrl);
      const url = URL.createObjectURL(blob);
      setSignedBlobUrl(url); setShowExportModal(true);
    } catch (err) { toast({ title: "Failed to generate signed PDF", description: err?.message, variant: "destructive" }); }
    finally { setExporting(false); }
  };

  const doReset = () => {
    if (signedBlobUrl) URL.revokeObjectURL(signedBlobUrl);
    setFile(null); setPageCount(0); setCurrentSignature(""); setPendingQueue([]); setPreviewPage(1); setFallbackPage(1);
    setOverlay({ x: 50, y: 50, width: 180, height: 80 }); setRenderedSize(null); setPdfPageSizes({});
    setFallbackMode(false); setFallbackCorner("bottom-right"); setSigColor("#000000"); setShowExportModal(false); setSignedBlobUrl("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const closeExportModal = () => { setShowExportModal(false); if (signedBlobUrl) URL.revokeObjectURL(signedBlobUrl); setSignedBlobUrl(""); };

  const showFirstSavePrompt = !!currentSignature && !savedSignature?.dataUrl && !saveAsked;
  const showSaveButton = !showFirstSavePrompt && savedSignature?.dataUrl !== currentSignature;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sign a PDF</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Draw or type your signature, place it on any page, and export a flattened signed PDF — all in your browser.</p>
      </div>

      <div className="bg-card border border-border rounded-[15px] p-6">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg py-10 cursor-pointer hover:bg-muted/40 hover:border-primary/40 transition-colors">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3"><UploadCloud className="w-7 h-7 text-primary" /></div>
          {file ? (
            <><span className="text-sm text-foreground font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />{file.name}</span><span className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · {pageCount} page(s) · Click to replace</span></>
          ) : (
            <><span className="text-sm text-foreground font-medium">Click to upload a PDF</span><span className="text-xs text-muted-foreground mt-1">PDF up to 10MB · stays on your device</span></>
          )}
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
        </label>
      </div>

      {file && (
        <div className="bg-card border border-border rounded-[15px] p-6 space-y-5">
          {fallbackMode ? (
            <div className="space-y-3">
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning-foreground">Live preview unavailable — using simple placement mode.</div>
              <PageNav page={fallbackPage} pageCount={pageCount} onChange={setFallbackPage} />
              {currentSignature && (
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Position</label><Select value={fallbackCorner} onChange={(e) => setFallbackCorner(e.target.value)} className="w-full sm:w-60"><option value="bottom-right">Bottom Right</option><option value="bottom-center">Bottom Center</option><option value="bottom-left">Bottom Left</option><option value="top-right">Top Right</option><option value="top-left">Top Left</option></Select></div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <PdfPreview file={file} pageNumber={previewPage} overlay={overlay} onOverlayChange={setOverlay} onRendered={onPdfRendered} onFallback={() => setFallbackMode(true)} signatureDataUrl={currentSignature} />
              <PageNav page={previewPage} pageCount={pageCount} onChange={setPreviewPage} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Add your signature</label>
            <div className="flex gap-2 mb-3">
              <button onClick={() => { setSigningMethod("draw"); setCurrentSignature(""); }} className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-colors ${signingMethod === "draw" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/40"}`}><PencilLine className="w-4 h-4" /> Draw</button>
              <button onClick={() => { setSigningMethod("type"); setCurrentSignature(""); }} className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-colors ${signingMethod === "type" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/40"}`}><Type className="w-4 h-4" /> Type</button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-muted-foreground">Color</span>
              <button onClick={() => setSigColor("#000000")} className={`flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors ${sigColor === "#000000" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/40"}`}><span className="w-3 h-3 rounded-full bg-black border border-border/40" /> Black</button>
              <button onClick={() => setSigColor("#1d4ed8")} className={`flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors ${sigColor === "#1d4ed8" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/40"}`}><span className="w-3 h-3 rounded-full" style={{ background: "#1d4ed8" }} /> Blue</button>
            </div>
            {savedSignature?.dataUrl && (
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg border border-border bg-card">
                <div className="w-14 h-9 rounded border border-border bg-white flex items-center justify-center overflow-hidden shrink-0"><img src={savedSignature.dataUrl} alt="Saved signature" className="max-w-full max-h-full object-contain" /></div>
                <span className="text-xs text-muted-foreground flex-1 min-w-0">Saved signature</span>
                <Button variant="outline" size="sm" onClick={useSavedSignature} disabled={currentSignature === savedSignature.dataUrl}>{currentSignature === savedSignature.dataUrl ? <><Check className="w-3.5 h-3.5" /> In use</> : "Use"}</Button>
                <Button variant="ghost" size="icon" onClick={deleteSavedSignature} aria-label="Remove saved signature"><Trash2 className="w-4 h-4" /></Button>
              </div>
            )}
            {signingMethod === "draw" ? <SignaturePad onChange={onSignatureChange} color={sigColor} /> : <TextSignatureInput onChange={onSignatureChange} color={sigColor} />}
          </div>

          {currentSignature ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded border border-border bg-white flex items-center justify-center overflow-hidden"><img src={currentSignature} alt="current" className="max-w-full max-h-full object-contain" /></div>
                <span className="flex-1">Signature ready — position it on the page above, then click "Add to PDF".</span>
                {showSaveButton && (
                  <Button variant="outline" size="sm" onClick={saveSignature}><BookmarkPlus className="w-3.5 h-3.5" /> Save for next time</Button>
                )}
              </div>
              {showFirstSavePrompt && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-2 flex-1 text-sm">
                    <BookmarkPlus className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span><span className="font-medium text-foreground">Save this signature?</span> <span className="text-muted-foreground">Reuse it on your next PDF without signing again. It stays on this device only.</span></span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={saveSignature}>Save signature</Button>
                    <Button size="sm" variant="ghost" onClick={dismissSavePrompt}>Not now</Button>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={addToPdf} className="w-full sm:flex-1 whitespace-normal"><Plus className="w-4 h-4 shrink-0" /> Add to PDF</Button>
                <Button variant="primary" onClick={previewAndShare} disabled={!pendingQueue.length || exporting} className="w-full sm:flex-1 whitespace-normal">{exporting ? <><Loader2 className="w-4 h-4 shrink-0 animate-spin" /> Generating…</> : <><Eye className="w-4 h-4 shrink-0" /> Preview & Share PDF</>}</Button>
              </div>
            </>
          ) : (
            pendingQueue.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="primary" onClick={previewAndShare} disabled={exporting} className="w-full sm:flex-1 whitespace-normal">{exporting ? <><Loader2 className="w-4 h-4 shrink-0 animate-spin" /> Generating…</> : <><Eye className="w-4 h-4 shrink-0" /> Preview & Share PDF ({pendingQueue.length})</>}</Button>
              </div>
            )
          )}

          <PendingQueue queue={pendingQueue} onEdit={onQueueEdit} onRemove={onQueueRemove} />

          <div className="pt-3 border-t border-border"><Button variant="destructive" onClick={() => setShowResetDialog(true)} className="w-full sm:w-auto"><RotateCcw className="w-4 h-4" /> Reset All</Button></div>
        </div>
      )}

      <div className="bg-muted/40 border border-border rounded-lg p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><PenLine className="w-4 h-4 text-primary" /></div>
        <div>
          <div className="text-sm font-medium text-foreground">How it works</div>
          <p className="text-xs text-muted-foreground mt-0.5">Draw or type your signature, drag it onto the page preview, and add as many stamps as you need. Everything stays editable in the "Added so far" list until you click "Preview & Share PDF" — then a flattened, signed copy is generated entirely in your browser. No file is uploaded anywhere.</p>
        </div>
      </div>

      <AppDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AppDialogContent maxWidth="max-w-sm">
          <AppDialogHeader>
            <AppDialogTitle>Reset everything?</AppDialogTitle>
            <AppDialogDescription>This will remove the uploaded file, all signatures, and the entire pending queue. This cannot be undone.</AppDialogDescription>
          </AppDialogHeader>
          <AppDialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { doReset(); setShowResetDialog(false); }}><Trash2 className="w-4 h-4" /> Reset All</Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>

      {showExportModal && <ExportPreviewModal open={showExportModal} onClose={closeExportModal} blobUrl={signedBlobUrl} fileName={`signed_${file?.name || "document.pdf"}`} />}
    </div>
  );
}