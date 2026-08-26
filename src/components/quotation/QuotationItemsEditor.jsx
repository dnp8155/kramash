import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney } from "@/utils/format";
import { lineTotal } from "@/lib/quotationCalc";
import { Section } from "@/components/quotation/QuotationParts";

export default function QuotationItemsEditor({
  items, updateItem, removeItem,
  addService, addRole, addCustom,
  addServiceId, setAddServiceId, addRoleId, setAddRoleId,
  services, roles, gstApplicable, readOnly, currency
}) {
  return (
    <Section title="Items & Deliverables">
      {!readOnly && (
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <span className="text-xs font-medium text-muted-foreground">Add Service</span>
            <div className="flex gap-2">
              <Select value={addServiceId} onChange={(e) => setAddServiceId(e.target.value)} className="flex-1">
                <option value="">— choose —</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Button size="sm" variant="outline" onClick={addService} disabled={!addServiceId}><Plus className="w-3.5 h-3.5" />Add</Button>
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <span className="text-xs font-medium text-muted-foreground">Add Role</span>
            <div className="flex gap-2">
              <Select value={addRoleId} onChange={(e) => setAddRoleId(e.target.value)} className="flex-1">
                <option value="">— choose —</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
              <Button size="sm" variant="outline" onClick={addRole} disabled={!addRoleId}><Plus className="w-3.5 h-3.5" />Add</Button>
            </div>
          </div>
          <Button size="sm" variant="dark" onClick={addCustom} className="shrink-0"><Plus className="w-3.5 h-3.5" />Custom Item</Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="No items yet" description="Add services, roles, or a custom item." />
      ) : (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2 pr-2 font-medium">Item</th>
                <th className="text-right py-2 px-1 font-medium w-16">Qty</th>
                <th className="text-right py-2 px-1 font-medium w-16">Days</th>
                <th className="text-right py-2 px-1 font-medium w-28">Rate</th>
                {gstApplicable && <th className="text-right py-2 px-1 font-medium w-20">GST%</th>}
                <th className="text-right py-2 px-1 font-medium w-28">Amount</th>
                {!readOnly && <th className="w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b border-border/60">
                  <td className="py-2 pr-2">
                    <Input
                      value={it.name}
                      onChange={(e) => updateItem(idx, "name", e.target.value)}
                      disabled={readOnly}
                      className="h-8"
                      placeholder="Item name"
                    />
                    <input
                      value={it.description || ""}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      disabled={readOnly}
                      placeholder="Description"
                      className="w-full text-xs text-muted-foreground bg-transparent border-0 focus:outline-none mt-0.5 placeholder:text-muted-foreground/60"
                    />
                  </td>
                  <td className="py-2 px-1">
                    <Input type="number" min="0" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} disabled={readOnly} className="h-8 text-right" />
                  </td>
                  <td className="py-2 px-1">
                    <Input
                      type="number" min="0"
                      value={it.rate_type === "Per Day" ? it.days : 1}
                      onChange={(e) => updateItem(idx, "days", Number(e.target.value))}
                      disabled={readOnly || it.rate_type !== "Per Day"}
                      className="h-8 text-right"
                    />
                  </td>
                  <td className="py-2 px-1">
                    <Input type="number" min="0" value={it.unit_rate} onChange={(e) => updateItem(idx, "unit_rate", Number(e.target.value))} disabled={readOnly} className="h-8 text-right" />
                  </td>
                  {gstApplicable && (
                    <td className="py-2 px-1">
                      <Input type="number" min="0" step="0.5" value={it.gst_rate} onChange={(e) => updateItem(idx, "gst_rate", Number(e.target.value))} disabled={readOnly} className="h-8 text-right" />
                    </td>
                  )}
                  <td className="py-2 px-1 text-right font-medium">{formatMoney(lineTotal(it), currency)}</td>
                  {!readOnly && (
                    <td className="py-2">
                      <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive" aria-label="Remove item">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}