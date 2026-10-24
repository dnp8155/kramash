import { useState, useEffect, useRef } from "react";
import UpgradeButton from "@/components/common/UpgradeButton";
import ProTag from "@/components/common/ProTag";
import { Link } from "react-router-dom";
import { Globe, Building2, Copy, ExternalLink, Check, Lock, Loader2, X, Save, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, ChevronDown, Share2, MessageSquare, Play, Briefcase, Quote, Link2, AlignLeft, HelpCircle, MapPin, Instagram, Youtube, Twitter, Image as ImageIcon, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/common/PageHeader";
import ActionDock from "@/components/common/ActionDock";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Toggle from "@/components/common/Toggle";
import Select from "@/components/common/Select";
import { useFeatureGate } from "@/components/common/ProGate";
import { usePlan } from "@/hooks/usePlan";
import { EXTRA_SOCIAL_ICON_OPTIONS } from "@/lib/socialIcons";
import { firstSocialLinkError, validateSocialUrl } from "@/lib/validation";
import WordCounterTextarea from "@/components/common/WordCounterTextarea";
import { cn } from "@/lib/utils";
import FadeImg from "@/components/common/FadeImg";
import {
  SECTION_TYPES, SINGLE_SECTION_TYPES, MAX_SECTIONS, maxItemsFor, itemIsFilled, newSection, normalizeSections, firstSectionError, parseVideoUrl, parseMapUrl, safeUrl,
} from "@/lib/publicSections";

const SLUG_MIN = 3;
// While typing: lowercase, letters/numbers/hyphens only (a trailing hyphen is allowed mid-typing).
const sanitizeSlugInput = (text) => (text || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-/, "").slice(0, 40);
const normalizeSlug = (text) => sanitizeSlugInput(text).replace(/-$/, "");
const suggestSlug = (name) => normalizeSlug((name || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim());

function safeParseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value) || fallback; } catch { return fallback; }
}

