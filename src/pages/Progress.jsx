import { useMemo, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import LoadingState from "@/components/common/LoadingState";
import { useEvents } from "@/hooks/useEvents";
import { useEventTeamAssignments } from "@/hooks/useEventTeamAssignments";
import { useEventServiceAssignments } from "@/hooks/useEventServiceAssignments";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { dateRange } from "@/utils/dates";
import { getEventsForDate } from "@/utils/progress";
import ProgressCalendar from "@/components/progress/ProgressCalendar";
import ScheduleDayCard from "@/components/progress/ScheduleDayCard";
import UpcomingBookings from "@/components/progress/UpcomingBookings";
import DateDetailModal from "@/components/progress/DateDetailModal";

export default function Progress() {
  const { events, loading } = useEvents();
  const { assignments } = useEventTeamAssignments();
  const { serviceAssignments } = useEventServiceAssignments();
  const { members } = useTeamMembers();
  const { ownerName } = useWorkspace();

  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const monthDates = useMemo(() => {
    const { year, month } = calendarMonth;
    const lastDay = new Date(year, month + 1, 0).getDate();
    return dateRange(
      `${year}-${String(month + 1).padStart(2, "0")}-01`,
      `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    );
  }, [calendarMonth]);

  const scheduleDates = useMemo(
    () => monthDates.filter((date) => getEventsForDate(events, date).length > 0),
    [monthDates, events]
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Progress" description="Date-wise operational schedule and calendar." />
        <Card>
          <LoadingState label="Loading schedule…" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Progress"
        description="Date-wise operational schedule and calendar."
      />

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardBody>
          <ProgressCalendar
            events={events}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onDateClick={setSelectedDate}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Schedule — {scheduleDates.length} day
            {scheduleDates.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {scheduleDates.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No events this month.
            </p>
          ) : (
            scheduleDates.map((date) => (
              <ScheduleDayCard
                key={date}
                date={date}
                events={events}
                assignments={assignments}
                serviceAssignments={serviceAssignments}
                members={members}
                ownerName={ownerName}
              />
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardBody>
          <UpcomingBookings
            assignments={assignments}
            serviceAssignments={serviceAssignments}
            events={events}
            members={members}
            ownerName={ownerName}
          />
        </CardBody>
      </Card>

      <DateDetailModal
        date={selectedDate}
        events={events}
        assignments={assignments}
        serviceAssignments={serviceAssignments}
        members={members}
        ownerName={ownerName}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}