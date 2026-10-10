import { useState } from "react";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";
import { checkTemplateImage, MAX_TEMPLATE_IMAGES } from "@/lib/templateImages";
import { Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// Up to 3 pictures from web links, each with an optional caption and a Test button. Only the link is saved.
export default function ImageLinksEditor({ images, onChange, readOnly }) {
  const t = useT();
  const list = Array.isArray(images) ? images : [];
  const [checks, setChecks] = useState({}); // index -> { busy } | { ok, via } | { ok:false, error }

  const update = (i, patch) => {
    onChange(list.map((im, idx) => (idx === i ? { ...im, ...patch } : im)));
    if (patch.url !== undefined) setChecks((c) => ({ ...c, [i]: undefined }));
  };
  const remove = (i) => { onChange(list.filter((_, idx) => idx !== i)); setChecks({}); };
  const test = async (i) => {
    setChecks((c) => ({ ...c, [i]: { busy: true } }));
    const r = await checkTemplateImage(list[i]?.url);
    setChecks((c) => ({ ...c, [i]: r }));
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        {t("Paste a picture's web link — nothing is uploaded or stored by us. Google Drive and Dropbox work too: share the picture as \"anyone with the link\" and paste that link.")}
      </p>
      <div className="space-y-2">
        {list.map((im, i) => {
          const c = checks[i];
          return (
            <div key={i} className="bg-muted/50 rounded-md p-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <Input value={im.url || ""} onChange={(e) => update(i, { url: e.target.value })} disabled={readOnly} placeholder={t("https://… link to the picture")} className="flex-1 min-w-0" />
                <Button size="sm" variant="outline" onClick={() => test(i)} disabled={readOnly || !String(im.url || "").trim() || c?.busy} className="shrink-0">
                  {c?.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("Test")}
                </Button>
                {!readOnly && (
                  <Button size="sm" variant="ghost" onClick={() => remove(i)} className="shrink-0" aria-label={t("Remove picture")}><Trash2 className="w-3.5 h-3.5" /></Button>
                )}
              </div>
              <Input value={im.caption || ""} onChange={(e) => update(i, { caption: e.target.value })} disabled={readOnly} placeholder={t("Caption (optional)")} />
              {c && !c.busy && (c.ok
                ? <p className="text-[11px] text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t("Works — this picture will appear in the PDF.")}</p>
                : <p className="text-[11px] text-destructive flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {c.error}</p>)}
            </div>
          );
        })}
      </div>
      {!readOnly && list.length < MAX_TEMPLATE_IMAGES && (
        <Button size="sm" variant="outline" className="mt-2" onClick={() => onChange([...list, { url: "", caption: "" }])}>
          <Plus className="w-3.5 h-3.5" /> {t("Add picture")}
        </Button>
      )}
    </div>
  );
}
