import { useState } from "react";
import { Download, Share2, Save, Loader2, Link2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

// Final export modal — shows the flattened signed PDF preview with
// Download, native Share (Web Share API), and Save-to-app options.
export default function ExportPreviewModal({ open, onClose, blobUrl, fileName }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState("");

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Signed PDF" });
      } else {
        handleDownload();
        toast({ title: "Sharing not supported — downloaded instead" });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        toast({ title: "Share failed", description: err?.message, variant: "destructive" });
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: "application/pdf" });
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setSavedUrl(file_url);
      toast({ title: "Saved to app storage", description: "File URL copied to clipboard" });
      try { await navigator.clipboard.writeText(file_url); } catch {}
    } catch (err) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Signed PDF Preview</DialogTitle>
          <DialogDescription>Review your signed PDF, then download, share, or save it.</DialogDescription>
        </DialogHeader>
        <div className="border border-border rounded-lg overflow-hidden bg-muted/20">
          <iframe src={blobUrl} title="Signed PDF" className="w-full h-[400px]" />
        </div>
        {savedUrl && (
          <div className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
            <Check className="w-3.5 h-3.5" />
            <span className="flex-1 truncate">Saved: {savedUrl}</span>
            <Button variant="ghost" size="sm" onClick={() => { try { navigator.clipboard.writeText(savedUrl); } catch {} }}>
              <Link2 className="w-3 h-3" /> Copy
            </Button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleDownload} className="flex-1">
            <Download className="w-4 h-4" /> Download
          </Button>
          <Button variant="outline" onClick={handleShare} className="flex-1">
            <Share2 className="w-4 h-4" /> Share
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save to App"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}