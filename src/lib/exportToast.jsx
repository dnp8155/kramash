import { ToastAction } from "@/components/ui/toast";

// Result toast for exports delivered through deliverWorkbook (see exportUtils.js).
// Phones: if the browser refused to open the share sheet (the tap expired while the file was
// built), offer a Share button to retry from a fresh tap. A closed sheet needs no message.
export function showExportToast(toast, res, label) {
  if (res?.status === "needs-tap") {
    toast({
      title: "Export ready",
      description: `${label} — tap Share to send or save the file.`,
      duration: 60000,
      action: <ToastAction altText="Share the exported file" onClick={() => res.share().catch(() => {})}>Share</ToastAction>,
    });
  } else if (res?.status !== "cancelled") {
    toast({ title: "Export ready", description: `${label} exported.` });
  }
}
