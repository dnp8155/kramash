import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, XCircle } from "lucide-react";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Input from "@/components/common/Input";
import { initials } from "@/utils/format";
import { isBookedOnDate, todayStr } from "@/utils/team";
import { Link } from "react-router-dom";

export default function AvailabilityChecker({ members, assignments, events }) {
  const [date, setDate] = useState(todayStr());

  const eventMap = useMemo(
    () => Object.fromEntries(events.map((e) => [e.id, e])),
    [events]
  );

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "Active"),
    [members]
  );

  const { booked, available } = useMemo(() => {
    const booked = [];
    const available = [];
    for (const m of activeMembers) {
      const booking = assignments
        .filter(
          (a) =>
            a.team_member_id === m.id && a.assignment_status === "Assigned"
        )
        .map((a) => ({ assignment: a, event: eventMap[a.event_id] }))
        .find(({ event: ev }) => ev && isBookedOnDate(m.id, date, assignments, eventMap));
      if (booking) booked.push({ member: m, event: booking.event });
      else available.push(m);
    }
    return { booked, available };
  }, [activeMembers, assignments, eventMap, date]);

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
                      <Link
                        to={`/events/${event.id}`}
                        className="truncate text-xs text-primary hover:underline"
                      >
                        {event.title}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> Available ({available.length})
            </p>
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No available team members found for this date.
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
        </div>
      </CardBody>
    </Card>
  );
}