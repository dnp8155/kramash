import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import PageHeader from "@/components/common/PageHeader";
import SearchInput from "@/components/common/SearchInput";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import ClientForm from "@/components/clients/ClientForm";
import { Plus, Pencil, Eye } from "lucide-react";

export default function Clients() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [eventCounts, setEventCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [clList, evList] = await Promise.all([
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500)
      ]);
      setClients(clList || []);
      const counts = {};
      (evList || []).forEach((e) => { counts[e.client_id] = (counts[e.client_id] || 0) + 1; });
      setEventCounts(counts);
    } catch (e) {
      setError(e?.message || "Failed to load clients.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.name} ${c.phone || ""} ${c.email || ""}`.toLowerCase().includes(q)
    );
  }, [clients, query]);

  const openNew = () => { setEditingClient(null); setShowForm(true); };
  const openEdit = (c) => { setEditingClient(c); setShowForm(true); };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <PageHeader title="Clients">
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Client</span>
        </Button>
      </PageHeader>

      <SearchInput
        placeholder="Search by name, phone, email"
        className="sm:max-w-xs"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && (
        <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-card border border-border rounded-lg">
          <LoadingState label="Loading clients…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            title={query ? "No clients found" : "No clients yet"}
            description={query ? "Try a different search term." : "Add a client to create and manage events."}
            action={!query ? <Button onClick={openNew}>+ Add Client</Button> : null}
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1.4fr_1fr_80px_auto] gap-4 items-center px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Name</span>
            <span>Phone</span>
            <span>Email</span>
            <span>Events</span>
            <span />
            <span />
          </div>
          {filtered.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_1fr_1.4fr_1fr_80px_auto] gap-3 sm:gap-4 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
              <button onClick={() => navigate(`/clients/${c.id}`)} className="text-left min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground sm:hidden">{c.phone || c.email || "—"}</div>
              </button>
              <span className="text-sm text-foreground hidden sm:block truncate">{c.phone || "—"}</span>
              <span className="text-sm text-muted-foreground hidden sm:block truncate">{c.email || "—"}</span>
              <span className="text-sm text-foreground hidden sm:block">{eventCounts[c.id] || 0}</span>
              <span className="hidden sm:block" />
              <div className="flex items-center gap-1 justify-self-end">
                <Button variant="ghost" size="icon" aria-label="View" onClick={() => navigate(`/clients/${c.id}`)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(c)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        client={editingClient}
        workspaceId={workspaceId}
      />
    </div>
  );
}