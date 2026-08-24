import { useState } from "react";
import { Bell, ChevronDown, ChevronUp } from "lucide-react";

export default function ReminderBanner() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-muted/60 border border-border rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <Bell className="w-4 h-4 text-foreground" />
        <span className="text-sm font-medium text-foreground">Reminders</span>
        <span className="ml-auto text-muted-foreground text-sm">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-muted-foreground">
          No pending reminders for this week.
        </div>
      )}
    </div>
  );
}