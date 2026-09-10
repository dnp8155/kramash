import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, XCircle, CalendarX, Ban } from "lucide-react";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Input from "@/components/common/Input";
import { initials } from "@/utils/format";
import { getAvailabilityStatus } from "@/utils/team";
import { Link } from "react-router-dom";

export default function AvailabilityChecker({ members, assignments, events, blockDates = [] }) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  });

  const eventMap = useMemo(
    () => Object.fromEntries(events.map((e) => [e.id, e])),
    [events]
  );

  const { booked, blocked, available, inactive } = useMemo(() => {
    const booked = [];
    const blocked = [];
    const available = [];
    const inactive = [];
    for (const m of members) {
      const status = getAvailabilityStatus(m, date, assignments, eventMap, blockDates);
      if (status === "inactive") {
        inactive.push(m);
      } else if (status === "blocked") {
        const block = blockDates.find(
          (b) => b.team_member_id === m.id && b.status === "active" &&
            date >= b.start_date && date <= (b.end_date || b.start_date)
        );
        blocked.push({ member: m, block });
      } else if (status === "booked") {
        const booking = assignments
          .filter(
            (a) =>
              a.team_member_id === m.id && a.assignment_status === "Assigned"
          )
          .map((a) => ({ assignment: a, event: eventMap[a.event_id] }))
          .find(({ assignment, event: ev }) => {
            if (!ev) return false;
            const dates = assignment.working_dates?.length
              ? assignment.working_dates
              : [];
            const r = { start: ev.start_date, end: ev.end_date || ev.start_date };
            const allDates = dates.length > 0 ? dates : expandRange(r.start, r.end);
            return allDates.includes(date);
          });
        const ev = booking?.event;
        booked.push({ member: m, event: ev });
      } else {
        available.push(m);
      }
    }
    return { booked, blocked, available, inactive };
  }, [members, assignments, eventMap, date, blockDates]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary" />
        <CardTitle>Team Availability</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="max-w-xs">
          <Input
            label="Check date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Booked */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <XCircle className="h-4 w-4 text-destructive" /> Booked ({booked.length})
            </p>
            {booked.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No one is booked on this date.
              </p>
            ) : (
              <ul className="space-y-2">
                {booked.map(({ member, event }) => (
                  <li key={member.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(member.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {member.name}
                      </p>
                      {event && (
                        <Link
                          to={`/events/${event.id}`}
                          className="truncate text-xs text-primary hover:underline"
                        >
                          {event.title}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Blocked */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarX className="h-4 w-4 text-warning" /> Blocked ({blocked.length})
            </p>
            {blocked.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No one is blocked on this date.
              </p>
            ) : (
              <ul className="space-y-2">
                {blocked.map(({ member, block }) => (
                  <li key={member.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/10 text-xs font-semibold text-warning">
                      {initials(member.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {member.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {block?.reason || "Unavailable"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Available */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> Available ({available.length})
            </p>
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No available team members for this date.
              </p>
            ) : (
              <ul className="space-y-2">
                {available.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-xs font-semibold text-success">
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {m.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.profession || "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Inactive */}
          {inactive.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Ban className="h-4 w-4 text-muted-foreground" /> Inactive ({inactive.length})
              </p>
              <ul className="space-y-2">
                {inactive.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-muted-foreground">
                        {m.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Inactive
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// Helper to expand a date range into individual dates
function expandRange(start, end) {
  if (!start) return [];
  if (!end || end < start) return [start];
  const dates = [];
  let d = start;
  while (d <= end) {
    dates.push(d);
    const dt = new Date(d + "T00:00:00");
    dt.setDate(dt.getDate() + 1);
    d = dt.toISOString().slice(0, 10);
  }
  return dates;
}