function Field({ label, children, className }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function VisibilityToggle({ label, value, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {value !== undefined && (value ? <div className="text-xs text-muted-foreground truncate">{value}</div> : <div className="text-xs text-warning">Not set</div>)}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

// Map row: a full Google Maps link (or the <iframe> code from Share → Embed a map) is drawn as a map; a short
// maps.app.goo.gl link can only be opened, because a browser cannot read where it leads.
function MapItemFields({ item, onChange }) {
  const m = item.url.trim() ? parseMapUrl(item.url) : null;
  return (
    <div className="space-y-2">
      <Input value={item.url} onChange={(e) => onChange({ ...item, url: e.target.value })} placeholder="Paste a Google Maps link" inputMode="url" autoCapitalize="none" spellCheck={false} />
      {item.url.trim() && !m && <p className="text-[11px] text-destructive">Paste a Google Maps link (Share → Copy link).</p>}
      {m && !m.embed && <p className="text-[11px] text-warning">This is a short link, so it will show as an "Open in Google Maps" button. To show the map itself, open the link, copy the full address from the browser bar and paste that here (or use Share → Embed a map).</p>}
      {m?.embed && <p className="text-[11px] text-success">The map will show on your page.</p>}
      <Input value={item.title} onChange={(e) => onChange({ ...item, title: e.target.value })} placeholder="Place name, e.g. Our studio (optional)" maxLength={80} />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Map size</span>
        <div className="inline-flex rounded-full border border-border bg-card p-0.5" role="group" aria-label="Map size">
          {[["small", "Small"], ["big", "Big"]].map(([v, l]) => {
            const on = (item.size === "small" ? "small" : "big") === v;
            return <button key={v} type="button" aria-pressed={on} onClick={() => onChange({ ...item, size: v })} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

// One row of a section: the fields depend on the section type.
function ItemFields({ type, item, onChange }) {
  const f = (k) => (e) => onChange({ ...item, [k]: e.target.value });
  if (type === "videos") {
    const bad = item.url.trim() && !parseVideoUrl(item.url);
    return (
      <div className="space-y-2">
        <Input value={item.url} onChange={f("url")} placeholder="https://youtube.com/watch?v=…" inputMode="url" autoCapitalize="none" spellCheck={false} />
        {bad && <p className="text-[11px] text-destructive">Paste a YouTube or Vimeo link.</p>}
        <Input value={item.title} onChange={f("title")} placeholder="Title (optional)" maxLength={80} />
      </div>
    );
  }
  if (type === "map") return <MapItemFields item={item} onChange={onChange} />;
  if (type === "services") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-2">
          <Input value={item.title} onChange={f("title")} placeholder="Service name" maxLength={80} />
          <Input value={item.price} onChange={f("price")} placeholder="From ₹25,000" maxLength={40} />
        </div>
        <textarea value={item.description} onChange={f("description")} placeholder="Short description (optional)" maxLength={300} rows={2} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none" />
      </div>
    );
  }
  if (type === "testimonials") {
    return (
      <div className="space-y-2">
        <textarea value={item.quote} onChange={f("quote")} placeholder="What the client said" maxLength={400} rows={3} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none" />
        <Input value={item.name} onChange={f("name")} placeholder="Client name (optional)" maxLength={60} />
      </div>
    );
  }
  if (type === "links") {
    const bad = item.url.trim() && !safeUrl(item.url);
    return (
      <div className="space-y-2">
        <Input value={item.title} onChange={f("title")} placeholder="Label, e.g. Price list (PDF)" maxLength={80} />
        <Input value={item.url} onChange={f("url")} placeholder="https://…" inputMode="url" autoCapitalize="none" spellCheck={false} />
        {bad && <p className="text-[11px] text-destructive">That link isn't valid.</p>}
        <Input value={item.note} onChange={f("note")} placeholder="Note (optional)" maxLength={120} />
      </div>
    );
  }
  if (type === "text") {
    return <textarea value={item.body} onChange={f("body")} placeholder="Write anything you want visitors to read" maxLength={1500} rows={5} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 resize-y" />;
  }
  return (
    <div className="space-y-2">
      <Input value={item.q} onChange={f("q")} placeholder="Question" maxLength={140} />
      <textarea value={item.a} onChange={f("a")} placeholder="Answer" maxLength={500} rows={2} className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none" />
    </div>
  );
}

const SECTION_ICONS = { map: MapPin, videos: Play, services: Briefcase, testimonials: Quote, links: Link2, text: AlignLeft, faq: HelpCircle };

function SectionEditor({ section, index, count, onChange, onMove, onRemove }) {
  const def = SECTION_TYPES[section.type];
  // A section that is still empty (just added) opens so you can fill it; saved ones stay folded to cut the scrolling.
  const [open, setOpen] = useState(() => !section.items.some((it) => itemIsFilled(section.type, it)));
  const filled = section.items.filter((it) => itemIsFilled(section.type, it)).length;
  const Icon = SECTION_ICONS[section.type];
  const maxItems = maxItemsFor(section.type);
  const single = section.type === "text" || maxItems === 1;
  const setItem = (i, it) => onChange({ ...section, items: section.items.map((x, idx) => (idx === i ? it : x)) });
  const removeItem = (i) => onChange({ ...section, items: section.items.filter((_, idx) => idx !== i) });
  const addItem = () => section.items.length < maxItems && onChange({ ...section, items: [...section.items, def.blank()] });
  const iconBtn = "w-8 h-8 rounded-full flex items-center justify-center border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0";
  return (
    <Card className={cn("p-4 sm:p-5", !section.visible && "opacity-70")}>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground truncate">{section.title.trim() || def.label}</span>
            <span className="block text-[11px] text-muted-foreground truncate">{def.label} · {filled} of {single ? 1 : maxItems} {(single ? 1 : maxItems) === 1 ? "item" : "items"}{!section.visible ? " · Hidden" : ""}</span>
          </span>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" className={iconBtn} onClick={() => onChange({ ...section, visible: !section.visible })} aria-label={section.visible ? "Hide section" : "Show section"} title={section.visible ? "Visible, tap to hide" : "Hidden, tap to show"}>
            {section.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button type="button" className={iconBtn} onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up"><ArrowUp className="w-4 h-4" /></button>
          <button type="button" className={iconBtn} onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down"><ArrowDown className="w-4 h-4" /></button>
          <button type="button" className={cn(iconBtn, "hover:text-destructive hover:bg-destructive/5")} onClick={onRemove} aria-label="Delete section"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {open && (<>
      <Field label="Section title (shown to visitors)" className="mt-4">
        <Input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} placeholder={def.defaultTitle} maxLength={60} />
      </Field>

      <div className="mt-4 space-y-3">
        {section.items.map((it, i) => (
          <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
            {!single && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground">{section.type === "faq" ? "Question" : "Item"} {i + 1}</span>
                {section.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1" aria-label="Remove item"><X className="w-3 h-3" /> Remove</button>
                )}
              </div>
            )}
            <ItemFields type={section.type} item={it} onChange={(v) => setItem(i, v)} />
          </div>
        ))}
      </div>
      {!single && (
        <button type="button" onClick={addItem} disabled={section.items.length >= maxItems} className="mt-3 text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1 disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> Add {section.type === "faq" ? "question" : "another"}{section.items.length >= maxItems ? ` (max ${maxItems})` : ""}
        </button>
      )}
      </>)}
    </Card>
  );
}

// A section with no filled rows (just added, or emptied before saving) still needs one empty row to type into.
const withOneRow = (sections) => sections.map((s) => (s.items.length ? s : { ...s, items: [SECTION_TYPES[s.type].blank()] }));

function SocialField({ label, value, onChange, placeholder, Icon, platform }) {
  const err = validateSocialUrl(value, platform);
  return (
    <Field label={label}>
      <div className="relative">
        <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="!pl-9" />
      </div>
      {err && <p className="text-[11px] mt-1 text-destructive">{err}</p>}
    </Field>
  );
}

// A titled settings card: icon + heading + one-line help, then the body.
function Panel({ icon: Icon, title, tag, summary, help, action, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-4 sm:p-5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2.5 min-w-0">
          {Icon && <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>}
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">{title}{tag}</span>
            {summary && !open && <span className="block text-xs text-muted-foreground truncate">{summary}</span>}
          </span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-4">
          {(help || action) && (
            <div className="mb-4 flex items-start justify-between gap-3">
              {help ? <p className="text-xs text-muted-foreground leading-relaxed">{help}</p> : <span />}
              {action}
            </div>
          )}
          {children}
        </div>
      )}
    </Card>
  );
}

export default function MyProfile() {
  usePageTitle("My Profile");
  const { workspace, setWorkspace } = useWorkspace();
  const term = useBusinessTerminology();
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slugStatus, setSlugStatus] = useState("idle"); // idle | invalid | checking | available | taken | error
  const { isPro, checkFeature, FeatureGateDialog } = useFeatureGate();
  // The logo is a Pro feature: Free users get the upgrade dialog here and the file picker never opens.
  const pickLogo = () => { if (!checkFeature("quotation_logo_enabled", "Branding Image / Logo")) return; logoFileRef.current?.click(); };
  const { plan, usage } = usePlan();
  const leadLimit = plan?.limits?.max_leads;
  const hasLeadCap = leadLimit > 0 && leadLimit < 100000;
  const leadsUsed = usage?.leads || 0;
  const leadsFull = !isPro && hasLeadCap && leadsUsed >= leadLimit;
  const [uploading, setUploading] = useState(false);
  const logoFileRef = useRef(null);

  const isSlugLocked = !!workspace?.public_profile_slug?.trim();
  const slugToCheck = form ? normalizeSlug(form.slug) : "";

  useEffect(() => {
    if (form || !workspace) return;
    const dp = safeParseJson(workspace.display_preferences, {});
    const initial = {
      enabled: !!workspace.public_profile_enabled,
      slug: workspace.public_profile_slug || suggestSlug(workspace.name),
      about: workspace.public_profile_about || "",
      show_phone: dp.public_show_phone !== false, show_email: dp.public_show_email !== false,
      show_address: dp.public_show_address !== false, show_website: dp.public_show_website !== false,
      show_social: dp.public_show_social !== false,
      stat_clients: dp.public_show_stat_clients === true,
      stat_works: dp.public_show_stat_works === true,
      stat_team: dp.public_show_stat_team === true,
      inquiry: dp.public_inquiry_enabled === true,
      social_instagram: dp.social_instagram || "", social_youtube: dp.social_youtube || "",
      social_twitter: dp.social_twitter || dp.social_portfolio || "",
      social_extra: Array.isArray(dp.social_extra) ? dp.social_extra.slice(0, 2) : [],
      sections: withOneRow(normalizeSections(dp.public_sections)),
    };
    setForm(initial);
    setSaved(initial);
  }, [workspace, form]);

  // Live availability of the chosen URL (only while it can still be chosen).
  useEffect(() => {
    if (isSlugLocked || !workspace?.id) return;
    if (!slugToCheck) { setSlugStatus("idle"); return; }
    if (slugToCheck.length < SLUG_MIN) { setSlugStatus("invalid"); return; }
    setSlugStatus("checking");
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_public_slug_available", { p_slug: slugToCheck, p_workspace_id: workspace.id });
      if (cancelled) return;
      setSlugStatus(error ? "error" : data ? "available" : "taken");
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [slugToCheck, isSlugLocked, workspace?.id]);

  if (!form) return null;

  const fullAddress = [workspace?.address, workspace?.city, workspace?.state, workspace?.country].filter(Boolean).join(", ");
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addExtraSocial = () => {
    if (form.social_extra.length >= 2) return;
    set("social_extra", [...form.social_extra, { icon: "facebook", url: "" }]);
  };
  const updateExtraSocial = (i, field, value) => set("social_extra", form.social_extra.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  const removeExtraSocial = (i) => set("social_extra", form.social_extra.filter((_, idx) => idx !== i));

  // Same rules as before: Pro feature, image files only, 5 MB max. The logo saves right away, not with the Save button.
  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!checkFeature("quotation_logo_enabled", "Branding Image / Logo")) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Please choose an image file." }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Image too large (max 5MB)." }); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Workspace.update(workspace.id, { logo: file_url });
      setWorkspace((w) => ({ ...w, logo: file_url }));
      toast({ title: "Logo updated" });
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };
  const removeLogo = async () => {
    try {
      await base44.entities.Workspace.update(workspace.id, { logo: "" });
      setWorkspace((w) => ({ ...w, logo: "" }));
      toast({ title: "Logo removed" });
    } catch (err) { toast({ title: "Failed to remove logo", description: err.message, variant: "destructive" }); }
  };
  const pageUrl = form.slug ? `${window.location.origin}/p/${form.slug}` : "";
  const live = isSlugLocked && form.enabled && saved.enabled;

  const setSection = (i, s) => set("sections", form.sections.map((x, idx) => (idx === i ? s : x)));
  const moveSection = (i, d) => {
    const next = [...form.sections];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("sections", next);
  };
  const usedTypes = new Set(form.sections.map((s) => s.type));
  const missingTypes = Object.entries(SECTION_TYPES).filter(([type]) => !usedTypes.has(type));
  const addedTypes = Object.entries(SECTION_TYPES).filter(([type]) => usedTypes.has(type));
  const addSection = (type) => form.sections.length < MAX_SECTIONS && !(SINGLE_SECTION_TYPES.has(type) && form.sections.some((x) => x.type === type)) && set("sections", [...form.sections, newSection(type)]);

  const save = async () => {
    const socialErr = firstSocialLinkError({
      instagram: form.social_instagram, youtube: form.social_youtube, twitter: form.social_twitter,
      website: workspace?.website, extra: form.social_extra,
    });
    if (socialErr) { toast({ title: "Invalid link", description: socialErr, variant: "destructive" }); return; }
    const secErr = firstSectionError(form.sections);
    if (secErr) { toast({ title: "Check your sections", description: secErr, variant: "destructive" }); return; }
    setSaving(true);
    try {
      const existingDp = safeParseJson(workspace?.display_preferences, {});
      const cleanSections = normalizeSections(form.sections).map((s) => ({
        ...s,
        title: s.title.trim(),
        items: s.items.filter((it) => Object.values(it).some((v) => String(v).trim())),
      })).filter((s) => s.items.length > 0 || s.title.trim());
      const updatedDp = {
        ...existingDp,
        public_show_phone: form.show_phone, public_show_email: form.show_email,
        public_show_address: form.show_address, public_show_website: form.show_website,
        public_show_social: form.show_social,
        public_show_stat_clients: form.stat_clients, public_show_stat_works: form.stat_works, public_show_stat_team: form.stat_team,
        public_sections: cleanSections,
        public_inquiry_enabled: form.inquiry,
        social_instagram: form.social_instagram.trim(), social_youtube: form.social_youtube.trim(),
        social_twitter: form.social_twitter.trim(), social_extra: form.social_extra.map((s) => ({ ...s, url: s.url.trim() })).filter((s) => s.url),
      };
      const payload = {
        public_profile_enabled: form.enabled,
        public_profile_about: form.about,
        display_preferences: JSON.stringify(updatedDp),
      };
      const finalForm = { ...form, sections: withOneRow(cleanSections) };
      // The URL is permanent once saved, so it is only written when publishing (never silently from the suggestion).
      if (!isSlugLocked && form.enabled) {
        const slug = normalizeSlug(form.slug);
        if (slug.length < SLUG_MIN) {
          toast({ title: "Choose your public URL", description: `Use at least ${SLUG_MIN} letters or numbers.`, variant: "destructive" });
          return;
        }
        const { data: free, error: availErr } = await supabase.rpc("is_public_slug_available", { p_slug: slug, p_workspace_id: workspace.id });
        if (availErr) throw availErr;
        if (!free) {
          setSlugStatus("taken");
          toast({ title: "That URL is taken", description: `/p/${slug} belongs to another business. Pick a different one.`, variant: "destructive" });
          return;
        }
        payload.public_profile_slug = slug;
        finalForm.slug = slug;
      }
      let updated;
      try {
        updated = await base44.entities.Workspace.update(workspace.id, payload);
      } catch (e) {
        if (e?.code === "23505" || /duplicate|unique/i.test(e?.message || "")) {
          setSlugStatus("taken");
          throw new Error("That public URL was just taken. Pick a different one.");
        }
        throw e;
      }
      setForm(finalForm);
      setSaved(finalForm);
      setWorkspace(updated);
      toast({ title: "Profile saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">
      <PageHeader title="My Profile" subtitle="Your shareable profile page. Show your work, services and contact details to anyone with the link." />

      <Panel defaultOpen icon={Globe} title="Publish & link" summary={form.enabled ? `Live · /p/${form.slug || "…"}` : "Not published"} help="Turn this on to make your profile page visible to anyone who has the link.">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">Publish my profile</div>
            <div className="text-xs text-muted-foreground">{form.enabled ? "Anyone with the link can view it." : "Off: nobody can open the page."}</div>
          </div>
          <Toggle checked={form.enabled} onChange={(v) => set("enabled", v)} label="Publish my profile" />
        </div>

        <Field label="Page URL" className="mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">{window.location.origin}/p/</span>
            <div className="relative flex-1 min-w-0">
              <Input value={form.slug} onChange={(e) => set("slug", sanitizeSlugInput(e.target.value))} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="your-business" readOnly={isSlugLocked} className={isSlugLocked ? "w-full bg-muted/50 cursor-not-allowed text-muted-foreground pr-8" : "w-full pr-8"} />
              {isSlugLocked && <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          </div>
          {isSlugLocked ? (
            <p className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground"><Lock className="w-3 h-3 shrink-0" /> This URL is permanent and can't be changed.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {slugStatus !== "idle" && (
                <p className="text-xs" aria-live="polite">
                  {slugStatus === "checking" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Checking availability…</span>}
                  {slugStatus === "available" && <span className="inline-flex items-center gap-1 text-success font-medium"><Check className="w-3 h-3" /> /p/{slugToCheck} is available</span>}
                  {slugStatus === "taken" && <span className="inline-flex items-center gap-1 text-destructive font-medium"><X className="w-3 h-3" /> /p/{slugToCheck} is already taken, try another</span>}
                  {slugStatus === "invalid" && <span className="text-muted-foreground">Use at least {SLUG_MIN} letters or numbers.</span>}
                  {slugStatus === "error" && <span className="text-muted-foreground">Couldn't check availability right now. It will be checked when you save.</span>}
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-start gap-1.5"><Lock className="w-3 h-3 mt-0.5 shrink-0" /><span>Pick it carefully: once you save with the profile published, this URL is locked permanently.</span></p>
            </div>
          )}
        </Field>

        {pageUrl && (isSlugLocked || form.enabled) && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4">
            <div className="flex-1 min-w-0 px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground font-mono break-all select-all">{pageUrl}</div>
            <Button size="sm" variant="outline" className="self-start sm:self-auto shrink-0" onClick={() => { navigator.clipboard.writeText(pageUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? <><Check className="w-3.5 h-3.5 text-success" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
            </Button>
          </div>
        )}
      </Panel>

      <Panel icon={Building2} title="Business details" summary={[workspace?.name, workspace?.tagline].filter(Boolean).join(" · ") || "Not set"} help="These come from your business setup and are shown on your profile. Change them once in Preferences and they update everywhere." action={<Link to="/preferences" className="text-xs font-medium text-primary hover:underline whitespace-nowrap">Edit in Preferences</Link>}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {[["Business name", workspace?.name], ["Tagline", workspace?.tagline]].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs font-medium text-muted-foreground">{k}</dt>
              <dd className={cn("text-sm mt-0.5 break-words", v ? "text-foreground" : "text-warning")}>{v || "Not set"}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel icon={ImageIcon} title="Logo" tag={!isPro && <ProTag />} summary={workspace?.logo ? "Logo added" : "No logo yet"} help="The same image is used as your logo in the sidebar, Preferences, invoices, quotations and on your profile page.">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
            {workspace?.logo ? <FadeImg src={workspace.logo} alt="Logo" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
          </div>
          <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={pickLogo} disabled={uploading}>
                {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</> : workspace?.logo ? "Replace" : "Upload image"}
              </Button>
              {workspace?.logo && <Button variant="ghost" size="sm" onClick={removeLogo}>Remove</Button>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Square, 512 × 512 px recommended · PNG / JPG / WebP · max 5 MB</p>
          </div>
        </div>
      </Panel>

      <Panel icon={AlignLeft} title="About" summary={form.about.trim() || "Not written yet"} help="A short intro shown at the top of your page.">
        <WordCounterTextarea value={form.about} onChange={(e) => set("about", e.target.value)} placeholder="Tell visitors about your business, specialties, and what makes you unique…" rows={4} />
      </Panel>

      <section className="space-y-3">
        <div className="px-1">
          <h2 className="text-sm font-semibold text-foreground">Sections</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Add what suits your business and name each section your way. They appear below your About text, in this order.</p>
        </div>
        {form.sections.map((s, i) => (
          <SectionEditor key={s.id} section={s} index={i} count={form.sections.length} onChange={(v) => setSection(i, v)} onMove={(d) => moveSection(i, d)} onRemove={() => set("sections", form.sections.filter((_, idx) => idx !== i))} />
        ))}
        {form.sections.length < MAX_SECTIONS ? (
          <div className="rounded-[15px] border border-dashed border-border p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3">{missingTypes.length === 0 ? "You have every kind of section" : form.sections.length === 0 ? "Start with a section" : "Not added yet"}</div>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-2.5">
              {missingTypes.map(([type, def]) => {
                const Icon = SECTION_ICONS[type];
                return (
                  <button key={type} type="button" onClick={() => addSection(type)} className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/50 transition-colors">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground leading-tight">{def.label}</span>
                      <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">{def.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {addedTypes.length > 0 && (
              <div className={cn("flex flex-wrap items-center gap-2", missingTypes.length > 0 && "mt-4 pt-4 border-t border-border")}>
                <span className="text-xs text-muted-foreground">Added:</span>
                {addedTypes.map(([type, def]) => SINGLE_SECTION_TYPES.has(type) ? (
                  <span key={type} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-card text-xs text-foreground" title={`One ${def.label} section is the most a profile can have`}>
                    <Check className="w-3 h-3 text-success" /> {def.label}
                  </span>
                ) : (
                  <button key={type} type="button" onClick={() => addSection(type)} title={`Add another ${def.label} section`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-card text-xs text-foreground hover:bg-muted transition-colors">
                    <Check className="w-3 h-3 text-success" /> {def.label} <Plus className="w-3 h-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground px-1">You've reached the limit of {MAX_SECTIONS} sections.</p>
        )}
      </section>

      <Panel icon={Share2} title="Social links" summary={(() => { const filled = (list) => list.filter((v) => String(v || "").trim()).length; const main = filled([form.social_instagram, form.social_youtube, form.social_twitter, workspace?.website]); const custom = filled(form.social_extra.map((s) => s.url)); const parts = [main && `${main} ${main === 1 ? "link" : "links"}`, custom && `${custom} custom ${custom === 1 ? "link" : "links"}`].filter(Boolean); return parts.length ? parts.join(", ") : "None added"; })()} help="Shown on your profile page and on quotations. Icons are picked from the link.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SocialField platform="instagram" label="Instagram" value={form.social_instagram} onChange={(v) => set("social_instagram", v)} placeholder="https://instagram.com/…" Icon={Instagram} />
          <SocialField platform="youtube" label="YouTube" value={form.social_youtube} onChange={(v) => set("social_youtube", v)} placeholder="https://youtube.com/…" Icon={Youtube} />
          <SocialField platform="twitter" label="Twitter / X" value={form.social_twitter} onChange={(v) => set("social_twitter", v)} placeholder="https://x.com/…" Icon={Twitter} />
          <Field label="Website">
            <div className="relative">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <div className="h-9 pl-9 pr-3 flex items-center rounded-md border border-border bg-muted/40 text-sm text-muted-foreground truncate">{workspace?.website || "Not set"}</div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">From your business details in <Link to="/preferences" className="text-primary hover:underline">Preferences</Link>.</p>
          </Field>
        </div>

        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Additional links (optional)</span>
            {form.social_extra.length < 2 && (
              <button type="button" onClick={addExtraSocial} className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1"><Plus className="w-3 h-3" /> Add link</button>
            )}
          </div>
          {form.social_extra.length === 0 ? (
            <p className="text-xs text-muted-foreground">No additional links added.</p>
          ) : (
            <div className="space-y-2">
              {form.social_extra.map((s, i) => {
                const opt = EXTRA_SOCIAL_ICON_OPTIONS.find((o) => o.v === s.icon) || EXTRA_SOCIAL_ICON_OPTIONS[0];
                const err = validateSocialUrl(s.url, s.icon || "other");
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Select value={s.icon} onChange={(e) => updateExtraSocial(i, "icon", e.target.value)} className="flex-1 sm:flex-none sm:w-36 min-w-0">
                      {EXTRA_SOCIAL_ICON_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </Select>
                    <div className="relative order-last basis-full sm:order-none sm:basis-0 sm:flex-1 min-w-0">
                      <opt.Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input value={s.url} onChange={(e) => updateExtraSocial(i, "url", e.target.value)} placeholder="https://…" className="!pl-9" />
                    </div>
                    <button type="button" onClick={() => removeExtraSocial(i)} className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0" aria-label="Remove link"><Trash2 className="w-3.5 h-3.5" /></button>
                    {err && <p className="basis-full text-[11px] text-destructive">{err}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>

      <Panel icon={MessageSquare} title="Inquiry form" summary={form.inquiry ? "On · inquiries arrive in Leads" : "Off"} help="Let visitors send you an inquiry straight from your profile page.">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">Show inquiry form</div>
            <div className="text-xs text-muted-foreground">{form.inquiry ? "Visitors see a “Send an inquiry” button and form." : "Off: no form is shown."}</div>
          </div>
          <Toggle checked={form.inquiry} onChange={(v) => set("inquiry", v)} label="Show inquiry form" />
        </div>
        <ol className="mt-4 space-y-2 text-xs text-muted-foreground">
          <li className="flex gap-2"><span className="font-semibold text-foreground shrink-0">1.</span><span className="min-w-0">A visitor sends their name, phone or email, date and message.</span></li>
          <li className="flex gap-2"><span className="font-semibold text-foreground shrink-0">2.</span><span className="min-w-0">It lands in <Link to="/leads" className="text-primary hover:underline">Leads</Link> as a new <span className="font-medium text-foreground">Website</span> lead, and you get a notification.</span></li>
          <li className="flex gap-2"><span className="font-semibold text-foreground shrink-0">3.</span><span className="min-w-0">Follow up there, and convert the lead into a client and event when they confirm.</span></li>
        </ol>
        {!isPro && (
          <div className={cn("mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs items-center", leadsFull ? "border-destructive/30 bg-destructive/5" : "border-warning/50 bg-warning/10")}>
            <Crown className="w-3.5 h-3.5 mt-0.5 shrink-0 text-warning" />
            <div className="min-w-0 text-muted-foreground">
              {leadsFull
                ? <span className="font-medium text-foreground">Lead limit reached ({leadsUsed}/{leadLimit}). Visitors can't send inquiries until you free up space or upgrade.</span>
                : <span className="font-medium text-foreground">Free plan{hasLeadCap ? `: ${leadsUsed} of ${leadLimit} leads used` : ""}.</span>}
              {" "}Pro has no lead limit and also sends each inquiry to your phone as a push alert.
            </div>
            <UpgradeButton />
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-3">Inquiries count toward your plan's lead limit. The form only works while your profile is published.</p>
        <p className="text-[11px] text-muted-foreground mt-1.5">Spam protection is built in: a hidden bot trap, a quick background check, no link-stuffed messages, and daily limits, so visitors never see a CAPTCHA.</p>
      </Panel>

      <Panel icon={Eye} title="Show on your profile" summary={`${["show_phone", "show_email", "show_address", "show_website", "show_social"].filter((k) => form[k]).length} of 5 details visible`} help="Choose which details visitors can see.">
        <div className="divide-y divide-border">
          {[["Phone", "show_phone", workspace?.phone], ["Email", "show_email", workspace?.email], ["Address", "show_address", fullAddress], ["Website", "show_website", workspace?.website], ["Social links", "show_social", undefined]].map(([label, key, value]) => (
            <div key={key} className="py-2.5 first:pt-0 last:pb-0"><VisibilityToggle label={label} value={value} checked={form[key]} onChange={(v) => set(key, v)} /></div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground mb-3">Your numbers (off by default)</div>
          <div className="divide-y divide-border">
            {[["Clients served", "stat_clients"], [`${term.workItemPlural} completed`, "stat_works"], ["Team members", "stat_team"]].map(([label, key]) => (
              <div key={key} className="py-2.5 first:pt-0 last:pb-0"><VisibilityToggle label={label} checked={form[key]} onChange={(v) => set(key, v)} /></div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-5 flex items-start gap-1.5">
          <Share2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Values come from <Link to="/preferences" className="text-primary hover:underline">Preferences → Profile & Workspace</Link>. Change them there; this switch only controls whether visitors see them.</span>
        </p>
      </Panel>

      {/* Floats until the end of the page, then settles into these plain buttons (same behaviour as quotations).
          aboveNav keeps the bottom menu visible and rests the bar just above it. */}
      <ActionDock
        aboveNav
        unsavedLabel="Unsaved changes"
        items={live ? [{ icon: ExternalLink, label: "View", onClick: () => window.open(pageUrl, "_blank", "noopener,noreferrer") }] : []}
        primary={{ icon: Save, label: saving ? "Saving…" : "Save", onClick: save, disabled: saving || !dirty, active: dirty, dirty }}
      >
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
          {live && (
            <Button variant="outline" onClick={() => window.open(pageUrl, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="w-4 h-4" /> View page
            </Button>
          )}
          <Button variant={dirty ? "primary" : "outline"} onClick={save} disabled={saving || !dirty}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save changes</>}
          </Button>
        </div>
      </ActionDock>
      {FeatureGateDialog}
    </div>
  );
}
