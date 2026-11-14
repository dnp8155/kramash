import { base44 } from "@/api/base44Client";
import { canCreateResource } from "@/lib/planService";

const ENTITY = {
  max_team_members: () => base44.entities.TeamMember,
  max_services: () => base44.entities.Service,
};

// "Can one more be added?" for forms that let you add several in a row (Save & add more).
// The count comes fresh from the database on every save (not from the cached plan usage, which can be a minute old and
// is only refreshed after the dialog closes), and it never goes below "what there was when the dialog opened plus what
// was added since", because a save that is still on its way is not in the database yet.
// `session` is a { base: null, added: 0 } object the form keeps while it is open.
// Returns null when it is fine, or { limit, current } when the plan's cap is reached.
export async function freshCapReached(plan, key, workspaceId, session) {
  if (!plan?.limits || !workspaceId || !ENTITY[key]) return null;
  let fresh;
  try {
    fresh = ((await ENTITY[key]().filter({ workspace_id: workspaceId, status: "active" })) || []).length;
  } catch {
    return null; // cannot count right now: the server still checks when it saves
  }
  if (session.base == null) session.base = fresh;
  const current = Math.max(fresh, session.base + session.added);
  const res = canCreateResource(plan.limits, key, current);
  return res.allowed ? null : { limit: res.limit, current };
}
