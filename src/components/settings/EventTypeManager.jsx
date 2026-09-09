import { useState } from "react";
import { Plus, X, Tag, CheckCircle } from "lucide-react";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { defaultEventTypes, defaultEventStatuses } from "@/constants/events";

// Workspace-level manager for Event Types and Event Statuses.
// Values are stored on the Workspace entity and drive the EventForm dropdowns.
// Existing events keep their saved values even if a type/status is removed.
export default function EventTypeManager({ eventTypes, eventStatuses, onChange }) {
  const [newType, setNewType] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const types = eventTypes && eventTypes.length ? eventTypes : defaultEventTypes;
  const statuses = eventStatuses && eventStatuses.length ? eventStatuses : defaultEventStatuses;

  const addType = () => {
    const val = newType.trim();
    if (!val) return;
    if (types.includes(val)) {
      setNewType("");
      return;
    }
    onChange({ event_types: [...types, val], event_statuses: eventStatuses });
    setNewType("");
  };

  const removeType = (val) => {
    onChange({ event_types: types.filter((t) => t !== val), event_statuses: eventStatuses });
  };

  const addStatus = () => {
    const val = newStatus.trim();
    if (!val) return;
    if (statuses.includes(val)) {
      setNewStatus("");
      return;
    }
    onChange({ event_types: eventTypes, event_statuses: [...statuses, val] });
    setNewStatus("");
  };

  const removeStatus = (val) => {
    onChange({ event_types: eventTypes, event_statuses: statuses.filter((s) => s !== val) });
  };

  const resetToDefaults = () => {
    onChange({ event_types: [...defaultEventTypes], event_statuses: [...defaultEventStatuses] });
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <CardTitle>Event Types & Statuses</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
      </CardHeader>
      <CardBody className="space-y-5">
        <p className="text-xs text-muted-foreground">
 Configure the types and statuses that appear in the event form. These are
          workspace-specific — other workspaces won't see your custom values.
          Existing events keep their saved values even if you remove a type or
          status here.
        </p>

        {/* Event Types */}
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Event Types</p>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/40 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {t}
                <button
                  onClick={() => removeType(t)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${t}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addType())}
              placeholder="Add a type (e.g. Architecture)"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addType}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>

        {/* Event Statuses */}
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Event Statuses</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/40 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <CheckCircle className="h-3 w-3 text-success" />
                {s}
                <button
                  onClick={() => removeStatus(s)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${s}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStatus())}
              placeholder="Add a status (e.g. On Hold)"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addStatus}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Status is never automatically changed by payments or dates. It is
            always controlled manually from the event form.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}