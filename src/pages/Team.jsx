import { useState } from "react";
import TeamMemberCard from "@/components/team/TeamMemberCard";
import Button from "@/components/common/Button";
import { teamMembers, teamPlanLimit } from "@/data/mockTeam";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = ["Roster", "Availability Calendar"];

export default function Team() {
  const [tab, setTab] = useState("Roster");

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 border-b border-border w-full sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Button variant="dark">
          + Add Team Member
        </Button>
      </div>

      {tab === "Roster" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {teamMembers.map((m) => (
              <TeamMemberCard key={m.id} member={m} />
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <Crown className="w-4 h-4" />
            Free plan: up to {teamPlanLimit.limit} team members — upgrade to Pro for {teamPlanLimit.proLimit}.
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
          Availability calendar coming soon.
        </div>
      )}
    </div>
  );
}