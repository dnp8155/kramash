import { useState } from "react";
import ReminderBanner from "@/components/events/ReminderBanner";
import UpgradeBanner from "@/components/events/UpgradeBanner";
import EventsTable from "@/components/events/EventsTable";
import EventsRightPanel from "@/components/events/EventsRightPanel";
import SearchInput from "@/components/common/SearchInput";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import { Mic, Users } from "lucide-react";

export default function Events() {
  const [query, setQuery] = useState("");

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <ReminderBanner />
      <UpgradeBanner />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <SearchInput
          placeholder="Search clients, team, events"
          className="sm:max-w-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <Select defaultValue="all">
            <option value="all">All Events (6)</option>
          </Select>
          <Select defaultValue="fy">
            <option value="fy">April 2026 – March 2026 (Current)</option>
          </Select>
          <Button size="md">
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Record</span>
          </Button>
          <Button variant="outline" size="icon" aria-label="Team">
            <Users className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <EventsTable query={query} />
        <EventsRightPanel />
      </div>
    </div>
  );
}