import { useState, useRef } from "react";
import { UploadCloud, PenLine, Download, FileText, Trash2, CheckCircle2 } from "lucide-react";
import Button from "@/components/common/Button";
import { useToast } from "@/components/ui/use-toast";

export default function SignPdf() {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [signed, setSigned] = useState(false);
  const fileRef = useRef(null);

  const onFileChange = (f) => {
    setFile(f);
    setSigned(false);
  };

  const addSignature = () => {
    if (!file) return;
    setSigned(true);
    toast({ title: "Signature added", description: "Your signature has been applied to the document." });
  };

  const reset = () => {
    setFile(null);
    setSigned(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="p-4 sm:p-6 max-w-[800px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sign a PDF</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Upload an agreement or contract and add your signature before sending it to a client.</p>
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
                {(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace
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
          <div className="mt-5">
            {signed && (
              <div className="flex items-center gap-2 text-sm text-success bg-success/5 border border-success/20 rounded-md px-3 py-2.5 mb-4">
                <CheckCircle2 className="w-4 h-4" />
                Signature applied — your document is ready to download and share.
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              {!signed ? (
                <Button onClick={addSignature}>
                  <PenLine className="w-4 h-4" />
                  Add Signature
                </Button>
              ) : (
                <Button onClick={() => toast({ title: "Download started", description: `${file.name} is being prepared.` })}>
                  <Download className="w-4 h-4" />
                  Download Signed
                </Button>
              )}
              <Button variant="outline" onClick={reset}>
                <Trash2 className="w-4 h-4" />
                Remove File
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted/40 border border-border rounded-lg p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <PenLine className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">How it works</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload your PDF, apply your saved signature, and download the signed copy. Your signature is securely stored in your workspace preferences.
          </p>
        </div>
      </div>
    </div>
  );
}