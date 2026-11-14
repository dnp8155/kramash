import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import Select from "@/components/common/Select";
import ExportRangePicker from "@/components/preferences/ExportRangePicker";
import ExcelExportCard from "@/components/preferences/ExcelExportCard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Download, Upload, FileJson, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, XCircle, Copy, Check } from "lucide-react";
import Button from "@/components/common/Button";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { usePlan } from "@/hooks/usePlan";
import { PLAN_UNLIMITED } from "@/lib/planService";
import { useToast } from "@/components/ui/use-toast";
import { invalidateRelated } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";
import {
  buildDataFile, dataFileToCsv, csvToDataFile, normalizeDataFile, exampleDataFile, fyLabelsInFile, filterDataByFy, downloadText, summarize, CSV_COLUMNS, METHODS, STATUSES,
} from "@/lib/dataFile";
import { loadExisting, planImport, runImport } from "@/lib/dataFileImport";
import { eventInFY, txInFY } from "@/lib/financialYearService";
import { fyForDate, todayISO } from "@/lib/dates";

const stamp = () => todayISO();
const FIELD_HELP = [
  ["clients", "name (required), phone, email, address, city, notes"],
  ["events", "title and dates (required), client, type, venue, contract_value, status, notes, payments"],
  ["payments", "date, kind, amount (all required), method, note. Inside an event they belong to it"],
  ["misc", "Payments that belong to no event, such as rent or print sales. Same as a payment, with category in place of note"],
  ["dates", "2026-03-05, 05/03/2026 or 5 Mar 2026. An event can list several dates"],
  ["kind", `"received" is money in from a client, "paid" is money out`],
  ["method", METHODS.join(", ")],
  ["status", `${STATUSES.join(", ")}. Leave it out and it is worked out from the dates`],
];

function Card({ title, children }) {
  return (
    <section className="bg-card border border-border rounded-[15px] p-5">
      <h2 className="font-semibold text-foreground mb-1">{title}</h2>
      {children}
    </section>
  );
}

