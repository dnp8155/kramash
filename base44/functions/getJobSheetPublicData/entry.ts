import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { waitUntil } from "base44:runtime";
import { buildJobSheetData, getDefaultEquipment } from "../../shared/jobSheetData.ts";

// Public endpoint — no auth required. The public_token authorizes access
// to exactly one event's job sheet. Service role is used because there is
// no authenticated user; the token itself is the authorization.
// ALL financial data is stripped in buildJobSheetData (hard safety rule).
// Display toggles (show_team_names, include_contacts) are applied server-side.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const token = body?.token;
    if (!token || typeof token !== "string" || token.length < 16) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Find portal by token
    const portals = await base44.asServiceRole.entities.JobSheetPortal.filter({
      public_token: token,
    });
    if (!portals || portals.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const portal = portals[0];

    if (!portal.is_enabled) {
      return Response.json(
        { error: "disabled", message: "This Job Sheet link is no longer available." },
        { status: 403 }
      );
    }

    // Fetch event
    let event: any;
    try {
      event = await base44.asServiceRole.entities.Event.get(portal.event_id);
    } catch {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (!event) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Extract job sheet config from event (for server-side toggle application)
    const rawConfig = event.job_sheet_config || {};
    const config = {
      show_team_names: rawConfig.show_team_names !== false,
      include_contacts: rawConfig.include_contacts === true,
      include_equipment: rawConfig.include_equipment !== false,
      equipment_items: rawConfig.equipment_items || [],
      default_reporting_time: rawConfig.default_reporting_time || "",
      date_overrides: rawConfig.date_overrides || [],
      internal_notes: rawConfig.internal_notes || "",
    };

    // Build job sheet data with config (applies toggles server-side)
    const data = await buildJobSheetData(base44, event, config);
    if (!data) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Resolve equipment items (config or category defaults)
    const equipmentItems =
      config.equipment_items.length > 0
        ? config.equipment_items.filter(Boolean)
        : getDefaultEquipment(data.category);

    // Increment view count (non-blocking)
    const now = new Date().toISOString();
    waitUntil(
      base44.asServiceRole.entities.JobSheetPortal.update(portal.id, {
        view_count: (portal.view_count || 0) + 1,
        first_viewed_at: portal.first_viewed_at || now,
        last_viewed_at: now,
      })
    );

    return Response.json({
      ...data,
      config: {
        show_team_names: config.show_team_names,
        include_contacts: config.include_contacts,
        include_equipment: config.include_equipment,
        equipment_items: equipmentItems,
        default_reporting_time: config.default_reporting_time,
        date_overrides: config.date_overrides,
        internal_notes: config.internal_notes,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}