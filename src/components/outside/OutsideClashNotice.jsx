import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { useT } from "@/hooks/useT";
import { useOutsideWork, outsideBookedDays } from "@/lib/outsideWork";

// A heads-up in the event form: one of the picked days is already booked by another business (Work from others).
// Never blocks saving.
export default function OutsideClashNotice({ dates }) {
  const t = useT();
  const { data: businesses } = useOutsideWork();
  const booked = useMemo(() => outsideBookedDays(businesses), [businesses]);
  const clashes = [...new Set((dates || []).filter(Boolean))].sort().filter((d) => booked[d]?.length);
  if (clashes.length === 0) return null;
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs space-y-1" role="status">
      <div className="flex items-center gap-1.5 font-semibold text-destructive">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        {clashes.length === 1
          ? t("You're already booked on {date}").replace("{date}", formatDate(clashes[0]))
          : t("You're already booked on {n} of these days").replace("{n}", clashes.length)}
      </div>
      {clashes.slice(0, 4).map((d) => booked[d].map((b, i) => (
        <div key={`${d}-${i}`} className="text-foreground">
          {formatDate(d)} · {b.business} · {b.title}{b.roles.length ? ` · ${b.roles.join(", ")}` : ""}
        </div>
      )))}
      <div className="text-muted-foreground">
        {t("You can still save.")}{" "}
        <Link to="/outside-work" className="text-primary font-medium hover:underline">{t("Work from others")}</Link>
      </div>
    </div>
  );
}
