import { Navigation, MapPin, Calendar, Phone, Clock, Users, Package, FileText, Wrench, CheckSquare } from "lucide-react";
import { getDirectionsUrl, CATEGORY_LABELS } from "@/lib/jobSheetService";
import { formatEventDate } from "@/lib/dates";

export default function JobSheetDocument({ data, config, workspace }) {
  const { event, client, quotationItems, teamAssignments, dayAssignments, membersById, eventDates } = data;
  const dateConfigs = config.date_configs || {};
  const equipment = config.equipment_list || [];
  const deliverables = config.deliverables || [];
  const showTeamNames = config.show_team_names;
  const includeContacts = config.include_crew_contacts;
  const includeEquipment = config.include_equipment;

  const directionsUrl = getDirectionsUrl(event, client);
  const categoryLabel = CATEGORY_LABELS[workspace?.business_category] || workspace?.custom_business_type || "Other";
  const fullAddress = event?.venue_address || [event?.venue, client?.address, client?.city].filter(Boolean).join(", ");

  // Build itinerary
  const itinerary = eventDates.map(date => {
    const dayItems = quotationItems.filter(item => item.day_date === date);
    const phases = [...new Set(dayItems.map(item => item.phase_title).filter(Boolean))];
    const dc = dateConfigs[date] || {};
    const dayAssignment = dayAssignments.find(d => d.date === date);
    const assignedMembers = teamAssignments.filter(a => a.working_dates?.includes(date));
    const crewItems = dayItems.filter(item => item.item_type === "role" || item.item_type === "team");

    return {
      date,
      phase: dc.phase_title || phases[0] || "",
      reportingTime: dc.reporting_time || "",
      venue: dc.venue_override || dayAssignment?.venue_override || event?.venue || "",
      crewItems,
      assignedMembers
    };
  });

  // Crew directory
  const crewDirectory = includeContacts
    ? teamAssignments.map(a => ({
        name: membersById[a.team_member_id]?.name || "—",
        role: a.role_name_snapshot || "Crew",
        phone: membersById[a.team_member_id]?.phone || "—"
      }))
    : [];

  return (
    <div className="print-area bg-card border border-border rounded-xl p-6 sm:p-8 space-y-6 max-w-[800px] mx-auto">
      {/* Header */}
      <div className="border-b-2 border-primary/20 pb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight uppercase">Operational Job Sheet</h1>
            <p className="text-xs text-muted-foreground">{categoryLabel} · Read Only</p>
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-3">{event?.title}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <InfoRow icon={Users} label="Client" value={client?.name || "—"} />
          <InfoRow icon={Phone} label="Contact" value={client?.phone || "—"} />
          <InfoRow icon={Calendar} label="Dates" value={event?.start_date ? formatEventDate(event.start_date, event.end_date) : "—"} />
          <InfoRow icon={FileText} label="Type" value={event?.event_type || "—"} />
          <InfoRow icon={MapPin} label="Venue" value={event?.venue || "—"} />
          <InfoRow icon={MapPin} label="Address" value={fullAddress || "—"} />
        </div>

        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
          >
            <Navigation className="w-4 h-4" /> Get Directions
          </a>
        )}
      </div>

      {/* Date-wise Itinerary */}
      {itinerary.length > 0 && (
        <Section title="Date-wise Itinerary" icon={Calendar}>
          <div className="space-y-3">
            {itinerary.map((day, i) => (
              <div key={day.date} className="border border-border/80 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b border-border/60">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="font-semibold text-foreground text-sm">{formatDay(day.date)}</div>
                  {day.phase && (
                    <div className="text-sm text-muted-foreground">· {day.phase}</div>
                  )}
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {day.reportingTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Reporting:</span>
                      <span className="font-medium text-foreground">{day.reportingTime}</span>
                    </div>
                  )}
                  {day.venue && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Venue:</span>
                      <span className="font-medium text-foreground">{day.venue}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-sm">
                    <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground shrink-0">Crew:</span>
                    <CrewDisplay
                      showTeamNames={showTeamNames}
                      crewItems={day.crewItems}
                      assignedMembers={day.assignedMembers}
                      membersById={membersById}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <Section title="Deliverables Checklist" icon={Package}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {deliverables.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Internal Notes */}
      {config.internal_notes && (
        <Section title="Internal Notes" icon={FileText}>
          <p className="text-sm text-foreground whitespace-pre-wrap">{config.internal_notes}</p>
        </Section>
      )}

      {/* Crew Contact Directory */}
      {includeContacts && crewDirectory.length > 0 && (
        <Section title="Crew Contact Directory" icon={Phone}>
          <div className="divide-y divide-border/60">
            {crewDirectory.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.role}</div>
                </div>
                <a
                  href={c.phone !== "—" ? `tel:${c.phone}` : undefined}
                  className="text-sm font-medium text-primary hover:underline shrink-0"
                >
                  {c.phone}
                </a>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Equipment Checklist */}
      {includeEquipment && equipment.length > 0 && (
        <Section title="Equipment / Kit Checklist" icon={Wrench}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {equipment.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Footer */}
      <div className="border-t border-border/60 pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Generated from {event?.title} · This document contains no financial information.
        </p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">{label}:</span>
      <span className="text-sm font-medium text-foreground truncate">{value}</span>
    </div>
  );
}

function CrewDisplay({ showTeamNames, crewItems, assignedMembers, membersById }) {
  if (showTeamNames) {
    if (assignedMembers.length === 0)
      return <span className="text-sm text-muted-foreground">No members assigned</span>;
    return (
      <div className="space-y-0.5">
        {assignedMembers.map(a => (
          <div key={a.id} className="text-sm">
            <span className="font-medium text-foreground">{a.role_name_snapshot || "Crew"}</span>
            {" — "}
            <span className="text-foreground">{membersById[a.team_member_id]?.name || "—"}</span>
          </div>
        ))}
      </div>
    );
  }

  // Roles only
  if (crewItems.length > 0) {
    const grouped = {};
    crewItems.forEach(item => {
      if (!grouped[item.name]) grouped[item.name] = 0;
      grouped[item.name] += (item.quantity || 1);
    });
    return (
      <div className="space-y-0.5">
        {Object.entries(grouped).map(([name, qty]) => (
          <div key={name} className="text-sm text-foreground">
            {qty > 1 ? `${qty}× ` : ""}{name}
          </div>
        ))}
      </div>
    );
  }

  // Fallback: roles from assignments
  if (assignedMembers.length === 0)
    return <span className="text-sm text-muted-foreground">No crew assigned</span>;
  const roleGrouped = {};
  assignedMembers.forEach(a => {
    const role = a.role_name_snapshot || "Crew";
    if (!roleGrouped[role]) roleGrouped[role] = 0;
    roleGrouped[role] += 1;
  });
  return (
    <div className="space-y-0.5">
      {Object.entries(roleGrouped).map(([role, count]) => (
        <div key={role} className="text-sm text-foreground">
          {count > 1 ? `${count}× ` : ""}{role}
        </div>
      ))}
    </div>
  );
}

function formatDay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
}