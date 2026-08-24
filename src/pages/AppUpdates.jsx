import { Smartphone, Download, CheckCircle2 } from "lucide-react";
import Button from "@/components/common/Button";

export default function AppUpdates() {
  return (
    <div className="p-4 sm:p-6 max-w-[800px] mx-auto space-y-4">
      <div className="bg-card border border-border rounded-lg p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Kramashah App</h2>
        <p className="text-sm text-muted-foreground mt-1">Version 1.0.0 · Phase 1</p>
        <div className="flex items-center justify-center gap-2 mt-3 text-sm text-success">
          <CheckCircle2 className="w-4 h-4" />
          You're up to date
        </div>
        <Button variant="outline" className="mt-4">
          <Download className="w-4 h-4" />
          Check for Updates
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Release Notes</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• React UI foundation migrated from legacy HTML build.</li>
          <li>• Shared sidebar, header, and mobile navigation.</li>
          <li>• Events, Team, Financial, Rate Estimator, Quotation, Preferences screens.</li>
        </ul>
      </div>
    </div>
  );
}