import { useState } from "react";
import { Plus, Trash2, Calculator, Percent } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import { mockServiceCatalog } from "@/data/mockQuotations";
import { formatCurrency } from "@/utils/format";

export default function RateEstimator() {
  const [rows, setRows] = useState([
    { id: 1, serviceId: "svc-1", qty: 1 },
    { id: 2, serviceId: "svc-4", qty: 1 },
  ]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [discount, setDiscount] = useState(0);
  const GST_RATE = 0.18;

  const addRow = () =>
    setRows((r) => [...r, { id: Date.now(), serviceId: mockServiceCatalog[0].id, qty: 1 }]);

  const removeRow = (id) => setRows((r) => r.filter((row) => row.id !== id));

  const updateRow = (id, field, value) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));

  const lineItems = rows.map((row) => {
    const svc = mockServiceCatalog.find((s) => s.id === row.serviceId);
    const total = (svc?.basePrice || 0) * row.qty;
    return { ...row, svc, total };
  });

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
  const discountAmount = (subtotal * (discount || 0)) / 100;
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = gstEnabled ? afterDiscount * GST_RATE : 0;
  const grandTotal = afterDiscount + gstAmount;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rate Estimator"
        description="Build estimates from your service catalog with optional GST."
        actions={<Button variant="outline"><Calculator className="h-4 w-4" /> Save Estimate</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button size="sm" variant="secondary" onClick={addRow}>
              <Plus className="h-4 w-4" /> Add Service
            </Button>
          </CardHeader>
          <CardBody className="space-y-3">
            {lineItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Select
                    label="Service"
                    value={item.serviceId}
                    onChange={(e) => updateRow(item.id, "serviceId", e.target.value)}
                  >
                    {mockServiceCatalog.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="w-full sm:w-24">
                  <label className="text-sm font-medium text-foreground">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => updateRow(item.id, "qty", Number(e.target.value))}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="text-sm font-medium text-foreground">Total</label>
                  <p className="mt-2.5 text-sm font-semibold text-foreground">{formatCurrency(item.total)}</p>
                </div>
                <button
                  onClick={() => removeRow(item.id)}
                  className="hidden h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:flex"
                  aria-label="Remove row"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="h-9 w-20 rounded-lg border border-input bg-card px-2 text-right text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Discount Amount</span>
              <span className="font-medium text-destructive">−{formatCurrency(discountAmount)}</span>
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <Percent className="h-4 w-4 text-primary" /> GST (18%)
              </span>
              <button
                onClick={() => setGstEnabled((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${gstEnabled ? "bg-primary" : "bg-border"}`}
                role="switch"
                aria-checked={gstEnabled}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${gstEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">GST Amount</span>
              <span className="font-medium text-foreground">{formatCurrency(gstAmount)}</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">Grand Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}