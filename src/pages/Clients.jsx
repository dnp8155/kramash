import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import SearchInput from "@/components/common/SearchInput";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/Skeletons";
import ClientForm from "@/components/clients/ClientForm";
import { Plus, Pencil, Eye, Download, Users, CalendarCheck, UserCheck } from "lucide-react";
import { exportClientsCsv } from "@/lib/exportUtils";
import StatCard from "@/components/common/StatCard";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";

export default function Clients() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const t = useT();

  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["clients", workspaceId],
    queryFn: async () => {
      const [clList, evList] = await Promise.all([
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500)
      ]);
      const counts = {};
      (evList || []).forEach((e) => { counts[e.client_id] = (counts[e.client_id] || 0) + 1; });
      return { clients: clList || [], eventCounts: counts };
    },
    enabled: !!workspaceId
  });
  const clients = data?.clients || [];
  const eventCounts = data?.eventCounts || {};
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["clients", workspaceId] });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.name} ${c.phone || ""} ${c.email || ""}`.toLowerCase().includes(q)
    );
  }, [clients, query]);

  const openNew = () => { setEditingClient(null); setShowForm(true); };
  const openEdit = (c) => { setEditingClient(c); setShowForm(true); };

  const totalEvents = Object.values(eventCounts).reduce((s, n) => s + n, 0);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your client directory and their {term.workItemSingular.toLowerCase()} history.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportClientsCsv(filtered, eventCounts)} disabled={filtered.length === 0}>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("Export")}</span>
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Add Client")}</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label={t("Total Clients")} value={clients.length} icon={Users} tone="primary" />
        <StatCard label={`Total ${term.workItemPlural}`} value={totalEvents} icon={CalendarCheck} tone="info" />
        <StatCard label={`With ${term.workItemPlural}`} value={Object.keys(eventCounts).length} icon={UserCheck} tone="success" />
      </div>

      <SearchInput
        placeholder={t("Search by name, phone, email")}
        className="sm:max-w-xs"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && (
        <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
          {error?.message || t("Failed to load clients.")}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            title={query ? t("No clients found") : t("No clients yet")}
            description={query ? t("Try a different search term.") : `Add a client to create and manage ${term.workItemPlural.toLowerCase()}.`}
            action={!query ? <Button onClick={openNew}>+ {t("Add Client")}</Button> : null}
          />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1.4fr_1fr_80px_auto] gap-4 items-center px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>{t("Name")}</span>
            <span>{t("Phone")}</span>
            <span>{t("Email")}</span>
            <span>{term.workItemPlural}</span>
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
        onSaved={invalidate}
        client={editingClient}
        workspaceId={workspaceId}
      />
    </div>
  );
}