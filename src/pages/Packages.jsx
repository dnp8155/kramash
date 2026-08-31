import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import StatCard from "@/components/common/StatCard";
import SearchInput from "@/components/common/SearchInput";
import EmptyState from "@/components/common/EmptyState";
import PackageForm from "@/components/packages/PackageForm";
import { PACKAGE_CATEGORIES, categoryLabel, parseItems, deletePackage } from "@/lib/packageService";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Package, Tag, CheckCircle2, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

const CATEGORY_COLOR = {
  wedding: "bg-pink-100 text-pink-700",
  pre_wedding: "bg-rose-100 text-rose-700",
  event: "bg-blue-100 text-blue-700",
  corporate: "bg-indigo-100 text-indigo-700",
  portrait: "bg-amber-100 text-amber-700",
  general: "bg-muted text-muted-foreground"
};

export default function Packages() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["packages", workspaceId],
    queryFn: () => base44.entities.Package.filter({ workspace_id: workspaceId }, "sort_order"),
    enabled: !!workspaceId
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", workspaceId],
    queryFn: () => base44.entities.Service.filter({ workspace_id: workspaceId }),
    enabled: !!workspaceId
  });

  const filtered = packages.filter((p) => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const stats = {
    total: packages.length,
    active: packages.filter((p) => p.is_active !== false).length,
    avgPrice: packages.length > 0
      ? Math.round(packages.reduce((sum, p) => sum + Number(p.total_price || 0), 0) / packages.length)
      : 0
  };

  const refresh = () => invalidateEntities(queryClient, ["Package"]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePackage(deleteTarget.id);
      toast({ title: "Package deleted" });
      refresh();
    } catch (e) {
      toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleActive = async (pkg) => {
    try {
      await base44.entities.Package.update(pkg.id, { is_active: pkg.is_active === false });
      refresh();
    } catch (e) {
      toast({ title: "Failed to update", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Packages"
        subtitle="Create reusable bundles of services with combined pricing."
      >
        <Button onClick={() => { setEditingPkg(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> New Package
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Packages" value={stats.total} icon={Package} tone="primary" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} tone="success" />
        <StatCard label="Avg. Price" value={`₹${stats.avgPrice.toLocaleString("en-IN")}`} icon={Tag} tone="warning" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search packages..." className="w-56" />
        <select
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {PACKAGE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading packages...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState title="No packages found" description="Create a reusable package bundle to speed up your quotations." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pkg) => {
            const items = parseItems(pkg.items_json);
            return (
              <Card key={pkg.id} className="p-5 hover:shadow-card-hover transition-shadow flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{pkg.name}</h3>
                    {pkg.category && (
                      <span className={cn("inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1", CATEGORY_COLOR[pkg.category])}>
                        {categoryLabel(pkg.category)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleActive(pkg)}
                    className="shrink-0"
                    title={pkg.is_active === false ? "Activate" : "Deactivate"}
                  >
                    {pkg.is_active === false
                      ? <XCircle className="w-4 h-4 text-muted-foreground" />
                      : <CheckCircle2 className="w-4 h-4 text-success" />}
                  </button>
                </div>
                {pkg.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{pkg.description}</p>
                )}
                <div className="flex-1 space-y-1 mb-3">
                  {items.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{item.name || "Custom"} ×{item.quantity || 1}</span>
                      <span className="font-medium tabular-nums">₹{((Number(item.unit_rate) || 0) * (Number(item.quantity) || 1) * (Number(item.days) || 1)).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                  {items.length > 4 && (
                    <div className="text-xs text-muted-foreground">+{items.length - 4} more items</div>
                  )}
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground italic">No items</div>
                  )}
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
                    <div className="text-lg font-bold text-foreground tabular-nums">₹{Number(pkg.total_price || 0).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => { setEditingPkg(pkg); setShowForm(true); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(pkg)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PackageForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={refresh}
        pkg={editingPkg}
        workspaceId={workspaceId}
        services={services}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}