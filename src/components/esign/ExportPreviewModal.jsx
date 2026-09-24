import { Download, Share2 } from "lucide-react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { useToast } from "@/components/ui/use-toast";

export default function ExportPreviewModal({ open, onClose, blobUrl, fileName }) {
  const { toast } = useToast();

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

  return (
    <AppDialog open={open} onOpenChange={onClose}>
      <AppDialogContent maxWidth="max-w-2xl">
        <AppDialogHeader>
          <AppDialogTitle>Signed PDF Preview</AppDialogTitle>
          <AppDialogDescription>Review your signed PDF, then download or share it.</AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
          <div className="border border-border rounded-lg overflow-hidden bg-muted/20">
            <iframe src={blobUrl} title="Signed PDF" className="w-full h-[400px]" />
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button onClick={handleDownload}><Download className="w-4 h-4" /> Download</Button>
          <Button variant="outline" onClick={handleShare}><Share2 className="w-4 h-4" /> Share</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}