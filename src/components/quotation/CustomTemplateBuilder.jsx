import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import RichTextEditor from "@/components/common/RichTextEditor";
import ImageLinksEditor from "@/components/quotation/ImageLinksEditor";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  BLOCK_TYPES, CUSTOM_FONTS, HEADING_STYLES, HEADER_LAYOUTS, FOOTER_LAYOUTS, TERMS_SOURCES,
  normalizeCustom, newBlock, newBlockId, blockHeading,
} from "@/constants/customTemplate";
import { CUSTOM_PRESETS, buildPreset } from "@/constants/customTemplatePresets";
import { ChevronUp, ChevronDown, Copy, Trash2, Plus, Save, Layers, Palette, FileText, ChevronRight } from "lucide-react";

const OUTLINE_TYPES = new Set(["text", "list", "stats", "table", "pricing", "milestones", "terms", "bank", "images"]);

function Label({ children }) {
  return <label className="block text-xs font-medium text-muted-foreground mb-1">{children}</label>;
}

function ToggleRow({ label, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
      <span className="text-xs font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

// Saved layouts live in the workspace preferences, so every quotation can start from them.
function readLayouts(workspace) {
  try {
    const raw = workspace?.display_preferences;
    const prefs = !raw ? {} : typeof raw === "object" ? raw : JSON.parse(raw);
    return Array.isArray(prefs.custom_layouts) ? prefs.custom_layouts : [];
  } catch { return []; }
}

// ---- one block's editor ----
function BlockFields({ block, set, readOnly }) {
  const t = useT();
  const ro = readOnly;
  const heading = (hint) => (
    <div><Label>{t("Heading")}</Label><Input value={block.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} disabled={ro} placeholder={hint || ""} /></div>
  );

  switch (block.type) {
    case "cover":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><Label>{t("Title")}</Label><Input value={block.title || ""} onChange={(e) => set({ title: e.target.value })} disabled={ro} /></div>
            <div><Label>{t("Line above the client name")}</Label><Input value={block.forLabel || ""} onChange={(e) => set({ forLabel: e.target.value })} disabled={ro} /></div>
          </div>
          <div><Label>{t("Subtitle")}</Label><Input value={block.subtitle || ""} onChange={(e) => set({ subtitle: e.target.value })} disabled={ro} placeholder={t("e.g. ARCHITECTURE & INTERIOR DESIGN")} /></div>
          <div><Label>{t("Client location (leave blank to use the client's city)")}</Label><Input value={block.location || ""} onChange={(e) => set({ location: e.target.value })} disabled={ro} /></div>
          <div><Label>{t("Lines at the bottom of the cover (one per line)")}</Label><Textarea value={block.tags || ""} onChange={(e) => set({ tags: e.target.value })} disabled={ro} rows={2} placeholder={t("ARCHITECTURE • INTERIOR DESIGN")} /></div>
          <ToggleRow label={t("Show the outline (list of sections) on the cover")} checked={block.showOutline !== false} onChange={(v) => set({ showOutline: v })} disabled={ro} />
          <p className="text-[11px] text-muted-foreground">{t("The cover is only used when it is the first block. Client name, date and the business logo are filled in automatically.")}</p>
        </div>
      );
    case "details":
      return (<div className="space-y-2">{heading(t("Optional"))}<p className="text-[11px] text-muted-foreground">{t("Shows who the quotation is prepared for, with its number, date and validity.")}</p></div>);
    case "text":
      return (
        <div className="space-y-2">
          {heading(t("Optional"))}
          <div><Label>{t("Text")}</Label><RichTextEditor value={block.body || ""} onChange={(v) => set({ body: v })} readOnly={ro} minHeight={120} /></div>
          <p className="text-[11px] text-muted-foreground">{t("You can type {{client}}, {{business}}, {{date}}, {{number}} or {{project}} and they are filled in.")}</p>
        </div>
      );
    case "list":
      return (
        <div className="space-y-2">
          {heading()}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><Label>{t("Marker")}</Label>
              <Select value={block.style || "check"} onChange={(e) => set({ style: e.target.value })} disabled={ro} className="w-full">
                <option value="check">{t("Tick")}</option><option value="bullet">{t("Bullet")}</option><option value="number">{t("Numbers")}</option>
              </Select>
            </div>
            <div className="self-end"><ToggleRow label={t("Bold the words before a colon")} checked={!!block.boldLead} onChange={(v) => set({ boldLead: v })} disabled={ro} /></div>
          </div>
          <div><Label>{t("Points (one per line)")}</Label><Textarea value={block.items || ""} onChange={(e) => set({ items: e.target.value })} disabled={ro} rows={7} /></div>
          <p className="text-[11px] text-muted-foreground">{t("Start a line with # to make it a sub-heading (e.g. # Ground Floor).")}</p>
        </div>
      );
    case "stats": {
      const rows = block.rows || [];
      const setRow = (i, patch) => set({ rows: rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
      return (
        <div className="space-y-2">
          {heading()}
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={r.label || ""} onChange={(e) => setRow(i, { label: e.target.value })} disabled={ro} placeholder={t("Label")} className="flex-1 min-w-0" />
              <Input value={r.value || ""} onChange={(e) => setRow(i, { value: e.target.value })} disabled={ro} placeholder={t("Value, e.g. 1200 sqft")} className="flex-1 min-w-0" />
              <Input value={r.note || ""} onChange={(e) => setRow(i, { note: e.target.value })} disabled={ro} placeholder={t("Note (optional)")} className="flex-1 min-w-0" />
              {!ro && <Button size="sm" variant="ghost" onClick={() => set({ rows: rows.filter((_, idx) => idx !== i) })} className="shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>}
            </div>
          ))}
          {!ro && <Button size="sm" variant="outline" onClick={() => set({ rows: [...rows, { label: "", value: "", note: "" }] })}><Plus className="w-3.5 h-3.5" /> {t("Add row")}</Button>}
        </div>
      );
    }
    case "images":
      return (
        <div className="space-y-2">
          {heading(t("Optional"))}
          <ImageLinksEditor images={block.images} onChange={(images) => set({ images })} readOnly={ro} />
        </div>
      );
    case "table": {
      const cols = block.columns || [];
      const rows = block.rows || [];
      const setCol = (i, v) => set({ columns: cols.map((c, idx) => (idx === i ? v : c)) });
      const setCell = (r, c, v) => set({ rows: rows.map((row, ri) => (ri === r ? cols.map((_, ci) => (ci === c ? v : (row || [])[ci] || "")) : row)) });
      return (
        <div className="space-y-2">
          {heading()}
          <div>
            <Label>{t("Columns")}</Label>
            <div className="flex gap-2 flex-wrap">
              {cols.map((c, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input value={c} onChange={(e) => setCol(i, e.target.value)} disabled={ro} className="w-36" />
                  {!ro && cols.length > 1 && <Button size="sm" variant="ghost" onClick={() => set({ columns: cols.filter((_, idx) => idx !== i), rows: rows.map((r) => (r || []).filter((_, idx) => idx !== i)) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
                </div>
              ))}
              {!ro && cols.length < 5 && <Button size="sm" variant="outline" onClick={() => set({ columns: [...cols, ""], rows: rows.map((r) => [...(r || []), ""]) })}><Plus className="w-3.5 h-3.5" /> {t("Column")}</Button>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("Rows")}</Label>
            {rows.map((row, r) => (
              <div key={r} className="flex gap-2 items-start">
                {cols.map((_, c) => (
                  <Textarea key={c} value={(row || [])[c] || ""} onChange={(e) => setCell(r, c, e.target.value)} disabled={ro} rows={2} className="flex-1 min-w-0" placeholder={cols[c] || ""} />
                ))}
                {!ro && <Button size="sm" variant="ghost" onClick={() => set({ rows: rows.filter((_, idx) => idx !== r) })} className="shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>}
              </div>
            ))}
            {!ro && <Button size="sm" variant="outline" onClick={() => set({ rows: [...rows, cols.map(() => "")] })}><Plus className="w-3.5 h-3.5" /> {t("Add row")}</Button>}
          </div>
        </div>
      );
    }
    case "callout":
      return (
        <div className="space-y-2">
          <div><Label>{t("Text")}</Label><Textarea value={block.text || ""} onChange={(e) => set({ text: e.target.value })} disabled={ro} rows={3} /></div>
          <div><Label>{t("Style")}</Label>
            <Select value={block.style || "quote"} onChange={(e) => set({ style: e.target.value })} disabled={ro} className="w-full">
              <option value="quote">{t("Centred quote")}</option><option value="box">{t("Highlighted box")}</option>
            </Select>
          </div>
        </div>
      );
    case "pricing":
      return (
        <div className="space-y-2">
          {heading()}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ToggleRow label={t("Show the items")} checked={block.showItems !== false} onChange={(v) => set({ showItems: v })} disabled={ro} />
            <ToggleRow label={t("Show subtotal, GST and total")} checked={block.showTotals !== false} onChange={(v) => set({ showTotals: v })} disabled={ro} />
          </div>
          <p className="text-[11px] text-muted-foreground">{t("Items, prices and totals come from this quotation. They hide if “Show pricing” is switched off.")}</p>
        </div>
      );
    case "milestones":
      return (<div className="space-y-2">{heading()}<p className="text-[11px] text-muted-foreground">{t("Shows this quotation's payment milestones.")}</p></div>);
    case "terms":
      return (
        <div className="space-y-2">
          <div><Label>{t("What to show")}</Label>
            <Select value={block.source || "terms"} onChange={(e) => set({ source: e.target.value, heading: TERMS_SOURCES[e.target.value]?.heading || block.heading })} disabled={ro} className="w-full">
              {Object.entries(TERMS_SOURCES).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
            </Select>
          </div>
          {heading()}
          <p className="text-[11px] text-muted-foreground">{t("The text comes from this quotation's own fields and follows their “Show in PDF” switch.")}</p>
        </div>
      );
    case "bank":
      return (<div className="space-y-2">{heading()}<p className="text-[11px] text-muted-foreground">{t("Shows this quotation's bank details.")}</p></div>);
    case "social":
      return (<p className="text-[11px] text-muted-foreground">{t("Shows this quotation's social links as icons.")}</p>);
    case "signoff":
      return (
        <div className="space-y-2">
          <div><Label>{t("Closing text")}</Label><Textarea value={block.text || ""} onChange={(e) => set({ text: e.target.value })} disabled={ro} rows={3} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div><Label>{t("Regards line")}</Label><Input value={block.regards || ""} onChange={(e) => set({ regards: e.target.value })} disabled={ro} /></div>
            <div><Label>{t("Name")}</Label><Input value={block.name || ""} onChange={(e) => set({ name: e.target.value })} disabled={ro} placeholder={t("Business name")} /></div>
            <div><Label>{t("Role")}</Label><Input value={block.role || ""} onChange={(e) => set({ role: e.target.value })} disabled={ro} placeholder={t("e.g. Principal Architect")} /></div>
          </div>
        </div>
      );
    case "pagebreak":
      return <p className="text-[11px] text-muted-foreground">{t("Everything after this block starts on a new page.")}</p>;
    default:
      return null;
  }
}

export default function CustomTemplateBuilder({ templateConfig, onChange, readOnly }) {
  const t = useT();
  const { toast } = useToast();
  const { workspace, setWorkspace } = useWorkspace();
  const custom = normalizeCustom(templateConfig?.custom);
  const { theme, letterhead, blocks } = custom;

  const [open, setOpen] = useState({}); // block id -> expanded
  const [addType, setAddType] = useState("text");
  const [startFrom, setStartFrom] = useState("");
  const [layoutName, setLayoutName] = useState("");
  const [saving, setSaving] = useState(false);
  const layouts = readLayouts(workspace);

  const commit = (next) => onChange({ ...templateConfig, custom: next });
  const setTheme = (patch) => commit({ ...custom, theme: { ...theme, ...patch } });
  const setLetterhead = (patch) => commit({ ...custom, letterhead: { ...letterhead, ...patch } });
  const setBlocks = (next) => commit({ ...custom, blocks: next });
  const setBlock = (id, patch) => setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };
  const duplicate = (i) => {
    const copy = { ...JSON.parse(JSON.stringify(blocks[i])), id: newBlockId() };
    const next = [...blocks];
    next.splice(i + 1, 0, copy);
    setBlocks(next);
    setOpen((o) => ({ ...o, [copy.id]: true }));
  };
  const remove = (i) => setBlocks(blocks.filter((_, idx) => idx !== i));
  const add = () => {
    const b = newBlock(addType);
    if (!b) return;
    setBlocks([...blocks, b]);
    setOpen((o) => ({ ...o, [b.id]: true }));
  };

  const applyStart = () => {
    if (!startFrom) return;
    let next = null;
    if (startFrom.startsWith("saved:")) {
      const found = layouts.find((l) => l.id === startFrom.slice(6));
      next = found ? normalizeCustom(JSON.parse(JSON.stringify(found.custom))) : null;
      // saved blocks keep their ids; give copies fresh ones so two quotations never share them
      if (next) next.blocks = next.blocks.map((b) => ({ ...b, id: newBlockId() }));
    } else {
      next = buildPreset(startFrom);
    }
    if (!next) return;
    if (blocks.length && !window.confirm(t("Replace the current layout? Your current blocks will be lost."))) return;
    commit(next);
    setOpen({});
    setStartFrom("");
  };

  const saveLayout = async () => {
    const name = layoutName.trim();
    if (!name) { toast({ title: t("Give the layout a name"), variant: "destructive" }); return; }
    setSaving(true);
    try {
      const raw = workspace?.display_preferences;
      const existing = !raw ? {} : typeof raw === "object" ? raw : JSON.parse(raw);
      const list = Array.isArray(existing.custom_layouts) ? existing.custom_layouts : [];
      const entry = { id: newBlockId(), name, custom };
      const updated = { ...existing, custom_layouts: [...list.filter((l) => l.name !== name), entry] };
      await base44.entities.Workspace.update(workspace.id, { display_preferences: JSON.stringify(updated) });
      setWorkspace((w) => ({ ...w, display_preferences: JSON.stringify(updated) }));
      setLayoutName("");
      toast({ title: t("Layout saved"), description: t("You can start any quotation from it.") });
    } catch (e) {
      toast({ title: t("Could not save the layout"), description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteLayout = async (id) => {
    if (!window.confirm(t("Delete this saved layout? Quotations already using it are not changed."))) return;
    try {
      const raw = workspace?.display_preferences;
      const existing = !raw ? {} : typeof raw === "object" ? raw : JSON.parse(raw);
      const updated = { ...existing, custom_layouts: (existing.custom_layouts || []).filter((l) => l.id !== id) };
      await base44.entities.Workspace.update(workspace.id, { display_preferences: JSON.stringify(updated) });
      setWorkspace((w) => ({ ...w, display_preferences: JSON.stringify(updated) }));
    } catch (e) {
      toast({ title: t("Could not delete"), description: e?.message, variant: "destructive" });
    }
  };

  const groups = {};
  Object.entries(BLOCK_TYPES).forEach(([type, m]) => { (groups[m.group] ||= []).push([type, m]); });

  return (
    <div className="space-y-5">
      {/* Start from */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5"><Layers className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs font-semibold">{t("Start from")}</span></div>
        <div className="flex gap-2">
          <Select value={startFrom} onChange={(e) => setStartFrom(e.target.value)} disabled={readOnly} className="flex-1 min-w-0">
            <option value="">{t("Choose a starting layout…")}</option>
            <optgroup label={t("Ready-made")}>
              {CUSTOM_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
            {layouts.length > 0 && (
              <optgroup label={t("My saved layouts")}>
                {layouts.map((l) => <option key={l.id} value={`saved:${l.id}`}>{l.name}</option>)}
              </optgroup>
            )}
          </Select>
          <Button size="sm" variant="outline" onClick={applyStart} disabled={readOnly || !startFrom} className="shrink-0">{t("Use")}</Button>
        </div>
        {startFrom && !startFrom.startsWith("saved:") && (
          <p className="text-[11px] text-muted-foreground mt-1">{CUSTOM_PRESETS.find((p) => p.id === startFrom)?.description}</p>
        )}
        {layouts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {layouts.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1 text-[11px] bg-muted rounded-full pl-2.5 pr-1 py-0.5">
                {l.name}
                {!readOnly && <button type="button" onClick={() => deleteLayout(l.id)} className="p-0.5 rounded-full hover:bg-background" aria-label={t("Delete layout")}><Trash2 className="w-3 h-3" /></button>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Theme */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-1.5 mb-2"><Palette className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs font-semibold">{t("Look")}</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div><Label>{t("Colour")}</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(theme.accent) ? theme.accent : "#b85a4e"} onChange={(e) => setTheme({ accent: e.target.value })} disabled={readOnly} className="h-9 w-12 rounded border border-border bg-card p-0.5 cursor-pointer" />
              <Input value={theme.accent} onChange={(e) => setTheme({ accent: e.target.value })} disabled={readOnly} className="flex-1 min-w-0 font-mono" />
            </div>
          </div>
          <div><Label>{t("Font")}</Label>
            <Select value={theme.font} onChange={(e) => setTheme({ font: e.target.value })} disabled={readOnly} className="w-full">
              {Object.entries(CUSTOM_FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </Select>
          </div>
          <div><Label>{t("Headings")}</Label>
            <Select value={theme.headingStyle} onChange={(e) => setTheme({ headingStyle: e.target.value })} disabled={readOnly} className="w-full">
              {Object.entries(HEADING_STYLES).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
            </Select>
          </div>
        </div>
      </div>

      {/* Letterhead */}
      <div className="pt-4 border-t border-border space-y-2">
        <div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs font-semibold">{t("Letterhead & footer")}</span></div>
        <p className="text-[11px] text-muted-foreground">{t("Logo, name, tagline, phone, email, address and website come from your business profile. The header and footer repeat on every page except the cover.")}</p>
        <ToggleRow label={t("Show letterhead header and footer")} checked={letterhead.enabled} onChange={(v) => setLetterhead({ enabled: v })} disabled={readOnly} />
        {letterhead.enabled && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><Label>{t("Header design")}</Label>
                <Select value={letterhead.headerLayout} onChange={(e) => setLetterhead({ headerLayout: e.target.value })} disabled={readOnly} className="w-full">
                  {Object.entries(HEADER_LAYOUTS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                </Select>
              </div>
              <div><Label>{t("Footer design")}</Label>
                <Select value={letterhead.footerLayout} onChange={(e) => setLetterhead({ footerLayout: e.target.value })} disabled={readOnly} className="w-full">
                  {Object.entries(FOOTER_LAYOUTS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("Letterhead details (one per line)")}</Label>
              <Textarea value={(letterhead.extra || []).join("\n")} onChange={(e) => setLetterhead({ extra: e.target.value.split("\n") })} disabled={readOnly} rows={3} placeholder={t("Partner names, a second phone number, a registration number…")} />
              <p className="text-[11px] text-muted-foreground mt-1">{t("Extra lines that aren't in your profile. They appear in the footer (or in the header when there is no footer).")}</p>
            </div>
            {letterhead.footerLayout !== "none" && (
              <div><Label>{t("Footer tagline (optional)")}</Label><Input value={letterhead.footerTagline || ""} onChange={(e) => setLetterhead({ footerTagline: e.target.value })} disabled={readOnly} placeholder={t("e.g. Architecture | Interior | Planning | Green Consultancy")} /></div>
            )}
          </>
        )}
      </div>

      {/* Blocks */}
      <div className="pt-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{t("Blocks")} ({blocks.length})</span>
          <span className="text-[11px] text-muted-foreground">{t("Shown top to bottom in the PDF")}</span>
        </div>
        {blocks.length === 0 && <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">{t("No blocks yet — pick a starting layout above, or add your first block below.")}</p>}
        {blocks.map((b, i) => {
          const meta = BLOCK_TYPES[b.type];
          const isOpen = !!open[b.id];
          const title = blockHeading(b);
          return (
            <div key={b.id} className="border border-border rounded-lg bg-card">
              <div className="flex items-center gap-1.5 px-2.5 py-2">
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [b.id]: !isOpen }))} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  <span className="text-xs font-semibold shrink-0">{t(meta.label)}</span>
                  {title && <span className="text-xs text-muted-foreground truncate">— {title}</span>}
                </button>
                {!readOnly && (
                  <div className="flex items-center shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("Move up")}><ChevronUp className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label={t("Move down")}><ChevronDown className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicate(i)} aria-label={t("Duplicate")}><Copy className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(i)} aria-label={t("Delete block")}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
              {isOpen && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border">
                  <BlockFields block={b} set={(patch) => setBlock(b.id, patch)} readOnly={readOnly} />
                  {OUTLINE_TYPES.has(b.type) && blocks[0]?.type === "cover" && (
                    <ToggleRow label={t("List this on the cover's outline")} checked={b.outline !== false} onChange={(v) => setBlock(b.id, { outline: v })} disabled={readOnly} />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!readOnly && (
          <div className="flex gap-2 pt-1">
            <Select value={addType} onChange={(e) => setAddType(e.target.value)} className="flex-1 min-w-0">
              {Object.entries(groups).map(([g, list]) => (
                <optgroup key={g} label={t(g)}>{list.map(([type, m]) => <option key={type} value={type}>{t(m.label)}</option>)}</optgroup>
              ))}
            </Select>
            <Button size="sm" onClick={add} className="shrink-0"><Plus className="w-3.5 h-3.5" /> {t("Add block")}</Button>
          </div>
        )}
      </div>

      {/* Save as my layout */}
      {!readOnly && (
        <div className="pt-4 border-t border-border">
          <Label>{t("Save this layout for other quotations")}</Label>
          <div className="flex gap-2">
            <Input value={layoutName} onChange={(e) => setLayoutName(e.target.value)} placeholder={t("Layout name, e.g. Residential proposal")} className="flex-1 min-w-0" />
            <Button size="sm" variant="outline" onClick={saveLayout} disabled={saving || !layoutName.trim() || blocks.length === 0} className="shrink-0"><Save className="w-3.5 h-3.5" /> {t("Save")}</Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{t("Saves the blocks, look and letterhead — it keeps your wording, but never the quotation's own prices or client details.")}</p>
        </div>
      )}
    </div>
  );
}
