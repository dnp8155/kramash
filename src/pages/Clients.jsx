import { useMemo, useState } from "react";
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
import { exportClientsCSV } from "@/utils/exports";
import { toast } from "@/components/ui/use-toast";

export default function Clients() {
  const { clients, loading, error, refetch, createClient } = useClients();
  const { events } = useEvents();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.phone, c.alternate_phone, c.email].some((f) =>
        (f || "").toLowerCase().includes(q)
      )
    );
  }, [clients, search]);

  const handleSave = async (data) => {
    await createClient(data);
    toast({ title: "Client added" });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Manage your clients and their event history."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { exportClientsCSV(clients, events); toast({ title: "Clients exported" }); }}>
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
                ? "Try a different search."
                : "Add a client to create and manage events."
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
            <ClientCard key={c.id} client={c} />
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