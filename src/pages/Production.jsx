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
import EmptyState from "@/components/common/EmptyState";
import ProductionTaskForm from "@/components/production/ProductionTaskForm";
import { PRODUCTION_STAGES, TASK_TYPES, stageLabel, taskTypeLabel, changeTaskStage, deleteTask } from "@/lib/productionService";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, CheckCircle2, Clock, AlertCircle, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const STAGE_CLASS = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  on_hold: "bg-red-100 text-red-700"
};

const PRIORITY_DOT = {
  low: "bg-muted-foreground",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-red-500"
};

export default function Production() {
  const { workspaceId } = useWorkspace();
  const term = useBusinessTerminology();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["production-tasks", workspaceId],
    queryFn: () => base44.entities.ProductionTask.filter({ workspace_id: workspaceId }, "-created_date"),
    enabled: !!workspaceId
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events", workspaceId],
    queryFn: () => base44.entities.Event.filter({ workspace_id: workspaceId }, "-created_date"),
    enabled: !!workspaceId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team", workspaceId],
    queryFn: () => base44.entities.TeamMember.filter({ workspace_id: workspaceId }),
    enabled: !!workspaceId
  });

  const eventsById = events.reduce((acc, e) => { acc[e.id] = e; return acc; }, {});
  const membersById = teamMembers.reduce((acc, m) => { acc[m.id] = m; return acc; }, {});

  const filtered = tasks.filter((t) => {
    const matchSearch = !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || t.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.stage === "pending").length,
    inProgress: tasks.filter((t) => t.stage === "in_progress").length,
    delivered: tasks.filter((t) => t.stage === "delivered").length,
    overdue: tasks.filter((t) => {
      if (!t.due_date || t.stage === "delivered") return false;
      return new Date(t.due_date) < new Date(new Date().toDateString());
    }).length
  };

  const refresh = () => invalidateEntities(queryClient, ["ProductionTask"]);

  const handleStageChange = async (task, newStage) => {
    try {
      await changeTaskStage(task.id, newStage, workspaceId);
      toast({ title: `Moved to "${stageLabel(newStage)}"` });
      refresh();
    } catch (e) {
      toast({ title: "Failed to update stage", description: e?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTask(deleteTarget.id);
      toast({ title: "Task deleted" });
      refresh();
    } catch (e) {
      toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workflow"
        title="Post-Production"
        subtitle="Track editing, color grading, album design, and delivery pipeline."
      >
        <Button onClick={() => { setEditingTask(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending" value={stats.pending} icon={Clock} tone="muted" />
        <StatCard label="In Progress" value={stats.inProgress} icon={Loader} tone="primary" />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle2} tone="success" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertCircle} tone="danger" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="w-56" />
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setStageFilter("all")}
            className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              stageFilter === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
          >
            All
          </button>
          {PRODUCTION_STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStageFilter(s.key)}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                stageFilter === s.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">Loading tasks...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState title="No tasks found" description="Create a production task to start tracking your workflow." />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          {filtered.map((task) => {
            const event = eventsById[task.event_id];
            const member = membersById[task.assigned_to];
            const isOverdue = task.due_date && task.stage !== "delivered" && new Date(task.due_date) < new Date(new Date().toDateString());
            return (
              <div key={task.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                <span className={cn("w-2 h-2 rounded-full shrink-0 mt-2", PRIORITY_DOT[task.priority])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{task.title}</span>
                    <span className="text-xs text-muted-foreground">· {taskTypeLabel(task.task_type)}</span>
                    {event && (
                      <button
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="text-xs text-primary hover:underline"
                      >
                        {event.title}
                      </button>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {member && <span>👤 {member.name}</span>}
                    {task.due_date && (
                      <span className={cn(isOverdue && "text-destructive font-medium")}>
                        📅 {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        {isOverdue && " (overdue)"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={task.stage}
                    onChange={(e) => handleStageChange(task, e.target.value)}
                    className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer", STAGE_CLASS[task.stage])}
                  >
                    {PRODUCTION_STAGES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => { setEditingTask(task); setShowForm(true); }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(task)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductionTaskForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={refresh}
        task={editingTask}
        workspaceId={workspaceId}
        eventId={editingTask?.event_id || ""}
        teamMembers={teamMembers}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}". This action cannot be undone.
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