import { useMemo } from "react";
import QuotationDayCard from "@/components/quotation/QuotationDayCard";
import EmptyState from "@/components/common/EmptyState";
import { includedDates } from "@/lib/quotationCalc";

export default function QuotationDayBuilder({
  items,
  setItems,
  startDate,
  endDate,
  excludedDates,
  teamMembers,
  roles,
  services,
  currency,
  readOnly
}) {
  const incDates = useMemo(
    () => includedDates(startDate, endDate, excludedDates),
    [startDate, endDate, excludedDates]
  );

  // Index items for stable lookup
  const indexedItems = useMemo(
    () => items.map((it, idx) => ({ ...it, _idx: idx })),
    [items]
  );

  const itemsByDay = useMemo(() => {
    const map = {};
    for (const it of indexedItems) {
      const key = it.day_date || "uncategorized";
      if (!map[key]) map[key] = [];
      map[key].push(it);
    }
    return map;
  }, [indexedItems]);

  // Get phase title for a day (from first item with that day_date)
  const getPhaseTitle = (date) => {
    const dayItems = itemsByDay[date] || [];
    return dayItems[0]?.phase_title || "";
  };

  // ---- Mutations ----

  const updatePhaseTitle = (date, title) => {
    setItems((prev) => prev.map((it) =>
      (it.day_date || "uncategorized") === date ? { ...it, phase_title: title } : it
    ));
  };

  const addTeamMember = (dayDate, memberId) => {
    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;
    const role = roles.find((r) => r.id === member.role_id);
    const phaseTitle = getPhaseTitle(dayDate);
    setItems((prev) => [...prev, {
      item_type: "team",
      reference_id: member.id,
      team_member_id: member.id,
      team_member_name_snapshot: member.name,
      member_type: "",
      day_date: dayDate === "uncategorized" ? "" : dayDate,
      phase_title: phaseTitle || "",
      name: member.name,
      description: role?.name || member.profession || "",
      quantity: 1,
      days: 1,
      unit_rate: role?.default_rate || member.default_rate || 0,
      rate_type: role?.rate_type || "Per Event",
      gst_rate: 0,
      sac_code: ""
    }]);
  };

  const addService = (dayDate, serviceId) => {
    const s = services.find((x) => x.id === serviceId);
    if (!s) return;
    const phaseTitle = getPhaseTitle(dayDate);
    setItems((prev) => [...prev, {
      item_type: "service",
      reference_id: s.id,
      day_date: dayDate === "uncategorized" ? "" : dayDate,
      phase_title: phaseTitle || "",
      name: s.name,
      description: s.description || "",
      quantity: 1,
      days: 1,
      unit_rate: s.default_rate || 0,
      rate_type: s.rate_type || "Fixed",
      gst_rate: s.gst_rate || 0,
      sac_code: s.sac_code || "",
      is_addon: false
    }]);
  };

  const addCustom = (dayDate) => {
    const phaseTitle = getPhaseTitle(dayDate);
    setItems((prev) => [...prev, {
      item_type: "custom",
      day_date: dayDate === "uncategorized" ? "" : dayDate,
      phase_title: phaseTitle || "",
      name: "",
      description: "",
      quantity: 1,
      days: 1,
      unit_rate: 0,
      rate_type: "Fixed",
      gst_rate: 0,
      sac_code: ""
    }]);
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const duplicateDay = (sourceDate, targetDates) => {
    const sourceItems = items.filter((it) => (it.day_date || "uncategorized") === sourceDate);
    if (sourceItems.length === 0) return;
    const newItems = [];
    for (const target of targetDates) {
      for (const it of sourceItems) {
        newItems.push({
          ...it,
          day_date: target === "uncategorized" ? "" : target,
          // phase_title, team_member_id, member_type, name, unit_rate, quantity all preserved
        });
      }
    }
    setItems((prev) => [...prev, ...newItems]);
  };

  // ---- Render ----

  const uncategorizedItems = itemsByDay["uncategorized"] || [];

  // If no dates configured and no items, show empty state
  if (incDates.length === 0 && items.length === 0) {
    return (
      <EmptyState
        title="No dates configured"
        description="Set a start and end date above to generate day chips, then build your day/phase structure."
      />
    );
  }

  return (
    <div className="space-y-3">
      {incDates.map((date) => (
        <QuotationDayCard
          key={date}
          date={date}
          phaseTitle={getPhaseTitle(date)}
          items={itemsByDay[date] || []}
          onUpdatePhaseTitle={updatePhaseTitle}
          onAddTeam={addTeamMember}
          onAddService={addService}
          onAddCustom={addCustom}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
          onDuplicate={duplicateDay}
          teamMembers={teamMembers}
          roles={roles}
          services={services}
          currency={currency}
          readOnly={readOnly}
          includedDates={incDates}
        />
      ))}

      {uncategorizedItems.length > 0 && (
        <QuotationDayCard
          date="uncategorized"
          isUncategorized
          phaseTitle={getPhaseTitle("uncategorized")}
          items={uncategorizedItems}
          onUpdatePhaseTitle={updatePhaseTitle}
          onAddTeam={addTeamMember}
          onAddService={addService}
          onAddCustom={addCustom}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
          onDuplicate={duplicateDay}
          teamMembers={teamMembers}
          roles={roles}
          services={services}
          currency={currency}
          readOnly={readOnly}
          includedDates={incDates}
        />
      )}
    </div>
  );
}