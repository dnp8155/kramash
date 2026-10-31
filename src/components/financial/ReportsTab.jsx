import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { BarChart3, Receipt, CalendarCheck, Users, Wallet, Download, TrendingUp, TrendingDown, ArrowDownLeft, ChartColumn, ChartArea, ChartPie, List, Inbox, Percent } from "lucide-react";
import SegmentedTabs from "@/components/common/SegmentedTabs";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import SummaryCard from "@/components/financial/SummaryCard";
import { eventFinancialSummary, sumByType } from "@/lib/financeService";
import { exportReportXlsx } from "@/lib/exportUtils";
import { showExportToast } from "@/lib/exportToast";
import { formatMoney, formatMoneyCompact } from "@/utils/format";
import ChartCard from "@/components/common/ChartCard";
import FiscalYearSelector from "@/components/dashboard/FiscalYearSelector";
import { formatEventDate } from "@/lib/dates";
import { CHART_PRIMARY, CHART_DESTRUCTIVE, CHART_MARGIN, CHART_TICK, CHART_GRID, CHART_TOOLTIP, CHART_LINE, CHART_Y_AXIS_WIDTH, chartDot } from "@/lib/chartTheme";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { computeLeadInsights } from "@/lib/leadManager";
import { STATUS_STYLES, SOURCE_STYLES, LOST_REASONS } from "@/constants/leadConfig";
import { currencyIcon } from "@/utils/currencyIcon";
import { txInRange } from "@/lib/financialYearService";

