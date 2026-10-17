// Services + add-ons for one day. A day follows the event's live service list (so anything added,
// changed or removed on the event shows up here); only when the owner picks specific ones for the
// day (saved service_ids) does it show just those.
export function daySchedServices(serviceAssignments = [], services = [], savedIds = []) {
  const serviceMap = {};
  services.forEach((s) => { serviceMap[s.id] = s; });
  const seen = new Set();
  const all = [];
  serviceAssignments.forEach((a) => {
    if (a.assignment_status === "removed" || seen.has(a.service_id)) return;
    seen.add(a.service_id);
    all.push({
      id: a.service_id,
      name: serviceMap[a.service_id]?.name || a.service_name_snapshot || "Service",
      provider: a.provider_name_snapshot,
      isAddon: !!a.is_addon
    });
  });
  const custom = (savedIds || []).filter((id) => seen.has(id));
  return { all, shown: custom.length ? all.filter((x) => custom.includes(x.id)) : all, isCustom: custom.length > 0 };
}
