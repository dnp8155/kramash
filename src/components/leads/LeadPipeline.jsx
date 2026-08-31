import { useState } from "react";
import { Phone, Mail, Calendar, Users, MoreVertical, Plus } from "lucide-react";
import { LEAD_STAGES, LEAD_PRIORITIES, changeStage } from "@/lib/leadService";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

const PRIORITY_DOT = {
  low: "bg-muted-foreground",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-red-500"
};

const STAGE_HEADER = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  qualified: "bg-violet-50 text-violet-700 border-violet-200",
  proposal_sent: "bg-amber-50 text-amber-700 border-amber-200",
  won: "bg-green-50 text-green-700 border-green-200",
  lost: "bg-red-50 text-red-700 border-red-200"
};

export default function LeadPipeline({ leads, teamMembers, workspaceId, onLeadClick, onAddLead, onStageChanged }) {
  const { toast } = useToast();
  const [dragLead, setDragLead] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const membersById = (teamMembers || []).reduce((acc, m) => { acc[m.id] = m; return acc; }, {});

  const handleDrop = async (stage) => {
    if (!dragLead || dragLead.stage === stage) return;
    const lead = dragLead;
    setDragLead(null);
    setDragOver(null);
    try {
      await changeStage(lead.id, lead.stage, stage, workspaceId);
      toast({ title: `Moved to "${LEAD_STAGES.find((s) => s.key === stage)?.label}"` });
      onStageChanged?.();
    } catch (e) {
      toast({ title: "Failed to move lead", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
      {LEAD_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage.key);
        const totalBudget = stageLeads.reduce((sum, l) => sum + Number(l.budget || 0), 0);
        return (
          <div
            key={stage.key}
            className={cn(
              "w-72 shrink-0 rounded-xl border bg-card flex flex-col",
              dragOver === stage.key && "ring-2 ring-primary/40"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(stage.key); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(stage.key)}
          >
            <div className={cn("flex items-center justify-between px-3 py-2.5 border-b rounded-t-xl", STAGE_HEADER[stage.key])}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{stage.label}</span>
                <span className="text-xs font-medium bg-white/60 rounded-full px-1.5 py-0.5">{stageLeads.length}</span>
              </div>
              {totalBudget > 0 && (
                <span className="text-xs font-medium tabular-nums">₹{(totalBudget / 100000).toFixed(1)}L</span>
              )}
            </div>
            <div className="flex-1 p-2 space-y-2 min-h-[200px] overflow-y-auto scrollbar-thin">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragLead(lead)}
                  onDragEnd={() => { setDragLead(null); setDragOver(null); }}
                  onClick={() => onLeadClick?.(lead)}
                  className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{lead.name}</div>
                      {lead.company && <div className="text-xs text-muted-foreground truncate">{lead.company}</div>}
                    </div>
                    <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1", PRIORITY_DOT[lead.priority])} />
                  </div>
                  {lead.work_type && (
                    <div className="text-xs text-muted-foreground mb-1.5">{lead.work_type}</div>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {lead.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
                    )}
                    {lead.event_date && (
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(lead.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    )}
                    {lead.assigned_to && membersById[lead.assigned_to] && (
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{membersById[lead.assigned_to].name.split(" ")[0]}</span>
                    )}
                  </div>
                  {lead.budget > 0 && (
                    <div className="mt-2 text-xs font-semibold text-foreground tabular-nums">
                      ₹{Number(lead.budget).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              ))}
              {stageLeads.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No leads
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}