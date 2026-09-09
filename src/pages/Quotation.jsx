import { useMemo, useState } from "react";
import { Plus, FileText, Eye, Download } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import SearchInput from "@/components/common/SearchInput";
import FilterControl from "@/components/common/FilterControl";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import { mockQuotations, quotationStatuses } from "@/data/mockQuotations";
import { formatCurrency, formatDate } from "@/utils/format";

export default function Quotation() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      mockQuotations.filter((q) => {
        const matchesSearch =
          !search || [q.id, q.client, q.event].some((f) => f.toLowerCase().includes(search.toLowerCase()));
        const matchesStatus = statusFilter === "all" || q.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [search, statusFilter]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Quotation & Agreement"
        description="Create, send, and track quotations and signed agreements."
        actions={<Button><Plus className="h-4 w-4" /> New Quotation</Button>}
      />

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotations…" className="flex-1" />
          <FilterControl label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={quotationStatuses} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quotations</CardTitle></CardHeader>
        {filtered.length === 0 ? (
          <EmptyState title="No quotations found" description="Create a quotation to get started." icon={FileText} />
        ) : (
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Quotation #</th>
                    <th className="px-5 py-3 font-semibold">Client</th>
                    <th className="px-5 py-3 font-semibold">Event</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Agreement</th>
                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((q) => (
                    <tr key={q.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium text-foreground">{q.id}</td>
                      <td className="px-5 py-3 text-foreground">{q.client}</td>
                      <td className="px-5 py-3 text-muted-foreground">{q.event}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">{formatCurrency(q.amount)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(q.date)}</td>
                      <td className="px-5 py-3"><StatusBadge status={q.status} /></td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium ${q.agreementSigned ? "text-success" : "text-muted-foreground"}`}>
                          {q.agreementSigned ? "Signed" : "Not signed"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="View"><Eye className="h-4 w-4" /></button>
                          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Download"><Download className="h-4 w-4" /></button>
                        </div>
                      </td>
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