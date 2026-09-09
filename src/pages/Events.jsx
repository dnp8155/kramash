import { useMemo, useState } from "react";
import { Plus, CalendarDays, Download } from "lucide-react";
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
import { usePlan } from "@/lib/PlanContext";
import PlanLimitReached from "@/components/common/PlanLimitReached";
import { eventStatuses, eventTypes, eventPeriods } from "@/constants/events";
import { isToday, isThisWeek, isUpcoming, isPast } from "@/utils/dates";
import { toast } from "@/components/ui/use-toast";
import { exportEventsCSV } from "@/utils/exports";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";

export default function Events() {
  const { events, loading, error, refetch, createEvent, updateEvent } = useEvents();
  const { clients, createClient } = useClients();
  const { canCreateResource, usage, getLimit } = usePlan();
  const t = useBusinessTerminology();
  const eventsLimit = getLimit("max_events");
  const eventsLimitReached = !canCreateResource("events");
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
      try {
        await createEvent(data);
        toast({ title: "Event created" });
      } catch (e) {
        toast({ title: "Cannot create event", description: e?.message, variant: "destructive" });
        throw e;
      }
    }
  };

  const openNew = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.workItemPlural}
        description={`Manage your upcoming and past ${t.workItemPlural.toLowerCase()}.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { exportEventsCSV(filtered, clients, "all", t); toast({ title: `${t.workItemPlural} exported` }); }}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={openNew} disabled={eventsLimitReached}>
              <Plus className="h-4 w-4" /> {t.createWorkItemLabel}
            </Button>
          </div>
        }
      />

      {eventsLimitReached && (
        <PlanLimitReached
          resource="event"
          currentUsage={usage.events}
          limit={eventsLimit}
        />
      )}

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
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
          <LoadingState label={`Loading ${t.workItemPlural.toLowerCase()}…`} />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={`No ${t.workItemPlural.toLowerCase()} yet`}
            description={`Create your first ${t.workItemSingular.toLowerCase()} to get started.`}
            icon={CalendarDays}
            action={
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> {t.createWorkItemLabel}
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