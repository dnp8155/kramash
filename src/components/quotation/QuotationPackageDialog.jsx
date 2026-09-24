import { useState, useEffect, useMemo } from "react";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { loadPackages, createPackage, deletePackage, serializePackageStructure } from "@/lib/quotationService";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Package, Trash2, Check, AlertCircle } from "lucide-react";
import { lineTotal } from "@/lib/quotationCalc";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";

export default function QuotationPackageDialog({
  open, onClose, workspaceId, items, onApplyPackage, readOnly, currency = "₹"
}) {
  const [tab, setTab] = useState("apply");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const { saving, start, stop } = useSubmitGuard();
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !workspaceId) return;
    setLoading(true);
    loadPackages(workspaceId)
      .then(setPackages)
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, [open, workspaceId]);

  const handleSave = async () => {
    if (!pkgName.trim()) {
      toast({ title: "Package name is required", variant: "destructive" });
      return;
    }
    if (!items || items.length === 0) {
      toast({ title: "No items to save", description: "Add items with prices to the quotation first.", variant: "destructive" });
      return;
    }
    if (!start()) return;
    try {
      const structureJson = serializePackageStructure(items);
      await createPackage(workspaceId, { name: pkgName, description: pkgDesc, structure_json: structureJson });
      toast({ title: "Package saved", description: pkgName });
      setPkgName("");
      setPkgDesc("");
      const refreshed = await loadPackages(workspaceId);
      setPackages(refreshed);
      setTab("apply");
    } catch (e) {
      toast({ title: "Failed to save package", description: e?.message, variant: "destructive" });
    } finally {
      stop();
    }
  };

  const handleDelete = async (pkgId, name) => {
    if (!window.confirm(`Delete package "${name}"? Existing quotations keep their own snapshot.`)) return;
    try {
      await deletePackage(workspaceId, pkgId);
      setPackages(packages.filter((p) => p.id !== pkgId));
      toast({ title: "Package deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onClose}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" /> Quotation Packages
          </AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody>
          <div className="flex gap-2 border-b border-border pb-2 mb-3">
            <button onClick={() => setTab("apply")}
              className={`text-sm font-medium px-3 py-1.5 rounded-t-lg transition-colors ${tab === "apply" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
              Apply Package
            </button>
            <button onClick={() => setTab("save")}
              className={`text-sm font-medium px-3 py-1.5 rounded-t-lg transition-colors ${tab === "save" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
              Save as Package
            </button>
          </div>

          {tab === "apply" && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading packages…</p>
              ) : packages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No packages saved yet. Create one from the "Save as Package" tab.</p>
              ) : (
                packages.map((pkg) => {
                  let pkgItems = [];
                  let pkgTotal = 0;
                  try {
                    const days = JSON.parse(pkg.structure_json || "[]");
                    for (const d of days) {
                      for (const it of (d.items || [])) {
                        pkgItems.push(it);
                        pkgTotal += Number(it.unit_rate || 0) * Number(it.quantity || 0) * Number(it.days || 1);
                      }
                    }
                  } catch { /* ignore */ }
                  return (
                    <div key={pkg.id} className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{pkg.name}</div>
                          {pkg.description && <div className="text-xs text-muted-foreground truncate">{pkg.description}</div>}
                        </div>
                        {!readOnly && (
                          <>
                            <Button size="sm" variant="dark" onClick={() => { onApplyPackage(pkg); onClose(); }}>
                              <Check className="w-3 h-3" /> Apply
                            </Button>
                            <button onClick={() => handleDelete(pkg.id, pkg.name)} className="text-muted-foreground hover:text-destructive p-1.5">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{pkgItems.length} items</span>
                        {pkgTotal > 0 && (
                          <span className="font-medium text-foreground">Total: {currency}{pkgTotal.toLocaleString("en-IN")}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "save" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Save the current quotation structure (days, team, services, custom items) <strong className="text-foreground">with prices</strong> as a reusable package. Applying a package later will populate the structure with saved rates — you can still edit everything after applying.</p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Package Name</label>
                <Input value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder="e.g. Premium Wedding Package" disabled={readOnly} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description (optional)</label>
                <Input value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} placeholder="What's included in this package" disabled={readOnly} />
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Items in this package ({items?.length || 0})</span>
                  {items?.length > 0 && (
                    <span className="text-xs font-semibold text-primary">
                      Total: {currency}{items.reduce((sum, it) => sum + (Number(lineTotal(it)) || 0), 0).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <div className="max-h-[180px] overflow-y-auto">
                  {(!items || items.length === 0) ? (
                    <div className="px-3 py-4 flex items-center gap-2 text-xs text-destructive">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>No items in quotation yet. Add items first, then save as package.</span>
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <tbody>
                        {items.map((it, i) => (
                          <tr key={i} className="border-t border-border/50">
                            <td className="px-3 py-1.5 text-foreground">{it.name || "Unnamed"}</td>
                            <td className="px-2 py-1.5 text-muted-foreground text-right whitespace-nowrap">{it.day_date || "—"}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-foreground whitespace-nowrap">
                              {currency}{(Number(lineTotal(it)) || 0).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </AppDialogBody>

        <AppDialogFooter>
          {tab === "save" && (
            <Button onClick={handleSave} disabled={saving || readOnly || !pkgName.trim() || !items?.length}>
              <Plus className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save Package"}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}