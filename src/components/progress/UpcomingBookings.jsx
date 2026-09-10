import { useMemo } from "react";
import { Users, Briefcase } from "lucide-react";
import { formatDate } from "@/utils/format";
import { dateRange, todayISO } from "@/utils/dates";
import SelfBadge from "@/components/common/SelfBadge";
import { isSelfMember } from "@/utils/selfDetection";

// Upcoming Team + Service bookings generated from actual assignment records.
// Only dates >= today are shown. Sorted by date → event name → item name.
export default function UpcomingBookings({
  assignments,
  serviceAssignments,
  events,
  members,
  ownerName,
}) {
  const today = todayISO();

  const teamBookings = useMemo(() => {
    const bookings = [];
    assignments
      .filter((a) => a.assignment_status === "Assigned")
      .forEach((a) => {
        const event = events.find((e) => e.id === a.event_id);
        if (!event || event.status === "Cancelled") return;
        const member = members.find((m) => m.id === a.team_member_id);
        (a.working_dates || []).forEach((date) => {
          if (date >= today) {
            bookings.push({
              date,
              eventName: event.title,
              memberName: member?.name || "Unknown",
              isSelf: member && isSelfMember(member.name, ownerName),
              role: a.role_name_snapshot,
            });
          }
        });
      });
    return bookings.sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.eventName.localeCompare(b.eventName)
    );
  }, [assignments, events, members, ownerName, today]);

  const serviceBookings = useMemo(() => {
    const bookings = [];
    serviceAssignments
      .filter((sa) => sa.assignment_status === "Assigned")
      .forEach((sa) => {
        const event = events.find((e) => e.id === sa.event_id);
        if (!event || event.status === "Cancelled") return;
        const dates =
          sa.working_dates && sa.working_dates.length > 0
            ? sa.working_dates
            : dateRange(event.start_date, event.end_date);
        dates.forEach((date) => {
          if (date >= today) {
            bookings.push({
              date,
              eventName: event.title,
              serviceName: sa.service_name_snapshot || "—",
              provider: sa.provider_name_snapshot,
            });
          }
        });
      });
    return bookings.sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.eventName.localeCompare(b.eventName)
    );
  }, [serviceAssignments, events, today]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <BookingSection title="Team" icon={Users} bookings={teamBookings}>
        {(b) => (
          <>
            <p className="text-sm font-medium text-foreground">
              {b.memberName}
              {b.isSelf && <SelfBadge className="ml-1" />}
            </p>
            <p className="text-xs text-muted-foreground">
              {b.eventName} · {formatDate(b.date)}
            </p>
          </>
        )}
      </BookingSection>
      <BookingSection title="Service" icon={Briefcase} bookings={serviceBookings}>
        {(b) => (
          <>
            <p className="text-sm font-medium text-foreground">{b.serviceName}</p>
            <p className="text-xs text-muted-foreground">
              {b.eventName} · {formatDate(b.date)}
            </p>
          </>
        )}
      </BookingSection>
    </div>
  );
}

function BookingSection({ title, icon: Icon, bookings, children }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4" /> {title}
      </p>
      {bookings.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No upcoming {title.toLowerCase()} bookings.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((b, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              {children(b)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}