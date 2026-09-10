import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { buildJobSheetData } from "../../shared/jobSheetData.ts";

// Internal endpoint — requires authentication. Returns operational job sheet
// data for crew execution. ALL financial data is stripped in buildJobSheetData
// (hard safety rule, not merely visual hiding). No config is applied server-side
// here — the admin frontend applies display toggles locally for live preview.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const eventId = body?.event_id;
    if (!eventId) {
      return Response.json({ error: "event_id is required" }, { status: 400 });
    }

    // Fetch event for access check
    let event: any;
    try {
      event = await base44.asServiceRole.entities.Event.get(eventId);
    } catch {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify workspace access
    const workspace = await base44.asServiceRole.entities.Workspace.get(event.workspace_id);
    if (!workspace) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const isMember =
      workspace.owner_user_id === user.id ||
      (workspace.member_user_ids || []).includes(user.id) ||
      user.role === "admin";
    if (!isMember) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build job sheet data (no config = all operational data, admin applies toggles)
    const data = await buildJobSheetData(base44, event);
    if (!data) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}