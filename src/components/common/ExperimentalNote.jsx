import { Info } from "lucide-react";
import { useT } from "@/hooks/useT";

// The amber note shown on features that are still being tried out (like the Beta note on Language), worded for
// "experimental". Remove where it is used once the feature is finished.
export default function ExperimentalNote({ name, className = "" }) {
  const t = useT();
  return (
    <div className={`flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 ${className}`}>
      <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
      <p className="text-xs text-foreground/80 leading-relaxed">
        <span className="font-semibold">{name} {t("is experimental.")}</span> {t("It is new and may change or have rough edges while we test it. Your feedback helps us improve it.")}
      </p>
    </div>
  );
}
