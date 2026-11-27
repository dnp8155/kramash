// Roles, members and services typed into a quotation (custom items) exist only on that quotation. At finalize
// the owner can save them to Team / Services, which also lets the event get cards for them on accept.
import { base44 } from "@/api/base44Client";
import { createTeamMember } from "@/lib/clientEdgeFunctions";
import { isIncludeItem } from "@/lib/quotationCalc";

const lc = (v) => String(v || "").trim().toLowerCase();
const teamRateType = (it) => (["Per Event", "Per Day", "Fixed"].includes(it.rate_type) ? it.rate_type : "Per Event");
const serviceRateType = (it) => (["Fixed", "Per Day", "Per Unit"].includes(it.rate_type) ? it.rate_type : "Fixed");

// [{ key, kind: "role" | "member" | "service", name, role?, rate }] — what isn't in the workspace yet.
export function collectNewEntries(items, roles, teamMembers, services) {
  const out = new Map();
  const roleNames = new Set((roles || []).map((r) => lc(r.name)));
  const serviceNames = new Set((services || []).map((s) => lc(s.name)));
  for (const it of items || []) {
    if (isIncludeItem(it)) continue;
    if (it.item_type === "team" && !it.team_member_id) {
      const role = String(it.description || "").trim();
      if (role && !roleNames.has(lc(role)) && !it.reference_id) {
        out.set(`role:${lc(role)}`, { key: `role:${lc(role)}`, kind: "role", name: role, rate: Number(it.unit_rate) || 0 });
      }
      const person = String(it.team_member_name_snapshot || "").trim();
      if (person) {
        const k = `member:${lc(person)}|${lc(role)}`;
        if (!out.has(k)) out.set(k, { key: k, kind: "member", name: person, role, rate: Number(it.unit_rate) || 0 });
      }
    } else if (it.item_type === "service" && !it.reference_id && String(it.name || "").trim() && !serviceNames.has(lc(it.name))) {
      const k = `service:${lc(it.name)}`;
      if (!out.has(k)) out.set(k, { key: k, kind: "service", name: String(it.name).trim(), rate: Number(it.unit_rate) || 0 });
    }
  }
  return [...out.values()];
}

// Creates the chosen entries and returns the updated items (linked to the new records) plus the records.
export async function saveNewEntries(workspaceId, chosen, items, roles) {
  const sample = (pred) => (items || []).find(pred) || {};
  const roleIds = Object.fromEntries((roles || []).map((r) => [lc(r.name), r.id]));
  const created = { roles: [], members: [], services: [] };
  const memberIds = {};
  const serviceIds = {};

  for (const e of chosen.filter((c) => c.kind === "role")) {
    const it = sample((x) => x.item_type === "team" && lc(x.description) === lc(e.name));
    const r = await base44.entities.TeamRole.create({ workspace_id: workspaceId, name: e.name, default_rate: e.rate, rate_type: teamRateType(it), status: "active" });
    roleIds[lc(e.name)] = r.id;
    created.roles.push(r);
  }
  for (const e of chosen.filter((c) => c.kind === "member")) {
    const it = sample((x) => x.item_type === "team" && lc(x.team_member_name_snapshot) === lc(e.name) && lc(x.description) === lc(e.role));
    const m = await createTeamMember({
      workspace_id: workspaceId, name: e.name, role_id: roleIds[lc(e.role)] || null, profession: e.role || "",
      default_rate: e.rate, rate_type: teamRateType(it), status: "active"
    });
    memberIds[`${lc(e.name)}|${lc(e.role)}`] = m.id;
    created.members.push(m);
  }
  for (const e of chosen.filter((c) => c.kind === "service")) {
    const it = sample((x) => x.item_type === "service" && lc(x.name) === lc(e.name));
    const s = await base44.entities.Service.create({ workspace_id: workspaceId, name: e.name, default_rate: e.rate, rate_type: serviceRateType(it), status: "active" });
    serviceIds[lc(e.name)] = s.id;
    created.services.push(s);
  }

  const next = (items || []).map((it) => {
    if (isIncludeItem(it)) return it;
    if (it.item_type === "team" && !it.team_member_id) {
      const mid = memberIds[`${lc(it.team_member_name_snapshot)}|${lc(it.description)}`];
      if (mid) return { ...it, team_member_id: mid, reference_id: mid };
      const rid = roleIds[lc(it.description)];
      if (!it.reference_id && rid && chosen.some((c) => c.kind === "role" && lc(c.name) === lc(it.description))) return { ...it, reference_id: rid };
    } else if (it.item_type === "service" && !it.reference_id && serviceIds[lc(it.name)]) {
      return { ...it, reference_id: serviceIds[lc(it.name)] };
    }
    return it;
  });
  return { items: next, created };
}
