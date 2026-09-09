import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Calculator, FileText, Users, Tag } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import EmptyState from "@/components/common/EmptyState";
import { useServices } from "@/hooks/useServices";
import { useTeamRoles } from "@/hooks/useTeamRoles";
import { computeEstimateTotals, lineTotal } from "@/utils/quotation";
import { formatCurrency } from "@/utils/format";

export default function RateEstimator() {
  const navigate = useNavigate();
  const { services } = useServices();
  const { roles } = useTeamRoles();
  const [items, setItems] = useState([]);
  const [markup, setMarkup] = useState(0);

  const activeServices = services.filter((s) => s.status === "active");
  const activeRoles = roles.filter((r) => r.status === "active");

  const update = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      next[idx].line_total = lineTotal(next[idx]);
      return next;
    });
  };

  const remove = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const addService = () => {
    const svc = activeServices[0];
    setItems((prev) => [
      ...prev,
      {
        item_type: "service",
        reference_id: svc?.id || null,
        name: svc?.name || "",
        description: svc?.description || "",
        quantity: 1,
        days: 1,
        unit_rate: svc?.default_rate || 0,
        line_total: lineTotal({ quantity: 1, days: 1, unit_rate: svc?.default_rate || 0 }),
      },
    ]);
  };

  const addRole = () => {
    const role = activeRoles[0];
    setItems((prev) => [
      ...prev,
      {
        item_type: "role",
        reference_id: role?.id || null,
        name: role?.name || "",
        description: "",
        quantity: 1,
        days: 1,
        unit_rate: role?.default_rate || 0,
        line_total: lineTotal({ quantity: 1, days: 1, unit_rate: role?.default_rate || 0 }),
      },
    ]);
  };

  const addCustom = () => {
    setItems((prev) => [
      ...prev,
      {
        item_type: "custom",
        reference_id: null,
        name: "",
        description: "",
        quantity: 1,
        days: 1,
        unit_rate: 0,
        line_total: 0,
      },
    ]);
  };

  const handleServiceSelect = (idx, serviceId) => {
    const svc = activeServices.find((s) => s.id === serviceId);
    if (!svc) return;
    setItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        reference_id: svc.id,
        name: svc.name,
        description: svc.description || "",
        unit_rate: svc.default_rate || 0,
      };
      next[idx].line_total = lineTotal(next[idx]);
      return next;
    });
  };

  const handleRoleSelect = (idx, roleId) => {
    const role = activeRoles.find((r) => r.id === roleId);
    if (!role) return;
    setItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        reference_id: role.id,
        name: role.name,
        unit_rate: role.default_rate || 0,
      };
      next[idx].line_total = lineTotal(next[idx]);
      return next;
    });
  };

  const totals = useMemo(
    () => computeEstimateTotals({ items, markup_percent: markup }),
    [items, markup]
  );

  const handleCreateQuotation = () => {
    if (items.length === 0) return;
    sessionStorage.setItem("estimateItems", JSON.stringify(items));
    navigate("/quotation/new");
  };

  const noData = activeServices.length === 0 && activeRoles.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rate Estimator"
        description="Build estimates from your team roles and service catalog."
        actions={
          <Button onClick={handleCreateQuotation} disabled={items.length === 0}>
            <FileText className="h-4 w-4" /> Create Quotation
          </Button>
        }
      />

      {noData && (
        <Card>
          <CardBody>
            <EmptyState
              title="No services or roles configured yet"
              description="Add services and team roles in Preferences to start building estimates."
              icon={Calculator}
            />
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={addService} disabled={activeServices.length === 0}>
                <Tag className="h-4 w-4" /> Service
              </Button>
              <Button size="sm" variant="secondary" onClick={addRole} disabled={activeRoles.length === 0}>
                <Users className="h-4 w-4" /> Team Role
              </Button>
              <Button size="sm" variant="outline" onClick={addCustom}>
                <Plus className="h-4 w-4" /> Custom
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {items.length === 0 ? (
              <EmptyState
                title="No line items yet"
                description="Add a service, team role, or custom item to start estimating."
                icon={Calculator}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-semibold min-w-[180px]">Item</th>
                      <th className="px-4 py-2 font-semibold w-16">Qty</th>
                      <th className="px-4 py-2 font-semibold w-16">Days</th>
                      <th className="px-4 py-2 font-semibold w-28">Rate</th>
                      <th className="px-4 py-2 font-semibold w-28 text-right">Total</th>
                      <th className="px-4 py-2 font-semibold w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="px-4 py-2">
                          {item.item_type === "service" && (
                            <Select
                              value={item.reference_id || ""}
                              onChange={(e) => handleServiceSelect(idx, e.target.value)}
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
                              placeholder="Custom item name"
                              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => update(idx, "quantity", Math.max(1, Number(e.target.value) || 1))}
                            className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            value={item.days}
                            onChange={(e) => update(idx, "days", Math.max(1, Number(e.target.value) || 1))}
                            className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            value={item.unit_rate}
                            onChange={(e) => update(idx, "unit_rate", Math.max(0, Number(e.target.value) || 0))}
                            className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-foreground">
                          {formatCurrency(item.line_total || 0)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => remove(idx)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remove row"
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
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" /> Team Cost
              </span>
              <span className="font-medium text-foreground">{formatCurrency(totals.teamCost)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4" /> Service Cost
              </span>
              <span className="font-medium text-foreground">{formatCurrency(totals.serviceCost)}</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">{formatCurrency(totals.subtotal)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                Markup (%)
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={markup}
                onChange={(e) => setMarkup(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-20 rounded-lg border border-input bg-card px-2 text-right text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Markup Amount</span>
              <span className="font-medium text-foreground">{formatCurrency(totals.markupAmount)}</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">Estimated Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(totals.estimatedTotal)}</span>
              </div>
            </div>
            <Button className="w-full" onClick={handleCreateQuotation} disabled={items.length === 0}>
              <FileText className="h-4 w-4" /> Create Quotation
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}