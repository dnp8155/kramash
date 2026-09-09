import { useMemo, useState } from "react";
import { Plus, Mail, Phone, Users } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import SearchInput from "@/components/common/SearchInput";
import FilterControl from "@/components/common/FilterControl";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import { mockTeam, teamStatuses } from "@/data/mockTeam";
import { initials } from "@/utils/format";

export default function Team() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      mockTeam.filter((m) => {
        const matchesSearch =
          !search || [m.name, m.role].some((f) => f.toLowerCase().includes(search.toLowerCase()));
        const matchesStatus = statusFilter === "all" || m.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [search, statusFilter]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description="Manage your crew, photographers, and editors."
        actions={<Button><Plus className="h-4 w-4" /> Invite Member</Button>}
      />

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…" className="flex-1" />
          <FilterControl label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={teamStatuses} />
        </CardBody>
      </Card>

      {filtered.length === 0 ? (
        <Card><EmptyState title="No members found" description="Try a different search." icon={Users} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <Card key={m.id} className="transition-shadow hover:shadow-md">
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                    {m.avatar || initials(m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 truncate"><Mail className="h-4 w-4 shrink-0" /> {m.email}</p>
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> {m.phone}</p>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">{m.events} events assigned</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}