const REPORTS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "events", label: "By event", icon: CalendarCheck },
  { key: "clients", label: "Clients", icon: Wallet },
  { key: "team", label: "Team", icon: Users },
  { key: "leads", label: "Leads", icon: Inbox },
  { key: "gst", label: "GST", icon: Percent },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (key) => { const [y, m] = key.split("-"); return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`; };
const compact = (n) => (Math.abs(n) >= 100000 ? `${(n / 100000).toFixed(1)}L` : Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(Math.round(n)));
const num = (v) => Number(v) || 0;

const CHART_KEY = "reports-chart-style";
const readStyle = (k, allowed, d) => { try { const v = JSON.parse(localStorage.getItem(CHART_KEY) || "{}")[k]; return allowed.includes(v) ? v : d; } catch { return d; } };
const saveStyle = (k, v) => { try { localStorage.setItem(CHART_KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(CHART_KEY) || "{}"), [k]: v })); } catch { /* ignore */ } };

// Small pill switch for the chart look: [icon] Bars | Line | Area ...
function StyleSwitch({ options, value, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5" role="group" aria-label="Chart style">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onChange(o.key)} aria-pressed={value === o.key} title={o.label}
          className={cn("h-7 px-2.5 inline-flex items-center gap-1 rounded-full text-[11px] font-semibold transition-colors", value === o.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <o.icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
// Percentage written inside the ring (never outside, so the chart box can't clip it); tiny slices skip it.
function RingLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.07) return null;
  const r = innerRadius + (outerRadius - innerRadius) / 2;
  const rad = (Math.PI / 180) * -midAngle;
  return (
    <text x={cx + r * Math.cos(rad)} y={cy + r * Math.sin(rad)} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {Math.round(percent * 100)}%
    </text>
  );
}
const TREND_STYLES = [{ key: "area", label: "Area", icon: ChartArea }, { key: "bars", label: "Bars", icon: ChartColumn }, { key: "pie", label: "Pie", icon: ChartPie }];
// Same series look as the dashboard's Payments chart.
const TREND_SERIES = [
  { key: "received", label: "Received", color: CHART_PRIMARY, gradId: "repRecvGrad" },
  { key: "paid", label: "Paid", color: CHART_DESTRUCTIVE, gradId: "repPaidGrad" },
];
const SPLIT_STYLES = [{ key: "donut", label: "Donut", icon: ChartPie }, { key: "list", label: "List", icon: List }];
const SLICE_COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "#8B5CF6", "#06B6D4", "#F97316", "#94A3B8"];

function Th({ children, right }) {
  return <th className={cn("px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap", right ? "text-right" : "text-left")}>{children}</th>;
}
function Td({ children, right, className }) {
  return <td className={cn("px-3 py-2.5 text-sm", right && "text-right tabular-nums", className)}>{children}</td>;
}
function ReportTable({ head, children }) {
  return (
    <div className="bg-card border border-border rounded-[15px] overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[520px]">
          <thead className="bg-muted/50 border-b border-border"><tr>{head}</tr></thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </div>
  );
}
// Phone layout for the wide tables: one card per row, figures in a small grid, no sideways scrolling.
function Stat({ label, children, className }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-semibold tabular-nums truncate", className)}>{children}</div>
    </div>
  );
}
function RowCard({ title, sub, aside, children }) {
  return (
    <div className="bg-card border border-border rounded-[15px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground break-words">{title}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        {aside}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3.5 pt-3.5 border-t border-border">{children}</div>
    </div>
  );
}
function CountCard({ label, value, sub, tone }) {
  return (
    <div className="bg-card border border-border rounded-[15px] p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-1.5 text-xl font-bold tabular-nums", tone || "text-foreground")}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
const signTone = (v) => (v > 0 ? "text-success" : v < 0 ? "text-destructive" : "text-foreground");

// Financial → Reports: five views of the selected financial year / range, each exportable to Excel.
//   transactions — active transactions inside the range     events — events inside the range
//   allTx        — every active transaction (for per-event / per-client totals that span dates)
export default function ReportsTab({ transactions, allTx, events, clients, members, serviceAssignments = [], currency, rangeLabel, dateRange, onExportGate }) {
  const t = useT();
  const { workspace, workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [report, setReport] = useState("overview");
  const [trendStyle, setTrendStyle] = useState(() => readStyle("trend", ["bars", "pie", "area"], "area"));
  const [visible, setVisible] = useState({ received: true, paid: true });
  // Never allow both off — an empty chart explains nothing.
  const toggleSeries = (key) => setVisible((v) => { const next = { ...v, [key]: !v[key] }; return next.received || next.paid ? next : v; });
  const [splitStyle, setSplitStyle] = useState(() => readStyle("split", ["donut", "list"], "donut"));

  const received = sumByType(transactions, "CLIENT_RECEIPT");
  const teamPaid = sumByType(transactions, "TEAM_PAYMENT");
  const expensesOnly = sumByType(transactions, "BUSINESS_EXPENSE");
  const paid = teamPaid + expensesOnly;
  const profit = received - paid;

  const monthly = useMemo(() => {
    const map = {};
    transactions.forEach((x) => {
      const k = (x.transaction_date || "").slice(0, 7);
      if (!k) return;
      const row = (map[k] ||= { key: k, received: 0, paid: 0 });
      if (x.transaction_type === "CLIENT_RECEIPT") row.received += num(x.amount); else row.paid += num(x.amount);
    });
    return Object.values(map).sort((a, b) => (a.key > b.key ? 1 : -1)).map((r) => ({ ...r, label: monthLabel(r.key), profit: r.received - r.paid }));
  }, [transactions]);

  const expenseRows = useMemo(() => {
    const map = {};
    transactions.forEach((x) => {
      if (x.transaction_type === "CLIENT_RECEIPT") return;
      const name = x.transaction_type === "TEAM_PAYMENT" ? t("Team payments") : (x.expense_category_name_snapshot || t("Uncategorised"));
      const row = (map[name] ||= { name, amount: 0, count: 0 });
      row.amount += num(x.amount); row.count += 1;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount).map((r) => ({ ...r, share: paid ? (r.amount / paid) * 100 : 0 }));
  }, [transactions, paid, t]);

  // Same contract value as the event page: base + service add-ons + billable extras.
  const svcByEvent = useMemo(() => {
    const m = {};
    serviceAssignments.forEach((a) => { (m[a.event_id] ||= []).push(a); });
    return m;
  }, [serviceAssignments]);
  const summaryOf = (e) => eventFinancialSummary(e, allTx, [], svcByEvent[e.id] || []);

  const eventRows = useMemo(() => events.map((e) => {
    const s = summaryOf(e);
    const cost = s.teamPaid + s.expenses;
    return { id: e.id, title: e.title, date: e.start_date, client: clients.find((c) => c.id === e.client_id)?.name || "", contract: s.contractValue, base: s.baseContractValue, addons: s.addonTotal, extras: s.miscTotal, received: s.received, pending: e.settled ? 0 : s.pending, cost, profit: s.profit, margin: s.received > 0 ? (s.profit / s.received) * 100 : null };
  }).sort((a, b) => b.profit - a.profit), [events, allTx, clients, svcByEvent]);  

  const clientRows = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (!e.client_id) return;
      const s = summaryOf(e);
      const row = (map[e.client_id] ||= { id: e.client_id, name: clients.find((c) => c.id === e.client_id)?.name || t("Unknown"), events: 0, contract: 0, received: 0, pending: 0 });
      row.events += 1; row.contract += s.contractValue; row.received += s.received; row.pending += e.settled ? 0 : s.pending;
    });
    return Object.values(map).sort((a, b) => b.pending - a.pending || b.received - a.received);
  }, [events, allTx, clients, t, svcByEvent]);  

  const teamRows = useMemo(() => {
    const map = {};
    transactions.forEach((x) => {
      if (x.transaction_type !== "TEAM_PAYMENT" || !x.team_member_id) return;
      const m = members.find((mm) => mm.id === x.team_member_id);
      const row = (map[x.team_member_id] ||= { id: x.team_member_id, name: m?.name || t("Team member"), role: m?.profession || "", paid: 0, count: 0, last: "" });
      row.paid += num(x.amount); row.count += 1;
      if ((x.transaction_date || "") > row.last) row.last = x.transaction_date;
    });
    return Object.values(map).sort((a, b) => b.paid - a.paid);
  }, [transactions, members, t]);

  // Leads and invoices are only fetched when their report is opened (the rest of this tab doesn't need them).
  const inRange = (d) => txInRange({ transaction_date: String(d || "").slice(0, 10) }, dateRange);
  const { data: allLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ["reports-leads", workspaceId],
    queryFn: () => base44.entities.Lead.filter({ workspace_id: workspaceId }, "-created_date", 1000),
    enabled: !!workspaceId && report === "leads",
    staleTime: 60 * 1000,
  });
  const { data: allInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["reports-invoices", workspaceId],
    queryFn: () => base44.entities.Invoice.filter({ workspace_id: workspaceId }, "-invoice_date", 1000),
    enabled: !!workspaceId && report === "gst",
    staleTime: 60 * 1000,
  });

  // Leads created in the selected period.
  const leadInsights = useMemo(
    () => computeLeadInsights((allLeads || []).filter((l) => inRange(l.created_date || l.created_at))),
    [allLeads, dateRange],
  );
  const sourceRows = leadInsights.sources.map((x) => ({ name: SOURCE_STYLES[x.source]?.label || x.source, total: x.total, won: x.won, rate: x.total ? Math.round((x.won / x.total) * 100) : 0 }));
  const lostRows = leadInsights.lostReasons.map((x) => ({ name: LOST_REASONS.find((o) => o.value === x.reason)?.label || (x.reason === "unspecified" ? "Not recorded" : x.reason), count: x.count }));

  // GST on invoices issued in the period (drafts and cancelled invoices are left out).
  const gstRows = useMemo(() => {
    const map = {};
    (allInvoices || []).forEach((inv) => {
      if (!inv.gst_applicable || inv.status === "draft" || inv.status === "cancelled") return;
      if (!inRange(inv.invoice_date)) return;
      const k = String(inv.invoice_date || "").slice(0, 7);
      if (!k) return;
      const row = (map[k] ||= { key: k, invoices: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0 });
      row.invoices += 1; row.taxable += num(inv.taxable_amount); row.cgst += num(inv.cgst_amount); row.sgst += num(inv.sgst_amount); row.igst += num(inv.igst_amount); row.gst += num(inv.gst_total);
    });
    return Object.values(map).sort((a, b) => (a.key > b.key ? 1 : -1)).map((x) => ({ ...x, label: monthLabel(x.key) }));
  }, [allInvoices, dateRange]);
  const gstTotals = gstRows.reduce((a, x) => ({ invoices: a.invoices + x.invoices, taxable: a.taxable + x.taxable, cgst: a.cgst + x.cgst, sgst: a.sgst + x.sgst, igst: a.igst + x.igst, gst: a.gst + x.gst }), { invoices: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0 });

  const axes = [
    <CartesianGrid key="g" {...CHART_GRID} />,
    <XAxis key="x" dataKey="label" tick={CHART_TICK} tickLine={false} axisLine={false} />,
    <YAxis key="y" tick={CHART_TICK} tickLine={false} axisLine={false} width={CHART_Y_AXIS_WIDTH} tickFormatter={(v) => formatMoneyCompact(v, currency)} />,
    <Tooltip key="t" {...CHART_TOOLTIP} formatter={(v, name) => [formatMoney(v, currency), t(name === "paid" ? "Paid" : "Received")]} />,
  ];
  const shown = TREND_SERIES.filter((x) => visible[x.key]);
  // Pie: the period's totals side by side (follows the Received / Paid pills).
  const pieData = shown.map((x) => ({ name: t(x.label), value: x.key === "received" ? received : paid, color: x.color })).filter((x) => x.value > 0);

  // Donut slices: the top seven categories, everything else folded into "Other".
  const slices = expenseRows.length > 8
    ? [...expenseRows.slice(0, 7), { name: t("Other"), amount: expenseRows.slice(7).reduce((a, r) => a + r.amount, 0), count: expenseRows.slice(7).reduce((a, r) => a + r.count, 0), share: expenseRows.slice(7).reduce((a, r) => a + r.share, 0) }]
    : expenseRows;

  const tables = {
    overview: { name: "Monthly summary", rows: monthly.map((r) => ({ month: r.label, received: r.received, paid: r.paid, profit: r.profit })), columns: [{ key: "month", label: "Month" }, { key: "received", label: "Received" }, { key: "paid", label: "Paid" }, { key: "profit", label: "Profit" }] },
    expenses: { name: "Expenses by category", rows: expenseRows.map((r) => ({ category: r.name, entries: r.count, amount: r.amount, share: `${r.share.toFixed(1)}%` })), columns: [{ key: "category", label: "Category" }, { key: "entries", label: "Entries" }, { key: "amount", label: "Amount" }, { key: "share", label: "Share" }] },
    events: { name: "Profit by event", rows: eventRows.map((r) => ({ title: r.title, date: r.date || "", client: r.client, base: r.base, addons: r.addons, extras: r.extras, contract: r.contract, received: r.received, pending: r.pending, cost: r.cost, profit: r.profit, margin: r.margin == null ? "" : `${r.margin.toFixed(1)}%` })), columns: [{ key: "title", label: "Event" }, { key: "date", label: "Date" }, { key: "client", label: "Client" }, { key: "base", label: "Base value" }, { key: "addons", label: "Add-ons" }, { key: "extras", label: "Extras" }, { key: "contract", label: "Contract value" }, { key: "received", label: "Received" }, { key: "pending", label: "Pending" }, { key: "cost", label: "Team + expenses" }, { key: "profit", label: "Profit" }, { key: "margin", label: "Margin" }] },
    clients: { name: "Clients and dues", rows: clientRows.map((r) => ({ client: r.name, events: r.events, contract: r.contract, received: r.received, pending: r.pending })), columns: [{ key: "client", label: "Client" }, { key: "events", label: "Events" }, { key: "contract", label: "Contract value" }, { key: "received", label: "Received" }, { key: "pending", label: "Outstanding" }] },
    team: { name: "Team payouts", rows: teamRows.map((r) => ({ member: r.name, role: r.role, payments: r.count, paid: r.paid, last: r.last })), columns: [{ key: "member", label: "Member" }, { key: "role", label: "Role" }, { key: "payments", label: "Payments" }, { key: "paid", label: "Total paid" }, { key: "last", label: "Last payment" }] },
    leads: { name: "Lead sources", rows: sourceRows.map((x) => ({ source: x.name, leads: x.total, won: x.won, conversion: `${x.rate}%` })), columns: [{ key: "source", label: "Source" }, { key: "leads", label: "Leads" }, { key: "won", label: "Won" }, { key: "conversion", label: "Conversion" }] },
    gst: { name: "GST summary", rows: gstRows.map((x) => ({ month: x.label, invoices: x.invoices, taxable: x.taxable, cgst: x.cgst, sgst: x.sgst, igst: x.igst, gst: x.gst })), columns: [{ key: "month", label: "Month" }, { key: "invoices", label: "Invoices" }, { key: "taxable", label: "Taxable value" }, { key: "cgst", label: "CGST" }, { key: "sgst", label: "SGST" }, { key: "igst", label: "IGST" }, { key: "gst", label: "Total GST" }] },
  };
  const current = tables[report];

  const doExport = async () => {
    if (onExportGate && !onExportGate()) return;
    const res = await exportReportXlsx(current.name, current.rows, current.columns, rangeLabel);
    showExportToast(toast, res, current.name);
  };

  return (
    <div className="space-y-4">
      {/* Same row as Payment Activity: "Showing" + the year picker, with the export at the right end. */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Showing")}</span>
        <FiscalYearSelector size="sm" align="left" />
        <Button variant="outline" size="sm" className="ml-auto" onClick={doExport} disabled={current.rows.length === 0} aria-label={t("Export to Excel")}>
          <Download className="w-3.5 h-3.5" />
          {/* Icon only on mobile, with the words from sm up. */}
          <span className="hidden sm:inline">{t("Export to Excel")}</span>
        </Button>
      </div>

      <SegmentedTabs items={REPORTS.map((r) => ({ value: r.key, label: t(r.label), icon: r.key === "expenses" ? currencyIcon(currency) : r.icon }))} value={report} onChange={setReport} layoutId="financial-report-indicator" size="sm" scroll />

      <div key={report} className="space-y-4 animate-fade-in">
        {report === "overview" && (
          <>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3">
              <SummaryCard label={t("Received")} value={received} tone="success" currency={currency} icon={ArrowDownLeft} />
              <SummaryCard label={t("Paid")} value={paid} tone="destructive" currency={currency} icon={TrendingDown} />
              <SummaryCard label={t("Profit")} value={profit} tone={profit >= 0 ? "success" : "destructive"} currency={currency} icon={TrendingUp} className="min-[420px]:col-span-2 sm:col-span-1" />
            </div>
            {monthly.length === 0 ? (
              <div className="bg-card border border-border rounded-[15px]"><EmptyState title="No transactions in this period" description="Record a payment or expense and the month-by-month view appears here." /></div>
            ) : (
              <>
                <div className="flex justify-end -mb-1">
                  <StyleSwitch options={TREND_STYLES} value={trendStyle} onChange={(v) => { setTrendStyle(v); saveStyle("trend", v); }} />
                </div>
                <ChartCard
                  heightClass={trendStyle === "pie" ? "h-auto" : "h-64"}
                  icon={TrendingUp}
                  title={t("Payments")}
                  subtitle={rangeLabel || t("By month")}
                  series={TREND_SERIES.map((x) => ({ ...x, label: t(x.label) }))}
                  visible={visible}
                  onToggle={toggleSeries}
                >
                  {trendStyle === "pie" ? (
                    <div className="px-2 grid sm:grid-cols-[240px_1fr] gap-4 items-center">
                      <div className="relative h-56 w-full max-w-[240px] mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="92%" paddingAngle={3} stroke="hsl(var(--card))" strokeWidth={2} label={RingLabel} labelLine={false} isAnimationActive={false}>
                              {pieData.map((x) => <Cell key={x.name} fill={x.color} />)}
                            </Pie>
                            <Tooltip {...CHART_TOOLTIP} formatter={(v, name) => [formatMoney(v, currency), name]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-10 text-center">
                          <span className="text-[11px] text-muted-foreground">{t("Profit")}</span>
                          <span className={cn("text-sm font-bold tabular-nums leading-tight break-words", signTone(profit))}>{formatMoney(profit, currency)}</span>
                        </div>
                      </div>
                      <ul className="space-y-3 min-w-0">
                        {pieData.map((x) => (
                          <li key={x.name} className="flex items-center gap-2.5 text-sm">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: x.color }} />
                            <span className="text-foreground">{x.name}</span>
                            <span className="ml-auto font-semibold tabular-nums text-foreground">{formatMoney(x.value, currency)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {trendStyle === "bars" ? (
                      <BarChart data={monthly} margin={CHART_MARGIN}>
                        {axes}
                        {shown.map((x) => <Bar key={x.key} dataKey={x.key} fill={x.color} radius={[4, 4, 0, 0]} maxBarSize={28} />)}
                      </BarChart>
                    ) : (
                      <AreaChart data={monthly} margin={CHART_MARGIN}>
                        <defs>
                          {TREND_SERIES.map((x) => (
                            <linearGradient key={x.gradId} id={x.gradId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={x.color} stopOpacity={0.2} />
                              <stop offset="100%" stopColor={x.color} stopOpacity={0.02} />
                            </linearGradient>
                          ))}
                        </defs>
                        {axes}
                        {shown.map((x) => <Area key={x.key} type="monotone" dataKey={x.key} stroke={x.color} {...CHART_LINE} fill={`url(#${x.gradId})`} dot={chartDot(x.color)} />)}
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                  )}
                </ChartCard>
                <div className="sm:hidden space-y-3">
                  {monthly.map((r) => (
                    <RowCard
                      key={r.key}
                      title={r.label}
                      aside={<span className={cn("shrink-0 text-sm font-bold tabular-nums", signTone(r.profit))}>{formatMoney(r.profit, currency)}</span>}
                    >
                      <Stat label={t("Received")} className="text-success">{formatMoney(r.received, currency)}</Stat>
                      <Stat label={t("Paid")} className="text-destructive">{formatMoney(r.paid, currency)}</Stat>
                    </RowCard>
                  ))}
                </div>
                <div className="hidden sm:block">
                <ReportTable head={<><Th>{t("Month")}</Th><Th right>{t("Received")}</Th><Th right>{t("Paid")}</Th><Th right>{t("Profit")}</Th></>}>
                  {monthly.map((r) => (
                    <tr key={r.key}><Td className="font-medium">{r.label}</Td><Td right className="text-success">{formatMoney(r.received, currency)}</Td><Td right className="text-destructive">{formatMoney(r.paid, currency)}</Td><Td right className={cn("font-semibold", signTone(r.profit))}>{formatMoney(r.profit, currency)}</Td></tr>
                  ))}
                </ReportTable>
                </div>
              </>
            )}
          </>
        )}

        {report === "expenses" && (expenseRows.length === 0 ? (
          <div className="bg-card border border-border rounded-[15px]"><EmptyState title="No expenses in this period" description="Team payments and business expenses show up here, grouped by category." /></div>
        ) : (
          <div className="bg-card border border-border rounded-[15px] divide-y divide-border">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{t("Where the money went")}</div>
                <div className="text-sm font-bold text-destructive tabular-nums">{formatMoney(paid, currency)}</div>
              </div>
              <StyleSwitch options={SPLIT_STYLES} value={splitStyle} onChange={(v) => { setSplitStyle(v); saveStyle("split", v); }} />
            </div>
            {splitStyle === "donut" && (
              <div className="p-4 grid sm:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="relative h-52 w-full max-w-[220px] mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={slices} dataKey="amount" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2}>
                        {slices.map((r, i) => <Cell key={r.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...CHART_TOOLTIP} formatter={(v) => formatMoney(v, currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] text-muted-foreground">{t("Total spent")}</span>
                    <span className="text-sm font-bold text-foreground tabular-nums">{formatMoney(paid, currency)}</span>
                  </div>
                </div>
                <ul className="space-y-2 min-w-0">
                  {slices.map((r, i) => (
                    <li key={r.name} className="flex items-center gap-2.5 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                      <span className="truncate text-foreground">{r.name}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground shrink-0">{formatMoney(r.amount, currency)} · {r.share.toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {splitStyle === "list" && expenseRows.map((r) => (
              <div key={r.name} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground truncate">{r.name} <span className="text-xs text-muted-foreground font-normal">· {r.count}</span></span>
                  <span className="tabular-nums text-foreground shrink-0">{formatMoney(r.amount, currency)} <span className="text-xs text-muted-foreground">({r.share.toFixed(0)}%)</span></span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-destructive/70" style={{ width: `${Math.max(2, r.share)}%` }} /></div>
              </div>
            ))}
          </div>
        ))}

        {report === "events" && (eventRows.length === 0 ? (
          <div className="bg-card border border-border rounded-[15px]"><EmptyState title="No events in this period" /></div>
        ) : (
          <>
          <div className="sm:hidden space-y-3">
            {eventRows.map((r) => (
              <RowCard
                key={r.id}
                title={r.title}
                sub={[r.date && formatEventDate(r.date), r.client].filter(Boolean).join(" · ")}
                aside={r.margin != null ? <span className={cn("shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 bg-muted", signTone(r.profit))}>{r.margin.toFixed(0)}%</span> : null}
              >
                <Stat label={t("Contract")}>
                  {formatMoney(r.contract, currency)}
                  {(r.addons > 0 || r.extras > 0) && (
                    <span className="block text-[10px] font-normal leading-tight text-muted-foreground whitespace-normal">
                      {formatMoney(r.base, currency)}{r.addons > 0 && ` + ${formatMoney(r.addons, currency)} ${t("add-ons")}`}{r.extras > 0 && ` + ${formatMoney(r.extras, currency)} ${t("extras")}`}
                    </span>
                  )}
                </Stat>
                <Stat label={t("Received")} className="text-success">{formatMoney(r.received, currency)}</Stat>
                <Stat label={t("Pending")} className={r.pending > 0 ? "text-warning" : "text-muted-foreground"}>{formatMoney(r.pending, currency)}</Stat>
                <Stat label={t("Team + expenses")}>{formatMoney(r.cost, currency)}</Stat>
                <Stat label={t("Profit")} className={signTone(r.profit)}>{formatMoney(r.profit, currency)}</Stat>
              </RowCard>
            ))}
          </div>
          <div className="hidden sm:block">
          <ReportTable head={<><Th>{t("Event")}</Th><Th right>{t("Contract")}</Th><Th right>{t("Received")}</Th><Th right>{t("Pending")}</Th><Th right>{t("Team + expenses")}</Th><Th right>{t("Profit")}</Th><Th right>{t("Margin")}</Th></>}>
            {eventRows.map((r) => (
              <tr key={r.id}>
                <Td><div className="font-medium text-foreground">{r.title}</div><div className="text-xs text-muted-foreground">{[r.date && formatEventDate(r.date), r.client].filter(Boolean).join(" · ")}</div></Td>
                <Td right>
                  <div>{formatMoney(r.contract, currency)}</div>
                  {(r.addons > 0 || r.extras > 0) && (
                    <div className="text-[10px] leading-tight text-muted-foreground font-normal">
                      {formatMoney(r.base, currency)}{r.addons > 0 && ` + ${formatMoney(r.addons, currency)} ${t("add-ons")}`}{r.extras > 0 && ` + ${formatMoney(r.extras, currency)} ${t("extras")}`}
                    </div>
                  )}
                </Td>
                <Td right className="text-success">{formatMoney(r.received, currency)}</Td>
                <Td right className={r.pending > 0 ? "text-warning" : "text-muted-foreground"}>{formatMoney(r.pending, currency)}</Td>
                <Td right>{formatMoney(r.cost, currency)}</Td>
                <Td right className={cn("font-semibold", signTone(r.profit))}>{formatMoney(r.profit, currency)}</Td>
                <Td right className="text-muted-foreground">{r.margin == null ? "—" : `${r.margin.toFixed(0)}%`}</Td>
              </tr>
            ))}
          </ReportTable>
          </div>
          </>
        ))}

        {report === "clients" && (clientRows.length === 0 ? (
          <div className="bg-card border border-border rounded-[15px]"><EmptyState title="No client work in this period" /></div>
        ) : (
          <>
          <div className="sm:hidden space-y-3">
            {clientRows.map((r) => (
              <RowCard key={r.id} title={r.name} sub={`${r.events} ${r.events === 1 ? t("event") : t("events")}`}>
                <Stat label={t("Contract")}>{formatMoney(r.contract, currency)}</Stat>
                <Stat label={t("Received")} className="text-success">{formatMoney(r.received, currency)}</Stat>
                <Stat label={t("Outstanding")} className={r.pending > 0 ? "text-warning" : "text-muted-foreground"}>{formatMoney(r.pending, currency)}</Stat>
              </RowCard>
            ))}
          </div>
          <div className="hidden sm:block">
          <ReportTable head={<><Th>{t("Client")}</Th><Th right>{t("Events")}</Th><Th right>{t("Contract")}</Th><Th right>{t("Received")}</Th><Th right>{t("Outstanding")}</Th></>}>
            {clientRows.map((r) => (
              <tr key={r.id}><Td className="font-medium">{r.name}</Td><Td right>{r.events}</Td><Td right>{formatMoney(r.contract, currency)}</Td><Td right className="text-success">{formatMoney(r.received, currency)}</Td><Td right className={cn("font-semibold", r.pending > 0 ? "text-warning" : "text-muted-foreground")}>{formatMoney(r.pending, currency)}</Td></tr>
            ))}
          </ReportTable>
          </div>
          </>
        ))}

        {report === "team" && (teamRows.length === 0 ? (
          <div className="bg-card border border-border rounded-[15px]"><EmptyState title="No team payments in this period" /></div>
        ) : (
          <>
          <div className="sm:hidden space-y-3">
            {teamRows.map((r) => (
              <RowCard
                key={r.id}
                title={r.name}
                sub={r.role}
                aside={<span className="shrink-0 text-sm font-bold tabular-nums text-foreground">{formatMoney(r.paid, currency)}</span>}
              >
                <Stat label={t("Payments")}>{r.count}</Stat>
                <Stat label={t("Last paid")} className="text-muted-foreground">{r.last ? formatEventDate(r.last) : "—"}</Stat>
              </RowCard>
            ))}
          </div>
          <div className="hidden sm:block">
          <ReportTable head={<><Th>{t("Member")}</Th><Th right>{t("Payments")}</Th><Th right>{t("Last paid")}</Th><Th right>{t("Total paid")}</Th></>}>
            {teamRows.map((r) => (
              <tr key={r.id}><Td><div className="font-medium text-foreground">{r.name}</div>{r.role && <div className="text-xs text-muted-foreground">{r.role}</div>}</Td><Td right>{r.count}</Td><Td right className="text-muted-foreground">{r.last ? formatEventDate(r.last) : "—"}</Td><Td right className="font-semibold">{formatMoney(r.paid, currency)}</Td></tr>
            ))}
          </ReportTable>
          </div>
          </>
        ))}

        {report === "leads" && (leadsLoading ? (
          <div className="bg-card border border-border rounded-[15px] p-8 text-center text-sm text-muted-foreground">{t("Loading…")}</div>
        ) : leadInsights.total === 0 ? (
          <div className="bg-card border border-border rounded-[15px]"><EmptyState title="No leads in this period" description="Leads created in the selected period, and how many became clients, show up here." /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CountCard label={t("Leads")} value={leadInsights.total} />
              <CountCard label={t("Won")} value={leadInsights.won} tone="text-success" />
              <CountCard label={t("Lost")} value={leadInsights.lost} tone="text-destructive" />
              <CountCard label={t("Conversion")} value={leadInsights.conversionRate == null ? "—" : `${leadInsights.conversionRate}%`} sub={t("won of decided leads")} />
            </div>
            <div className="bg-card border border-border rounded-[15px] divide-y divide-border">
              <div className="px-4 py-3 text-sm font-semibold text-foreground">{t("Where leads are now")}</div>
              {leadInsights.stages.map((st) => (
                <div key={st.status} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{t(STATUS_STYLES[st.status]?.label || st.status)}</span>
                    <span className="tabular-nums text-foreground">{st.count}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary/70" style={{ width: `${st.count ? Math.max(2, (st.count / leadInsights.total) * 100) : 0}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="sm:hidden space-y-3">
              {sourceRows.map((x) => (
                <RowCard key={x.name} title={x.name} aside={<span className="shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 bg-muted text-foreground">{x.rate}%</span>}>
                  <Stat label={t("Leads")}>{x.total}</Stat>
                  <Stat label={t("Won")} className="text-success">{x.won}</Stat>
                </RowCard>
              ))}
            </div>
            <div className="hidden sm:block">
              <ReportTable head={<><Th>{t("Source")}</Th><Th right>{t("Leads")}</Th><Th right>{t("Won")}</Th><Th right>{t("Conversion")}</Th></>}>
                {sourceRows.map((x) => (
                  <tr key={x.name}><Td className="font-medium">{x.name}</Td><Td right>{x.total}</Td><Td right className="text-success">{x.won}</Td><Td right className="text-muted-foreground">{x.rate}%</Td></tr>
                ))}
              </ReportTable>
            </div>
            {lostRows.length > 0 && (
              <div className="bg-card border border-border rounded-[15px] divide-y divide-border">
                <div className="px-4 py-3 text-sm font-semibold text-foreground">{t("Why leads were lost")}</div>
                {lostRows.map((x) => (
                  <div key={x.name} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{t(x.name)}</span>
                    <span className="tabular-nums text-muted-foreground">{x.count}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ))}

        {report === "gst" && (invoicesLoading ? (
          <div className="bg-card border border-border rounded-[15px] p-8 text-center text-sm text-muted-foreground">{t("Loading…")}</div>
        ) : gstRows.length === 0 ? (
          <div className="bg-card border border-border rounded-[15px]"><EmptyState title="No GST invoices in this period" description={workspace?.gst_enabled ? "Issued invoices with GST (not drafts or cancelled) in the selected period are summed up here." : "Switch on GST in Preferences, then invoices with GST are summed up here by month."} /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3">
              <SummaryCard label={t("Taxable value")} value={gstTotals.taxable} currency={currency} icon={currencyIcon(currency)} />
              <SummaryCard label={t("Total GST")} value={gstTotals.gst} tone="primary" currency={currency} icon={Percent} />
              <SummaryCard label={gstTotals.igst > 0 && gstTotals.cgst === 0 ? t("IGST") : t("CGST + SGST")} value={gstTotals.igst > 0 && gstTotals.cgst === 0 ? gstTotals.igst : gstTotals.cgst + gstTotals.sgst} currency={currency} icon={Wallet} className="min-[420px]:col-span-2 sm:col-span-1" />
            </div>
            <p className="text-xs text-muted-foreground px-1">{t("Based on invoices issued in this period, not drafts or cancelled ones. Check with your accountant before filing.")}</p>
            <div className="sm:hidden space-y-3">
              {gstRows.map((x) => (
                <RowCard key={x.key} title={x.label} sub={`${x.invoices} ${x.invoices === 1 ? t("invoice") : t("invoices")}`} aside={<span className="shrink-0 text-sm font-bold tabular-nums text-foreground">{formatMoney(x.gst, currency)}</span>}>
                  <Stat label={t("Taxable value")}>{formatMoney(x.taxable, currency)}</Stat>
                  <Stat label="CGST">{formatMoney(x.cgst, currency)}</Stat>
                  <Stat label="SGST">{formatMoney(x.sgst, currency)}</Stat>
                  <Stat label="IGST">{formatMoney(x.igst, currency)}</Stat>
                </RowCard>
              ))}
            </div>
            <div className="hidden sm:block">
              <ReportTable head={<><Th>{t("Month")}</Th><Th right>{t("Invoices")}</Th><Th right>{t("Taxable value")}</Th><Th right>CGST</Th><Th right>SGST</Th><Th right>IGST</Th><Th right>{t("Total GST")}</Th></>}>
                {gstRows.map((x) => (
                  <tr key={x.key}><Td className="font-medium">{x.label}</Td><Td right>{x.invoices}</Td><Td right>{formatMoney(x.taxable, currency)}</Td><Td right>{formatMoney(x.cgst, currency)}</Td><Td right>{formatMoney(x.sgst, currency)}</Td><Td right>{formatMoney(x.igst, currency)}</Td><Td right className="font-semibold">{formatMoney(x.gst, currency)}</Td></tr>
                ))}
              </ReportTable>
            </div>
          </>
        ))}
      </div>
    </div>
  );
}
