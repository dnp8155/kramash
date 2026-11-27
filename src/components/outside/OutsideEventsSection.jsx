import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, Handshake } from "lucide-react";
import { DateChips } from "@/components/events/EventsTable";
import { useOutsideWork, useOutsideOnEvents, upcomingOutsideItems } from "@/lib/outsideWork";
import { todayISO, isTomorrow, isOngoingEvent } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

// Events page: the next (up to 3) jobs other businesses booked this person for — "Work from others".
// Same shape as the Events list (columns on larger screens, one card per job on phones), in cocoa brown with a
// dashed outline, so it reads as "not yours to manage". Read-only: every row and the arrow open Work from others.
// Shown unless the person turned it off (switch on the Work from others page, saved to their profile). Not part of
// the Events list: search, filters, counts and exports ignore it.
const GRID = "sm:grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto]"; // same columns as the Events list

function whenLabel(e, t) {
  const today = todayISO();
  if ((e.event_dates || []).includes(today)) return { text: (e.event_dates || []).length > 1 ? t("In Progress") : t("Today"), strong: true };
  if (isTomorrow(e.__next)) return { text: t("Tomorrow"), strong: true };
  if (isOngoingEvent(e)) return { text: t("In Progress"), strong: true };
  return { text: t("Upcoming"), strong: false };
}

function Badge({ label }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
      label.strong ? "bg-outside text-white" : "bg-outside/10 text-outside")}>{label.text}</span>
  );
}

export default function OutsideEventsSection() {
  const t = useT();
  const navigate = useNavigate();
  const { data: businesses } = useOutsideWork();
  const { showOnEvents: on } = useOutsideOnEvents();
  const all = upcomingOutsideItems(businesses, Infinity);
  const items = all.slice(0, 3); // at most 3 here; the count shows them all
  if (!on || items.length === 0) return null;
  const open = () => navigate("/outside-work");

  return (
    <section aria-label={t("Work from others")} className="space-y-2">
      {/* Phones: cards like the Events list, under a dashed brown frame. From sm up: one table card. */}
      <div className="rounded-[15px] border border-dashed border-outside/60 bg-card shadow-card overflow-hidden">
        {/* Header: same as the Dashboard widgets (icon + title, "View all →" on the right, line under it), in brown. */}
        <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-outside/30">
          <div className="flex items-center gap-2 min-w-0">
            <Handshake className="w-4 h-4 text-outside shrink-0" />
            <h3 className="text-sm font-semibold text-foreground truncate">{t("Work from others")}</h3>
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-[7px] bg-outside/10 text-outside">{all.length}</span>
          </div>
          <button type="button" onClick={open} className="shrink-0 text-xs font-medium text-outside hover:underline flex items-center gap-1">
            {t("View all")} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="max-sm:p-3">

        {/* Column titles, same as the Events list */}
        <div className={cn("hidden sm:grid gap-4 items-center px-4 py-2 border-b border-outside/20 text-xs font-medium text-muted-foreground uppercase tracking-wide", GRID)}>
          <span>{t("Business")}</span>
          <span>{t("Name")}</span>
          <span>{t("Role")}</span>
          <span>{t("Date(s)")}</span>
          <span>{t("Status")}</span>
          <span />
        </div>

        {items.map((e) => {
          const label = whenLabel(e, t);
          const roles = (e.__outside?.roles || []).join(", ");
          return (
            <div key={e.id} className="mb-2 last:mb-0 rounded-[12px] border border-dashed border-outside/50 bg-card sm:mb-0 sm:rounded-none sm:border-0 sm:border-b sm:border-solid sm:border-outside/15 sm:bg-transparent sm:last:border-0">
              <div role="button" tabIndex={0} onClick={open} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(); } }}
                className={cn("grid grid-cols-[1fr_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-outside/5 transition-colors cursor-pointer", GRID)}>
                {/* Phones */}
                <div className="min-w-0 sm:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-outside font-medium truncate">{t("For")} {e.__outside?.business}</div>
                    <Badge label={label} />
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate mt-1">{e.title}</div>
                  {roles && <div className="text-xs text-muted-foreground truncate mt-0.5">{roles}</div>}
                  <div className="mt-1"><DateChips event={e} maxChips={2} /></div>
                </div>

                {/* Larger screens: the same columns as the Events list */}
                <span className="hidden sm:block text-sm text-outside font-medium truncate">{e.__outside?.business}</span>
                <div className="hidden sm:block min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{e.title}</div>
                  {e.venue && <div className="text-xs text-muted-foreground truncate">{e.venue}</div>}
                </div>
                <span className="hidden sm:block text-sm text-foreground truncate">{roles || "—"}</span>
                <div className="hidden sm:block"><DateChips event={e} maxChips={3} /></div>
                <div className="hidden sm:flex"><Badge label={label} /></div>

                {/* Same round chevron as the Events list rows (phones 44px, larger screens 28px); opens Work from others. */}
                <span className="sm:hidden flex items-center justify-center w-11 h-11 rounded-full border border-border bg-card text-muted-foreground justify-self-end touch-min" aria-hidden="true">
                  <ChevronRight className="w-5 h-5" />
                </span>
                <span className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full border border-border bg-card text-muted-foreground justify-self-end" aria-hidden="true">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          );
        })}
        </div>
      </div>
      {/* The way to turn it off: the switch lives on Work from others. */}
      <button type="button" onClick={open} className="no-press px-1 text-xs text-muted-foreground hover:text-outside">
        {t("Turn this off in Work from others")} →
      </button>
    </section>
  );
}
