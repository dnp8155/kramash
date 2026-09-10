import { Plus, Trash2, Calendar } from "lucide-react";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import { lineTotal } from "@/utils/quotation";
import { formatCurrency, formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";

const MEMBER_SIDES = ["Bride Side", "Groom Side", "Common", "Others"];

// Day/Phase-based quotation item builder.
// Replaces the flat QuotationItemEditor with a date-grouped structure.
//
// Each included date shows a day card with:
//   - Phase/function title input (custom text)
//   - Items for that day (team roles, services, custom items)
//   - Add Team Role / Add Service / Add Custom buttons
//
// Items without a day_date appear in an "Ungrouped Items" section.
//
// Responsive: day cards stack vertically, item rows become stacked cards on mobile.
export default function QuotationDayBuilder({
  items,
  services,
  roles,
  teamMembers = [],
  gstEnabled,
  allDates = [],
  excludedDates = [],
  onToggleDate,
  onChange,
}) {
  const activeServices = (services || []).filter((s) => s.status === "active");
  const activeRoles = (roles || []).filter((r) => r.status === "active");
  const includedDates = allDates.filter((d) => !excludedDates.includes(d));

  // Group items by day_date
  const itemsByDate = {};
  const ungroupedItems = [];
  items.forEach((item, idx) => {
    if (item.day_date) {
      if (!itemsByDate[item.day_date]) itemsByDate[item.day_date] = [];
      itemsByDate[item.day_date].push({ item, idx });
    } else {
      ungroupedItems.push({ item, idx });
    }
  });

  const update = (idx, field, value) => {
    const next = items.map((it, i) =>
      i === idx ? { ...it, [field]: value } : it
    );
    next[idx] = { ...next[idx], line_total: lineTotal(next[idx]) };
    onChange(next);
  };

  const remove = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const addRole = (dayDate) => {
    const role = activeRoles[0];
    onChange([
      ...items,
      {
        item_type: "role",
        reference_id: role?.id || null,
        team_member_id: null,
        name: role?.name || "",
        description: "",
        quantity: 1,
        days: 1,
        unit_rate: role?.default_rate || 0,
        gst_rate: null,
        sac_code: "",
        day_date: dayDate || null,
        phase_title: dayDate ? getPhaseTitle(dayDate) : "",
        member_side: "",
        line_total: lineTotal({ quantity: 1, days: 1, unit_rate: role?.default_rate || 0 }),
        sort_order: items.length,
      },
    ]);
  };

  const addService = (dayDate) => {
    const svc = activeServices[0];
    onChange([
      ...items,
      {
        item_type: "service",
        reference_id: svc?.id || null,
        provider_id: null,
        is_addon: false,
        name: svc?.name || "",
        description: svc?.description || "",
        quantity: 1,
        days: 1,
        unit_rate: svc?.default_rate || 0,
        gst_rate: gstEnabled ? svc?.gst_rate || null : null,
        sac_code: svc?.sac_code || "",
        day_date: dayDate || null,
        phase_title: dayDate ? getPhaseTitle(dayDate) : "",
        member_side: "",
        line_total: lineTotal({ quantity: 1, days: 1, unit_rate: svc?.default_rate || 0 }),
        sort_order: items.length,
      },
    ]);
  };

  const addCustom = (dayDate) => {
    onChange([
      ...items,
      {
        item_type: "custom",
        reference_id: null,
        name: "",
        description: "",
        quantity: 1,
        days: 1,
        unit_rate: 0,
        gst_rate: null,
        sac_code: "",
        day_date: dayDate || null,
        phase_title: dayDate ? getPhaseTitle(dayDate) : "",
        member_side: "",
        line_total: 0,
        sort_order: items.length,
      },
    ]);
  };

  const getPhaseTitle = (date) => {
    const dayItems = itemsByDate[date] || [];
    return dayItems.length > 0 ? dayItems[0].item.phase_title || "" : "";
  };

  const setPhaseTitle = (date, title) => {
    const next = items.map((it) =>
      it.day_date === date ? { ...it, phase_title: title } : it
    );
    onChange(next);
  };

  const handleServiceSelect = (idx, serviceId) => {
    const svc = activeServices.find((s) => s.id === serviceId);
    if (!svc) return;
    const next = [...items];
    next[idx] = {
      ...next[idx],
      reference_id: svc.id,
      name: svc.name,
      description: svc.description || "",
      unit_rate: svc.default_rate || 0,
      gst_rate: gstEnabled ? svc.gst_rate || null : null,
      sac_code: svc.sac_code || "",
    };
    next[idx].line_total = lineTotal(next[idx]);
    onChange(next);
  };

  const handleRoleSelect = (idx, roleId) => {
    const role = activeRoles.find((r) => r.id === roleId);
    if (!role) return;
    const next = [...items];
    next[idx] = {
      ...next[idx],
      reference_id: role.id,
      name: role.name,
      unit_rate: role.default_rate || 0,
    };
    next[idx].line_total = lineTotal(next[idx]);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Date chips */}
      {allDates.length > 1 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> Project Dates — tap to include/exclude
          </p>
          <div className="flex flex-wrap gap-2">
            {allDates.map((d) => {
              const excluded = excludedDates.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onToggleDate?.(d)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    excluded
                      ? "border-border bg-muted/30 text-muted-foreground/50 line-through"
                      : "border-primary/30 bg-primary/10 text-primary"
                  )}
                >
                  {formatDate(d, "dd MMM")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day cards */}
      {includedDates.map((date) => {
        const dayItems = itemsByDate[date] || [];
        const dayTotal = dayItems.reduce((s, { item }) => s + (item.line_total || 0), 0);
        return (
          <div key={date} className="rounded-xl border border-border bg-card">
            {/* Day header */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {new Date(date + "T00:00:00").getDate()}
              </div>
              <input
                type="text"
                value={getPhaseTitle(date)}
                onChange={(e) => setPhaseTitle(date, e.target.value)}
                placeholder="Function / Phase title (e.g. Haldi, Sangeet, Site Measurement)"
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-input focus:bg-card focus:outline-none"
              />
              <span className="text-xs font-medium text-muted-foreground">
                {formatDate(date, "dd MMM yyyy")} · {formatCurrency(dayTotal)}
              </span>
            </div>

            {/* Day items */}
            <div className="p-3">
              {dayItems.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  No items for this day. Add a team role, service, or custom item.
                </p>
              ) : (
                <div className="space-y-2">
                  {dayItems.map(({ item, idx }) => (
                    <ItemRow
                      key={idx}
                      item={item}
                      idx={idx}
                      activeServices={activeServices}
                      activeRoles={activeRoles}
                      teamMembers={teamMembers}
                      gstEnabled={gstEnabled}
                      onServiceSelect={handleServiceSelect}
                      onRoleSelect={handleRoleSelect}
                      onUpdate={update}
                      onRemove={remove}
                    />
                  ))}
                </div>
              )}

              {/* Add buttons */}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => addRole(date)} disabled={activeRoles.length === 0}>
                  <Plus className="h-3.5 w-3.5" /> Team Role
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addService(date)} disabled={activeServices.length === 0}>
                  <Plus className="h-3.5 w-3.5" /> Service
                </Button>
                <Button size="sm" variant="outline" onClick={() => addCustom(date)}>
                  <Plus className="h-3.5 w-3.5" /> Custom
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Ungrouped items */}
      {ungroupedItems.length > 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20">
          <div className="border-b border-border px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ungrouped Items (no date)
            </p>
          </div>
          <div className="space-y-2 p-3">
            {ungroupedItems.map(({ item, idx }) => (
              <ItemRow
                key={idx}
                item={item}
                idx={idx}
                activeServices={activeServices}
                activeRoles={activeRoles}
                teamMembers={teamMembers}
                gstEnabled={gstEnabled}
                onServiceSelect={handleServiceSelect}
                onRoleSelect={handleRoleSelect}
                onUpdate={update}
                onRemove={remove}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add ungrouped item buttons (when no dates or for general items) */}
      {allDates.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => addRole(null)} disabled={activeRoles.length === 0}>
            <Plus className="h-4 w-4" /> Add Team Role
          </Button>
          <Button size="sm" variant="secondary" onClick={() => addService(null)} disabled={activeServices.length === 0}>
            <Plus className="h-4 w-4" /> Add Service
          </Button>
          <Button size="sm" variant="outline" onClick={() => addCustom(null)}>
            <Plus className="h-4 w-4" /> Custom Item
          </Button>
        </div>
      )}

      {/* Add ungrouped when dates exist but user wants general items */}
      {allDates.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => addRole(null)} disabled={activeRoles.length === 0}>
            <Plus className="h-3.5 w-3.5" /> Add Team Role (no date)
          </Button>
          <Button size="sm" variant="ghost" onClick={() => addService(null)} disabled={activeServices.length === 0}>
            <Plus className="h-3.5 w-3.5" /> Add Service (no date)
          </Button>
          <Button size="sm" variant="ghost" onClick={() => addCustom(null)}>
            <Plus className="h-3.5 w-3.5" /> Custom Item (no date)
          </Button>
        </div>
      )}

      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          No items yet. {allDates.length > 1 ? "Add items to each day above." : "Add a team role, service, or custom item."}
        </p>
      )}
    </div>
  );
}

