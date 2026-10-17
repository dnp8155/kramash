import { useState, useRef, useEffect } from "react";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";
import { useToast } from "@/components/ui/use-toast";
import { checkTemplateImage, MAX_TEMPLATE_IMAGES } from "@/lib/templateImages";
import { saveLocalImage, getLocalImageBlob } from "@/lib/localImages";
import { Trash2, CheckCircle2, AlertCircle, Loader2, ImagePlus, Link2, ImageOff, Info } from "lucide-react";

// Small preview of a picture kept on this device; shows "missing" when it was chosen on another device.
function LocalThumb({ id, onMissing }) {
  const [src, setSrc] = useState("");
  const [state, setState] = useState("loading"); // loading | ok | missing
  useEffect(() => {
    let url = "";
    let live = true;
    setState("loading");
    getLocalImageBlob(id).then((blob) => {
      if (!live) return;
      if (!blob) { setState("missing"); onMissing?.(); return; }
      url = URL.createObjectURL(blob);
      setSrc(url);
      setState("ok");
    });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [id]);  
  return (
    <div className="w-12 h-12 rounded-md bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
      {state === "ok" ? <img src={src} alt="" className="w-full h-full object-cover" /> : state === "missing" ? <ImageOff className="w-4 h-4 text-muted-foreground" /> : <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

// Up to 3 pictures, each from this device or from a web link, with an optional caption. Pictures chosen on the
// device stay on it (nothing is uploaded or saved by us); only a short reference is stored with the quotation.
export default function ImageLinksEditor({ images, onChange, readOnly }) {
  const t = useT();
  const { toast } = useToast();
  const list = Array.isArray(images) ? images : [];
  const [checks, setChecks] = useState({}); // index -> { busy } | { ok, via } | { ok:false, error }
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState({}); // index -> true when a device picture isn't on this device
  const addInput = useRef(null);
  const replaceInput = useRef(null);
  const replaceIndex = useRef(-1);

  const update = (i, patch) => {
    onChange(list.map((im, idx) => (idx === i ? { ...im, ...patch } : im)));
    if (patch.url !== undefined) setChecks((c) => ({ ...c, [i]: undefined }));
  };
  const remove = (i) => { onChange(list.filter((_, idx) => idx !== i)); setChecks({}); setMissing({}); };
  const test = async (i) => {
    setChecks((c) => ({ ...c, [i]: { busy: true } }));
    const r = await checkTemplateImage(list[i]?.url);
    setChecks((c) => ({ ...c, [i]: r }));
  };

  // Shrinks and keeps each chosen file on this device; returns the new entries (errors are toasted).
  const importFiles = async (files) => {
    const out = [];
    setBusy(true);
    for (const file of files) {
      try {
        const { id, name } = await saveLocalImage(file);
        out.push({ url: "", local: id, localName: name, caption: "" });
      } catch (e) {
        toast({ title: t("Couldn't add picture"), description: t(e?.message || "That file couldn't be used."), variant: "destructive" });
      }
    }
    setBusy(false);
    return out;
  };

  const onAddFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_TEMPLATE_IMAGES - list.length);
    e.target.value = "";
    if (!files.length) return;
    const added = await importFiles(files);
    if (added.length) onChange([...list, ...added]);
  };

  const onReplaceFile = async (e) => {
    const file = (e.target.files || [])[0];
    const i = replaceIndex.current;
    e.target.value = "";
    if (!file || i < 0) return;
    const [added] = await importFiles([file]);
    if (added) {
      onChange(list.map((im, idx) => (idx === i ? { ...added, caption: im.caption || "" } : im)));
      setMissing((m) => ({ ...m, [i]: false }));
    }
  };

  return (
    <div>
      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 mb-2">
        <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/80 leading-relaxed">
          <span className="font-semibold">{t("Pictures are in beta.")}</span>{" "}
          {t("Pictures from your device stay on this device and are never uploaded, so they won't appear if you make the PDF on another device.")}
        </p>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        {t("Pick from this device, or paste a web link (Google Drive and Dropbox share links work too).")}
      </p>
      <div className="space-y-2">
        {list.map((im, i) => {
          if (im.local) {
            return (
              <div key={i} className="bg-muted/50 rounded-md p-2.5 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <LocalThumb id={im.local} onMissing={() => setMissing((m) => ({ ...m, [i]: true }))} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">{im.localName || t("Picture")}</div>
                    {missing[i]
                      ? <div className="text-[11px] text-warning flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0" /> {t("Not on this device — choose it again")}</div>
                      : <div className="text-[11px] text-muted-foreground">{t("On this device")}</div>}
                  </div>
                  {!readOnly && missing[i] && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => { replaceIndex.current = i; replaceInput.current?.click(); }} className="shrink-0">
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("Choose")}
                    </Button>
                  )}
                  {!readOnly && (
                    <Button size="sm" variant="ghost" onClick={() => remove(i)} className="shrink-0" aria-label={t("Remove picture")}><Trash2 className="w-3.5 h-3.5" /></Button>
                  )}
                </div>
                <Input value={im.caption || ""} onChange={(e) => update(i, { caption: e.target.value })} disabled={readOnly} placeholder={t("Caption (optional)")} />
              </div>
            );
          }
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
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => addInput.current?.click()}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />} {t("From device")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onChange([...list, { url: "", caption: "" }])}>
            <Link2 className="w-3.5 h-3.5" /> {t("Paste link")}
          </Button>
        </div>
      )}
      <input ref={addInput} type="file" accept="image/*" multiple className="hidden" onChange={onAddFiles} />
      <input ref={replaceInput} type="file" accept="image/*" className="hidden" onChange={onReplaceFile} />
    </div>
  );
}
