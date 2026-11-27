import { useState } from "react";
import Input from "@/components/common/Input";
import { trackStatuses, TRACK_DEFAULT_NAMES, TRACK_MAX_NAME } from "@/lib/trackStatuses";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

// Preferences → Types & Display → Track: the business's own names for the last two Track statuses.
// The first three (To be started, In progress, Ready) are fixed. Saved with the other display options.
export default function TrackStatusNames({ names, onSave, disabled, onLocked }) {
  const t = useT();
  const current = trackStatuses(names);
  const [drafts, setDrafts] = useState(() => [current[3].label, current[4].label]);

  const commit = (i) => {
    if (disabled) return;
    const value = drafts[i].trim().slice(0, TRACK_MAX_NAME) || TRACK_DEFAULT_NAMES[i];
    const next = [current[3].label, current[4].label];
    next[i] = value;
    setDrafts((d) => d.map((x, j) => (j === i ? value : x)));
    if (value !== next[i] || value !== current[i + 3].label) onSave(next);
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{t("Status names")}</div>
      <p className="text-xs text-muted-foreground">{t("The first three are fixed. Name the last two to suit your work, for example Sent to client and Delivered, or Approved and Completed.")}</p>
      <div className="flex flex-wrap items-center gap-2">
        {current.slice(0, 3).map((s) => (
          <span key={s.value} className={cn("inline-flex items-center gap-1 h-7 px-3 rounded-full text-xs font-semibold", s.cls)}><s.Icon className="w-3 h-3 shrink-0" />{t(s.label)}</span>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1].map((i) => {
          // Live: the tag (icon and colour) follows what is being typed, exactly as clients will see it.
          const live = trackStatuses(drafts)[i + 3];
          const iconTone = live.cls.split(" ").filter((c) => c.startsWith("text-") || c.startsWith("dark:text-")).join(" ");
          return (
            <div key={i} className="space-y-1.5" onClick={disabled ? onLocked : undefined}>
              <div className="relative">
                <live.Icon className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none z-10", iconTone)} />
                <Input
                  size="sm"
                  className="pl-8"
                  value={drafts[i]}
                  maxLength={TRACK_MAX_NAME}
                  disabled={disabled}
                  onChange={(e) => setDrafts((d) => d.map((x, j) => (j === i ? e.target.value : x)))}
                  onBlur={() => commit(i)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  aria-label={`${t("Status")} ${i + 4}`}
                />
              </div>
              <span className={cn("inline-flex items-center gap-1 h-7 px-3 rounded-full text-xs font-semibold max-w-full", live.cls)}>
                <live.Icon className="w-3 h-3 shrink-0" /><span className="truncate">{live.label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
