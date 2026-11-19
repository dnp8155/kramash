import { useState } from "react";
import { Plus, X } from "lucide-react";
import Input from "@/components/common/Input";
import { normalizeDueRules, clampDays, MAX_DUE_RULES, MAX_RULE_WORD, MAX_DUE_DAYS } from "@/lib/trackDue";
import { useT } from "@/hooks/useT";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";

// Preferences → Types & Display → Track: "Expected delivery" rules. Each rule is a word and a number of days after
// the job's last day (in the business's own word: event, project, appointment…); a new Track item whose name contains the word gets that date. "Anything else" covers the rest
// (empty = no date). Saved with the other display options when a field is left (like the status names above).
export default function TrackDueRules({ value, onSave, disabled, onLocked }) {
  const t = useT();
  // The business's own words: "event" / "project" / "appointment"…, and an example of what it hands over.
  const term = useBusinessTerminology();
  const work = (term.workItemSingular || "Event").toLowerCase();
  const ex = term.deliverableExample || "Report";
  const saved = normalizeDueRules(value);
  const [rows, setRows] = useState(() => saved.rules.map((r) => ({ word: r.word, days: String(r.days) })));
  const [other, setOther] = useState(() => (saved.otherDays === null ? "" : String(saved.otherDays)));

  const save = (nextRows = rows, nextOther = other) => {
    if (disabled) return;
    const clean = normalizeDueRules({ rules: nextRows, otherDays: nextOther });
    if (JSON.stringify(clean) !== JSON.stringify(saved)) onSave(clean);
  };
  const setRow = (i, field, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [field]: v } : r)));
  const removeRow = (i) => { const next = rows.filter((_, j) => j !== i); setRows(next); save(next); };
  const addRow = () => { if (!disabled && rows.length < MAX_DUE_RULES) setRows((rs) => [...rs, { word: "", days: "" }]); };
  const onEnter = (e) => { if (e.key === "Enter") e.currentTarget.blur(); };
  // Same 14px as the Track card (the app stops iPhone zooming into fields, so 16px is not needed).
  const daysField = "w-20 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    <div className="space-y-2" onClick={disabled ? onLocked : undefined}>
      <div className="text-sm font-medium text-foreground">{t("Expected delivery")}</div>
      <p className="text-xs text-muted-foreground">
        {`${t("Days after the")} ${work}${t("'s last day, for new items whose name has the word (e.g.")} ${ex}). ${t("Dates set by hand stay.")}`}
      </p>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              size="sm"
              className="flex-1 min-w-0 text-sm"
              value={r.word}
              maxLength={MAX_RULE_WORD}
              placeholder={`${t("Word, e.g.")} ${ex}`}
              disabled={disabled}
              onChange={(e) => setRow(i, "word", e.target.value)}
              onBlur={() => save()}
              onKeyDown={onEnter}
              aria-label={t("Word in the item name")}
            />
            <Input
              size="sm"
              type="number" min={0} max={MAX_DUE_DAYS} inputMode="numeric"
              className={daysField}
              value={r.days}
              placeholder="45"
              disabled={disabled}
              onChange={(e) => setRow(i, "days", e.target.value)}
              onBlur={() => save()}
              onKeyDown={onEnter}
              aria-label={`${t("Days after the")} ${work}`}
            />
            <span className="text-xs text-muted-foreground shrink-0 w-9">{t("days")}</span>
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={disabled}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
              aria-label={t("Remove rule")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <span className="flex-1 min-w-0 text-sm font-medium text-foreground pl-1">{t("Anything else")}</span>
          <Input
            size="sm"
            type="number" min={0} max={MAX_DUE_DAYS} inputMode="numeric"
            className={daysField}
            value={other}
            placeholder={t("None")}
            disabled={disabled}
            onChange={(e) => setOther(e.target.value)}
            onBlur={(e) => { const v = clampDays(e.target.value); const s = v === null ? "" : String(v); setOther(s); save(rows, s); }}
            onKeyDown={onEnter}
            aria-label={t("Days for anything else")}
          />
          <span className="text-xs text-muted-foreground shrink-0 w-9">{t("days")}</span>
          <span className="shrink-0 w-7" />
        </div>
      </div>

      {rows.length < MAX_DUE_RULES && (
        <button type="button" onClick={addRow} disabled={disabled} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> {t("Add rule")}
        </button>
      )}
    </div>
  );
}
