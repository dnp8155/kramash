import React, { useState, useRef } from 'react';
import { useWorkspace } from '@/lib/WorkspaceContext';
import {
  exportWorkspaceData,
  importData,
  downloadJson,
  readJsonFile,
  WORKSPACE_SCOPED_ENTITIES,
} from '@/lib/dataTransferService';
import { Database, Download, Upload, FileJson, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DataTools() {
  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const fileInputRef = useRef(null);

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [exportStats, setExportStats] = useState(null);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [importMode, setImportMode] = useState('upsert');
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState('');

  const handleExport = async () => {
    if (!workspaceId) return;
    setExporting(true);
    setExportProgress('Starting...');
    setExportStats(null);
    try {
      const data = await exportWorkspaceData(workspaceId, (entity, current, total) => {
        setExportProgress(`${current}/${total} — ${entity}`);
      });
      const wsName = (workspace?.name || 'workspace').replace(/[^a-zA-Z0-9]/g, '_');
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(data, `kramasha-backup-${wsName}-${date}.json`);
      const totalRecords = data._meta?.total_records || 0;
      setExportStats({ entities: WORKSPACE_SCOPED_ENTITIES.length, records: totalRecords });
      setExportProgress('Export complete!');
    } catch (err) {
      setExportProgress(`Error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setImportError('');
    setImportPreview(null);
    setImportResults(null);
    try {
      const json = await readJsonFile(file);
      const entityNames = Object.keys(json.entities || {});
      const totalRecords = entityNames.reduce((sum, name) => sum + (json.entities[name]?.length || 0), 0);
      setImportPreview({ entityCount: entityNames.length, totalRecords, entityNames, exportedAt: json._meta?.exported_at, sourceWorkspace: json._meta?.workspace_id });
    } catch (err) {
      setImportError(err.message);
    }
  };

  const handleImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    setImportProgress('Starting...');
    setImportResults(null);
    try {
      const json = await readJsonFile(importFile);
      const results = await importData(json, importMode, (entity, current, total) => {
        setImportProgress(`${current}/${total} — ${entity}`);
      });
      setImportResults(results);
      setImportProgress('Import complete!');
    } catch (err) {
      setImportProgress(`Error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const totalImported = importResults && Object.values(importResults).reduce((sum, r) => sum + (r.success || 0), 0);
  const totalFailed = importResults && Object.values(importResults).reduce((sum, r) => sum + (r.failed || 0), 0);

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Data Tools</h1>
              <p className="text-xs text-muted-foreground leading-tight">Export & import workspace data</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Export Data</h2>
                <p className="text-sm text-muted-foreground mt-0.5 leading-snug">Download all workspace data (clients, events, quotations, invoices, financials, team, and more) as a single JSON backup file.</p>
              </div>
            </div>
            {exporting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-3">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" /><span>{exportProgress}</span>
              </div>
            )}
            {exportStats && !exporting && (
              <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-lg px-3 py-2 mb-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" /><span>Exported {exportStats.records} records across {exportStats.entities} entities.</span>
              </div>
            )}
            <button onClick={handleExport} disabled={exporting || !workspaceId} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium rounded-xl py-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-transform">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Exporting...' : 'Export Workspace Data'}
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Import Data</h2>
                <p className="text-sm text-muted-foreground mt-0.5 leading-snug">Upload a previously exported JSON file to restore or migrate data. Upsert mode updates existing records; Insert mode skips duplicates.</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="w-full flex items-center gap-3 border-2 border-dashed border-border rounded-xl p-4 text-left disabled:opacity-50 hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileJson className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{importFile ? importFile.name : 'Choose a JSON file'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Tap to select a backup file'}</div>
              </div>
            </button>
            {importError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mt-3">
                <XCircle className="w-4 h-4 shrink-0" /><span>{importError}</span>
              </div>
            )}
            {importPreview && !importError && (
              <div className="bg-muted/50 rounded-lg p-3 mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileJson className="w-4 h-4 text-muted-foreground" /><span>{importPreview.entityCount} entities</span><span className="text-muted-foreground">·</span><span>{importPreview.totalRecords} records</span>
                </div>
                {importPreview.exportedAt && <div className="text-xs text-muted-foreground">Exported: {new Date(importPreview.exportedAt).toLocaleString()}</div>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {importPreview.entityNames.slice(0, 8).map((name) => (
                    <span key={name} className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">{name}</span>
                  ))}
                  {importPreview.entityNames.length > 8 && <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">+{importPreview.entityNames.length - 8} more</span>}
                </div>
              </div>
            )}
            {importPreview && !importError && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => setImportMode('upsert')} className={`flex-1 text-sm font-medium rounded-lg py-2 border transition-colors ${importMode === 'upsert' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>Upsert (update existing)</button>
                <button onClick={() => setImportMode('insert')} className={`flex-1 text-sm font-medium rounded-lg py-2 border transition-colors ${importMode === 'insert' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>Insert (skip duplicates)</button>
              </div>
            )}
            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mt-3">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" /><span>{importProgress}</span>
              </div>
            )}
            {importResults && !importing && (
              <div className="mt-3 space-y-2">
                <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${totalFailed > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                  {totalFailed > 0 ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>Imported {totalImported} records{totalFailed > 0 && `, ${totalFailed} failed`}</span>
                </div>
                <div className="max-h-48 overflow-y-auto scrollbar-thin border border-border rounded-lg divide-y divide-border">
                  {Object.entries(importResults).map(([name, r]) => (
                    <div key={name} className="flex items-center justify-between px-3 py-1.5 text-xs">
                      <span className="font-medium text-foreground">{name}</span>
                      <div className="flex items-center gap-2">
                        {r.success > 0 && <span className="text-success">{r.success} ok</span>}
                        {r.failed > 0 && <span className="text-destructive">{r.failed} failed</span>}
                        {r.errors.length > 0 && <span className="text-muted-foreground truncate max-w-32" title={r.errors[0]}>{r.errors[0]}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {importPreview && !importError && (
              <button onClick={handleImport} disabled={importing} className="w-full flex items-center justify-center gap-2 bg-foreground text-background font-medium rounded-xl py-3 mt-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-transform">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? 'Importing...' : `Import (${importMode})`}
              </button>
            )}
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">How it works</p>
          <p><strong>Export</strong> reads all data for the current workspace ({workspace?.name || '—'}) and downloads it as a JSON file. <strong>Import</strong> uploads that file and writes records back — use Upsert to overwrite existing records, or Insert to add only new ones. Keep the JSON file safe — it contains all your business data.</p>
        </div>
      </div>
    </div>
  );
}