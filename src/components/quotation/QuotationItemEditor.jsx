import { Plus, Trash2, GripVertical } from "lucide-react";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import { lineTotal } from "@/utils/quotation";
import { formatCurrency } from "@/utils/format";

// Editable line-item table for the quotation editor.
// items: [{ item_type, reference_id, name, description, quantity, days, unit_rate, gst_rate, sac_code, sort_order }]
export default function QuotationItemEditor({
  items,
  services,
  roles,
  gstEnabled,
  onChange,
}) {
  const activeServices = (services || []).filter((s) => s.status === "active");
  const activeRoles = (roles || []).filter((r) => r.status === "active");

  const update = (idx, field, value) => {
    const next = items.map((it, i) =>
      i === idx ? { ...it, [field]: value } : it
    );
    // Recompute line_total
    next[idx] = { ...next[idx], line_total: lineTotal(next[idx]) };
    onChange(next);
  };

  const remove = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const addService = () => {
    const svc = activeServices[0];
    onChange([
      ...items,
      {
        item_type: "service",
        reference_id: svc?.id || null,
        name: svc?.name || "",
        description: svc?.description || "",
        quantity: 1,
        days: 1,
        unit_rate: svc?.default_rate || 0,
        gst_rate: gstEnabled ? svc?.gst_rate || null : null,
        sac_code: svc?.sac_code || "",
        line_total: lineTotal({ quantity: 1, days: 1, unit_rate: svc?.default_rate || 0 }),
        sort_order: items.length,
      },
    ]);
  };

  const addRole = () => {
    const role = activeRoles[0];
    onChange([
      ...items,
      {
        item_type: "role",
        reference_id: role?.id || null,
        name: role?.name || "",
        description: "",
        quantity: 1,
        days: 1,
        unit_rate: role?.default_rate || 0,
        gst_rate: null,
        sac_code: "",
        line_total: lineTotal({ quantity: 1, days: 1, unit_rate: role?.default_rate || 0 }),
        sort_order: items.length,
      },
    ]);
  };

  const addCustom = () => {
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
        line_total: 0,
        sort_order: items.length,
      },
    ]);
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
    <div className="space-y-3">
      {/* Add buttons */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={addService} disabled={activeServices.length === 0}>
          <Plus className="h-4 w-4" /> Add Service
        </Button>
        <Button size="sm" variant="secondary" onClick={addRole} disabled={activeRoles.length === 0}>
          <Plus className="h-4 w-4" /> Add Team Role
        </Button>
        <Button size="sm" variant="outline" onClick={addCustom}>
          <Plus className="h-4 w-4" /> Custom Item
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          No line items yet. Add a service, team role, or custom item above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold w-8"></th>
                <th className="px-3 py-2 font-semibold min-w-[180px]">Item</th>
                <th className="px-3 py-2 font-semibold w-16">Qty</th>
                <th className="px-3 py-2 font-semibold w-16">Days</th>
                <th className="px-3 py-2 font-semibold w-28">Rate</th>
                {gstEnabled && <th className="px-3 py-2 font-semibold w-20">GST %</th>}
                <th className="px-3 py-2 font-semibold w-28 text-right">Amount</th>
                <th className="px-3 py-2 font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="px-3 py-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="px-3 py-2">
                    {item.item_type === "service" && (
                      <Select
                        value={item.reference_id || ""}
                        onChange={(e) => handleServiceSelect(idx, e.target.value)}
                        className="mb-1"
                      >
                        {activeServices.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </Select>
                    )}
                    {item.item_type === "role" && (
                      <Select
                        value={item.reference_id || ""}
                        onChange={(e) => handleRoleSelect(idx, e.target.value)}
                        className="mb-1"
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
                        onChange={(e) => update(idx, "name", e.target.value)}
                        placeholder="Item name"
                        className="mb-1 h-9 w-full rounded-lg border border-input bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    )}
                    <input
                      type="text"
                      value={item.description || ""}
                      onChange={(e) => update(idx, "description", e.target.value)}
                      placeholder="Description (optional)"
                      className="h-8 w-full rounded-lg border border-input bg-card px-2 text-xs text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => update(idx, "quantity", Math.max(1, Number(e.target.value) || 1))}
                      className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      value={item.days}
                      onChange={(e) => update(idx, "days", Math.max(1, Number(e.target.value) || 1))}
                      className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={item.unit_rate}
                      onChange={(e) => update(idx, "unit_rate", Math.max(0, Number(e.target.value) || 0))}
                      className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </td>
                  {gstEnabled && (
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.gst_rate || ""}
                        onChange={(e) => update(idx, "gst_rate", e.target.value ? Number(e.target.value) : null)}
                        placeholder="—"
                        className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 text-right font-semibold text-foreground">
                    {formatCurrency(item.line_total || 0)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => remove(idx)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}