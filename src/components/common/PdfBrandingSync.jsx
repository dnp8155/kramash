import { useEffect } from "react";
import { usePlan } from "@/hooks/usePlan";
import { setPdfBranding } from "@/lib/pdfBranding";

// Keeps PDF generation told whether this workspace is on the Free plan ("Made with Kramasha" on the last page).
export default function PdfBrandingSync() {
  const { plan } = usePlan({ loadUsage: false });
  const free = !!plan && plan.planCode !== "PRO";
  useEffect(() => {
    setPdfBranding(free);
    return () => setPdfBranding(false);
  }, [free]);
  return null;
}