// Import & Export: one page for every way of moving data out (Excel, JSON, CSV) and in (JSON, CSV). Reached from
// Preferences → Import & Export. One range picker serves all the exports.
export default function DataFiles() {
  usePageTitle("Import & Export");
  const navigate = useNavigate();
  const [exportRange, setExportRange] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspace, workspaceId } = useWorkspace();
  const { fiscalYears, selectedFY, refresh: refreshFY } = useFinancialYear();
  const { plan: planInfo, usage, loading: planLoading } = usePlan();
  const fileRef = useRef(null);
  // How many more events this plan allows. Nothing on the server enforces it, so the import has to.
  const eventCap = planInfo?.limits?.max_events;
  const maxNewEvents = eventCap === undefined || eventCap === null || eventCap >= PLAN_UNLIMITED ? Infinity : Math.max(0, eventCap - (usage?.events || 0));

  const [exporting, setExporting] = useState("");
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [checked, setChecked] = useState(null); // { data, issues }
  // The year the file's data belongs to. It has to be chosen on purpose: "" means not chosen yet.
  const [importFy, setImportFy] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [exampleTab, setExampleTab] = useState("json");
  const [copied, setCopied] = useState(false);

  const exampleJson = JSON.stringify(exampleDataFile(), null, 2);
  const exampleCsv = dataFileToCsv(exampleDataFile());

  const exportNow = async (kind) => {
    setExporting(kind);
    try {
      const [clients, events, transactions, members] = await Promise.all([
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 10000),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "start_date", 10000),
        base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId }, "transaction_date", 20000),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 5000),
      ]);
      // An event is in the range by its first date and travels with all of its payments, even ones received in a
      // later year, so the file imports cleanly on its own. Misc payments are in the range by their own date.
      const inRange = (date, fyTest) => !exportRange || exportRange.type === "all" || (exportRange.type === "fy" ? fyTest(exportRange.fy) : !!date && date >= exportRange.start && date <= exportRange.end);
      const pickedEvents = (events || []).filter((e) => inRange(e.start_date, (fy) => eventInFY(e, fy)));
      const pickedIds = new Set(pickedEvents.map((e) => e.id));
      const pickedTx = (transactions || []).filter((t) => (t.event_id ? pickedIds.has(t.event_id) : !t.client_id && inRange(t.transaction_date, (fy) => txInFY(t, fy))));
      const wholeWorkspace = !exportRange || exportRange.type === "all";
      const usedClients = new Set(pickedEvents.map((e) => e.client_id));
      const file = buildDataFile({
        clients: wholeWorkspace ? clients : (clients || []).filter((c) => usedClients.has(c.id)),
        events: pickedEvents, transactions: pickedTx,
        membersById: Object.fromEntries((members || []).map((m) => [m.id, m])),
      });
      const rangeTag = exportRange && exportRange.type !== "all" ? `_${String(exportRange.label).replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}` : "";
      const base = `${(workspace?.name || "Kramasha").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_")}_data${rangeTag}_${stamp()}`;
      if (kind === "json") downloadText(JSON.stringify(file, null, 2), `${base}.json`, "application/json");
      else downloadText(dataFileToCsv(file), `${base}.csv`, "text/csv;charset=utf-8;");
      const s = summarize(normalizeDataFile(file).data);
      toast({ title: "Export ready", description: `${s.clients} clients, ${s.events} events and ${s.payments} payments.` });
    } catch (e) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    } finally {
      setExporting("");
    }
  };

  const reset = () => {
    setFileName(""); setParseError(""); setChecked(null); setImportFy(""); setConfirmOpen(false); setExisting(null); setResult(null); setShowAllIssues(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    if (/\.xlsx?$/i.test(file.name)) { setParseError("Excel files can not be imported directly. In Excel choose Save As and pick CSV, then choose that file here."); return; }
    if (file.size > 15 * 1024 * 1024) { setParseError("This file is larger than 15 MB. Split it by financial year and import each part."); return; }
    setBusy(true);
    try {
      const text = await file.text();
      let raw;
      if (/\.csv$/i.test(file.name)) {
        const parsed = csvToDataFile(text);
        if (parsed.error) { setParseError(parsed.error); return; }
        raw = parsed.file;
      } else {
        try { raw = JSON.parse(text); } catch { setParseError("This file is not valid JSON. Open the example below to see what it should look like."); return; }
      }
      const res = normalizeDataFile(raw);
      setChecked(res);
      if (res.issues.some((i) => i.where === "File")) return;
      const ex = await loadExisting(workspaceId);
      setExisting(ex);
    } catch (err) {
      setParseError(err?.message || "This file could not be read.");
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    setConfirmOpen(false);
    setBusy(true);
    setProgress("Starting…");
    try {
      const res = await runImport(plan, { workspaceId, fiscalYears, existing, maxNewEvents, onProgress: (label, done, total) => setProgress(`${label} (${Math.min(done, total)} of ${total})`) });
      setResult(res);
      ["Client", "Event", "FinancialTransaction", "FinancialYear"].forEach((n) => invalidateRelated(queryClient, n));
      refreshFY?.();
    } catch (err) {
      setResult({ clients: 0, events: 0, payments: 0, yearsCreated: [], skippedNoFy: 0, failed: [err?.message || "The import stopped unexpectedly."] });
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  // The file narrowed to the chosen year, and what importing it would do. Re-worked whenever the choice changes.
  const fileYears = useMemo(() => (checked ? fyLabelsInFile(checked.data) : []), [checked]);
  const plan = useMemo(
    () => (checked && existing && importFy && !checked.issues.some((i) => i.where === "File") ? planImport(filterDataByFy(checked.data, importFy), existing, fiscalYears) : null),
    [checked, existing, importFy, fiscalYears]
  );
  const errors = checked?.issues.filter((i) => i.level === "error") || [];
  const warnings = checked?.issues.filter((i) => i.level === "warning") || [];
  const shownIssues = showAllIssues ? checked?.issues : checked?.issues.slice(0, 6);
  // Payments of the chosen year's events that carry a date in a different year: they are saved under the year of their own date.
  const paymentsInOtherYears = useMemo(() => {
    if (!checked || !importFy || importFy === "all") return 0;
    return filterDataByFy(checked.data, importFy).events.flatMap((e) => e.payments).filter((p) => fyForDate(p.date) !== importFy).length;
  }, [checked, importFy]);
  const yearLabel = importFy === "all" ? "all years in the file" : `FY ${importFy}`;
  const nothingToAdd = plan && plan.counts.clients + plan.counts.events + plan.counts.payments === 0;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader title="Import & Export" subtitle="Move your clients, events and payments in or out as a JSON or CSV file, or download Excel reports." />

      <Card title="Export your data">
        <p className="text-sm text-muted-foreground">Pick a range once; it is used by every download below. Voided payments are left out of the JSON and CSV files. An event is counted by its first date and comes with all of its payments, even ones received in a later year.</p>
        <div className="mt-4">
          <ExportRangePicker fiscalYears={fiscalYears} defaultFyId={selectedFY?.id} onChange={setExportRange} />
        </div>
        <h3 className="text-sm font-semibold text-foreground mt-1">JSON or CSV <span className="font-normal text-muted-foreground">· free on every plan</span></h3>
        <p className="text-xs text-muted-foreground mt-1 mb-3">One file with your clients, events and payments. Keep it as a backup, open the CSV in Excel, or import it into another Kramasha account.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" disabled={!!exporting || !workspaceId || !exportRange} onClick={() => exportNow("json")}>
            {exporting === "json" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5" />} Download JSON
          </Button>
          <Button variant="outline" size="sm" disabled={!!exporting || !workspaceId || !exportRange} onClick={() => exportNow("csv")}>
            {exporting === "csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Download CSV
          </Button>
        </div>
        <div className="border-t border-border mt-5 pt-4">
          <ExcelExportCard exportRange={exportRange} />
        </div>
      </Card>

      <Card title="Import from a file">
        <p className="text-sm text-muted-foreground">Choose a JSON or CSV file, then say which financial year the data is for. You see exactly what will be added before anything is saved, and anything already in your account is skipped, so importing the same file twice does not double anything.</p>

        <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" onChange={onPick} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="mt-3 w-full flex items-center gap-3 border-2 border-dashed border-border rounded-xl p-4 text-left hover:border-primary/40 transition-colors disabled:opacity-50">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0"><Upload className="w-5 h-5 text-muted-foreground" /></div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{fileName || "Choose a JSON or CSV file"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{fileName ? "Choose another file to start again" : "Tap to select a file"}</div>
          </div>
        </button>

        {busy && !result && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" /><span>{progress || "Reading the file…"}</span>
          </div>
        )}
        {parseError && (
          <div className="mt-3 flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{parseError}</span></div>
        )}
        {checked && !plan && checked.issues.some((i) => i.where === "File") && (
          <div className="mt-3 flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"><XCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{checked.issues[0].message}</span></div>
        )}

        {checked && existing && !result && !checked.issues.some((i) => i.where === "File") && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Which financial year is this data for? <span className="text-destructive">*</span></label>
              <Select value={importFy} onChange={(e) => setImportFy(e.target.value)} className="w-full">
                <option value="">Select the financial year…</option>
                {fileYears.map((y) => <option key={y} value={y}>FY {y}</option>)}
                {fileYears.length > 1 && <option value="all">All years in this file</option>}
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                {fileYears.length > 0 ? `The dates in this file fall in ${fileYears.map((y) => "FY " + y).join(", ")}. ` : ""}
                Only the year you pick is imported, so data from other years is left out. The wrong year would put these records into the wrong reports and totals.
              </p>
            </div>

            {plan && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[["New clients", plan.counts.clients], ["New events", plan.counts.events], ["New payments", plan.counts.payments]].map(([label, n]) => (
                    <div key={label} className="rounded-xl border border-border bg-background px-3 py-2.5">
                      <div className="text-xl font-bold tabular-nums text-foreground">{n}</div>
                      <div className="text-[11px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
                {(plan.counts.eventsExisting > 0 || plan.counts.paymentsExisting > 0) && (
                  <p className="text-xs text-muted-foreground">Already in your account and skipped: {plan.counts.eventsExisting} events, {plan.counts.paymentsExisting} payments.</p>
                )}
                {plan.counts.yearsToCreate > 0 && (
                  <div className="flex items-start gap-2 text-sm text-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <CalendarPlus className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>You do not have {plan.missingYears.join(", ")} yet, so {plan.missingYears.length > 1 ? "they" : "it"} will be created for you when you import. {plan.missingYears.length > 1 ? "They are" : "It is"} added as {plan.missingYears.length > 1 ? "extra years" : "an extra year"}, and your current active year does not change.</span>
                  </div>
                )}
                {plan.counts.events > maxNewEvents && (
                  <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Your plan has room for {maxNewEvents} more {maxNewEvents === 1 ? "event" : "events"}, so only the first {maxNewEvents} will be added. <Link to="/plan" className="underline font-medium">Upgrade to Pro</Link> to bring in all {plan.counts.events}.</span>
                  </div>
                )}
              </>
            )}

            {checked.issues.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 text-xs font-medium bg-muted/50 text-foreground">
                  {errors.length > 0 && <span className="text-destructive">{errors.length} to fix (skipped)</span>}
                  {errors.length > 0 && warnings.length > 0 && <span className="text-muted-foreground"> · </span>}
                  {warnings.length > 0 && <span className="text-warning">{warnings.length} to check</span>}
                </div>
                <ul className="divide-y divide-border">
                  {shownIssues.map((i, k) => (
                    <li key={k} className="px-3 py-2 text-xs flex gap-2">
                      {i.level === "error" ? <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />}
                      <span><span className="font-medium text-foreground">{i.where}.</span> <span className="text-muted-foreground">{i.message}</span></span>
                    </li>
                  ))}
                </ul>
                {checked.issues.length > 6 && (
                  <button type="button" onClick={() => setShowAllIssues((v) => !v)} className="w-full px-3 py-2 text-xs font-medium text-primary border-t border-border hover:bg-muted/40">
                    {showAllIssues ? "Show fewer" : `Show all ${checked.issues.length}`}
                  </button>
                )}
              </div>
            )}

            {!importFy ? (
              <p className="text-sm text-muted-foreground">Pick the financial year above to see what will be added.</p>
            ) : nothingToAdd ? (
              <p className="text-sm text-muted-foreground">There is nothing new to add from this file for {yearLabel}.</p>
            ) : (
              <Button variant="primary" className="w-full" disabled={busy || planLoading} onClick={() => setConfirmOpen(true)}>
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress}</> : <><Upload className="w-4 h-4" /> Import {plan.counts.events} events and {plan.counts.payments} payments</>}
              </Button>
            )}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-3">
            <div className={cn("flex items-start gap-2 text-sm rounded-lg px-3 py-2", result.failed.length ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>
              {result.failed.length ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>Added {result.clients} clients, {result.events} events and {result.payments} payments{result.yearsCreated.length ? `, and created ${result.yearsCreated.join(", ")}` : ""}{result.failed.length ? `. ${result.failed.length} could not be saved.` : "."}{result.skippedNoFy > 0 ? ` ${result.skippedNoFy} payments were skipped because no financial year covers their date.` : ""}</span>
            </div>
            {result.failed.length > 0 && (
              <ul className="rounded-xl border border-border divide-y divide-border">
                {result.failed.slice(0, 10).map((m, k) => <li key={k} className="px-3 py-2 text-xs text-muted-foreground">{m}</li>)}
              </ul>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/events")}>View events</Button>
              <Button variant="ghost" size="sm" onClick={reset}>Import another file</Button>
            </div>
          </div>
        )}
      </Card>

      <AppDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AppDialogContent maxWidth="max-w-md">
          <AppDialogHeader>
            <AppDialogTitle>{importFy === "all" ? "Import every year in this file?" : `Import into FY ${importFy}?`}</AppDialogTitle>
            <AppDialogDescription>
              {plan ? `${plan.counts.events} events, ${plan.counts.payments} payments and ${plan.counts.clients} new clients will be added for ${yearLabel}.` : ""}
            </AppDialogDescription>
          </AppDialogHeader>
          <AppDialogBody className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 rounded-lg px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span><span className="font-semibold">Check the year before you continue.</span> Imported events and payments count in {importFy === "all" ? "those years" : `FY ${importFy}`}&apos;s reports, totals and balances straight away. There is no undo: if the year is wrong, you would have to delete the records one by one.</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Anything already in your account is skipped, not changed.</li>
              {paymentsInOtherYears > 0 && <li>{paymentsInOtherYears} of these payments are dated in another financial year. They are saved under the year of their own date.</li>}
              {plan?.counts.yearsToCreate > 0 && <li>{plan.missingYears.join(", ")} will be created as {plan.missingYears.length > 1 ? "extra years" : "an extra year"}.</li>}
              {plan && plan.counts.events > maxNewEvents && <li>Your plan only has room for {maxNewEvents} more events, so only the first {maxNewEvents} are added.</li>}
              <li>Payments you paid out are saved as expenses on their event.</li>
            </ul>
          </AppDialogBody>
          <AppDialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={doImport}>{importFy === "all" ? "Yes, import all years" : `Yes, import into FY ${importFy}`}</Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>

      <Card title="Writing your own file">
        <p className="text-sm text-muted-foreground">Coming from another app or a sheet of your own? Put your details into this layout and import it. Copy the example, replace the details, and save it with a .json (or .csv) ending.</p>

        <div className="flex items-center gap-2 mt-3">
          {[["json", "JSON"], ["csv", "CSV"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setExampleTab(id)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", exampleTab === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(exampleTab === "json" ? exampleJson : exampleCsv); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ } }}>
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => exampleTab === "json" ? downloadText(exampleJson, "kramasha-example.json", "application/json") : downloadText(exampleCsv, "kramasha-example.csv", "text/csv;charset=utf-8;")}>
              <Download className="w-3.5 h-3.5" /> Example file
            </Button>
          </div>
        </div>
        <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-muted/50 border border-border p-3 text-[11px] leading-relaxed text-foreground scrollbar-thin">{exampleTab === "json" ? exampleJson : exampleCsv}</pre>
        {exampleTab === "csv" && (
          <p className="text-xs text-muted-foreground mt-2">One row per payment, with the event repeated on each row. Columns: {CSV_COLUMNS.join(", ")}. Leave the event blank for a misc payment, and the payment columns blank for an event with none yet. Separate several event dates with a semicolon.</p>
        )}

        <h4 className="text-xs font-semibold text-foreground mt-4 mb-2">What each part means</h4>
        <dl className="rounded-xl border border-border divide-y divide-border text-xs">
          {FIELD_HELP.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[5.5rem_1fr] gap-3 px-3 py-2">
              <dt className="font-medium text-foreground">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground mt-3">Team members and services are not part of this file, so add those inside the app afterwards.</p>
      </Card>
    </div>
  );
}
