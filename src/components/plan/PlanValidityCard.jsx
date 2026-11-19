import { motion } from "framer-motion";
import { CalendarCheck, CalendarClock, Crown, Info } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { planValidity } from "@/lib/planValidity";
import { cn } from "@/lib/utils";

const CYCLES = { MONTHLY: "Monthly", SIX_MONTHS: "6 Months", ANNUAL: "Yearly" };
const TONES = {
  ok: { text: "text-success", bar: "bg-success", chip: "bg-success/10 text-success" },
  soon: { text: "text-warning", bar: "bg-warning", chip: "bg-warning/10 text-warning" },
  urgent: { text: "text-destructive", bar: "bg-destructive", chip: "bg-destructive/10 text-destructive" },
  expired: { text: "text-destructive", bar: "bg-destructive", chip: "bg-destructive/10 text-destructive" },
};

// "Plan validity" on Your Plan: days left with a bar, start / end dates, how Pro was started, and what renewing does.
// `bare`: no card of its own (it sits inside the Current Plan card on Your Plan).
export default function PlanValidityCard({ subscription, onRenewClick, bare = false }) {
  const v = planValidity(subscription);
  if (!v) return null;
  const tone = TONES[v.tone];
  const rows = [
    { icon: CalendarCheck, label: "Started", value: formatDate(v.startedAt) },
    { icon: CalendarClock, label: v.expired ? "Ended" : "Valid until", value: `${formatDate(v.expiresAt)}${v.expired ? "" : " (end of day)"}` },
    { icon: Crown, label: "Plan", value: `Pro${CYCLES[v.cycle] ? ` · ${CYCLES[v.cycle]}` : ""} · ${v.source}` },
  ];
  return (
    <div className={bare ? "" : "bg-card border border-border rounded-[15px] p-5"}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Plan validity</h3>
          <p className={cn("text-2xl font-bold mt-1 tabular-nums", tone.text)}>{v.headline}</p>
        </div>
        <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-full", tone.chip)}>
          {v.expired ? "Free limits apply" : v.tone === "ok" ? "Active" : "Renew soon"}
        </span>
      </div>

      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v.usedPercent} aria-label="Part of the plan period used">
        <motion.div className={cn("h-full rounded-full", tone.bar)} initial={{ width: 0 }} animate={{ width: `${v.usedPercent}%` }} transition={{ type: "spring", stiffness: 120, damping: 22 }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{formatDate(v.startedAt)}</span>
        <span>{v.totalDays} {v.totalDays === 1 ? "day" : "days"} in this period</span>
        <span>{formatDate(v.expiresAt)}</span>
      </div>

      <div className="mt-4 rounded-xl border border-border divide-y divide-border">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-2.5">
            <Icon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="ml-auto text-sm font-medium text-foreground text-right">{value}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {v.expired
            ? "Renew below to switch Pro back on. Nothing you made is lost."
            : "Pro doesn't renew by itself. Renewing early adds the new period after your current end date, so you never lose days."}
          {onRenewClick && <> <button type="button" onClick={onRenewClick} className="font-medium text-primary hover:text-primary-hover">{v.expired ? "Renew now" : "See renewal options"}</button></>}
        </span>
      </p>
    </div>
  );
}
