// Saving lead changes together with their history entry.
import { base44 } from "@/api/base44Client";

// Saves `core` fields plus `extra` ones that come from the lead-manager database update (0048). If that update hasn't
// been run yet, the extra columns don't exist, so the save is retried with the core fields only.
async function updateLead(id, core, extra) {
  try {
    await base44.entities.Lead.update(id, { ...core, ...extra });
  } catch (e) {
    if (!/lost_reason|last_contacted_at|column/i.test(e?.message || "")) throw e;
    if (Object.keys(core).length) await base44.entities.Lead.update(id, core);
  }
}

// Adds a line to the lead's timeline. Never blocks the action it describes: a failed log is swallowed.
export async function logLeadActivity(workspaceId, leadId, { kind = "note", body = "", from_status = "", to_status = "" } = {}) {
  try {
    return await base44.entities.LeadActivity.create({ workspace_id: workspaceId, lead_id: leadId, kind, body, from_status, to_status });
  } catch {
    return null;
  }
}

// Moves a lead to a new status and records it. `lostReason` is saved when the new status is "lost" (and cleared otherwise).
export async function changeLeadStatus(workspaceId, lead, newStatus, { lostReason = "", note = "" } = {}) {
  await updateLead(lead.id, { status: newStatus }, { lost_reason: newStatus === "lost" ? lostReason : "" });
  await logLeadActivity(workspaceId, lead.id, { kind: "status", from_status: lead.status, to_status: newStatus, body: [lostReason && `reason:${lostReason}`, note].filter(Boolean).join(" · ") });
}

// Notes that you called or messaged the lead; a brand-new lead becomes "Contacted".
export async function markLeadContacted(workspaceId, lead, kind, body = "") {
  const advance = lead.status === "new";
  await updateLead(lead.id, advance ? { status: "contacted" } : {}, { last_contacted_at: new Date().toISOString() });
  await logLeadActivity(workspaceId, lead.id, { kind, body });
  if (advance) await logLeadActivity(workspaceId, lead.id, { kind: "status", from_status: "new", to_status: "contacted" });
  return advance;
}
