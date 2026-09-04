import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { loadPackages, createPackage, deletePackage, serializePackageStructure } from "@/lib/quotationService";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Package, Trash2, Check } from "lucide-react";

export default function QuotationPackageDialog({
  open, onClose, workspaceId, items, onApplyPackage, readOnly
}) {
  const [tab, setTab] = useState("apply");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pkgName, setPkgName] = useState("");
  const [pkgDesc, setPkgDesc] = useState("");
  const [saving, setSaving] = useState(false);
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
      toast({ title: "No items to save", description: "Add items to the quotation first.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const structureJson = serializePackageStructure(items);
      await createPackage(workspaceId, {
        name: pkgName,
        description: pkgDesc,
        structure_json: structureJson
      });
      toast({ title: "Package saved", description: pkgName });
      setPkgName("");
      setPkgDesc("");
      const refreshed = await loadPackages(workspaceId);
      setPackages(refreshed);
      setTab("apply");
    } catch (e) {
      toast({ title: "Failed to save package", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" /> Quotation Packages
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border pb-2 mb-3">
          <button
            onClick={() => setTab("apply")}
            className={`text-sm font-medium px-3 py-1.5 rounded-t-lg transition-colors ${tab === "apply" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Apply Package
          </button>
          <button
            onClick={() => setTab("save")}
            className={`text-sm font-medium px-3 py-1.5 rounded-t-lg transition-colors ${tab === "save" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
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
              packages.map((pkg) => (
                <div key={pkg.id} className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{pkg.name}</div>
                    {pkg.description && <div className="text-xs text-muted-foreground truncate">{pkg.description}</div>}
                  </div>
                  {!readOnly && (
                    <>
                      <Button
                        size="sm"
                        variant="dark"
                        onClick={() => {
                          onApplyPackage(pkg);
                          onClose();
                        }}
                      >
                        <Check className="w-3 h-3" /> Apply
                      </Button>
                      <button
                        onClick={() => handleDelete(pkg.id, pkg.name)}
                        className="text-muted-foreground hover:text-destructive p-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "save" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Save the current quotation structure (days, team, services, custom items) as a reusable package. Applying a package later will populate the structure — you can still edit everything after applying.</p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Package Name</label>
              <Input value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder="e.g. Premium Wedding Package" disabled={readOnly} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Description (optional)</label>
              <Input value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} placeholder="What's included in this package" disabled={readOnly} />
            </div>
          </div>
        )}

        <DialogFooter>
          {tab === "save" && (
            <Button onClick={handleSave} disabled={saving || readOnly || !pkgName.trim()}>
              <Plus className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save Package"}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}