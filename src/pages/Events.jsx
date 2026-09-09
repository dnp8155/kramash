import { useMemo, useState } from "react";
import { Plus, CalendarDays } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody } from "@/components/common/Card";
import SearchInput from "@/components/common/SearchInput";
import FilterControl from "@/components/common/FilterControl";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EventCard from "@/components/events/EventCard";
import EventForm from "@/components/events/EventForm";
import { useEvents } from "@/hooks/useEvents";
import { useClients } from "@/hooks/useClients";
import { eventStatuses, eventTypes, eventPeriods } from "@/constants/events";
import { isToday, isThisWeek, isUpcoming, isPast } from "@/utils/dates";
import { toast } from "@/components/ui/use-toast";

export default function Events() {
  const { events, loading, error, refetch, createEvent, updateEvent } = useEvents();
  const { clients, createClient } = useClients();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events
      .filter((e) => {
        const clientName = clientMap[e.client_id]?.name || "";
        const matchesSearch =
          !q ||
          [e.title, clientName, e.venue].some((f) =>
            (f || "").toLowerCase().includes(q)
          );
        const matchesStatus = statusFilter === "all" || e.status === statusFilter;
        const matchesType = typeFilter === "all" || e.event_type === typeFilter;
        const date = e.start_date;
        let matchesPeriod = true;
        if (periodFilter === "Upcoming") matchesPeriod = isUpcoming(date);
        else if (periodFilter === "Today") matchesPeriod = isToday(date);
        else if (periodFilter === "This Week") matchesPeriod = isThisWeek(date);
        else if (periodFilter === "Past") matchesPeriod = isPast(date);
        return matchesSearch && matchesStatus && matchesType && matchesPeriod;
      })
      .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  }, [events, clientMap, search, statusFilter, typeFilter, periodFilter]);

  const handleSave = async (data) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, data);
      toast({ title: "Event updated" });
    } else {
      await createEvent(data);
      toast({ title: "Event created" });
    }
  };

  const openNew = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Events"
        description="Manage your upcoming and past productions."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New Event
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, clients, venues…"
            className="flex-1 min-w-[200px]"
          />
          <FilterControl
            label="Period"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            options={eventPeriods}
          />
          <FilterControl
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={eventStatuses}
          />
          <FilterControl
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={eventTypes}
          />
        </CardBody>
      </Card>

      {loading ? (
        <Card>
          <LoadingState label="Loading events…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No events yet"
            description="Create your first event to get started."
            icon={CalendarDays}
            action={
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> New Event
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              clientName={clientMap[event.client_id]?.name}
            />
          ))}
        </div>
      )}

      <EventForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        event={editingEvent}
        clients={clients}
        onSave={handleSave}
        onCreateClient={createClient}
      />
    </div>
  );
}