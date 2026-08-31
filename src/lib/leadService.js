import { base44 } from "@/api/base44Client";

export const LEAD_STAGES = [
  { key: "new", label: "New", color: "blue" },
  { key: "contacted", label: "Contacted", color: "indigo" },
  { key: "qualified", label: "Qualified", color: "violet" },
  { key: "proposal_sent", label: "Proposal Sent", color: "amber" },
  { key: "won", label: "Won", color: "green" },
  { key: "lost", label: "Lost", color: "red" }
];

export const LEAD_SOURCES = [
  { key: "instagram", label: "Instagram" },
  { key: "meta_ads", label: "Meta Ads" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "referral", label: "Referral" },
  { key: "website", label: "Website" },
  { key: "phone_call", label: "Phone Call" },
  { key: "direct", label: "Direct / Walk-in" },
  { key: "other", label: "Other" }
];

export const LEAD_PRIORITIES = [
  { key: "low", label: "Low", color: "muted" },
  { key: "medium", label: "Medium", color: "blue" },
  { key: "high", label: "High", color: "amber" },
  { key: "urgent", label: "Urgent", color: "red" }
];

export const ACTIVITY_TYPES = [
  { key: "call", label: "Call", icon: "Phone" },
  { key: "whatsapp", label: "WhatsApp", icon: "MessageCircle" },
  { key: "email", label: "Email", icon: "Mail" },
  { key: "meeting", label: "Meeting", icon: "Users" },
  { key: "note", label: "Note", icon: "StickyNote" },
  { key: "follow_up", label: "Follow-up", icon: "CalendarClock" }
];

export const stageLabel = (stage) => LEAD_STAGES.find((s) => s.key === stage)?.label || stage;
export const sourceLabel = (source) => LEAD_SOURCES.find((s) => s.key === source)?.label || source;
export const priorityLabel = (priority) => LEAD_PRIORITIES.find((p) => p.key === priority)?.label || priority;

export async function createLead(data) {
  return base44.entities.Lead.create(data);
}

export async function updateLead(id, data) {
  return base44.entities.Lead.update(id, data);
}

export async function deleteLead(id) {
  return base44.entities.Lead.delete(id);
}

export async function changeStage(leadId, oldStage, newStage, workspaceId) {
  const lead = await base44.entities.Lead.update(leadId, { stage: newStage });
  await base44.entities.LeadActivity.create({
    workspace_id: workspaceId,
    lead_id: leadId,
    activity_type: "stage_change",
    description: `Stage changed from "${stageLabel(oldStage)}" to "${stageLabel(newStage)}"`,
    old_stage: oldStage,
    new_stage: newStage
  });
  return lead;
}

export async function addActivity(workspaceId, leadId, activityType, description) {
  return base44.entities.LeadActivity.create({
    workspace_id: workspaceId,
    lead_id: leadId,
    activity_type: activityType,
    description
  });
}

export async function convertLeadToClient(lead, workspaceId) {
  const client = await base44.entities.Client.create({
    workspace_id: workspaceId,
    name: lead.name,
    phone: lead.phone || "",
    email: lead.email || "",
    company: lead.company || "",
    notes: lead.notes || `Converted from lead (source: ${sourceLabel(lead.source)})`
  });
  await base44.entities.Lead.update(lead.id, {
    stage: "won",
    converted_client_id: client.id,
    converted_at: new Date().toISOString()
  });
  await base44.entities.LeadActivity.create({
    workspace_id: workspaceId,
    lead_id: lead.id,
    activity_type: "stage_change",
    description: `Lead converted to client: ${client.name}`,
    old_stage: lead.stage,
    new_stage: "won"
  });
  return client;
}