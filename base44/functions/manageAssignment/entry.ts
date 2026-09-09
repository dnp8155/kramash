import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Manages event assignments (team and service) with server-side SELF
// duplicate prevention. Only ONE SELF (workspace owner) assignment is
// allowed per event — across both team and service assignments.
//
// This is the authoritative enforcement point. Frontend filtering is a
// convenience; this backend function is the guarantee.
//
// Operations:
//   - create: Creates a new EventTeamAssignment or EventServiceAssignment
//   - update: Updates an existing assignment
//
// SELF validation:
//   - Resolves the workspace owner's name
//   - Finds all team members whose name matches the owner (case-insensitive)
//   - If the member being assigned is SELF, checks all existing assignments
//     (team + service) for the same event
//   - If SELF is already assigned (excluding the assignment being edited),
//     rejects with 409: "Owner / Self is already assigned to this event."

function normalizeName(s) {
  return (s || '').trim().toLowerCase();
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const { operation, assignment_type, workspace_id, assignment_id, ...entityData } = body;

    if (!workspace_id) return Response.json({ error: 'workspace_id is required' }, { status: 400 });
    if (!operation || !['create', 'update'].includes(operation)) {
      return Response.json({ error: 'operation must be "create" or "update"' }, { status: 400 });
    }
    if (!assignment_type || !['team', 'service'].includes(assignment_type)) {
      return Response.json({ error: 'assignment_type must be "team" or "service"' }, { status: 400 });
    }

    // ─── Resolve workspace owner name ───
    const workspace = await base44.asServiceRole.entities.Workspace.get(workspace_id);
    if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 404 });

    let ownerName = '';
    if (workspace.owner_user_id) {
      try {
        const ownerUser = await base44.asServiceRole.entities.User.get(workspace.owner_user_id);
        ownerName = ownerUser?.full_name || '';
      } catch { /* ignore — SELF check skipped if owner can't be resolved */ }
    }

    // ─── Determine the member ID and event ID for SELF check ───
    let memberIdToCheck: string = '';
    let eventId: string = '';

    if (assignment_type === 'team') {
      if (operation === 'create') {
        memberIdToCheck = entityData.team_member_id || '';
        eventId = entityData.event_id || '';
        if (!memberIdToCheck) return Response.json({ error: 'team_member_id is required' }, { status: 400 });
        if (!eventId) return Response.json({ error: 'event_id is required' }, { status: 400 });
      } else {
        if (!assignment_id) return Response.json({ error: 'assignment_id is required for update' }, { status: 400 });
        const existing = await base44.asServiceRole.entities.EventTeamAssignment.get(assignment_id);
        if (!existing) return Response.json({ error: 'Assignment not found' }, { status: 404 });
        memberIdToCheck = entityData.team_member_id || existing.team_member_id;
        eventId = existing.event_id;
      }
    } else {
      // service assignment
      if (operation === 'create') {
        memberIdToCheck = entityData.provider_id || '';
        eventId = entityData.event_id || '';
        if (!eventId) return Response.json({ error: 'event_id is required' }, { status: 400 });
      } else {
        if (!assignment_id) return Response.json({ error: 'assignment_id is required for update' }, { status: 400 });
        const existing = await base44.asServiceRole.entities.EventServiceAssignment.get(assignment_id);
        if (!existing) return Response.json({ error: 'Assignment not found' }, { status: 404 });
        memberIdToCheck = entityData.provider_id !== undefined ? entityData.provider_id : existing.provider_id;
        eventId = existing.event_id;
      }
    }

    // ─── SELF validation ───
    // Only check if there's an owner name and a real team member (not "client" or null)
    if (ownerName && memberIdToCheck && memberIdToCheck !== 'client') {
      // Find all team members that are SELF (name matches owner, case-insensitive)
      const allMembers = await base44.asServiceRole.entities.TeamMember.filter(
        { workspace_id },
        '-created_date',
        500
      );
      const selfMemberIds = (allMembers || [])
        .filter(m => normalizeName(m.name) === normalizeName(ownerName))
        .map(m => m.id);

      // Only proceed if the member being assigned is SELF
      if (selfMemberIds.includes(memberIdToCheck)) {
        const excludeId = operation === 'update' ? assignment_id : null;

        // Check team assignments for this event
        const teamAssignments = await base44.asServiceRole.entities.EventTeamAssignment.filter(
          { workspace_id, event_id: eventId, assignment_status: 'Assigned' },
          '-created_date',
          500
        );
        for (const a of teamAssignments || []) {
          if (excludeId && a.id === excludeId && assignment_type === 'team') continue;
          if (selfMemberIds.includes(a.team_member_id)) {
            return Response.json({
              error: 'Owner / Self is already assigned to this event.',
            }, { status: 409 });
          }
        }

        // Check service assignments for this event
        const serviceAssignments = await base44.asServiceRole.entities.EventServiceAssignment.filter(
          { workspace_id, event_id: eventId, assignment_status: 'Assigned' },
          '-created_date',
          500
        );
        for (const sa of serviceAssignments || []) {
          if (excludeId && sa.id === excludeId && assignment_type === 'service') continue;
          if (!sa.provider_id || sa.provider_id === 'client') continue;
          if (selfMemberIds.includes(sa.provider_id)) {
            return Response.json({
              error: 'Owner / Self is already assigned to this event.',
            }, { status: 409 });
          }
        }
      }
    }

    // ─── Perform the create/update ───
    let record;
    if (operation === 'create') {
      if (assignment_type === 'team') {
        record = await base44.entities.EventTeamAssignment.create({
          ...entityData,
          workspace_id,
        });
      } else {
        record = await base44.entities.EventServiceAssignment.create({
          ...entityData,
          workspace_id,
        });
      }
    } else {
      if (assignment_type === 'team') {
        record = await base44.entities.EventTeamAssignment.update(assignment_id, entityData);
      } else {
        record = await base44.entities.EventServiceAssignment.update(assignment_id, entityData);
      }
    }

    return Response.json({ success: true, record });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
}