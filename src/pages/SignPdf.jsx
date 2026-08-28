import { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { UploadCloud, Download, FileText, Trash2, Loader2, PenLine } from "lucide-react";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import SignaturePad from "@/components/common/SignaturePad";
import { useToast } from "@/components/ui/use-toast";

export default function SignPdf() {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [signature, setSignature] = useState("");
  const [signPage, setSignPage] = useState(1);
  const [position, setPosition] = useState("bottom-right");
  const [signerName, setSignerName] = useState("");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef(null);

  const onFileChange = async (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast({ title: "Please upload a PDF file", variant: "destructive" });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: "File too large (max 10MB)", variant: "destructive" });
      return;
    }
    setFile(f);
    setSignature("");
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(URL.createObjectURL(f));
    try {
      const bytes = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      setPageCount(pdfDoc.getPageCount());
      setSignPage(1);
    } catch (e) {
      toast({ title: "Failed to read PDF", description: e?.message, variant: "destructive" });
      setPageCount(0);
    }
  };

  const downloadSigned = async () => {
    if (!file || !signature) return;
    setProcessing(true);
    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);

      const base64 = signature.split(",")[1];
      const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const pngImage = await pdfDoc.embedPng(sigBytes);

      const pageIdx = Math.min(Math.max(1, signPage), pageCount) - 1;
      const page = pdfDoc.getPage(pageIdx);
      const { width: pw } = page.getSize();

      const sigWidth = 180;
      const sigHeight = sigWidth * (pngImage.height / pngImage.width);
      const margin = 40;

      let x;
      switch (position) {
        case "bottom-left": x = margin; break;
        case "bottom-center": x = (pw - sigWidth) / 2; break;
        case "bottom-right": x = pw - sigWidth - margin; break;
        default: x = pw - sigWidth - margin;
      }
      const y = margin;

      page.drawImage(pngImage, { x, y, width: sigWidth, height: sigHeight });

      if (signerName.trim()) {
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const text = `Signed by ${signerName} on ${new Date().toLocaleDateString()}`;
        const fontSize = 9;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: x + (sigWidth - textWidth) / 2,
          y: y - 12,
          size: fontSize,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      }

      const signedBytes = await pdfDoc.save();
      const blob = new Blob([signedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signed_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Signed PDF downloaded", description: `${file.name} has been signed and downloaded.` });
    } catch (e) {
      toast({ title: "Failed to sign PDF", description: e?.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl("");
    setSignature("");
    setPageCount(0);
    setSignPage(1);
    setSignerName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="p-4 sm:p-6 max-w-[800px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sign a PDF</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload an agreement or contract, draw your signature, and download the signed copy.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg py-12 cursor-pointer hover:bg-muted/40 hover:border-primary/40 transition-colors">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <UploadCloud className="w-7 h-7 text-primary" />
          </div>
          {file ? (
            <>
              <span className="text-sm text-foreground font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB · {pageCount} page(s) · Click to replace
              </span>
            </>
          ) : (
            <>
              <span className="text-sm text-foreground font-medium">Click to upload a PDF</span>
              <span className="text-xs text-muted-foreground mt-1">PDF up to 10MB</span>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
        </label>

        {file && (
          <>
            <div className="mt-5 border border-border rounded-lg overflow-hidden bg-muted/20">
              <iframe src={fileUrl} title="PDF Preview" className="w-full h-[400px]" />
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-foreground mb-2">Draw your signature</label>
              <SignaturePad onChange={setSignature} />
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Sign on page</label>
                <Select value={signPage} onChange={(e) => setSignPage(Number(e.target.value))} className="w-full">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>Page {p}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Position</label>
                <Select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full">
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Signed by (optional)</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-9 px-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <Button onClick={downloadSigned} disabled={!signature || processing}>
                {processing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing…</>
                ) : (
                  <><Download className="w-4 h-4" /> Download Signed PDF</>
                )}
              </Button>
              <Button variant="outline" onClick={reset}>
                <Trash2 className="w-4 h-4" /> Remove File
              </Button>
            </div>
            {!signature && (
              <p className="text-xs text-muted-foreground mt-2">Draw your signature above to enable download.</p>
            )}
          </>
        )}
      </div>

      <div className="bg-muted/40 border border-border rounded-lg p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <PenLine className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">How it works</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload your PDF, draw your signature, choose the page and position, then download. The signature is
            embedded directly into the PDF — everything happens in your browser, no upload to any server.
          </p>
        </div>
      </div>
    </div>
  );
}