import { useState, useEffect, useMemo } from "react";
import { formatMoney } from "@/utils/format";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { loadPackages, createPackage, deletePackage, serializePackageStructure } from "@/lib/quotationService";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Package, Trash2, Check, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { lineTotal } from "@/lib/quotationCalc";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useT } from "@/hooks/useT";

export default function QuotationPackageDialog({
  open, onClose, workspaceId, items, roles = [], onApplyPackage, readOnly, currency = "INR"
}) {
  const t = useT();
  const [tab, setTab] = useState("apply");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [expandedId, setExpandedId] = useState(null);
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
      toast({ title: t("Package name is required"), variant: "destructive" });
      return;
    }
    if (!items || items.length === 0) {
      toast({ title: t("No items to save"), description: t("Add items with prices to the quotation first."), variant: "destructive" });
      return;
    }
    if (!start()) return;
    try {
      const structureJson = serializePackageStructure(items, roles);
      await createPackage(workspaceId, { name: pkgName, description: pkgDesc, structure_json: structureJson });
      toast({ title: t("Package saved"), description: pkgName });
      setPkgName("");
      setPkgDesc("");
      const refreshed = await loadPackages(workspaceId);
      setPackages(refreshed);
      setTab("apply");
    } catch (e) {
      toast({ title: t("Failed to save package"), description: e?.message, variant: "destructive" });
    } finally {
      stop();
    }
  };

  const handleDelete = async (pkgId, name) => {
    if (!window.confirm(`${t("Delete package")} "${name}"? ${t("Existing quotations keep their own snapshot.")}`)) return;
    try {
      await deletePackage(workspaceId, pkgId);
      setPackages(packages.filter((p) => p.id !== pkgId));
      toast({ title: t("Package deleted") });
    } catch (e) {
      toast({ title: t("Delete failed"), description: e?.message, variant: "destructive" });
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onClose}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" /> {t("Quotation Packages")}
          </AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody>
          <div className="flex gap-2 border-b border-border pb-2 mb-3">
            <button onClick={() => setTab("apply")}
              className={`text-sm font-medium px-3 py-1.5 rounded-t-lg transition-colors ${tab === "apply" ? "text-primary border-b-2 border-primary" : "text-muted-foreground sm:hover:text-foreground"}`}>
              {t("Apply Package")}
            </button>
            <button onClick={() => setTab("save")}
              className={`text-sm font-medium px-3 py-1.5 rounded-t-lg transition-colors ${tab === "save" ? "text-primary border-b-2 border-primary" : "text-muted-foreground sm:hover:text-foreground"}`}>
              {t("Save as Package")}
            </button>
          </div>

          {tab === "apply" && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("Loading packages…")}</p>
              ) : packages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("No packages saved yet. Create one from the \"Save as Package\" tab.")}</p>
              ) : (
                packages.map((pkg) => {
                  let days = [];
                  let pkgItemCount = 0;
                  let pkgTotal = 0;
                  try {
                    days = JSON.parse(pkg.structure_json || "[]");
                    for (const d of days) {
                      for (const it of (d.items || [])) {
                        pkgItemCount += 1;
                        pkgTotal += Number(it.unit_rate || 0) * Number(it.quantity || 0) * Number(it.days || 1);
                      }
                    }
                  } catch { /* ignore */ }
                  const isExpanded = expandedId === pkg.id;
                  return (
                    <div key={pkg.id} className="border border-border rounded-lg sm:hover:bg-muted/30 transition-colors">
                      <div className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : pkg.id)}
                            className="flex-1 min-w-0 flex items-center gap-1.5 text-left"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-foreground truncate">{pkg.name}</span>
                              {pkg.description && <span className="block text-xs text-muted-foreground truncate">{pkg.description}</span>}
                            </span>
                          </button>
                          {!readOnly && (
                            <>
                              <Button size="sm" variant="dark" onClick={() => { onApplyPackage(pkg); onClose(); }}>
                                <Check className="w-3 h-3" /> {t("Apply")}
                              </Button>
                              <button onClick={() => handleDelete(pkg.id, pkg.name)} className="text-muted-foreground sm:hover:text-destructive p-1.5">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{pkgItemCount} {t("items")}</span>
                          {pkgTotal > 0 && (
                            <span className="font-medium text-foreground">{t("Total")}: {formatMoney(pkgTotal, currency)}</span>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/20 px-3 py-2 space-y-2">
                          {days.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">{t("No items in this package.")}</p>
                          ) : (
                            days.map((d, di) => (
                              <div key={di}>
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                  {d.phase_title || (d.day_date && d.day_date !== "uncategorized" ? d.day_date : t("General"))}
                                </div>
                                <table className="w-full text-xs">
                                  <tbody>
                                    {(d.items || []).map((it, i) => (
                                      <tr key={i} className="border-t border-border/50 first:border-t-0">
                                        <td className="py-1 text-foreground">
                                          {it.item_type === "team" ? (it.description || it.team_member_name_snapshot || t("Role")) : (it.name || t("Unnamed"))}
                                        </td>
                                        <td className="py-1 text-right font-medium text-foreground whitespace-nowrap">
                                          {formatMoney((Number(it.unit_rate || 0) * Number(it.quantity || 0) * Number(it.days || 1)) || 0, currency)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "save" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("Save the current quotation structure (days, team, services, custom items) with prices as a reusable package. Applying a package later will populate the structure with saved rates — you can still edit everything after applying.")}</p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t("Package Name")}</label>
                <Input value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder={t("Package name")} disabled={readOnly} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t("Description (optional)")}</label>
                <Input value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} placeholder={t("What's included in this package")} disabled={readOnly} />
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{t("Items in this package")} ({items?.length || 0})</span>
                  {items?.length > 0 && (
                    <span className="text-xs font-semibold text-primary">
                      {t("Total")}: {formatMoney(items.reduce((sum, it) => sum + (Number(lineTotal(it)) || 0), 0), currency)}
                    </span>
                  )}
                </div>
                <div className="max-h-[180px] overflow-y-auto">
                  {(!items || items.length === 0) ? (
                    <div className="px-3 py-4 flex items-center gap-2 text-xs text-destructive">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{t("No items in quotation yet. Add items first, then save as package.")}</span>
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <tbody>
                        {items.map((it, i) => (
                          <tr key={i} className="border-t border-border/50">
                            <td className="px-3 py-1.5 text-foreground">
                              {it.item_type === "team" ? (it.description || t("Role")) : (it.name || t("Unnamed"))}
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground text-right whitespace-nowrap">{it.day_date || "—"}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-foreground whitespace-nowrap">
                              {formatMoney(Number(lineTotal(it)) || 0, currency)}
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
              <Plus className="w-3.5 h-3.5" /> {saving ? t("Saving…") : t("Save Package")}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>{t("Close")}</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}