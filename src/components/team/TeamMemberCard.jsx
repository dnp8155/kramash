import { Pencil, Trash2, ExternalLink, Archive, RotateCcw, Calendar, CalendarClock, Crown } from "lucide-react";
import { TEAM_MEMBER_STATUS, AVAILABILITY_STATUS } from "@/constants/teamConfig";
import { formatMoney } from "@/utils/format";
import { memberBookingCount, isSelfMember } from "@/lib/teamService";
import { formatAssignmentDates, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import PaymentDot from "@/components/common/PaymentDot";
import { buildPersonStatements } from "@/lib/personStatementService";
import { useT } from "@/hooks/useT";

// Derive a display status: inactive members show inactive; active members
// with current/upcoming bookings show "booked", otherwise "available".
function displayStatus(member, assignments) {
  if (member.status === "inactive") return AVAILABILITY_STATUS.inactive;
  const count = memberBookingCount(member.id, assignments);
  return count > 0 ? AVAILABILITY_STATUS.booked : AVAILABILITY_STATUS.available;
}

export default function TeamMemberCard({ member, assignments = [], transactions = [], serviceAssignments = [], expenseTransactions = [], eventsById = {}, currentUser, currency = "INR", onEdit, onArchive, onDelete, onOpen }) {
  const t = useT();
  const status = displayStatus(member, assignments);
  const bookings = memberBookingCount(member.id, assignments);
  const active = member.status === "active";

  // Financial: total agreed rate from active assignments, total paid from TEAM_PAYMENT transactions.
  const memberAssignments = assignments.filter(
    (a) => a.team_member_id === member.id && a.assignment_status !== "removed"
  );
  // One person can be both a team member and a service provider, so combine role + service
  // assignments and TEAM_PAYMENT + service payments (same builder as the person statement).
  const statement = isSelfMember(member)
    ? null
    : buildPersonStatements({
        members: [member], teamAssignments: assignments, serviceAssignments,
        transactions: [...(transactions || []), ...expenseTransactions], eventsById
      }).find((s) => s.key === member.id) || null;
  const totalRate = statement
    ? statement.combinedTotal
    : memberAssignments.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const totalPaid = statement
    ? statement.totalPaid
    : (transactions || []).filter((tx) => tx.team_member_id === member.id).reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
  const remaining = Math.max(0, totalRate - totalPaid);
  const overpaid = !isSelfMember(member) && totalPaid > totalRate ? totalPaid - totalRate : 0;

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
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 team-chip-dot" aria-label={t("Self")}>
            <Crown className="w-3 h-3" />
          </span>
        ) : (
          <PaymentDot paid={totalPaid} agreed={totalRate} size="lg" className="team-chip-dot" />
        )}
        <button
          onClick={() => onOpen?.(member)}
          className="text-sm font-semibold text-foreground flex items-center gap-1.5 text-left hover:underline min-w-0"
        >
          <span className="truncate">{member.name}</span>
        </button>
        <span className="text-xs text-muted-foreground ml-auto truncate">
          {member.profession || "—"}
        </span>
        <button onClick={() => onEdit?.(member)} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" aria-label={t("Edit")}>
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onArchive?.(member)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-warning hover:bg-muted transition-colors shrink-0"
          aria-label={active ? t("Archive") : t("Reactivate")}
          title={active ? t("Set inactive") : t("Set active")}
        >
          {active ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onDelete?.(member)} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0" aria-label={t("Delete")}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Next booking date — clearly visible */}
      {nextBooking ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-sm">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground">{t("Next:")}</span>
          <button onClick={() => onOpen?.(member)} className="text-foreground font-medium hover:underline">
            {formatAssignmentDates(nextBooking.a, nextBooking.ev)}
          </button>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {nextBooking.ev.title}</span>
        </div>
      ) : lastWorked ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-sm">
          <CalendarClock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">{t("Last worked:")}</span>
          <button onClick={() => onOpen?.(member)} className="text-foreground font-medium hover:underline">
            {formatAssignmentDates(lastWorked.a, lastWorked.ev)}
          </button>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {lastWorked.ev.title}</span>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-1.5 text-sm">
          <span className="text-xs text-muted-foreground">{t("Bookings:")}</span>
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
          <span className="text-xs text-muted-foreground">{t("Last worked:")}</span>
          <button onClick={() => onOpen?.(member)} className="text-foreground font-medium hover:underline">
            {formatAssignmentDates(lastWorked.a, lastWorked.ev)}
          </button>
        </div>
      )}

      {/* Financial footer: RATE / PAID / REMAINING (SELF → Share, not a liability) */}
      <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-border">
        <div>
          <div className="text-xs text-muted-foreground font-medium">{isSelf ? t("Share") : t("Rate")}</div>
          <div className={cn("text-sm font-bold tabular-nums mt-0.5", overpaid > 0 ? "text-[#2563eb]" : "text-foreground")}>{formatMoney(totalRate, currency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-medium">{isSelf ? t("Owner") : t("Paid")}</div>
          <div className={cn(
            "text-sm font-bold tabular-nums mt-0.5",
            !isSelf && overpaid > 0 ? "text-[#2563eb]" : !isSelf && totalPaid >= totalRate && totalRate > 0 ? "text-success" : "text-foreground"
          )}>
            {isSelf ? "—" : formatMoney(totalPaid, currency)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-medium">{isSelf ? t("Internal") : overpaid > 0 ? t("Overpaid") : t("Remaining")}</div>
          <div className={cn(
            "text-sm font-bold tabular-nums mt-0.5",
            isSelf ? "text-primary" : overpaid > 0 ? "text-[#2563eb]" : remaining > 0 ? "text-warning" : "text-success"
          )}>
            {isSelf ? t("Share") : formatMoney(overpaid > 0 ? overpaid : remaining, currency)}
          </div>
        </div>
      </div>

      {!active && (
        <div className="mt-2 text-xs font-medium text-destructive">
          {t(TEAM_MEMBER_STATUS.inactive.label)}
        </div>
      )}
    </div>
  );
}