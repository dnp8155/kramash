import { formatEventDate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import StatusBadge from "@/components/common/StatusBadge";
import { X, Calendar, MapPin, User, Briefcase, Wallet, StickyNote, ArrowRight, Ban } from "lucide-react";

// Popup showing full details of all bookings + blocks on a given date.
export default function DayBookingsPopup({ date, bookings = [], blocks = [], currency = "INR", onClose, onEventClick }) {
  if (!date) return null;
  const dateLabel = (() => {
    try {
      return new Date(date + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } catch (e) {
      return date;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">{dateLabel}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Bookings */}
          {bookings.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                <span className="w-2 h-2 rounded-full bg-[#e74c3c]" /> Booked ({bookings.length})
              </div>
              <div className="space-y-3">
                {bookings.map(({ member, event: ev, assignment }) => (
                  <div key={`${member.id}-${ev?.id}`} className="border border-border rounded-lg p-3 bg-muted/30">
                    {/* Member */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{member.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {member.profession || assignment?.role_name_snapshot || "Team Member"}
                        </div>
                      </div>
                    </div>

                    {/* Event details */}
                    {ev && (
                      <button
                        onClick={() => { onEventClick?.(ev); onClose(); }}
                        className="w-full text-left bg-card border border-border rounded-md p-2.5 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{ev.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {ev.event_type ? `${ev.event_type} · ` : ""}
                              {formatEventDate(ev.start_date, ev.end_date)}
                            </div>
                          </div>
                          <StatusBadge status={ev.status} />
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs">
                          {ev.venue && (
                            <div className="flex items-start gap-1.5 text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span className="break-words">
                                {ev.venue}{ev.venue_address ? `, ${ev.venue_address}` : ""}
                              </span>
                            </div>
                          )}
                          {assignment && Number(assignment.agreed_rate) > 0 && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Wallet className="w-3.5 h-3.5 shrink-0" />
                              <span>{formatMoney(assignment.agreed_rate, currency)} · {assignment.rate_type || "Per Event"}</span>
                            </div>
                          )}
                          {Number(ev.contract_value) > 0 && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Briefcase className="w-3.5 h-3.5 shrink-0" />
                              <span>Contract: {formatMoney(ev.contract_value, currency)}</span>
                            </div>
                          )}
                          {assignment?.notes && (
                            <div className="flex items-start gap-1.5 text-muted-foreground">
                              <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span className="break-words">{assignment.notes}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-primary font-medium mt-2 pt-2 border-t border-border">
                          Open event <ArrowRight className="w-3 h-3" />
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocks */}
          {blocks.length > 0 && (
            <div className={bookings.length > 0 ? "pt-3 border-t border-border" : ""}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                <span className="w-2 h-2 rounded-full bg-[#6b7280]" /> Blocked / Leave ({blocks.length})
              </div>
              <div className="space-y-2">
                {blocks.map(({ member, block }) => (
                  <div key={member.id} className="flex items-center gap-2 border border-border rounded-lg p-2.5 bg-muted/30">
                    <div className="w-7 h-7 rounded-full bg-[#6b7280]/15 flex items-center justify-center shrink-0">
                      <Ban className="w-3.5 h-3.5 text-[#6b7280]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{member.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {block?.reason || "Leave"}
                        {block?.end_date && block.end_date !== block.start_date ? ` · until ${formatEventDate(block.end_date)}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {bookings.length === 0 && blocks.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-6 h-6 text-success" />
              </div>
              <p className="text-sm font-medium text-foreground">No bookings on this day</p>
              <p className="text-xs text-muted-foreground mt-0.5">All team members are available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}