// Single item row — responsive: stacked card on mobile, row on desktop
function ItemRow({ item, idx, activeServices, activeRoles, teamMembers = [], gstEnabled, onServiceSelect, onRoleSelect, onUpdate, onRemove }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 sm:p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        {/* Name + description */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {item.item_type === "service" && (
            <Select
              value={item.reference_id || ""}
              onChange={(e) => onServiceSelect(idx, e.target.value)}
              className="!h-9"
            >
              {activeServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          )}
          {item.item_type === "role" && (
            <Select
              value={item.reference_id || ""}
              onChange={(e) => onRoleSelect(idx, e.target.value)}
              className="!h-9"
            >
              {activeRoles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          )}
          {item.item_type === "custom" && (
            <input
              type="text"
              value={item.name}
              onChange={(e) => onUpdate(idx, "name", e.target.value)}
              placeholder="Item name"
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          )}
          <input
            type="text"
            value={item.description || ""}
            onChange={(e) => onUpdate(idx, "description", e.target.value)}
            placeholder="Description (optional)"
            className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
          />
          {item.item_type === "role" && (
            <Select
              value={item.member_side || ""}
              onChange={(e) => onUpdate(idx, "member_side", e.target.value)}
              className="!h-8 !text-xs"
            >
              <option value="">Side (optional)</option>
              {MEMBER_SIDES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          )}
          {item.item_type === "role" && (
            <Select
              value={item.team_member_id || ""}
              onChange={(e) => onUpdate(idx, "team_member_id", e.target.value || null)}
              className="!h-8 !text-xs"
            >
              <option value="">Assign team member (optional)</option>
              {teamMembers.filter((m) => m.status !== "Inactive").map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          )}
          {item.item_type === "service" && (
            <div className="flex items-center gap-2">
              <Select
                value={item.provider_id || ""}
                onChange={(e) => onUpdate(idx, "provider_id", e.target.value || null)}
                className="!h-8 !text-xs"
              >
                <option value="">Provider (optional)</option>
                {teamMembers.filter((m) => m.status !== "Inactive").map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={item.is_addon || false}
                  onChange={(e) => onUpdate(idx, "is_addon", e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                />
                Add-on
              </label>
            </div>
          )}
        </div>

        {/* Qty / Days / Rate / GST / Amount */}
        <div className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
          <div className="w-16">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">Qty</label>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => onUpdate(idx, "quantity", Math.max(1, Number(e.target.value) || 1))}
              className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="w-16">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">Days</label>
            <input
              type="number"
              min="1"
              value={item.days}
              onChange={(e) => onUpdate(idx, "days", Math.max(1, Number(e.target.value) || 1))}
              className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="w-24">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">Rate</label>
            <input
              type="number"
              min="0"
              value={item.unit_rate}
              onChange={(e) => onUpdate(idx, "unit_rate", Math.max(0, Number(e.target.value) || 0))}
              className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          {gstEnabled && (
            <div className="w-16">
              <label className="text-[10px] font-medium uppercase text-muted-foreground">GST %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={item.gst_rate || ""}
                onChange={(e) => onUpdate(idx, "gst_rate", e.target.value ? Number(e.target.value) : null)}
                placeholder="—"
                className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          )}
          <div className="min-w-[80px] text-right">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">Amount</label>
            <p className="py-1.5 text-sm font-semibold text-foreground">
              {formatCurrency(item.line_total || 0)}
            </p>
          </div>
          <button
            onClick={() => onRemove(idx)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}