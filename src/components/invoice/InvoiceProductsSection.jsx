import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Package, FilePlus } from "lucide-react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { formatMoney } from "@/utils/format";

const SHIFTS = ["Full Day", "Half Day", "Morning", "Evening", "Night"];

// Parse events_json safely
function parseEvents(json) {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function stringifyEvents(events) {
  return JSON.stringify(events || []);
}

// Single package row with expandable nested events table
function PackageRow({ item, index, updateItem, removeItem, currency, readOnly }) {
  const [expanded, setExpanded] = useState(true);
  const events = parseEvents(item.events_json);

  const updateEvent = (evIdx, field, value) => {
    const next = events.map((ev, i) => (i === evIdx ? { ...ev, [field]: value } : ev));
    updateItem(index, "events_json", stringifyEvents(next));
  };

  const addEvent = () => {
    const next = [...events, { event_name: "", date: "", location: "", team_size: "", shift: "Full Day" }];
    updateItem(index, "events_json", stringifyEvents(next));
  };

  const removeEvent = (evIdx) => {
    const next = events.filter((_, i) => i !== evIdx);
    updateItem(index, "events_json", stringifyEvents(next));
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Package header row */}
      <div className="p-3 bg-secondary/40 space-y-2">
        {/* Name row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <Package className="w-4 h-4 text-primary shrink-0" />
          <Input
            value={item.name || ""}
            onChange={(e) => updateItem(index, "name", e.target.value)}
            placeholder="Package name (e.g. Wedding Package)"
            disabled={readOnly}
            className="flex-1 bg-card"
          />
          {!readOnly && (
            <button
              onClick={() => removeItem(index)}
              className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors shrink-0"
              title="Remove package"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Rate + Amount row */}
        <div className="flex items-center gap-2 sm:gap-3 sm:pl-10">
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <span className="text-xs text-muted-foreground shrink-0">Rate</span>
            <Input
              type="number"
              value={item.unit_rate || 0}
              onChange={(e) => updateItem(index, "unit_rate", e.target.value)}
              disabled={readOnly}
              className="w-full sm:w-24 text-right bg-card"
            />
          </div>
          <div className="flex items-center gap-1.5 justify-end flex-1 sm:flex-none sm:w-24">
            <span className="text-sm font-medium text-foreground tabular-nums text-right">
              {formatMoney(Number(item.unit_rate || 0) * Number(item.quantity || 1), currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Nested events table */}
      {expanded && (
        <div className="px-3 pb-3 pt-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Events</p>
          {events.length > 0 && (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border">
                    <th className="text-left px-2 py-2 font-medium">Event</th>
                    <th className="text-left px-2 py-2 font-medium">Date</th>
                    <th className="text-left px-2 py-2 font-medium">Location</th>
                    <th className="text-left px-2 py-2 font-medium">Team size</th>
                    <th className="text-left px-2 py-2 font-medium">Shift</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, evIdx) => (
                    <tr key={evIdx} className="border-b border-border/50 last:border-0">
                      <td className="px-2 py-1.5">
                        <Input
                          value={ev.event_name || ""}
                          onChange={(e) => updateEvent(evIdx, "event_name", e.target.value)}
                          placeholder="Event name"
                          disabled={readOnly}
                          className="bg-card h-8"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="date"
                          value={ev.date || ""}
                          onChange={(e) => updateEvent(evIdx, "date", e.target.value)}
                          disabled={readOnly}
                          className="bg-card h-8"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={ev.location || ""}
                          onChange={(e) => updateEvent(evIdx, "location", e.target.value)}
                          placeholder="Venue"
                          disabled={readOnly}
                          className="bg-card h-8"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          value={ev.team_size || ""}
                          onChange={(e) => updateEvent(evIdx, "team_size", e.target.value)}
                          placeholder="2+2"
                          disabled={readOnly}
                          className="bg-card h-8 w-20"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select
                          value={ev.shift || "Full Day"}
                          onChange={(e) => updateEvent(evIdx, "shift", e.target.value)}
                          disabled={readOnly}
                          className="h-8"
                        >
                          {SHIFTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        {!readOnly && (
                          <button
                            onClick={() => removeEvent(evIdx)}
                            className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                            title="Remove event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!readOnly && (
            <button
              onClick={addEvent}
              className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add event
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Simple line item row
function LineItemRow({ item, index, updateItem, removeItem, currency, readOnly }) {
  return (
    <div className="p-3 border border-border rounded-lg bg-card space-y-2">
      {/* Name row */}
      <div className="flex items-center gap-2">
        <FilePlus className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          value={item.name || ""}
          onChange={(e) => updateItem(index, "name", e.target.value)}
          placeholder="Item description"
          disabled={readOnly}
          className="flex-1"
        />
        {!readOnly && (
          <button
            onClick={() => removeItem(index)}
            className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors shrink-0"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Qty / Rate / Amount row */}
      <div className="flex items-center gap-2 sm:gap-3 sm:pl-6">
        <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
          <span className="text-xs text-muted-foreground shrink-0">Qty</span>
          <Input
            type="number"
            value={item.quantity || 1}
            onChange={(e) => updateItem(index, "quantity", e.target.value)}
            disabled={readOnly}
            className="w-full sm:w-16 text-center"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
          <span className="text-xs text-muted-foreground shrink-0">Rate</span>
          <Input
            type="number"
            value={item.unit_rate || 0}
            onChange={(e) => updateItem(index, "unit_rate", e.target.value)}
            disabled={readOnly}
            className="w-full sm:w-24 text-right"
          />
        </div>
        <div className="flex items-center gap-1.5 justify-end flex-1 sm:flex-none sm:w-24">
          <span className="text-sm font-medium text-foreground tabular-nums text-right">
            {formatMoney(Number(item.unit_rate || 0) * Number(item.quantity || 1), currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceProductsSection({
  items,
  setItems,
  readOnly,
  currency
}) {
  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addPackage = () => {
    setItems((prev) => [...prev, {
      item_type: "package",
      name: "",
      description: "",
      quantity: 1,
      unit_rate: 0,
      events_json: stringifyEvents([])
    }]);
  };

  const addLineItem = () => {
    setItems((prev) => [...prev, {
      item_type: "line_item",
      name: "",
      description: "",
      quantity: 1,
      unit_rate: 0
    }]);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Products &amp; Packages</h3>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addPackage} disabled={readOnly}>
            <Package className="w-3.5 h-3.5" /> + Package
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem} disabled={readOnly}>
            <FilePlus className="w-3.5 h-3.5" /> + Line Item
          </Button>
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          Add a package or a line item to start building this invoice.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) =>
            item.item_type === "package" ? (
              <PackageRow
                key={idx}
                item={item}
                index={idx}
                updateItem={updateItem}
                removeItem={removeItem}
                currency={currency}
                readOnly={readOnly}
              />
            ) : (
              <LineItemRow
                key={idx}
                item={item}
                index={idx}
                updateItem={updateItem}
                removeItem={removeItem}
                currency={currency}
                readOnly={readOnly}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}