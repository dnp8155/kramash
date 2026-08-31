import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import LoadingState from "@/components/common/LoadingState";
import DetailSkeleton from "@/components/common/DetailSkeleton";
import DetailErrorState from "@/components/common/DetailErrorState";
import LeadForm from "@/components/leads/LeadForm";
import LeadActivityTimeline from "@/components/leads/LeadActivityTimeline";
import ConvertLeadDialog from "@/components/leads/ConvertLeadDialog";
import { LEAD_STAGES, LEAD_SOURCES, LEAD_PRIORITIES, stageLabel, sourceLabel, priorityLabel, changeStage, deleteLead } from "@/lib/leadService";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Phone, Mail, Calendar, MapPin, Users, Pencil, Trash2,
  UserPlus, StickyNote, Building2, TrendingUp, AlertCircle
} from "lucide-react";
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

const PRIORITY_CLASS = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700"
};

const STAGE_CLASS = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-indigo-100 text-indigo-700",
  qualified: "bg-violet-100 text-violet-700",
  proposal_sent: "bg-amber-100 text-amber-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700"
};

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const term = useBusinessTerminology();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => base44.entities.Lead.get(id),
    enabled: !!id
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["lead-activities", id],
    queryFn: () => base44.entities.LeadActivity.filter({ lead_id: id }, "-created_date"),
    enabled: !!id
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team", workspaceId],
    queryFn: () => base44.entities.TeamMember.filter({ workspace_id: workspaceId }),
    enabled: !!workspaceId
  });

  const refresh = () => {
    invalidateEntities(queryClient, ["Lead", "LeadActivity"]);
    queryClient.invalidateQueries({ queryKey: ["lead", id] });
    queryClient.invalidateQueries({ queryKey: ["lead-activities", id] });
  };

  if (isLoading) return <DetailSkeleton />;
  if (error || !lead) {
    return (
      <DetailErrorState
        title="Lead not found"
        description="This lead may not exist or you don't have access."
        onBack={() => navigate("/leads")}
        onRetry={refresh}
        backLabel="Back to Leads"
      />
    );
  }

  const assignedMember = teamMembers.find((m) => m.id === lead.assigned_to);
  const isWon = lead.stage === "won";
  const isLost = lead.stage === "lost";
  const isConverted = !!lead.converted_client_id;

  const handleStageChange = async (newStage) => {
    try {
      await changeStage(lead.id, lead.stage, newStage, workspaceId);
      toast({ title: `Stage changed to "${stageLabel(newStage)}"` });
      refresh();
    } catch (e) {
      toast({ title: "Failed to change stage", description: e?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLead(lead.id);
      toast({ title: "Lead deleted" });
      navigate("/leads");
    } catch (e) {
      toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => navigate("/leads")}
            className="mt-1 p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80 mb-1">Lead</div>
            <h1 className="text-xl sm:text-[1.625rem] font-bold text-foreground tracking-tight">{lead.name}</h1>
            {lead.company && <p className="text-sm text-muted-foreground mt-0.5">{lead.company}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isConverted && !isLost && (
            <Button variant="success" onClick={() => setShowConvert(true)}>
              <UserPlus className="w-4 h-4" /> Convert to Client
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button variant="ghost" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Details + Stage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage selector */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Pipeline Stage</h3>
            <div className="flex flex-wrap gap-2">
              {LEAD_STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleStageChange(s.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    lead.stage === s.key
                      ? cn(STAGE_CLASS[s.key], "ring-2 ring-offset-1 ring-primary/30")
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {isConverted && (
              <div className="mt-3 flex items-center gap-2 text-sm text-success">
                <AlertCircle className="w-4 h-4" />
                Converted to client. <button onClick={() => navigate(`/clients/${lead.converted_client_id}`)} className="underline font-medium">View client →</button>
              </div>
            )}
          </Card>

          {/* Contact Info */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailField icon={Phone} label="Phone" value={lead.phone} />
              <DetailField icon={Mail} label="Email" value={lead.email} />
              <DetailField icon={Building2} label="Company" value={lead.company} />
              <DetailField icon={Users} label="Assigned To" value={assignedMember?.name} />
              <DetailField icon={Calendar} label="Tentative Date" value={lead.event_date ? new Date(lead.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""} />
              <DetailField icon={MapPin} label="Venue" value={lead.venue} />
              <DetailField icon={TrendingUp} label="Source" value={sourceLabel(lead.source)} />
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Priority</div>
                <span className={cn("inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full", PRIORITY_CLASS[lead.priority])}>
                  {priorityLabel(lead.priority)}
                </span>
              </div>
            </div>
            {lead.work_type && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Work Type Interest</div>
                <div className="text-sm font-medium text-foreground">{lead.work_type}</div>
              </div>
            )}
            {lead.budget > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Budget</div>
                <div className="text-lg font-bold text-foreground tabular-nums">₹{Number(lead.budget).toLocaleString("en-IN")}</div>
              </div>
            )}
          </Card>

          {/* Notes */}
          {lead.notes && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-muted-foreground" /> Notes
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card className="p-5">
            <LeadActivityTimeline
              activities={activities}
              workspaceId={workspaceId}
              leadId={lead.id}
              onAdded={refresh}
            />
          </Card>
        </div>

        {/* Right — Follow-up + Quick Actions */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Follow-up</h3>
            {lead.follow_up_date ? (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-medium">{new Date(lead.follow_up_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No follow-up scheduled.</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-foreground hover:bg-muted rounded-lg px-3 py-2 transition-colors">
                  <Phone className="w-4 h-4 text-muted-foreground" /> Call {lead.phone}
                </a>
              )}
              {lead.phone && (
                <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-foreground hover:bg-muted rounded-lg px-3 py-2 transition-colors">
                  <Phone className="w-4 h-4 text-muted-foreground" /> WhatsApp
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-foreground hover:bg-muted rounded-lg px-3 py-2 transition-colors">
                  <Mail className="w-4 h-4 text-muted-foreground" /> Email
                </a>
              )}
              {!isConverted && !isLost && (
                <button onClick={() => setShowConvert(true)} className="w-full flex items-center gap-2 text-sm text-success hover:bg-success/5 rounded-lg px-3 py-2 transition-colors">
                  <UserPlus className="w-4 h-4" /> Convert to Client
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <LeadForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={refresh}
        lead={lead}
        workspaceId={workspaceId}
        teamMembers={teamMembers}
      />
      <ConvertLeadDialog
        open={showConvert}
        onClose={() => setShowConvert(false)}
        lead={lead}
        workspaceId={workspaceId}
        onConverted={refresh}
      />
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{lead.name}". This action cannot be undone.
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

function DetailField({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <span className="truncate">{value || "—"}</span>
      </div>
    </div>
  );
}