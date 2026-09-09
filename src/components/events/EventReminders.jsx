import { useEffect, useState } from "react";
import { Bell, Plus, Trash2, Loader2, Clock } from "lucide-react";
import Card, { CardBody, CardHeader, CardTitle } from "@/components/common/Card";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/lib/PlanContext";
import { formatDate } from "@/utils/format";
import { toast } from "@/components/ui/use-toast";

// Event reminder component: allows creating 24h/48h in-app reminders
// for an event. Only IN_APP channel is functional in Beta.
export default function EventReminders({ event }) {
  const { workspaceId } = useWorkspace();
  const { canUseFeature } = usePlan();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!workspaceId || !event?.id) return;
    setLoading(true);
    try {
      const r = await base44.entities.EventReminder.filter(
        { workspace_id: workspaceId, event_id: event.id },
        "scheduled_for",
        20
      );
      setReminders(r || []);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [workspaceId, event?.id]);

  const createReminder = async (reminderType) => {
    if (!canUseFeature("reminders_enabled")) {
      toast({ title: "Reminders are a Pro feature", description: "Upgrade to Kramashah Pro to set event reminders.", variant: "destructive" });
      return;
    }
    if (!event?.start_date) {
      toast({ title: "Event has no start date", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      // Calculate the scheduled time (24 or 48 hours before event start).
      const eventStart = new Date(event.start_date + "T09:00:00");
      const hoursBefore = reminderType === "24_HOURS" ? 24 : 48;
      const scheduledFor = new Date(eventStart.getTime() - hoursBefore * 60 * 60 * 1000);

      // Don't create a reminder in the past.
      if (scheduledFor.getTime() < Date.now()) {
        toast({ title: "Cannot set reminder", description: "The reminder time would be in the past.", variant: "destructive" });
        return;
      }

      await base44.entities.EventReminder.create({
        workspace_id: workspaceId,
        event_id: event.id,
        reminder_type: reminderType,
        scheduled_for: scheduledFor.toISOString(),
        status: "PENDING",
        channel: "IN_APP",
      });

      // Also create an in-app notification.
      await base44.entities.Notification.create({
        workspace_id: workspaceId,
        type: "EVENT_UPCOMING",
        title: "Event reminder set",
        message: `You'll be reminded ${hoursBefore} hours before "${event.title}" on ${formatDate(event.start_date)}.`,
        related_entity_type: "Event",
        related_entity_id: event.id,
        read: false,
      });

      toast({ title: "Reminder created", description: `${hoursBefore} hours before event` });
      load();
    } catch (e) {
      toast({ title: "Failed to create reminder", description: e?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const deleteReminder = async (id) => {
    try {
      await base44.entities.EventReminder.delete(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Reminder removed" });
    } catch (e) {
      toast({ title: "Failed to remove", description: e?.message, variant: "destructive" });
    }
  };

  const hasReminder = (type) => reminders.some((r) => r.reminder_type === type && r.status !== "DISMISSED");

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <CardTitle>Event Reminders</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reminders…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={hasReminder("24_HOURS") ? "outline" : "primary"}
                onClick={() => createReminder("24_HOURS")}
                disabled={creating || hasReminder("24_HOURS")}
              >
                <Plus className="h-3.5 w-3.5" /> 24 hours before
              </Button>
              <Button
                size="sm"
                variant={hasReminder("48_HOURS") ? "outline" : "primary"}
                onClick={() => createReminder("48_HOURS")}
                disabled={creating || hasReminder("48_HOURS")}
              >
                <Plus className="h-3.5 w-3.5" /> 48 hours before
              </Button>
            </div>

            {reminders.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Set a reminder to get an in-app notification before this event.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {reminders.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-2.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {r.reminder_type === "24_HOURS" ? "24 hours before" : "48 hours before"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.scheduled_for)} · {r.channel}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                    <Button variant="ghost" size="icon" onClick={() => deleteReminder(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              In-app notifications only. SMS, email, and push channels require external configuration.
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}