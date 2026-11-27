import { AlertTriangle } from "lucide-react";
import { useT } from "@/hooks/useT";

// Shown when a list reached the most rows the app loads at once, so the screen may be missing some.
export const LOAD_LIMIT = 1000;
export const hitLimit = (...lists) => lists.some((l) => Array.isArray(l) && l.length >= LOAD_LIMIT);

export default function LimitNotice({ className = "" }) {
  const t = useT();
  return (
    <div className={`flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning ${className}`}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{t("Your workspace has more records than this screen loads at once (1000), so some may be missing here. Clash warnings and the calendar could be incomplete. Please tell your developer.")}</span>
    </div>
  );
}
