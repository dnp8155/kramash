import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import Button from "@/components/common/Button";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useToast } from "@/components/ui/use-toast";
import { useFeatureGate } from "@/components/common/ProGate";
import { showExportToast } from "@/lib/exportToast";
import { loadAllTransactions } from "@/lib/financeService";
import { txInFY, eventInFY } from "@/lib/financialYearService";
import { exportFinancialXlsx, exportBusinessWorkbookXlsx } from "@/lib/exportUtils";
import ProTag from "@/components/common/ProTag";
import { cn } from "@/lib/utils";

// The Excel reports (a workbook per financial year, and a flat list of payments). Pro only. It uses the range chosen
// on the Import & Export page, so there is one picker for every kind of export.
export default function ExcelExportCard({ exportRange }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { workspace, workspaceId } = useWorkspace();
  const term = useBusinessTerminology();
  const [exporting, setExporting] = useState(false);
  const [exportingTx, setExportingTx] = useState(false);
  const exportLock = useRef(false);
  const { checkFeature, hasFeature, FeatureGateDialog } = useFeatureGate();
  const canExport = hasFeature("excel_csv_export_enabled");
  const askUpgrade = (key, label) => () => checkFeature(key, label);
  // Voided payments stay in the books; this tick box decides whether exports list them (on by default).
  const [includeVoided, setIncludeVoided] = useState(true);
  const inExportRange = (date, fyTest) => {
    if (!exportRange || exportRange.type === "all") return true;
    if (exportRange.type === "fy") return fyTest(exportRange.fy);
    return !!date && date >= exportRange.start && date <= exportRange.end;
  };
  const notifyExport = (res, label) => showExportToast(toast, res, label);

  return (
    <>
      <h3 className="text-sm font-semibold text-foreground mb-1 inline-flex items-center gap-2">Excel reports{!canExport && <ProTag />}</h3>
      <div className={cn(!canExport && "opacity-60 cursor-pointer")} onClick={!canExport ? askUpgrade("excel_csv_export_enabled", "Excel Export") : undefined}>
      <div className={cn(!canExport && "pointer-events-none")}>
      <label className="flex items-start gap-2 text-xs text-foreground my-3 cursor-pointer">
        <input type="checkbox" checked={includeVoided} onChange={(e) => setIncludeVoided(e.target.checked)} className="mt-0.5" />
        <span><span className="font-medium">Include voided entries</span> — payments that were cancelled are listed as <em>Voided</em>, with the reason and date, and are not counted in totals. Recommended for transparency.</span>
      </label>
      <Button size="sm" disabled={exporting || !exportRange || !canExport} onClick={async () => {
        if (!checkFeature("excel_csv_export_enabled", "Excel Export")) return;
        if (exportLock.current) return; // one export per click, even on a double tap
        exportLock.current = true;
        setExporting(true);
        try {
          const [allEvents, clients, members, services, teamAsg, svcAsg, allTx] = await Promise.all([
            base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 1000),
            base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 1000),
            base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 1000),
            base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 1000),
            base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, assignment_status: "assigned" }, "-created_date", 5000),
            base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId, assignment_status: "assigned" }, "-created_date", 5000),
            base44.entities.FinancialTransaction.filter(includeVoided ? { workspace_id: workspaceId } : { workspace_id: workspaceId, status: "ACTIVE" }, "-transaction_date", 10000),
          ]);
          const byId = (list) => Object.fromEntries((list || []).map((x) => [x.id, x]));
          const group = (list) => (list || []).reduce((acc, a) => { (acc[a.event_id] = acc[a.event_id] || []).push(a); return acc; }, {});
          const fyEvents = (allEvents || []).filter((e) => e.status !== "cancelled" && inExportRange(e.start_date, (fy) => eventInFY(e, fy)));
          if (fyEvents.length === 0) {
            toast({ title: "Nothing to export for this period." });
          } else {
            const res = await exportBusinessWorkbookXlsx(fyEvents, {
              ownerName: user?.full_name || "",
          businessName: workspace?.name || "",
              fyLabel: exportRange.label,
              includeVoided,
              clientsMap: byId(clients), teamMap: byId(members), serviceMap: byId(services),
              assignmentsByEvent: group(teamAsg), serviceAssignmentsByEvent: group(svcAsg),
              transactions: allTx || [], workPlural: term.workItemPlural, currency: workspace?.currency || "INR",
            });
            notifyExport(res, `${res.count} ${term.workItemPlural.toLowerCase()}`);
          }
        } catch (e) {
          toast({ title: "Export failed", description: e?.message, variant: "destructive" });
        } finally {
          setExporting(false);
          exportLock.current = false;
        }
      }}>
        {exporting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting…</> : <><Download className="w-3.5 h-3.5" /> Export to Excel</>}
      </Button>
      <p className="text-xs text-muted-foreground mt-2 mb-4">One workbook for the selected year: a Main Summary of every {term.workItemSingular.toLowerCase()}, then a sheet per client with their details, transactions, team and services.</p>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">Payment activity only</p>
      <Button variant="outline" size="sm" disabled={exportingTx || !exportRange || !canExport} onClick={async () => {
        if (!checkFeature("excel_csv_export_enabled", "Excel Export")) return;
        setExportingTx(true);
        try {
          const tx = await loadAllTransactions(workspaceId);
          const events = await base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500);
          const clients = await base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500);
          const members = await base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500);
          const eventsById = {}, clientsById = {}, membersById = {};
          events.forEach((e) => { eventsById[e.id] = e; });
          clients.forEach((c) => { clientsById[c.id] = c; });
          members.forEach((m) => { membersById[m.id] = m; });
          const fyTx = tx.filter((t) => inExportRange(t.transaction_date, (fy) => txInFY(t, fy)));
          if (fyTx.length === 0) {
            toast({ title: "No transactions found for this period." });
          } else {
            const res = await exportFinancialXlsx(fyTx, { eventsById, clientsById, membersById }, workspace?.currency || "INR", exportRange.label, { shareSheet: true, includeVoided });
            notifyExport(res, `${fyTx.length} transactions`);
          }
        } catch (e) {
          toast({ title: "Export failed", description: e?.message, variant: "destructive" });
        } finally {
          setExportingTx(false);
        }
      }}>
        {exportingTx ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting…</> : <><Download className="w-3.5 h-3.5" /> Export to Excel</>}
      </Button>
      <p className="text-xs text-muted-foreground mt-2">Exports every payment and expense in the selected range as a flat list.</p>
      </div>
      </div>
      {FeatureGateDialog}
    </>
  );
}
