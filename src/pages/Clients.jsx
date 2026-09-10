import { useEffect, useMemo, useState } from "react";
import { Plus, Users, Download } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody } from "@/components/common/Card";
import SearchInput from "@/components/common/SearchInput";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import ClientCard from "@/components/clients/ClientCard";
import ClientForm from "@/components/clients/ClientForm";
import { useClients } from "@/hooks/useClients";
import { useEvents } from "@/hooks/useEvents";
import { base44 } from "@/api/base44Client";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";
import { exportClientsCSV } from "@/utils/exports";
import { toast } from "@/components/ui/use-toast";

export default function Clients() {
  const { clients, loading, error, refetch, createClient } = useClients();
  const { events } = useEvents();
  const t = useBusinessTerminology();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    base44.entities.FinancialTransaction.filter(
      { transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" },
      "-transaction_date",
      500
    )
      .then(setTransactions)
      .catch(() => setTransactions([]));
  }, []);

  const clientStats = useMemo(() => {
    const map = new Map();
    for (const c of clients) {
      const clientEvents = events.filter((e) => e.client_id === c.id);
      const eventCount = clientEvents.length;
      const contractValue = clientEvents
        .filter((e) => e.status !== "Cancelled")
        .reduce((s, e) => s + (Number(e.contract_value) || 0), 0);
      const received = transactions
        .filter((t) => t.client_id === c.id)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const outstanding = Math.max(0, contractValue - received);
      map.set(c.id, { eventCount, outstanding });
    }
    return map;
  }, [clients, events, transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.phone, c.alternate_phone, c.email, c.city, c.state].some((f) =>
        (f || "").toLowerCase().includes(q)
      )
    );
  }, [clients, search]);

  const handleSave = async (data) => {
    await createClient(data);
    toast({ title: "Client created successfully." });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description={`Manage your clients and their ${t.workItemSingular.toLowerCase()} history.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { exportClientsCSV(clients, events, t); toast({ title: "Clients exported" }); }}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </div>
        }
      />

      <Card>
        <CardBody>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email…"
          />
        </CardBody>
      </Card>

      {loading ? (
        <Card>
          <LoadingState label="Loading clients…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={search ? "No clients found" : "No clients yet"}
            description={
              search
                ? "Try a different name, phone number or email."
                : "Add your first client to start managing projects, events and payments."
            }
            icon={Users}
            action={
              !search ? (
                <Button onClick={() => setModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Client
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              eventCount={clientStats.get(c.id)?.eventCount || 0}
              outstanding={clientStats.get(c.id)?.outstanding || 0}
            />
          ))}
        </div>
      )}

      <ClientForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}