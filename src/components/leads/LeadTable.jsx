import { Phone, Mail, Calendar, Pencil, Trash2, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import Button from "@/components/common/Button";
import { LEAD_STAGES, LEAD_SOURCES, LEAD_PRIORITIES, stageLabel, sourceLabel, priorityLabel } from "@/lib/leadService";
import { cn } from "@/lib/utils";

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

export default function LeadTable({ leads, teamMembers, onLeadClick, onEdit, onDelete, loading }) {
  if (loading) {
    return <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">Loading leads...</div>;
  }
  if (leads.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl">
        <EmptyState title="No leads found" description="Create a new lead or adjust your filters." />
      </div>
    );
  }

  const membersById = (teamMembers || []).reduce((acc, m) => { acc[m.id] = m; return acc; }, {});

  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>Contact</span>
        <span>Source</span>
        <span>Stage</span>
        <span>Priority</span>
        <span>Date</span>
        <span>Budget</span>
        <span />
      </div>
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
          onClick={() => onLeadClick?.(lead)}
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{lead.name}</div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
              {lead.work_type && <span className="truncate">{lead.work_type}</span>}
            </div>
          </div>
          <span className="text-sm text-muted-foreground hidden md:block">{sourceLabel(lead.source)}</span>
          <span className={cn("inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full w-fit", STAGE_CLASS[lead.stage])}>
            {stageLabel(lead.stage)}
          </span>
          <span className={cn("inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full w-fit", PRIORITY_CLASS[lead.priority])}>
            {priorityLabel(lead.priority)}
          </span>
          <span className="text-sm text-muted-foreground hidden md:block">
            {lead.event_date ? new Date(lead.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums hidden md:block">
            {lead.budget > 0 ? `₹${Number(lead.budget).toLocaleString("en-IN")}` : "—"}
          </span>
          <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => onEdit?.(lead)}><Pencil className="w-3 h-3" /></Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete?.(lead)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}