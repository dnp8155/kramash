import { useMemo, useState } from "react";
import { Zap } from "lucide-react";
import Toggle from "@/components/common/Toggle";
import Select from "@/components/common/Select";
import Input from "@/components/common/Input";
import ProTag from "@/components/common/ProTag";
import { useFeatureGate } from "@/components/common/ProGate";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import { workspaceTz, tzLabel } from "@/lib/workspaceTime";
import { rulesForCategory, getAutomation, getTemplates, saveAutomation, templateNeedsDoc } from "@/lib/messageTemplates";

const HOURS = [7, 8, 9, 10, 11, 12, 14, 16, 18, 20];
const hourLabel = (h) => `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;

// A number that is saved when the field is left, not on every key press.
function NumberField({ label, value, min = 0, max = 365, onCommit }) {
  const [text, setText] = useState(String(value));
  const commit = () => {
    const n = Math.min(max, Math.max(min, parseInt(text, 10)));
    const next = Number.isNaN(n) ? value : n;
    setText(String(next));
    if (next !== value) onCommit(next);
  };
  return (
    <label className="block min-w-[110px] flex-1">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      <Input type="number" inputMode="numeric" min={min} max={max} value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} />
    </label>
  );
}

// Preferences → Business → Connections → Automation. Email goes out by itself from the connected Gmail (Pro).
// WhatsApp can't be sent for you, so a WhatsApp rule sends you a reminder to send it (free).
export default function AutomationManager({ gmail }) {
  const t = useT();
  const { toast } = useToast();
  const { workspace, setWorkspace } = useWorkspace();
  const { hasFeature } = useFeatureGate();
  const canEmail = hasFeature("client_email_enabled");
  const auto = useMemo(() => getAutomation(workspace), [workspace]);
  // Automatic messages are about the event itself, so the send-quotation / send-invoice templates are not offered.
  const templates = useMemo(() => getTemplates(workspace, workspace?.business_category).filter((tpl) => !templateNeedsDoc(tpl)), [workspace]);
  const [saving, setSaving] = useState(false);

  const save = async (next) => {
    setSaving(true);
    try { await saveAutomation(workspace, setWorkspace, next); }
    catch (e) { toast({ title: t("Failed to save"), description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };
  const patchRule = (key, patch) => save({ ...auto, rules: { ...auto.rules, [key]: { ...auto.rules[key], ...patch } } });

  const rules = useMemo(() => rulesForCategory(workspace?.business_category), [workspace?.business_category]);
  const usesEmail = auto.enabled && rules.some((def) => { const r = auto.rules[def.key]; return r.enabled && (r.channel === "email" || r.channel === "both"); });

  return (
    <div className="bg-card border border-border rounded-[15px] p-4">
      <div className="flex items-start gap-2 mb-1">
        <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{t("Automatic messages")}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t("Let Kramasha follow up for you. Pick what goes out and when. Emails are sent for you from your Gmail. WhatsApp can't be sent for you, so you get a reminder with the message ready to send.")}
          </p>
        </div>
        <Toggle checked={auto.enabled} label={t("Automatic messages")} disabled={saving} onChange={(v) => save({ ...auto, enabled: v })} />
      </div>

      {usesEmail && canEmail && !gmail.connected && (
        <p className="text-xs text-warning mt-2">{t("Connect Gmail above so emails can go out. Until then they are skipped.")}</p>
      )}

      <div className={auto.enabled ? "" : "opacity-50 pointer-events-none"} aria-disabled={!auto.enabled}>
      <div className="mt-3 max-w-[220px]">
        <div className="text-xs font-medium text-muted-foreground mb-1">{t("Send at")} · {t("Timezone as set in Preferences")} ({tzLabel(workspaceTz(workspace))})</div>
        <Select value={String(auto.send_hour)} disabled={saving} onChange={(e) => save({ ...auto, send_hour: Number(e.target.value) })}>
          {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </Select>
      </div>

      <ul className="divide-y divide-border mt-2">
        {rules.map((def) => {
          const r = auto.rules[def.key];
          const emailChosen = r.channel === "email" || r.channel === "both";
          return (
            <li key={def.key} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{t(def.title)}</div>
                  <div className="text-xs text-muted-foreground">{t(def.hint)}</div>
                </div>
                <Toggle
                  checked={r.enabled}
                  label={t(def.title)}
                  disabled={saving}
                  onChange={(v) => {
                    // Emails need Pro. Without it the rule starts on the free WhatsApp reminder instead of being blocked.
                    patchRule(def.key, v && emailChosen && !canEmail ? { enabled: true, channel: "whatsapp" } : { enabled: v });
                  }}
                />
              </div>

              {r.enabled && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <label className="block min-w-[170px] flex-1">
                      <span className="block text-xs font-medium text-muted-foreground mb-1">{t("Send by")}</span>
                      <Select value={emailChosen && !canEmail ? "whatsapp" : r.channel} disabled={saving} onChange={(e) => patchRule(def.key, { channel: e.target.value })}>
                        <option value="whatsapp">{t("WhatsApp (I get a reminder)")}</option>
                        <option value="email" disabled={!canEmail}>{t("Email (sent automatically)")}{!canEmail ? " (Pro)" : ""}</option>
                        <option value="both" disabled={!canEmail}>{t("Both")}{!canEmail ? " (Pro)" : ""}</option>
                      </Select>
                      <span className="block text-[11px] text-muted-foreground mt-1">
                        {r.channel === "whatsapp" || (emailChosen && !canEmail)
                          ? t("You get a notification. Tap it to send the message on WhatsApp yourself.")
                          : r.channel === "email"
                            ? t("Sent from your Gmail to the client's email address.")
                            : t("Emailed from your Gmail, and you also get a WhatsApp reminder.")}
                      </span>
                    </label>
                    <label className="block min-w-[170px] flex-1">
                      <span className="block text-xs font-medium text-muted-foreground mb-1">{t("Template")}</span>
                      <Select value={r.template_id} disabled={saving} onChange={(e) => patchRule(def.key, { template_id: e.target.value })}>
                        {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                      </Select>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {def.key === "payment_due" && (<>
                      <NumberField label={t("Days before due date")} value={r.before_days} onCommit={(v) => patchRule(def.key, { before_days: v })} />
                      <NumberField label={t("If overdue, repeat every (days)")} value={r.overdue_every_days} onCommit={(v) => patchRule(def.key, { overdue_every_days: v })} />
                      <NumberField label={t("Repeat up to (times)")} value={r.overdue_max} min={1} max={10} onCommit={(v) => patchRule(def.key, { overdue_max: v })} />
                    </>)}
                    {def.key === "event_upcoming" && (
                      <NumberField label={t("Days before it starts")} value={r.before_days} min={1} onCommit={(v) => patchRule(def.key, { before_days: v })} />
                    )}
                    {def.key === "thank_you" && (
                      <NumberField label={t("Days after it ends")} value={r.after_days} min={1} onCommit={(v) => patchRule(def.key, { after_days: v })} />
                    )}
                  </div>
                  {def.key === "payment_due" && (
                    <p className="text-[11px] text-muted-foreground">{t("Also sent on the due date. Set 0 to skip a step. Stops once the payment is made or the event is settled.")}</p>
                  )}
                  {def.key === "anniversary" && (
                    <p className="text-[11px] text-muted-foreground">{t("Sent on the same date each year as the event, to clients with an email or phone on file.")}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      </div>
      {!canEmail && (
        <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1.5">
          {t("Automatic email needs")} <ProTag />.
        </p>
      )}
    </div>
  );
}
