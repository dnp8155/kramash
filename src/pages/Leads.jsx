import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import StatCard from "@/components/common/StatCard";
import SearchInput from "@/components/common/SearchInput";
import LoadingState from "@/components/common/LoadingState";
import LeadForm from "@/components/leads/LeadForm";
import LeadPipeline from "@/components/leads/LeadPipeline";
import LeadTable from "@/components/leads/LeadTable";
import { LEAD_STAGES, LEAD_SOURCES, stageLabel, sourceLabel, deleteLead } from "@/lib/leadService";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";
import { Plus, LayoutGrid, List, Phone, TrendingUp, Target, CheckCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

export default function Leads() {
  const { workspaceId } = useWorkspace();
  const term = useBusinessTerminology();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [view, setView] = useState("pipeline");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", workspaceId],
    queryFn: () => base44.entities.Lead.filter({ workspace_id: workspaceId }, "-created_date"),
    enabled: !!workspaceId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team", workspaceId],
    queryFn: () => base44.entities.TeamMember.filter({ workspace_id: workspaceId }),
    enabled: !!workspaceId
  });

  const filtered = leads.filter((l) => {
    const matchSearch = !search ||
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.work_type?.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || l.stage === stageFilter;
    const matchSource = sourceFilter === "all" || l.source === sourceFilter;
    return matchSearch && matchStage && matchSource;
  });

  const stats = {
    total: leads.length,
    active: leads.filter((l) => !["won", "lost"].includes(l.stage)).length,
    won: leads.filter((l) => l.stage === "won").length,
    pipelineValue: leads
      .filter((l) => !["won", "lost"].includes(l.stage))
      .reduce((sum, l) => sum + Number(l.budget || 0), 0)
  };

  const conversionRate = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : "0";

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLead(deleteTarget.id);
      toast({ title: "Lead deleted" });
      invalidateEntities(queryClient, ["Lead", "LeadActivity"]);
    } catch (e) {
      toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const refresh = () => invalidateEntities(queryClient, ["Lead", "LeadActivity"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Leads"
        subtitle="Capture enquiries, track pipeline, and convert leads to clients."
      >
        <Button onClick={() => { setEditingLead(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> New Lead
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Leads"
          value={stats.active}
          icon={Target}
          tone="primary"
        />
        <StatCard
          label="Pipeline Value"
          value={`₹${(stats.pipelineValue / 100000).toFixed(1)}L`}
          icon={TrendingUp}
          tone="warning"
        />
        <StatCard
          label="Won"
          value={stats.won}
          icon={CheckCircle}
          tone="success"
        />
        <StatCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          tone="primary"
        />
      </div>

      {/* Filters + View toggle */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="w-56" />
          <select
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="all">All Stages</option>
            {LEAD_STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">All Sources</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("pipeline")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === "pipeline" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
          >
            <LayoutGrid className="w-4 h-4" /> Pipeline
          </button>
          <button
            onClick={() => setView("table")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
          >
            <List className="w-4 h-4" /> Table
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl">
          <LoadingState label="Loading leads..." />
        </div>
      ) : view === "pipeline" ? (
        <LeadPipeline
          leads={filtered}
          teamMembers={teamMembers}
          workspaceId={workspaceId}
          onLeadClick={(l) => navigate(`/leads/${l.id}`)}
          onAddLead={() => { setEditingLead(null); setShowForm(true); }}
          onStageChanged={refresh}
        />
      ) : (
        <LeadTable
          leads={filtered}
          teamMembers={teamMembers}
          loading={isLoading}
          onLeadClick={(l) => navigate(`/leads/${l.id}`)}
          onEdit={(l) => { setEditingLead(l); setShowForm(true); }}
          onDelete={(l) => setDeleteTarget(l)}
        />
      )}

      {/* Form Dialog */}
      <LeadForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={refresh}
        lead={editingLead}
        workspaceId={workspaceId}
        teamMembers={teamMembers}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}