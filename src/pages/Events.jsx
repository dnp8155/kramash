import { useMemo, useState } from "react";
import { Plus, CalendarDays, MapPin, Users } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import SearchInput from "@/components/common/SearchInput";
import FilterControl from "@/components/common/FilterControl";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import Modal from "@/components/common/Modal";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { mockEvents, eventStatuses, eventTypes } from "@/data/mockEvents";
import { formatCurrency, formatDate } from "@/utils/format";

export default function Events() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    return mockEvents.filter((e) => {
      const matchesSearch =
        !search ||
        [e.title, e.client, e.location].some((f) =>
          f.toLowerCase().includes(search.toLowerCase())
        );
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, statusFilter, typeFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Events"
        description="Manage your upcoming and past productions."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> New Event
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, clients, venues…"
            className="flex-1"
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

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No events found"
            description="Try adjusting your filters or create a new event."
            icon={CalendarDays}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => (
            <Card key={event.id} className="flex flex-col transition-shadow hover:shadow-md">
              <CardBody className="flex flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{event.type}</p>
                    <h3 className="text-base font-semibold text-foreground">{event.title}</h3>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> {formatDate(event.date)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {event.location}
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> {event.team.length} crew assigned
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(event.budget)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="text-sm font-semibold text-success">{formatCurrency(event.paid)}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <NewEventModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function NewEventModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Event"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Create Event</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Event Title" name="title" placeholder="e.g. Sharma Wedding" />
        <Input label="Client" name="client" placeholder="Client name" />
        <Select label="Type" name="type">
          {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input label="Date" name="date" type="date" />
        <Input label="Location" name="location" placeholder="Venue" className="sm:col-span-2" />
        <Input label="Budget (₹)" name="budget" type="number" placeholder="0" />
        <Select label="Status" name="status">
          {eventStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
    </Modal>
  );
}