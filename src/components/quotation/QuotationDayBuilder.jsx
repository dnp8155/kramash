import { useMemo, useState } from "react";
import QuotationDayCard from "@/components/quotation/QuotationDayCard";
import { AlertTriangle } from "lucide-react";
import { includedDates } from "@/lib/quotationCalc";
import { useT } from "@/hooks/useT";

export default function QuotationDayBuilder({
  items, setItems, startDate, endDate, excludedDates,
  teamMembers, roles, services, currency, readOnly, workspace, itemErrors = {}, mode = "day_wise"
}) {
  const t = useT();
  const incDates = useMemo(
    () => includedDates(startDate, endDate, excludedDates),
    [startDate, endDate, excludedDates]
  );

  const indexedItems = useMemo(() => items.map((it, idx) => ({ ...it, _idx: idx })), [items]);

  const itemsByDay = useMemo(() => {
    const map = {};
    for (const it of indexedItems) {
      const key = it.day_date || "uncategorized";
      if (!map[key]) map[key] = [];
      map[key].push(it);
    }
    return map;
  }, [indexedItems]);

  const [phaseTitles, setPhaseTitles] = useState({});

  const getPhaseTitle = (date) => {
    if (date in phaseTitles) return phaseTitles[date];
    const dayItems = itemsByDay[date] || [];
    return dayItems[0]?.phase_title || "";
  };

  const updatePhaseTitle = (date, title) => {
    setPhaseTitles((prev) => ({ ...prev, [date]: title }));
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
      quantity: 1, days: 1,
      unit_rate: role?.default_rate || member.default_rate || 0,
      rate_type: role?.rate_type || "Per Event",
      gst_rate: 0, sac_code: ""
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
      quantity: 1, days: 1,
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
      name: "", description: "",
      quantity: 1, days: 1,
      unit_rate: 0, rate_type: "Fixed",
      gst_rate: 0, sac_code: ""
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
        newItems.push({ ...it, day_date: target === "uncategorized" ? "" : target });
      }
    }
    setItems((prev) => [...prev, ...newItems]);
  };

  // Every item must be visible somewhere, because every item is counted in the totals.
  //  - General ("regular") mode: one list with all items.
  //  - Day-wise mode: items on an included date sit in that day's card; anything else (no date,
  //    or a date that was excluded / is outside the range) goes to the "Other items" card.
  const incSet = useMemo(() => new Set(incDates), [incDates]);
  const uncategorizedItems = mode === "day_wise"
    ? indexedItems.filter((it) => !it.day_date || !incSet.has(it.day_date))
    : indexedItems;
  const orphanCount = mode === "day_wise" ? uncategorizedItems.filter((it) => it.day_date).length : 0;
  const noDates = incDates.length === 0;

  return (
    <div className="space-y-3">
      {noDates && items.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm font-medium text-muted-foreground">{t("No dates configured yet.")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("Set a start and end date above to build day-wise structure, or add custom items below.")}
          </p>
        </div>
      )}

      {mode === "day_wise" && incDates.map((date) => (
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
          workspace={workspace}
          includedDates={incDates}
          itemErrors={itemErrors}
        />
      ))}

      {orphanCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <span>
            {orphanCount} {t("item(s) belong to dates that are no longer in this quotation. They are still included in the total — keep them (they show under \"Other items\" below) or remove them.")}
          </span>
        </div>
      )}

      {(mode !== "day_wise" || uncategorizedItems.length > 0 || noDates) && (
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
          workspace={workspace}
          includedDates={incDates}
          itemErrors={itemErrors}
        />
      )}
    </div>
  );
}