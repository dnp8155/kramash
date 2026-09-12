import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { Textarea } from "@/components/ui/textarea";
import Select from "@/components/common/Select";
import { useToast } from "@/components/ui/use-toast";
import { loadPackages, updatePackage, deletePackage } from "@/lib/quotationService";
import { Package, Pencil, Trash2, Plus, Power, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/utils/format";

// Package management section for Preferences — list, edit metadata, toggle, delete.
// Package structure (items) is created from the Quotation Editor "Save as Package" flow;
// here admins manage the package's name, description, terms, footer, category and status.
export default function PackageSection({ workspaceId, currency = "₹" }) {
  const { toast } = useToast();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      setPackages(await loadPackages(workspaceId));
    } catch (e) {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (pkg) => {
    const next = pkg.status === "active" ? "inactive" : "active";
    setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, status: next } : p));
    try {
      await updatePackage(workspaceId, pkg.id, { ...pkg, status: next });
      toast({ title: next === "active" ? "Package enabled" : "Package disabled" });
    } catch (e) {
      setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, status: pkg.status } : p));
      toast({ title: "Failed to update package", description: e?.message, variant: "destructive" });
    }
  };

  const handleDelete = async (pkg) => {
    if (!window.confirm(`Delete package "${pkg.name}"? Existing quotations keep their own snapshot.`)) return;
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    try {
      await deletePackage(workspaceId, pkg.id);
      toast({ title: "Package deleted" });
    } catch (e) {
      load();
      toast({ title: "Failed to delete package", description: e?.message, variant: "destructive" });
    }
  };

  const onSaved = (saved) => {
    setPackages((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next;
      }
      return [saved, ...prev];
    });
    load();
  };

  return (
    <div className="space-y-2">
      {loading ? (
        <p className="text-sm text-muted-foreground py-2">Loading packages…</p>
      ) : packages.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2 space-y-1">
          <p>No packages yet.</p>
          <p className="text-xs">Build a quotation in the Quotation Editor, then use "Save as Package" to create a reusable template here.</p>
        </div>
      ) : (
        packages.map((pkg) => {
          const { items, total } = parseStructure(pkg.structure_json);
          const isOpen = !!expanded[pkg.id];
          return (
            <div key={pkg.id} className="border border-border rounded-lg">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [pkg.id]: !p[pkg.id] }))}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <Package className={cn("w-3.5 h-3.5 shrink-0", pkg.status === "active" ? "text-success" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium flex-1 min-w-0 truncate", pkg.status === "inactive" && "text-muted-foreground line-through")}>{pkg.name}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{items.length} items</span>
                {total > 0 && (
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">{formatMoney(total, currency)}</span>
                )}
                <button onClick={() => setEditing(pkg)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Edit package">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleStatus(pkg)} className="text-muted-foreground hover:text-warning shrink-0" aria-label="Toggle status" title={pkg.status === "active" ? "Disable" : "Enable"}>
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(pkg)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Delete package">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {isOpen && (
                <div className="px-4 pb-3 pt-1 border-t border-border space-y-2">
                  {pkg.description && <p className="text-xs text-muted-foreground">{pkg.description}</p>}
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Category:</span> {labelCategory(pkg.category)}
                  </div>
                  {items.length > 0 ? (
                    <div className="rounded-md border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <tbody>
                          {items.map((it, i) => (
                            <tr key={i} className="border-t border-border/50 first:border-t-0">
                              <td className="px-2.5 py-1.5 text-foreground">{it.name || "Unnamed"}</td>
                              <td className="px-2 py-1.5 text-muted-foreground text-right whitespace-nowrap">{it.day_date || "—"}</td>
                              <td className="px-2.5 py-1.5 text-right font-medium text-foreground whitespace-nowrap">
                                {formatMoney((Number(it.unit_rate) || 0) * (Number(it.quantity) || 0) * (Number(it.days) || 1), currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No items in this package.</p>
                  )}
                  {pkg.terms_and_conditions && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Terms</div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{pkg.terms_and_conditions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      <PackageEditDialog
        open={!!editing}
        pkg={editing}
        workspaceId={workspaceId}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
      />
    </div>
  );
}

function parseStructure(json) {
  let items = [];
  let total = 0;
  try {
    const days = JSON.parse(json || "[]");
    for (const d of days) {
      for (const it of (d.items || [])) {
        items.push({ ...it, day_date: d.day_date });
        total += (Number(it.unit_rate) || 0) * (Number(it.quantity) || 0) * (Number(it.days) || 1);
      }
    }
  } catch { /* ignore */ }
  return { items, total };
}

function labelCategory(cat) {
  const map = { PHOTOGRAPHY: "Photography", EVENT_MANAGEMENT: "Event Management", ARCHITECTURE: "Architecture", OTHER: "Other" };
  return map[cat] || cat || "—";
}

function PackageEditDialog({ open, pkg, workspaceId, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", description: "", category: "PHOTOGRAPHY", terms_and_conditions: "", footer_message: "", status: "active" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pkg) {
      setForm({
        name: pkg.name || "",
        description: pkg.description || "",
        category: pkg.category || "PHOTOGRAPHY",
        terms_and_conditions: pkg.terms_and_conditions || "",
        footer_message: pkg.footer_message || "",
        status: pkg.status || "active"
      });
    }
  }, [pkg]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Package name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const saved = await updatePackage(workspaceId, pkg.id, { ...pkg, ...form });
      toast({ title: "Package updated" });
      onSaved(saved);
      onClose();
    } catch (e) {
      toast({ title: "Failed to update package", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" /> Edit Package
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Package Name</label>
            <Input value={form.name} onChange={set("name")} placeholder="e.g. Premium Wedding Package" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
            <Input value={form.description} onChange={set("description")} placeholder="What's included in this package" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
              <Select value={form.category} onChange={set("category")}>
                <option value="PHOTOGRAPHY">Photography</option>
                <option value="EVENT_MANAGEMENT">Event Management</option>
                <option value="ARCHITECTURE">Architecture</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <Select value={form.status} onChange={set("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Default Terms & Conditions</label>
            <Textarea value={form.terms_and_conditions} onChange={set("terms_and_conditions")} rows={3} placeholder="Applied when this package is used" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Default Footer Message</label>
            <Textarea value={form.footer_message} onChange={set("footer_message")} rows={2} placeholder="Thank-you note shown on the quotation" />
          </div>
          <p className="text-xs text-muted-foreground">Package items (structure & rates) are managed from the Quotation Editor. Here you manage the package's metadata, default terms, and status.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name.trim()}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}