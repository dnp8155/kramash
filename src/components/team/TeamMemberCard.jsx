import { Pencil, Trash2, ExternalLink, Archive, RotateCcw, Calendar, CalendarClock, Crown, Users } from "lucide-react";
import { TEAM_MEMBER_STATUS, AVAILABILITY_STATUS } from "@/constants/teamConfig";
import { formatMoney } from "@/utils/format";
import { memberBookingCount, isSelfMember } from "@/lib/teamService";
import { formatEventDate, isUpcomingDate, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import PaymentDot from "@/components/common/PaymentDot";

// Derive a display status: inactive members show inactive; active members
// with current/upcoming bookings show "booked", otherwise "available".
function displayStatus(member, assignments) {
  if (member.status === "inactive") return AVAILABILITY_STATUS.inactive;
  const count = memberBookingCount(member.id, assignments);
  return count > 0 ? AVAILABILITY_STATUS.booked : AVAILABILITY_STATUS.available;
}

export default function TeamMemberCard({ member, assignments = [], transactions = [], eventsById = {}, currentUser, currency = "INR", onEdit, onArchive, onDelete, onOpen }) {
  const status = displayStatus(member, assignments);
  const bookings = memberBookingCount(member.id, assignments);
  const active = member.status === "active";

  // Financial: total agreed rate from active assignments, total paid from TEAM_PAYMENT transactions.
  const memberAssignments = assignments.filter(
    (a) => a.team_member_id === member.id && a.assignment_status !== "removed"
  );
  const totalRate = memberAssignments.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const totalPaid = (transactions || [])
    .filter((t) => t.team_member_id === member.id)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const remaining = Math.max(0, totalRate - totalPaid);

  // Next upcoming booking with per-member dates
  const today = todayISO();
  const upcomingBookings = memberAssignments
    .map((a) => {
      const ev = eventsById[a.event_id];
      if (!ev || ev.status === "cancelled") return null;
      const start = a.booking_start_date || ev.start_date;
      const end = a.booking_end_date || ev.end_date || start;
      if (end < today) return null;
      return { a, ev, start, end };
    })
    .filter(Boolean)
    .sort((x, y) => x.start.localeCompare(y.start));
  const nextBooking = upcomingBookings[0] || null;

  // Last worked date — most recent past assignment (end date < today)
  const pastBookings = memberAssignments
    .map((a) => {
      const ev = eventsById[a.event_id];
      if (!ev || ev.status === "cancelled") return null;
      const start = a.booking_start_date || ev.start_date;
      const end = a.booking_end_date || ev.end_date || start;
      if (end >= today) return null;
      return { a, ev, start, end };
    })
    .filter(Boolean)
    .sort((x, y) => y.end.localeCompare(x.end));
  const lastWorked = pastBookings[0] || null;

  const isSelf = isSelfMember(member);

  return (
    <div className="bg-card border border-border rounded-[15px] p-4 relative overflow-hidden">
      {/* Header: status dot + name + SELF badge + role + actions */}
      <div className="flex items-center gap-2 pl-1">
        {isSelf ? (
          <Users className="w-4 h-4 shrink-0 team-chip-dot text-muted-foreground" />
        ) : (
          <PaymentDot paid={totalPaid} agreed={totalRate} size="lg" className="team-chip-dot" />
        )}
        <button
          onClick={() => onOpen?.(member)}
          className="text-sm font-semibold text-foreground flex items-center gap-1.5 text-left hover:underline min-w-0"
        >
          <span className="truncate">{member.name}</span>
          {isSelf && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground shrink-0">
              <Crown className="w-2.5 h-2.5" /> Self
            </span>
          )}
        </button>
        <span className="text-xs text-muted-foreground ml-auto truncate">
          {member.profession || "—"}
        </span>
        <button onClick={() => onEdit?.(member)} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" aria-label="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onArchive?.(member)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-warning hover:bg-muted transition-colors shrink-0"
          aria-label={active ? "Archive" : "Reactivate"}
          title={active ? "Set inactive" : "Set active"}
        >
          {active ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onDelete?.(member)} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0" aria-label="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Next booking date — clearly visible */}
      {nextBooking ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-sm">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground">Next:</span>
          <button onClick={() => onOpen?.(member)} className="text-foreground font-medium hover:underline">
            {formatEventDate(nextBooking.start, nextBooking.end)}
          </button>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {nextBooking.ev.title}</span>
        </div>
      ) : lastWorked ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-sm">
          <CalendarClock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Last worked:</span>
          <button onClick={() => onOpen?.(member)} className="text-foreground font-medium hover:underline">
            {formatEventDate(lastWorked.start, lastWorked.end)}
          </button>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {lastWorked.ev.title}</span>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-1.5 text-sm">
          <span className="text-xs text-muted-foreground">Bookings:</span>
          <button onClick={() => onOpen?.(member)} className="text-foreground font-medium hover:underline flex items-center gap-1">
            {bookings}
            {bookings > 0 && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
          </button>
        </div>
      )}

      {/* Last worked date — shown alongside next booking when both exist */}
      {nextBooking && lastWorked && (
        <div className="mt-1 flex items-center gap-1.5 text-sm">
          <CalendarClock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Last worked:</span>
          <button onClick={() => onOpen?.(member)} className="text-foreground font-medium hover:underline">
            {formatEventDate(lastWorked.start, lastWorked.end)}
          </button>
        </div>
      )}

      {/* Financial footer: RATE / PAID / REMAINING (SELF → Share, not a liability) */}
      <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-border">
        <div>
          <div className="text-xs text-muted-foreground font-medium">{isSelf ? "Share" : "Rate"}</div>
          <div className="text-sm font-bold text-foreground tabular-nums mt-0.5">{formatMoney(totalRate, currency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-medium">{isSelf ? "Owner" : "Paid"}</div>
          <div className={cn(
            "text-sm font-bold tabular-nums mt-0.5",
            !isSelf && totalPaid >= totalRate && totalRate > 0 ? "text-success" : "text-foreground"
          )}>
            {isSelf ? "—" : formatMoney(totalPaid, currency)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-medium">{isSelf ? "Internal" : "Remaining"}</div>
          <div className={cn(
            "text-sm font-bold tabular-nums mt-0.5",
            isSelf ? "text-primary" : remaining > 0 ? "text-warning" : "text-success"
          )}>
            {isSelf ? "Share" : formatMoney(remaining, currency)}
          </div>
        </div>
      </div>

      {!active && (
        <div className="mt-2 text-xs font-medium text-destructive">
          {TEAM_MEMBER_STATUS.inactive.label}
        </div>
      )}
    </div>
  );
}