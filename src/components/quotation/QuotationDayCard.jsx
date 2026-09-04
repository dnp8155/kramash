import { useState } from "react";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import { formatMoney } from "@/utils/format";
import { lineTotal, formatDateChip } from "@/lib/quotationCalc";
import { MEMBER_TYPE_OPTIONS } from "@/constants/quotationConfig";
import { Trash2, Plus, Copy, Users, Package, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function QuotationDayCard({
  date,
  phaseTitle,
  items,
  onUpdatePhaseTitle,
  onAddTeam,
  onAddService,
  onAddCustom,
  onUpdateItem,
  onRemoveItem,
  onDuplicate,
  teamMembers,
  roles,
  services,
  currency,
  readOnly,
  isUncategorized,
  includedDates = []
}) {
  const [addTeamId, setAddTeamId] = useState("");
  const [addServiceId, setAddServiceId] = useState("");
  const [showDuplicate, setShowDuplicate] = useState(false);

  const teamItems = items.filter((it) => it.item_type === "team");
  const serviceItems = items.filter((it) => it.item_type === "service");
  const customItems = items.filter((it) => it.item_type === "custom" || (!it.item_type && !it.team_member_id));
  const otherItems = items.filter((it) => it.item_type === "role");

  const dayTotal = items.reduce((s, it) => s + lineTotal(it), 0);

  const handleAddTeam = () => {
    if (!addTeamId) return;
    onAddTeam(date, addTeamId);
    setAddTeamId("");
  };

  const handleAddService = () => {
    if (!addServiceId) return;
    onAddService(date, addServiceId);
    setAddServiceId("");
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/30 border-b border-border flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
            {isUncategorized ? "General" : formatDateChip(date)}
          </span>
        </div>
        <input
          value={phaseTitle || ""}
          onChange={(e) => onUpdatePhaseTitle(date, e.target.value)}
          disabled={readOnly}
          placeholder="Function / Phase title (e.g. Haldi, Sangeet, Site Measurement)"
          className="flex-1 min-w-[160px] bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted-foreground/50"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(dayTotal, currency)}</span>
          {!readOnly && !isUncategorized && (
            <Button size="sm" variant="ghost" onClick={() => setShowDuplicate(!showDuplicate)}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Duplicate Day inline panel */}
      {showDuplicate && !readOnly && (
        <DuplicateDayInline
          sourceDate={date}
          includedDates={includedDates}
          onDuplicate={onDuplicate}
          onClose={() => setShowDuplicate(false)}
        />
      )}

      {/* Body */}
      <div className="p-3 sm:p-4 space-y-4">
        {/* Team Assignments */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</span>
          </div>
          {teamItems.length === 0 && otherItems.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-1">No team assigned for this day.</p>
          ) : (
            <div className="space-y-2">
              {[...teamItems, ...otherItems].map((it) => (
                <ItemRow
                  key={it._idx ?? it.id ?? Math.random()}
                  item={it}
                  onUpdate={(field, val) => onUpdateItem(it._idx, field, val)}
                  onRemove={() => onRemoveItem(it._idx)}
                  currency={currency}
                  readOnly={readOnly}
                  showMemberType={it.item_type === "team"}
                />
              ))}
            </div>
          )}
          {!readOnly && (
            <div className="flex gap-2 mt-2">
              <Select value={addTeamId} onChange={(e) => setAddTeamId(e.target.value)} className="flex-1 h-8 text-xs">
                <option value="">— Add team member —</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
              <Button size="sm" variant="outline" onClick={handleAddTeam} disabled={!addTeamId}>
                <Plus className="w-3 h-3" />Add
              </Button>
            </div>
          )}
        </div>

        {/* Service Assignments */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Services</span>
          </div>
          {serviceItems.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-1">No services added for this day.</p>
          ) : (
            <div className="space-y-2">
              {serviceItems.map((it) => (
                <ItemRow
                  key={it._idx ?? it.id ?? Math.random()}
                  item={it}
                  onUpdate={(field, val) => onUpdateItem(it._idx, field, val)}
                  onRemove={() => onRemoveItem(it._idx)}
                  currency={currency}
                  readOnly={readOnly}
                  showAddon
                />
              ))}
            </div>
          )}
          {!readOnly && (
            <div className="flex gap-2 mt-2">
              <Select value={addServiceId} onChange={(e) => setAddServiceId(e.target.value)} className="flex-1 h-8 text-xs">
                <option value="">— Add service —</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Button size="sm" variant="outline" onClick={handleAddService} disabled={!addServiceId}>
                <Plus className="w-3 h-3" />Add
              </Button>
            </div>
          )}
        </div>

        {/* Custom Line Items */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custom Items</span>
          </div>
          {customItems.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-1">No custom items for this day.</p>
          ) : (
            <div className="space-y-2">
              {customItems.map((it) => (
                <ItemRow
                  key={it._idx ?? it.id ?? Math.random()}
                  item={it}
                  onUpdate={(field, val) => onUpdateItem(it._idx, field, val)}
                  onRemove={() => onRemoveItem(it._idx)}
                  currency={currency}
                  readOnly={readOnly}
                  showDescription
                />
              ))}
            </div>
          )}
          {!readOnly && (
            <Button size="sm" variant="ghost" onClick={() => onAddCustom(date)} className="mt-2">
              <Plus className="w-3 h-3" />Add Custom Item
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Item Row (stacked card, responsive) ----

function ItemRow({ item, onUpdate, onRemove, currency, readOnly, showMemberType, showAddon, showDescription }) {
  return (
    <div className="bg-muted/20 border border-border/60 rounded-lg p-2.5 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {showDescription ? (
            <input
              value={item.name || ""}
              onChange={(e) => onUpdate("name", e.target.value)}
              disabled={readOnly}
              placeholder="Description (e.g. Drone Coverage)"
              className="w-full text-sm font-medium bg-transparent focus:outline-none placeholder:text-muted-foreground/50"
            />
          ) : (
            <span className="text-sm font-medium text-foreground block truncate">{item.name || "Unnamed"}</span>
          )}
          {item.description && !showDescription && (
            <span className="text-xs text-muted-foreground block truncate">{item.description}</span>
          )}
          {showDescription && (
            <input
              value={item.description || ""}
              onChange={(e) => onUpdate("description", e.target.value)}
              disabled={readOnly}
              placeholder="Notes (optional)"
              className="w-full text-xs text-muted-foreground bg-transparent focus:outline-none placeholder:text-muted-foreground/50 mt-0.5"
            />
          )}
        </div>
        {!readOnly && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-1 shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showMemberType && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground uppercase">Side</span>
            <Select
              value={item.member_type || ""}
              onChange={(e) => onUpdate("member_type", e.target.value)}
              disabled={readOnly}
              className="h-7 text-xs py-0"
            >
              <option value="">—</option>
              {MEMBER_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase">Qty</span>
          <Input type="number" min="0" value={item.quantity} onChange={(e) => onUpdate("quantity", Number(e.target.value))} disabled={readOnly} className="h-7 w-14 text-xs text-right py-0" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase">Rate</span>
          <Input type="number" min="0" value={item.unit_rate} onChange={(e) => onUpdate("unit_rate", Number(e.target.value))} disabled={readOnly} className="h-7 w-24 text-xs text-right py-0" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground uppercase">Amount</span>
          <span className="text-sm font-medium tabular-nums h-7 flex items-center">{formatMoney(lineTotal(item), currency)}</span>
        </div>
        {showAddon && !readOnly && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer ml-auto">
            <input type="checkbox" checked={!!item.is_addon} onChange={(e) => onUpdate("is_addon", e.target.checked)} className="rounded" />
            Add-on
          </label>
        )}
      </div>
    </div>
  );
}

// ---- Duplicate Day inline panel ----

function DuplicateDayInline({ sourceDate, includedDates, onDuplicate, onClose }) {
  const [targets, setTargets] = useState([]);

  const toggleTarget = (d) => {
    if (targets.includes(d)) setTargets(targets.filter((x) => x !== d));
    else setTargets([...targets, d]);
  };

  const available = includedDates.filter((d) => d !== sourceDate);

  return (
    <div className="p-3 bg-muted/20 border-b border-border space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Duplicate to target dates:</span>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      {available.length === 0 ? (
        <span className="text-xs text-muted-foreground/60">No other included dates available. Add more dates or include excluded ones.</span>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {available.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleTarget(d)}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
                  targets.includes(d)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {formatDateChip(d)}
              </button>
            ))}
          </div>
          {targets.length > 0 && (
            <Button size="sm" variant="dark" onClick={() => { onDuplicate(sourceDate, targets); onClose(); }}>
              <Copy className="w-3 h-3" /> Duplicate to {targets.length} date{targets.length > 1 ? "s" : ""}
            </Button>
          )}
        </>
      )}
    </div>
  );
}