import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";

// The "Add-on" tag for a service. One look everywhere (Services tab, Team-by-date, Calendar).
export default function AddOnTag({ className }) {
  const t = useT();
  return (
    <span className={cn("shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-warning/15 text-warning", className)}>
      {t("Add-on")}
    </span>
  );
}
