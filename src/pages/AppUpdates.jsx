import { RefreshCw, Check, Download, Smartphone } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";

const changelog = [
  { version: "1.4.0", date: "Sep 2026", tag: "Feature", title: "Rate Estimator with GST", notes: "Build estimates with optional 18% GST and line-item discounts." },
  { version: "1.3.2", date: "Aug 2026", tag: "Improvement", title: "Faster event loading", notes: "Optimized event list rendering for large workspaces." },
  { version: "1.3.0", date: "Aug 2026", tag: "Feature", title: "Team invitations", notes: "Invite crew members by email with role-based access." },
  { version: "1.2.5", date: "Jul 2026", tag: "Fix", title: "Payment export fix", notes: "Resolved currency formatting in exported reports." },
];

const tagStyles = {
  Feature: "bg-primary/10 text-primary",
  Improvement: "bg-info/10 text-info",
  Fix: "bg-warning/10 text-warning",
};

export default function AppUpdates() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="App & Updates" description="Version info, changelog, and app installation." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" /><CardTitle>Current Version</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">v1.4.0</p>
              <p className="text-sm text-muted-foreground">Released Sep 2026 · You're up to date</p>
              <div className="mt-3 flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" /> Latest version installed
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Button variant="outline"><Download className="h-4 w-4" /> Check for Updates</Button>
              <p className="text-xs text-muted-foreground">Auto-update enabled</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" /><CardTitle>Install App</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-muted-foreground">Install Kramashah as an app on your device for quick access.</p>
            <Button className="w-full"><Smartphone className="h-4 w-4" /> Install on this device</Button>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Changelog</CardTitle></CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-border">
            {changelog.map((c) => (
              <div key={c.version} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-5">
                <div className="sm:w-28 shrink-0">
                  <p className="text-sm font-semibold text-foreground">v{c.version}</p>
                  <p className="text-xs text-muted-foreground">{c.date}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tagStyles[c.tag]}`}>{c.tag}</span>
                    <p className="text-sm font-semibold text-foreground">{c.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}