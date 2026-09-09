import { useMemo, useState } from "react";
import { Wallet, Download, TrendingUp, TrendingDown, Clock } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import SearchInput from "@/components/common/SearchInput";
import FilterControl from "@/components/common/FilterControl";
import Button from "@/components/common/Button";
import StatCard from "@/components/common/StatCard";
import EmptyState from "@/components/common/EmptyState";
import { mockPayments, paymentStatuses } from "@/data/mockPayments";
import { formatCurrency, formatDate } from "@/utils/format";

export default function Financial() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      mockPayments.filter((p) => {
        const matchesSearch =
          !search || [p.event, p.client].some((f) => f.toLowerCase().includes(search.toLowerCase()));
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [search, statusFilter]
  );

  const received = mockPayments.filter((p) => p.status === "Received").reduce((s, p) => s + p.amount, 0);
  const pending = mockPayments.filter((p) => p.status === "Pending").reduce((s, p) => s + p.amount, 0);
  const overdue = mockPayments.filter((p) => p.status === "Overdue").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Financial"
        description="Track payments, dues, and revenue across events."
        actions={<Button variant="outline"><Download className="h-4 w-4" /> Export</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Received" value={received} isCurrency icon={TrendingUp} accent="success" trend={`${mockPayments.filter((p) => p.status === "Received").length} payments`} />
        <StatCard label="Pending" value={pending} isCurrency icon={Clock} accent="warning" trend="Awaiting clearance" />
        <StatCard label="Overdue" value={overdue} isCurrency icon={TrendingDown} accent="destructive" trend="Needs follow-up" />
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by event or client…" className="flex-1" />
          <FilterControl label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={paymentStatuses} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment Activity</CardTitle></CardHeader>
        {filtered.length === 0 ? (
          <EmptyState title="No payments found" description="Adjust filters to see results." icon={Wallet} />
        ) : (
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Payment ID</th>
                    <th className="px-5 py-3 font-semibold">Event</th>
                    <th className="px-5 py-3 font-semibold">Client</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Method</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">{p.id}</td>
                      <td className="px-5 py-3 text-foreground">{p.event}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.client}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">{formatCurrency(p.amount)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.method}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(p.date)}</td>
                      <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        )}
      </Card>
    </div>
  );
}