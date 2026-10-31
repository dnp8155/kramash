import { useMemo, useRef, useState } from "react";
import { Plus, Save, RotateCcw, Trash2, ChevronDown, Mail, MessageCircle } from "lucide-react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_VARIABLES, getTemplates, renderTemplate, sampleValues,
  withTemplateSaved, withTemplateRemoved, saveMessageTemplates,
} from "@/lib/messageTemplates";

const fieldClass =
  "w-full bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-base md:text-sm px-3 py-2 " +
  "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40";

function TemplateEditor({ tpl, isNew, samples, onSave, onRemove, onCancel, saving }) {
  const t = useT();
  const bodyRef = useRef(null);
  const [name, setName] = useState(tpl.name);
  const [subject, setSubject] = useState(tpl.subject || "");
  const [body, setBody] = useState(tpl.body || "");
  const preview = useMemo(() => ({ s: renderTemplate(subject, samples).text, b: renderTemplate(body, samples).text }), [subject, body, samples]);

  const insert = (key) => {
    const el = bodyRef.current;
    const token = `{${key}}`;
    if (!el) { setBody((b) => b + token); return; }
    const s = el.selectionStart ?? body.length;
    const e = el.selectionEnd ?? body.length;
    setBody(body.slice(0, s) + token + body.slice(e));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
  };

  return (
    <div className="space-y-3 pt-3">
      {!tpl.isDefault && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">{t("Template name")}</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Album ready")} />
        </div>
      )}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">{t("Email subject")}</div>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1">{t("Message")}</div>
        <textarea ref={bodyRef} rows={7} className={fieldClass} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {TEMPLATE_VARIABLES.map((v) => (
            <button
              key={v.key} type="button" title={v.label} onClick={() => insert(v.key)}
              className="px-2 py-0.5 rounded-full border border-border bg-card text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40"
            >
              {`{${v.key}}`}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[15px] border border-border bg-muted/30 p-3">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">{t("Preview with sample details")}</div>
        {subject && <p className="text-sm font-semibold text-foreground break-words mb-1">{preview.s}</p>}
        <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{preview.b}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={saving || !body.trim() || (!tpl.isDefault && !name.trim())} onClick={() => onSave({ id: tpl.id, name: tpl.isDefault ? tpl.name : name.trim(), subject, body })}>
          <Save className="w-3.5 h-3.5" /> {t("Save")}
        </Button>
        {isNew && <Button size="sm" variant="outline" onClick={onCancel}>{t("Cancel")}</Button>}
        {!isNew && (tpl.edited || !tpl.isDefault) && (
          <Button size="sm" variant="outline" disabled={saving} onClick={() => onRemove(tpl)}>
            {tpl.isDefault ? <><RotateCcw className="w-3.5 h-3.5" /> {t("Reset to default")}</> : <><Trash2 className="w-3.5 h-3.5" /> {t("Delete")}</>}
          </Button>
        )}
      </div>
    </div>
  );
}

// Preferences → Business → Connections → Templates. The same templates feed the Send message dialog,
// for both WhatsApp (message only) and Gmail (subject + message).
export default function MessageTemplatesManager() {
  const t = useT();
  const { toast } = useToast();
  const { workspace, setWorkspace } = useWorkspace();
  const term = useBusinessTerminology();
  // Only the studio's own templates are managed here; the built-in ones are always offered in Send message.
  const templates = useMemo(() => getTemplates(workspace, workspace?.business_category).filter((x) => !x.isDefault), [workspace]);
  const samples = useMemo(() => sampleValues({ workspace, term }), [workspace, term]);
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState(null); // a new template being written
  const [saving, setSaving] = useState(false);

  const startDraft = (seed = {}) => { setOpenId(null); setDraft({ id: `my_${Date.now().toString(36)}`, name: "", subject: "", body: "Hi {name},\n\n", isDefault: false, ...seed }); };
  const example = useMemo(() => ({
    name: "Album ready",
    subject: "Your {workItem} album is ready",
    body: "Hi {name},\n\nGood news! Your album for \"{event}\" is ready. Let us know a good time to hand it over.\n\n{studio}",
  }), []);
  const exampleOut = useMemo(() => renderTemplate(example.body, samples).text, [example, samples]);

  const run = async (map, okTitle) => {
    setSaving(true);
    try {
      await saveMessageTemplates(workspace, setWorkspace, map);
      toast({ title: okTitle });
      return true;
    } catch (e) {
      toast({ title: t("Failed to save template"), description: e?.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = async (tpl) => {
    if (await run(withTemplateSaved(workspace, tpl), t("Template saved"))) { setDraft(null); setOpenId(tpl.id); }
  };
  const remove = async (tpl) => {
    if (await run(withTemplateRemoved(workspace, tpl.id), tpl.isDefault ? t("Reset to default") : t("Template deleted"))) setOpenId(null);
  };

  return (
    <div className="bg-card border border-border rounded-[15px] p-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("Message templates")}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed flex items-center gap-1 flex-wrap">
            {t("Used for")} <MessageCircle className="w-3 h-3" /> WhatsApp {t("and")} <Mail className="w-3 h-3" /> Gmail. {t("Use {name}, {amount} and other details; they are filled in when you send.")}
          </p>
        </div>
        {!draft && (
          <Button size="sm" variant="outline" onClick={() => startDraft()}>
            <Plus className="w-3.5 h-3.5" /> {t("New")}
          </Button>
        )}
      </div>

      <div className="rounded-[15px] border border-dashed border-border bg-muted/30 p-3 mt-3 mb-1">
        <div className="text-xs font-semibold text-foreground mb-1">{t("How it works")}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("Write your message and put details in curly brackets. When you send, each one is replaced with the real detail from that client and event.")}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 mt-2">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{t("You write")}</div>
            <p className="text-xs text-foreground whitespace-pre-wrap break-words rounded-lg bg-card border border-border p-2">{example.body}</p>
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{t("Client receives")}</div>
            <p className="text-xs text-foreground whitespace-pre-wrap break-words rounded-lg bg-card border border-border p-2">{exampleOut}</p>
          </div>
        </div>
        {!draft && <Button size="sm" variant="outline" className="mt-2" onClick={() => startDraft(example)}>{t("Use this example")}</Button>}
      </div>

      <ul className="divide-y divide-border">
        {draft && (
          <li className="py-3">
            <div className="text-sm font-medium text-foreground">{t("New template")}</div>
            <TemplateEditor tpl={draft} isNew samples={samples} saving={saving} onSave={save} onCancel={() => setDraft(null)} />
          </li>
        )}
        {!draft && templates.length === 0 && (
          <li className="py-4 text-sm text-muted-foreground">{t("No custom templates yet. Tap New to write one; it will show up in Send message on every event.")}</li>
        )}
        {templates.map((tpl) => {
          const open = openId === tpl.id;
          return (
            <li key={tpl.id} className="py-1">
              <button type="button" onClick={() => setOpenId(open ? null : tpl.id)} className="w-full flex items-center gap-2 py-2 text-left">
                <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">{tpl.name}</span>
                {tpl.edited && <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t("Edited")}</span>}
                {!tpl.isDefault && <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t("Yours")}</span>}
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
              </button>
              {open && <div className="pb-3"><TemplateEditor key={tpl.id + (tpl.edited ? "e" : "")} tpl={tpl} samples={samples} saving={saving} onSave={save} onRemove={remove} /></div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
