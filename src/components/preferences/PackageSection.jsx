import { useState, useEffect, useCallback } from "react";
import {
  AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import RoundIconButton from "@/components/common/RoundIconButton";
import Input from "@/components/common/Input";
import { Textarea } from "@/components/ui/textarea";
import Select from "@/components/common/Select";
import { useToast } from "@/components/ui/use-toast";
import { loadPackages, createPackage, updatePackage, deletePackage, migrateLegacyPackageStructure, loadRoles, loadServices } from "@/lib/quotationService";
import { mapToQuotationCategory, QUOTATION_CATEGORIES } from "@/constants/quotationConfig";
import { parseGroups, packageTotal, parseOverride, lineTotal, buildStructure, newItem, addItemToGeneral, INCLUDES_GROUP, GENERAL_GROUP } from "@/lib/packageStructure";
import SharePackageDialog from "@/components/preferences/SharePackageDialog";
import { Package, Pencil, Trash2, Plus, Power, Loader2, ChevronDown, ChevronRight, Lock, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/utils/format";
import { askConfirm } from "@/lib/confirmDialog";

function businessTypeLabel(workspace) {
  const category = mapToQuotationCategory(workspace?.business_category);
  return QUOTATION_CATEGORIES.find((c) => c.value === category)?.label || category;
}

// Package management section for Preferences — list, edit metadata, toggle, delete.
// Package structure (items) is created from the Quotation Editor "Save as Package" flow;
// here admins manage the package's name, description, terms, footer and status. The
// package's category always follows the workspace's configured business type (locked).
export default function PackageSection({ workspaceId, currency = "₹", workspace }) {
  const { toast } = useToast();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const list = await loadPackages(workspaceId);
      // One-time repair: packages saved before team items were generalized to
      // roles still have a specific person's name baked in — fix them in place
      // the first time they're loaded here.
      const repaired = await Promise.all(list.map(async (pkg) => {
        const { changed, structureJson } = migrateLegacyPackageStructure(pkg.structure_json);
        if (!changed) return pkg;
        try {
          return await updatePackage(workspaceId, pkg.id, { ...pkg, structure_json: structureJson });
        } catch {
          return pkg;
        }
      }));
      setPackages(repaired);
    } catch {
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
    if (!await askConfirm(`Delete package "${pkg.name}"? Existing quotations keep their own snapshot.`)) return;
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
          <p className="text-xs">Tap "New package" below to add one. You can also save a quotation as a package from the Quotation Editor.</p>
        </div>
      ) : (
        packages.map((pkg) => {
          const { items, total } = parseStructure(pkg.structure_json);
          const isOpen = !!expanded[pkg.id];
          return (
            <div key={pkg.id} className="border border-border rounded-lg">
              {/* Name and price on the first line; the round action buttons wrap underneath on a narrow phone. */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5">
                <RoundIconButton
                  onClick={() => setExpanded((p) => ({ ...p, [pkg.id]: !p[pkg.id] }))}
                  className="shrink-0"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </RoundIconButton>
                <Package className={cn("w-3.5 h-3.5 shrink-0", pkg.status === "active" ? "text-success" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium flex-1 min-w-[7rem] break-anywhere", pkg.status === "inactive" && "text-muted-foreground line-through")}>{pkg.name}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{items.length} items</span>
                {(parseOverride(pkg.total_override) ?? total) > 0 && (
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">{formatMoney(parseOverride(pkg.total_override) ?? total, currency)}</span>
                )}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <RoundIconButton onClick={() => setSharing(pkg)} className="hover:text-primary hover:border-primary/40 hover:bg-primary/5" aria-label="Share package" title="Share with a client">
                    <Share2 className="w-3.5 h-3.5" />
                  </RoundIconButton>
                  <RoundIconButton onClick={() => setEditing(pkg)} aria-label="Edit package" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </RoundIconButton>
                  <RoundIconButton onClick={() => toggleStatus(pkg)} className="hover:text-warning hover:border-warning/40 hover:bg-warning/5" aria-label="Toggle status" title={pkg.status === "active" ? "Disable" : "Enable"}>
                    <Power className="w-3.5 h-3.5" />
                  </RoundIconButton>
                  <RoundIconButton onClick={() => handleDelete(pkg)} className="hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5" aria-label="Delete package" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </RoundIconButton>
                </div>
              </div>
              {isOpen && (
                <div className="px-4 pb-3 pt-1 border-t border-border space-y-2">
                  {pkg.description && <p className="text-xs text-muted-foreground">{pkg.description}</p>}
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Business Type:</span> {businessTypeLabel(workspace)}
                  </div>
                  {items.length > 0 ? (
                    <div className="rounded-md border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <tbody>
                          {items.map((it, i) => (
                            <tr key={i} className="border-t border-border/50 first:border-t-0">
                              <td className="px-2.5 py-1.5 text-foreground">
                                {it.item_type === "team" ? (it.description || "Role") : (it.name || "Unnamed")}
                              </td>
                              <td className="px-2 py-1.5 text-muted-foreground text-right whitespace-nowrap">
                                {!it.day_date || it.day_date === "uncategorized" ? "General" : it.day_date}
                              </td>
                              <td className="px-2.5 py-1.5 text-right font-medium text-foreground whitespace-nowrap">
                                {formatMoney(lineTotal(it), currency)}
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

      {/* Bottom left, like "Add Template" under the milestone templates. */}
      <div className="flex items-center gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={() => setEditing({})}>
          <Plus className="w-3.5 h-3.5" /> New package
        </Button>
      </div>

      <PackageEditDialog
        open={!!editing}
        pkg={editing}
        workspaceId={workspaceId}
        workspace={workspace}
        currency={currency}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
      />
      <SharePackageDialog open={!!sharing} onClose={() => setSharing(null)} pkg={sharing} workspace={workspace} currency={currency} />
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
        total += lineTotal(it);
      }
    }
  } catch { /* ignore */ }
  return { items, total };
}

const RATE_TYPE_OPTIONS = ["Per Day", "Per Event", "Fixed", "Per Unit"];
const KIND_OPTIONS = [{ value: "role", label: "Role" }, { value: "service", label: "Service" }, { value: "custom", label: "Item" }];

// A dropdown of the workspace's roles or services. A row saved earlier whose name is no longer in the list
// (renamed or removed) stays selectable under its own name, so opening a package never silently drops it.
function ListPicker({ list, item, noun, onPick }) {
  const matchId = list.find((x) => x.id === item.reference_id || (item.name && x.name === item.name))?.id || "";
  const orphan = !matchId && item.name ? item.name : "";
  return (
    <Select value={matchId || (orphan ? "__current" : "")} onChange={(e) => e.target.value !== "__current" && onPick(e.target.value)} className="w-full">
      <option value="">{list.length === 0 ? `No ${noun}s set up yet` : `Select ${noun}`}</option>
      {orphan && <option value="__current">{orphan}</option>}
      {list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
    </Select>
  );
}

function groupTitle(g) {
  if (g.day_date === INCLUDES_GROUP) return "Includes / Deliverables";
  if (g.day_date === GENERAL_GROUP) return "General";
  return g.phase_title || g.day_date;
}

// New package (pkg has no id) or edit an existing one: details, items (roles and other lines with quantity, days and
// rate), terms and footer. Package items used to be changeable only by saving a quotation as a package.
function PackageEditDialog({ open, pkg, workspaceId, workspace, currency, onClose, onSaved }) {
  const { toast } = useToast();
  const isNew = !pkg?.id;
  const [form, setForm] = useState({ name: "", description: "", terms_and_conditions: "", footer_message: "", status: "active" });
  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [price, setPrice] = useState("");
  // The workspace's own roles and services: a row picks from these instead of typing the name.
  const [roles, setRoles] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    if (!open || !workspaceId) return;
    let cancelled = false;
    Promise.all([loadRoles(workspaceId), loadServices(workspaceId)])
      .then(([r, s]) => { if (!cancelled) { setRoles(r.filter((x) => x.status !== "inactive")); setServices(s); } })
      .catch(() => { /* the lists just stay empty */ });
    return () => { cancelled = true; };
  }, [open, workspaceId]);

  useEffect(() => {
    if (pkg) {
      setForm({
        name: pkg.name || "",
        description: pkg.description || "",
        terms_and_conditions: pkg.terms_and_conditions || "",
        footer_message: pkg.footer_message || "",
        status: pkg.status || "active"
      });
      setGroups(parseGroups(pkg.structure_json));
      setPrice(pkg.total_override != null ? String(pkg.total_override) : "");
    }
  }, [pkg]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const patchItem = (gi, ii, patch) => setGroups((gs) => gs.map((g, a) => (a === gi ? { ...g, items: g.items.map((it, b) => (b === ii ? { ...it, ...patch } : it)) } : g)));
  const removeItem = (gi, ii) => setGroups((gs) => gs.map((g, a) => (a === gi ? { ...g, items: g.items.filter((_, b) => b !== ii) } : g)));
  const addItem = (kind) => setGroups((gs) => addItemToGeneral(gs, newItem(kind)));
  // Changing a row's type clears what was picked for the old type.
  const changeKind = (gi, ii, kind) => patchItem(gi, ii, { item_type: kind, name: "", description: "", reference_id: "" });
  // Picking a role or service fills in its name and default rate, like the quotation editor does; the rate can still be edited.
  const pickRole = (gi, ii, roleId) => {
    const r = roles.find((x) => x.id === roleId);
    patchItem(gi, ii, r ? { reference_id: r.id, name: r.name, unit_rate: r.default_rate || 0, rate_type: r.rate_type || "Per Event" } : { reference_id: "", name: "" });
  };
  const pickService = (gi, ii, serviceId) => {
    const s = services.find((x) => x.id === serviceId);
    patchItem(gi, ii, s
      ? { reference_id: s.id, name: s.name, description: s.description || "", unit_rate: s.default_rate || 0, rate_type: s.rate_type || "Fixed", gst_rate: s.gst_rate || 0, sac_code: s.sac_code || "" }
      : { reference_id: "", name: "", description: "" });
  };
  const total = packageTotal(groups);
  const priceNum = parseOverride(price);
  const margin = priceNum === null ? 0 : priceNum - total;

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Package name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const category = mapToQuotationCategory(workspace?.business_category);
      const payload = { ...pkg, ...form, category, structure_json: buildStructure(groups) };
      // Only touch the price when one is typed or the package already had the field, so older databases keep working.
      if (priceNum !== null || "total_override" in (pkg || {})) payload.total_override = priceNum;
      const saved = isNew ? await createPackage(workspaceId, payload) : await updatePackage(workspaceId, pkg.id, payload);
      toast({ title: isNew ? "Package created" : "Package updated" });
      onSaved(saved);
      onClose();
    } catch (e) {
      toast({ title: isNew ? "Failed to create package" : "Failed to update package", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onClose}>
      <AppDialogContent maxWidth="max-w-2xl">
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" /> {isNew ? "New Package" : "Edit Package"}
          </AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Package Name</label>
            <Input value={form.name} onChange={set("name")} placeholder="Enter package name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
            <Input value={form.description} onChange={set("description")} placeholder="What's included in this package" />
          </div>

          <div className="rounded-xl border border-border p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-foreground">Items</div>
              {total > 0 && <div className="text-xs text-muted-foreground">Items total <span className="font-semibold text-foreground">{formatMoney(total, currency)}</span></div>}
            </div>
            {groups.every((g) => g.items.length === 0) && (
              <p className="text-xs text-muted-foreground">No items yet. Add the roles and items this package includes, with their rates.</p>
            )}
            {groups.map((g, gi) => g.items.length > 0 && (
              <div key={gi} className="space-y-2">
                {groups.filter((x) => x.items.length > 0).length > 1 && (
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{groupTitle(g)}</div>
                )}
                {g.items.map((it, ii) => (
                  <div key={ii} className="space-y-2 rounded-lg bg-muted/30 border border-border/60 p-2">
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end">
                      <div className="col-span-2 sm:col-span-2">
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Type</label>
                        <Select value={it.item_type} onChange={(e) => changeKind(gi, ii, e.target.value)} className="w-full">
                          {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          {!KIND_OPTIONS.some((o) => o.value === it.item_type) && <option value={it.item_type}>{it.item_type}</option>}
                        </Select>
                      </div>
                      <div className="col-span-3 sm:col-span-9">
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">{it.item_type === "role" ? "Role" : it.item_type === "service" ? "Service" : "Name"}</label>
                        {it.item_type === "role" || it.item_type === "service" ? (
                          <ListPicker
                            list={it.item_type === "role" ? roles : services}
                            item={it}
                            noun={it.item_type === "role" ? "role" : "service"}
                            onPick={(id) => (it.item_type === "role" ? pickRole(gi, ii, id) : pickService(gi, ii, id))}
                          />
                        ) : (
                          <Input value={it.name || ""} onChange={(e) => patchItem(gi, ii, { name: e.target.value })} placeholder="Enter item name" />
                        )}
                      </div>
                      <RoundIconButton onClick={() => removeItem(gi, ii)} className="col-span-1 mb-0.5 justify-self-center hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5" aria-label="Remove item" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </RoundIconButton>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Rate</label>
                        <Input type="number" inputMode="decimal" min={0} value={it.unit_rate ?? 0} onChange={(e) => patchItem(gi, ii, { unit_rate: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Rate type</label>
                        <Select value={it.rate_type || "Fixed"} onChange={(e) => patchItem(gi, ii, { rate_type: e.target.value })} className="w-full">
                          {RATE_TYPE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                          {!RATE_TYPE_OPTIONS.includes(it.rate_type || "Fixed") && <option value={it.rate_type}>{it.rate_type}</option>}
                        </Select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Qty</label>
                        <Input type="number" inputMode="numeric" min={1} value={it.quantity ?? 1} onChange={(e) => patchItem(gi, ii, { quantity: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Days</label>
                        <Input
                          type="number" inputMode="numeric" min={1}
                          value={it.rate_type === "Per Day" ? (it.days ?? 1) : 1}
                          disabled={it.rate_type !== "Per Day"}
                          title={it.rate_type === "Per Day" ? undefined : "Days count only when the rate type is Per Day"}
                          onChange={(e) => patchItem(gi, ii, { days: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Amount</label>
                        <div className="h-9 px-3 flex items-center text-sm font-semibold text-foreground bg-card border border-border rounded-lg tabular-nums">{formatMoney(lineTotal(it), currency)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => addItem("role")}><Plus className="w-3.5 h-3.5" /> Add role</Button>
              <Button size="sm" variant="outline" onClick={() => addItem("service")}><Plus className="w-3.5 h-3.5" /> Add service</Button>
              <Button size="sm" variant="outline" onClick={() => addItem("custom")}><Plus className="w-3.5 h-3.5" /> Add item</Button>
            </div>

            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-muted-foreground">Package price (what you charge)</label>
                <div className="flex items-center gap-2">
                  <Input type="number" inputMode="decimal" min={0} placeholder={String(total)} value={price} onChange={(e) => setPrice(e.target.value)} className="w-36 text-right" />
                  {price !== "" && <button type="button" onClick={() => setPrice("")} className="text-xs text-primary underline shrink-0">Reset</button>}
                </div>
              </div>
              {priceNum !== null && priceNum !== total ? (
                <p className={cn("text-[11px] font-medium", margin >= 0 ? "text-success" : "text-destructive")}>
                  {margin >= 0 ? `Your margin: ${formatMoney(margin, currency)}` : `Below the items total by ${formatMoney(-margin, currency)}`}
                  <span className="font-normal text-muted-foreground"> · clients never see it</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Leave empty to charge the items total. Type a higher price to keep a margin; clients only see the package price.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Business Type</label>
              <div className="h-9 px-3 flex items-center gap-1.5 text-sm bg-muted/50 border border-border rounded-lg text-muted-foreground">
                <Lock className="w-3 h-3 shrink-0" />
                <span className="truncate">{businessTypeLabel(workspace)}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <Select value={form.status} onChange={set("status")} className="w-full">
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
            <Textarea value={form.footer_message} onChange={set("footer_message")} rows={2} placeholder="Thank-you note shown on the quotation and on the shared package image" />
          </div>
          <p className="text-xs text-muted-foreground">The price is what you charge. Clients never see your margin. Business type follows your setting in Preferences → Business Type.</p>
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name.trim()}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : isNew ? "Create Package" : "Save Changes"}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
