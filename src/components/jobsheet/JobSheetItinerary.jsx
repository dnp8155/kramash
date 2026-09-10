import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import { formatDate } from "@/utils/format";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";

export default function JobSheetItinerary({ itinerary, config }) {
  if (!itinerary || itinerary.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Date-wise Itinerary</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-muted-foreground">
            No date-wise itinerary data. Assign dates to quotation items or team members to build the itinerary.
          </p>
        </CardBody>
      </Card>
    );
  }

  // Group crew by role for the "Roles Only" display mode
  const groupCrewByRole = (crew) => {
    const map = new Map();
    for (const c of crew) {
      const key = c.role;
      if (!map.has(key)) map.set(key, { role: c.role, count: 0, members: [] });
      const entry = map.get(key);
      entry.count += 1;
      if (c.member_name) entry.members.push(c.member_name);
    }
    return Array.from(map.values());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date-wise Itinerary</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {itinerary.map((day) => {
          const override = config.date_overrides?.find((o) => o.date === day.date);
          const reportingTime = override?.reporting_time || config.default_reporting_time || "";
          const venue = override?.venue || "";

          return (
            <div key={day.date} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{formatDate(day.date)}</span>
                {day.phase_title && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {day.phase_title}
                  </span>
                )}
              </div>

              {reportingTime && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Reporting: {reportingTime}
                </p>
              )}
              {venue && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {venue}
                </p>
              )}

              {day.crew.length > 0 && (
                <div className="mt-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> Crew
                  </p>
                  {config.show_team_names ? (
                    <ul className="mt-1 space-y-0.5">
                      {day.crew.map((c, idx) => (
                        <li key={idx} className="text-sm text-foreground">
                          {c.role}
                          {c.member_name && (
                            <span className="text-muted-foreground"> — {c.member_name}</span>
                          )}
                          {c.member_side && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({c.member_side})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="mt-1 space-y-0.5">
                      {groupCrewByRole(day.crew).map((g, idx) => (
                        <li key={idx} className="text-sm text-foreground">
                          {g.count}× {g.role}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {day.deliverables.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground">Deliverables</p>
                  <ul className="mt-1 space-y-0.5">
                    {day.deliverables.map((d, idx) => (
                      <li key={idx} className="text-sm text-foreground">
                        • {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}