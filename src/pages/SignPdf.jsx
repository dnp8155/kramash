import { useState } from "react";
import { UploadCloud, PenLine, Download } from "lucide-react";
import Button from "@/components/common/Button";

export default function SignPdf() {
  const [file, setFile] = useState(null);

  return (
    <div className="p-4 sm:p-6 max-w-[800px] mx-auto space-y-4">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-base font-semibold mb-1">Sign a PDF</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upload an agreement or contract and add your signature before sending it to a client.
        </p>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg py-10 cursor-pointer hover:bg-muted/40 transition-colors">
          <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-sm text-foreground font-medium">
            {file ? file.name : "Click to upload a PDF"}
          </span>
          <span className="text-xs text-muted-foreground mt-1">PDF up to 10MB</span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button disabled={!file}>
            <PenLine className="w-4 h-4" />
            Add Signature
          </Button>
          <Button variant="outline" disabled={!file}>
            <Download className="w-4 h-4" />
            Download Signed
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Digital signature processing arrives in a future phase.
      </p>
    </div>
  );
}