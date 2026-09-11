import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import SearchInput from "@/components/common/SearchInput";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import LeadForm from "@/components/leads/LeadForm";
import { useToast } from "@/components/ui/use-toast";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { Plus, Pencil, Trash2, Phone, Mail, Calendar, TrendingUp, Flame, Users, Target } from "lucide-react";

const STATUS_STYLES = {
  new: { bg: "bg-blue-50", text: "text-blue-700", label: "New" },
  contacted: { bg: "bg-purple-50", text: "text-purple-700", label: "Contacted" },
  qualified: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Qualified" },
  negotiation: { bg: "bg-amber-50", text: "text-amber-700", label: "Negotiation" },
  won: { bg: "bg-green-50", text: "text-green-700", label: "Won" },
  lost: { bg: "bg-red-50", text: "text-red-700", label: "Lost" }
};

const PRIORITY_STYLES = {
  hot: { icon: Flame, color: "text-red-600", bg: "bg-red-50", label: "Hot" },
  warm: { icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", label: "Warm" },
  cold: { icon: Target, color: "text-blue-600", bg: "bg-blue-50", label: "Cold" }
};

const SOURCE_LABELS = {
  referral: "Referral",
  social_media: "Social Media",
  website: "Website",
  walk_in: "Walk-in",
  advertisement: "Advertisement",
  other: "Other"
};

export default function Leads() {
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", workspaceId],
    queryFn: async () => {
      return await base44.entities.Lead.filter({ workspace_id: workspaceId }, "-created_date", 500);
    },
    enabled: !!workspaceId
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] });
    invalidateEntities(queryClient, ["Lead"]);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (priorityFilter !== "all" && l.priority !== priorityFilter) return false;
      if (q && !`${l.name} ${l.phone || ""} ${l.email || ""} ${l.event_type || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leads, query, statusFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    won: leads.filter((l) => l.status === "won").length,
    hot: leads.filter((l) => l.priority === "hot").length,
    active: leads.filter((l) => !["won", "lost"].includes(l.status)).length
  }), [leads]);

  const openNew = () => { setEditingLead(null); setShowForm(true); };
  const openEdit = (l) => { setEditingLead(l); setShowForm(true); };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Delete lead "${lead.name}"?`)) return;
    try {
      await base44.entities.Lead.delete(lead.id);
      toast({ title: "Lead deleted" });
      invalidate();
    } catch {
      toast({ title: "Failed to delete lead", variant: "destructive" });
    }
  };

  const handleStatusChange = async (lead, newStatus) => {
    try {
      await base44.entities.Lead.update(lead.id, { status: newStatus });
      invalidate();
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <PageHeader title="Leads" subtitle="Track and manage potential clients through your sales pipeline.">
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Lead</span>
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={stats.total} icon={Users} tone="primary" />
        <StatCard label="Active" value={stats.active} icon={Target} tone="info" />
        <StatCard label="Hot Leads" value={stats.hot} icon={Flame} tone="warning" />
        <StatCard label="Won" value={stats.won} icon={TrendingUp} tone="success" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search leads..." className="flex-1" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44">
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="sm:w-40">
          <option value="all">All Priorities</option>
          {Object.entries(PRIORITY_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query || statusFilter !== "all" || priorityFilter !== "all" ? "No leads match your filters" : "No leads yet"}
          description={query || statusFilter !== "all" || priorityFilter !== "all" ? "Try adjusting your search or filters." : "Add your first lead to start tracking potential clients."}
          action={!query && statusFilter === "all" && priorityFilter === "all" ? (
            <Button onClick={openNew}><Plus className="w-4 h-4" /> Add Lead</Button>
          ) : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lead) => {
            const st = STATUS_STYLES[lead.status] || STATUS_STYLES.new;
            const pr = PRIORITY_STYLES[lead.priority] || PRIORITY_STYLES.warm;
            const PrIcon = pr.icon;
            return (
              <div key={lead.id} className="bg-card border border-border rounded-xl p-4 shadow-card hover:shadow-card-hover hover-lift transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-foreground truncate">{lead.name}</h3>
                    {lead.event_type && <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.event_type}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${pr.bg} ${pr.color}`}>
                      <PrIcon className="w-3 h-3" />
                      {pr.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                  {lead.source && (
                    <span className="text-xs text-muted-foreground">{SOURCE_LABELS[lead.source] || lead.source}</span>
                  )}
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.event_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{new Date(lead.event_date).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}
                </div>

                {lead.budget > 0 && (
                  <div className="text-sm font-medium text-foreground mb-3">
                    Budget: ₹{lead.budget.toLocaleString("en-IN")}
                  </div>
                )}

                {lead.notes && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2 break-anywhere">{lead.notes}</p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Select
                    size="sm"
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead, e.target.value)}
                    className="flex-1"
                  >
                    {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(lead)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(lead)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LeadForm
        open={showForm}
        onClose={() => setShowForm(false)}
        editingLead={editingLead}
        onSaved={invalidate}
      />
    </div>
  );
}