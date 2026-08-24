import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import ReminderBanner from "@/components/events/ReminderBanner";
import UpgradeBanner from "@/components/events/UpgradeBanner";
import EventsTable from "@/components/events/EventsTable";
import EventsRightPanel from "@/components/events/EventsRightPanel";
import EventForm from "@/components/events/EventForm";
import SearchInput from "@/components/common/SearchInput";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import { Users, Plus, Download } from "lucide-react";
import { isToday, isThisWeek, isUpcomingDate, isPastDate, isWithinFY, fyOptions, currentFY } from "@/lib/dates";
import { exportEventsCsv } from "@/lib/exportUtils";

export default function Events() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fyFilter, setFyFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [evList, clList] = await Promise.all([
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500)
      ]);
      setEvents(evList || []);
      const map = {};
      (clList || []).forEach((c) => { map[c.id] = c; });
      setClients(map);
    } catch (e) {
      setError(e?.message || "Failed to load events.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const clientName = (id) => clients[id]?.name || "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (fyFilter && fyFilter !== "all" && !isWithinFY(e.start_date, fyFilter)) return false;
      switch (statusFilter) {
        case "today": if (!isToday(e.start_date)) return false; break;
        case "week": if (!isThisWeek(e.start_date)) return false; break;
        case "upcoming": if (!(isUpcomingDate(e.start_date) && e.status !== "completed" && e.status !== "cancelled")) return false; break;
        case "past": if (!(isPastDate(e.start_date) || e.status === "completed")) return false; break;
        case "completed": if (e.status !== "completed") return false; break;
        case "in-progress": if (e.status !== "in-progress") return false; break;
        case "cancelled": if (e.status !== "cancelled") return false; break;
        default: break;
      }
      if (q) {
        const hay = `${e.title} ${e.event_type} ${e.venue || ""} ${clientName(e.client_id)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, query, statusFilter, fyFilter, clients]);

  const openEvent = (e) => navigate(`/events/${e.id}`);
  const openNew = () => { setEditingEvent(null); setShowForm(true); };
  const openEdit = (e) => { setEditingEvent(e); setShowForm(true); };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <ReminderBanner events={events} onEventClick={openEvent} />
      <UpgradeBanner used={events.length} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <SearchInput
          placeholder="Search events, clients, venue"
          className="sm:max-w-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Events ({events.length})</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Select value={fyFilter} onChange={(e) => setFyFilter(e.target.value)}>
            <option value="all">All Years</option>
            {fyOptions(3).map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}{f.value === currentFY() ? " (Current)" : ""}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label="Export"
            onClick={() => exportEventsCsv(filtered, clients, fyFilter !== "all" ? fyFilter : null)}
            disabled={filtered.length === 0}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Team" onClick={() => navigate("/team")}>
            <Users className="w-4 h-4" />
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Event</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <EventsTable
          events={filtered}
          clients={clients}
          loading={loading}
          onEventClick={openEvent}
          onEditEvent={openEdit}
          onAdd={openNew}
          canAdd
        />
        <EventsRightPanel events={events} onEventClick={openEvent} />
      </div>

      <EventForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        event={editingEvent}
        workspaceId={workspaceId}
      />
    </div>
  );
}