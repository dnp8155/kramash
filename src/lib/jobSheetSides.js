// Crew of one job-sheet day, grouped by "side" (the business member type, e.g. Bride Side / Groom Side) the
// same way the client portal's Team card does (PortalTeamSection): side names prettified, members without a
// side under "Team".
// members: [{ side, role, name }]
//   -> [{ side, items: [{ role, name }]            (names shown: role, member name under it)
//                    | [{ role, count }] }]        (names hidden: "2× Role" lines)
// The job sheet already labels the block "Team:", so members without a side are not headed "Team" again:
// they get no heading when they are the only group, and "Unassigned" next to other sides.
export const NO_SIDE_LABEL = "Unassigned";

const SIDE_LABELS = { bride_side: "Bride Side", groom_side: "Groom Side", common: "Common", other: "Others" };
export const formatSide = (side) => SIDE_LABELS[side] || side || NO_SIDE_LABEL;

export function groupCrewBySide(members = [], showNames = false) {
  const groups = new Map();
  for (const m of members) {
    const side = formatSide(m.side);
    if (!groups.has(side)) groups.set(side, []);
    groups.get(side).push(m);
  }
  const onlyNoSide = groups.size === 1 && groups.has(NO_SIDE_LABEL);
  return [...groups].map(([side, list]) => {
    const heading = onlyNoSide ? "" : side;
    if (showNames) return { side, heading, items: list.map((m) => ({ role: m.role || "Team Member", name: m.name || "" })) };
    const counts = new Map();
    for (const m of list) counts.set(m.role || "Team Member", (counts.get(m.role || "Team Member") || 0) + 1);
    return { side, heading, items: [...counts].map(([role, count]) => ({ role, count })) };
  });
}

// "Role — Name" / "2× Role", for places that draw plain text lines (the PDF).
export const crewLine = (it) => (it.count ? `${it.count > 1 ? `${it.count}× ` : ""}${it.role}` : it.name ? `${it.role} — ${it.name}` : it.role);

// On unless explicitly switched off, so job sheets saved before the setting existed show sides too.
export const showSidesOn = (config) => config?.show_team_sides !== false;
