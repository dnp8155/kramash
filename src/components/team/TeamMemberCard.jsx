import { Pencil, Trash2, ExternalLink, Archive, RotateCcw } from "lucide-react";
import { TEAM_MEMBER_STATUS, AVAILABILITY_STATUS } from "@/constants/teamConfig";
import { formatINR } from "@/utils/format";
import { memberBookingCount } from "@/lib/teamService";
import { cn } from "@/lib/utils";

// Derive a display status: inactive members show inactive; active members
// with current/upcoming bookings show "booked", otherwise "available".
function displayStatus(member, assignments) {
  if (member.status === "inactive") return AVAILABILITY_STATUS.inactive;
  const count = memberBookingCount(member.id, assignments);
  return count > 0 ? AVAILABILITY_STATUS.booked : AVAILABILITY_STATUS.available;
}

export default function TeamMemberCard({ member, assignments = [], onEdit, onArchive, onDelete, onOpen }) {
  const status = displayStatus(member, assignments);
  const bookings = memberBookingCount(member.id, assignments);
  const active = member.status === "active";

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", status.dot)} />
        <button
          onClick={() => onOpen?.(member)}
          className="text-sm font-semibold text-foreground flex-1 text-left hover:underline"
        >
          {member.name}
        </button>
        <button onClick={() => onEdit?.(member)} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onArchive?.(member)}
          className="text-muted-foreground hover:text-warning"
          aria-label={active ? "Archive" : "Reactivate"}
          title={active ? "Set inactive" : "Set active"}
        >
          {active ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onDelete?.(member)} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Role</div>
          <div className="text-foreground font-medium truncate">{member.profession || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Bookings</div>
          <div className="text-foreground font-medium flex items-center gap-1">
            <button onClick={() => onOpen?.(member)} className="hover:underline flex items-center gap-1">
              {bookings}
              {bookings > 0 && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-border text-center">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Default Rate</div>
          <div className="text-sm font-medium text-foreground">{formatINR(member.default_rate)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Rate Type</div>
          <div className="text-sm font-medium text-foreground">{member.rate_type || "—"}</div>
        </div>
      </div>

      {!active && (
        <div className="mt-2 text-[10px] font-semibold text-destructive uppercase tracking-wide">
          {TEAM_MEMBER_STATUS.inactive.label}
        </div>
      )}
    </div>
  );
}