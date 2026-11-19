import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageCheck, Plus, Trash2, Copy, Link2, MessageCircle, Check, ChevronDown, CalendarClock, X, Info, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { askConfirm } from "@/lib/confirmDialog";
import { whatsappShareUrl } from "@/lib/portalShare";
import { whatsappNumber } from "@/lib/validation";
import { trackStatuses, statusOf, TRACK_DONE } from "@/lib/trackStatuses";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { cn } from "@/lib/utils";
import { formatCount } from "@/utils/format";
import { formatDateChip, isPastDate } from "@/lib/dates";
import { expectedDateFor, quotationSuggestions } from "@/lib/trackDue";
import { useT } from "@/hooks/useT";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import Input from "@/components/common/Input";
import Toggle from "@/components/common/Toggle";
import EmptyState from "@/components/common/EmptyState";
import ProLock from "@/components/common/ProLock";

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Shared with the event page, which loads the items in the background so the tab opens with them already there.
export const deliverablesQuery = (workspaceId, eventId) => ({
  queryKey: ["event-deliverables", eventId],
  queryFn: () => base44.entities.EventDeliverable.filter({ workspace_id: workspaceId, event_id: eventId }, "created_date", 200),
  staleTime: 15 * 1000
});
// Quantities go up to 25,000 (prints, photos, invitation cards…).
const MAX_QTY = 25000;
const clampQty = (v) => Math.max(1, Math.min(MAX_QTY, parseInt(v, 10) || 1));

// Event details → Track: what you are making for this client (with a quantity) and where each item stands.
// Optionally shared with the client (their portals and a link). Part of the portals, so a Pro feature.
// quotation / quotationItems: the accepted quotation and its lines (loaded by the event page), for the one-tap card
// that adds its "Includes / Deliverables" to Track.
export default function EventTrackTab({ event, workspaceId, client, quotation, quotationItems }) {
  const t = useT();
  return (
    <ProLock feature="client_portal_enabled" label={t("Track")}>
      <TrackBody event={event} workspaceId={workspaceId} client={client} quotation={quotation} quotationItems={quotationItems} />
    </ProLock>
  );
}

// Quotation lines already handled on this device for an event (added, or "Not now"), so a line you deleted on
// purpose is not suggested again. Kept per event; a new line added to the quotation later is still suggested.
const seenKey = (eventId) => `track-quote-seen:${eventId}`;
const readSeen = (eventId) => { try { const v = JSON.parse(localStorage.getItem(seenKey(eventId)) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const writeSeen = (eventId, names) => { try { localStorage.setItem(seenKey(eventId), JSON.stringify(names.slice(-300))); } catch { /* not remembered: the card may show again */ } };

function TrackBody({ event, workspaceId, client, quotation, quotationItems }) {
  const t = useT();
  const term = useBusinessTerminology();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prefs = useDisplayPreferences();
  const statuses = trackStatuses(prefs.trackStatusNames);
  const [title, setTitle] = useState("");
  const [qty, setQty] = useState("1");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    ...deliverablesQuery(workspaceId, event.id),
    enabled: !!event?.id && !!workspaceId
  });

  const refresh = () => invalidateEntities(queryClient, ["EventDeliverable"]);
  const fail = (msg, e) => toast({ title: t(msg), description: e?.message, variant: "destructive" });

  const add = async () => {
    const name = title.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const created = await base44.entities.EventDeliverable.create({
        workspace_id: workspaceId, event_id: event.id, title: name, quantity: clampQty(qty), status: "not_started",
        expected_date: expectedDateFor(name, event, prefs.trackDueRules)
      });
      // Added to the list at once, so the card grows once instead of waiting for (and jumping on) the refetch.
      if (created?.id) queryClient.setQueryData(["event-deliverables", event.id], (list = []) => (list.some((x) => x.id === created.id) ? list : [...list, created]));
      setTitle("");
      setQty("1");
      refresh();
    } catch (e) {
      fail("Failed to add item", e);
    } finally {
      setAdding(false);
    }
  };

  const patch = async (item, data) => {
    // Shown at once; put back if the save fails.
    const key = ["event-deliverables", event.id];
    const before = queryClient.getQueryData(key);
    queryClient.setQueryData(key, (list = []) => list.map((x) => (x.id === item.id ? { ...x, ...data } : x)));
    try {
      await base44.entities.EventDeliverable.update(item.id, data);
      refresh();
    } catch (e) {
      queryClient.setQueryData(key, before);
      fail("Failed to save", e);
    }
  };

  const remove = async (item) => {
    if (!await askConfirm(t("Remove this item?"), { destructive: true })) return;
    const key = ["event-deliverables", event.id];
    const before = queryClient.getQueryData(key);
    queryClient.setQueryData(key, (list = []) => list.filter((x) => x.id !== item.id));
    try {
      await base44.entities.EventDeliverable.delete(item.id);
      refresh();
    } catch (e) {
      queryClient.setQueryData(key, before);
      fail("Failed to remove", e);
    }
  };

  // One-tap card: the accepted quotation's "Includes / Deliverables" lines that are not on the list yet.
  const [seen, setSeen] = useState(() => readSeen(event.id));
  const [addingAll, setAddingAll] = useState(false);
  const suggestions = isLoading ? [] : quotationSuggestions(quotationItems, items, seen, MAX_QTY)
    .map((sug) => ({ ...sug, expected: expectedDateFor(sug.name, event, prefs.trackDueRules) }));
  const markSeen = (names) => { const next = [...seen, ...names]; setSeen(next); writeSeen(event.id, next); };

  const addAll = async () => {
    if (addingAll || suggestions.length === 0) return;
    setAddingAll(true);
    const key = ["event-deliverables", event.id];
    const done = [];
    try {
      // One by one, so they keep the quotation's order on the list.
      for (const sug of suggestions) {
        const created = await base44.entities.EventDeliverable.create({
          workspace_id: workspaceId, event_id: event.id, title: sug.name, quantity: sug.quantity, status: "not_started",
          expected_date: sug.expected
        });
        done.push(sug.name);
        if (created?.id) queryClient.setQueryData(key, (list = []) => (list.some((x) => x.id === created.id) ? list : [...list, created]));
      }
    } catch (e) {
      fail("Failed to add item", e);
    } finally {
      if (done.length) markSeen(done);
      setAddingAll(false);
      refresh();
    }
  };

  // Shown at once (the switch flips straight away); the event page refreshes quietly after the save.
  const savedOn = !!event.public_tracking_enabled && !!event.public_token;
  const [share, setShare] = useState({ on: savedOn, token: event.public_token || "" });
  useEffect(() => { setShare({ on: savedOn, token: event.public_token || "" }); }, [savedOn, event.public_token]);
  const shareOn = share.on && !!share.token;
  const link = shareOn ? `${window.location.origin}/track/${share.token}` : "";
  // Sharing always works on the link. It also shows in the client portal, but only when this client's portal is on.
  const portalOn = !!client?.portal_access_enabled;

  const toggleShare = async (on) => {
    const before = share;
    const token = share.token || (on ? newToken() : "");
    setShare({ on, token });
    try {
      await base44.entities.Event.update(event.id, {
        public_tracking_enabled: on,
        ...(on && !event.public_token ? { public_token: token } : {})
      });
      // Only this event needs reloading; nothing else on screen shows the sharing switch.
      queryClient.invalidateQueries({ queryKey: ["event", event.id] });
    } catch (e) {
      setShare(before);
      fail("Failed to update sharing", e);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: t("Couldn't copy"), variant: "destructive" });
    }
  };

  const whatsapp = () => {
    const first = (client?.name || "").trim().split(/\s+/)[0];
    const msg = `${first ? `Hi ${first},` : "Hi,"}\n\n${t("You can follow the progress of your work here:")}\n${link}`;
    window.open(whatsappShareUrl(whatsappNumber(client?.phone), msg), "_blank", "noopener");
  };

  const delivered = items.filter((x) => x.status === TRACK_DONE).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <PackageCheck className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{t("Track")}</span>
        {/* "done" (not the last status name): a business that renamed it to e.g. "Cancelled" got "(0/1 cancelled)". */}
        {items.length > 0 && <span className="text-xs text-muted-foreground">({delivered}/{items.length} {t("done")})</span>}
      </div>

      {suggestions.length > 0 && (
        <Card className="p-4 space-y-3 border-primary/30 bg-primary/[0.03]">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {items.length === 0 ? t("From the accepted quotation") : t("New in the accepted quotation")}
                {quotation?.quotation_number ? <span className="text-muted-foreground font-medium"> ({quotation.quotation_number})</span> : null}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t("Its Includes / Deliverables, ready to track. Add them in one tap and update their status as you go.")}</p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {suggestions.map((sug) => (
              <li key={sug.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 break-words">
                  {sug.quantity > 1 && <span className="text-muted-foreground tabular-nums">{formatCount(sug.quantity)} × </span>}
                  <span className="font-medium text-foreground">{sug.name}</span>
                </span>
                {sug.expected && <span className="text-xs text-muted-foreground whitespace-nowrap">{t("Expected by")} {formatDateChip(sug.expected)}</span>}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={addAll} disabled={addingAll}>
              <Plus className="w-3.5 h-3.5" /> {suggestions.length === 1 ? t("Add it") : `${t("Add all")} ${suggestions.length}`}
            </Button>
            <Button size="sm" variant="outline" onClick={() => markSeen(suggestions.map((x) => x.name))} disabled={addingAll}>{t("Not now")}</Button>
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2">
          <label className="shrink-0 flex items-center gap-1 h-9 rounded-lg border border-border bg-card pl-2.5 pr-1 focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-primary/40 transition-all">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Qty")}</span>
            <input
              type="number" min={1} max={MAX_QTY} inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-14 bg-transparent text-center text-sm text-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label={t("Quantity")}
            />
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("Add an item")}
            maxLength={120}
            className="text-sm"
          />
          <Button type="submit" size="sm" disabled={!title.trim() || adding}><Plus className="w-3.5 h-3.5" /> {t("Add")}</Button>
        </form>

        {isLoading ? (
          // Same size as the item tiles, so the card does not jump when the list arrives.
          <div className="space-y-2" aria-hidden="true">
            {[0, 1].map((i) => <div key={i} className="h-[7.5rem] rounded-xl border border-border bg-muted/40 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={t("Nothing to track yet")}
            description={t("Add what you are working on for this client, and update its status as you go.")}
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <TrackItem key={item.id} item={item} statuses={statuses} onPatch={patch} onRemove={remove} />
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">{t("Rename the last two statuses, or turn Track off, in Preferences → Types & Display.")}</p>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Link2 className="w-4 h-4 text-muted-foreground" /> {t("Share with client")}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("Optional. When on, these items and their status (read-only) show on a link you can send (no password needed) and in the client's portal. Off keeps them private.")}
            </p>
          </div>
          <Toggle checked={shareOn} onChange={toggleShare} label={t("Share with client")} />
        </div>
        {!portalOn && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="min-w-0">
              {client?.id
                ? <>{t("The client portal is off for")} <span className="font-semibold text-foreground">{client.name || t("this client")}</span>, {t("so this shows only on the link. Turn their portal on to show it there too.")}{" "}
                    <Link to={`/clients/${client.id}#portal`} className="font-medium text-primary hover:underline">{t("Turn on client portal")}</Link></>
                : `${t("No client on this")} ${(term.workItemSingular || "Event").toLowerCase()}, ${t("so this shows only on the link.")}`}
            </span>
          </div>
        )}
        {shareOn && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground break-all bg-muted/50 rounded-lg px-3 py-2">{link}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? <><Check className="w-3.5 h-3.5" /> {t("Copied")}</> : <><Copy className="w-3.5 h-3.5" /> {t("Copy link")}</>}
              </Button>
              <Button size="sm" variant="outline" onClick={whatsapp}><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// One size scale in the tile: 14px for the item name, 12px for every chip, the quantity and the note. The app already
// stops iPhone zooming into small fields (maximum-scale=1 in index.html), so 16px fields are not needed here.
const NUM_FIELD = "bg-transparent text-center text-xs font-semibold text-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

// One tracked item: a small tile with the title, its status pill, an "Expected by" date chip and the quantity,
// with the optional client note underneath. Everything saves as you change it.
function TrackItem({ item, statuses, onPatch, onRemove }) {
  const t = useT();
  const meta = statusOf(statuses, item.status);
  const q = Number(item.quantity) || 1;
  const done = item.status === TRACK_DONE;
  const date = item.expected_date || "";
  const late = !!date && !done && isPastDate(date);

  const openPicker = (e) => { try { e.currentTarget.showPicker?.(); } catch { /* the native tap still opens it */ } };

  return (
    <li className={cn("rounded-xl border border-border bg-card p-3 space-y-2.5 transition-opacity", done && "opacity-80")}>
      <div className="flex items-start gap-2">
        <div className={cn("flex-1 min-w-0 text-sm font-semibold text-foreground break-words leading-snug", done && "line-through decoration-muted-foreground/50")}>
          {item.title}
        </div>
        <button
          type="button"
          onClick={() => onRemove(item)}
          className="shrink-0 -mt-1 -mr-1 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
          aria-label={t("Remove")}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Status pill: our own icon, label and chevron, with the native list laid invisibly on top (tapping still opens
            the phone's picker). Browsers draw a select's own text at their own size, which made it larger than the chips. */}
        <div className={cn("relative shrink-0 inline-flex items-center gap-1.5 h-7 max-w-[11rem] rounded-full pl-2.5 pr-2 text-xs font-semibold focus-within:ring-2 focus-within:ring-ring/40", meta.cls)}>
          <meta.Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t(meta.label)}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <select
            value={item.status}
            onChange={(e) => onPatch(item, { status: e.target.value })}
            aria-label={t("Status")}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {statuses.map((s) => <option key={s.value} value={s.value}>{t(s.label)}</option>)}
          </select>
        </div>

        {/* Expected date: a chip that opens the date picker. Empty shows "Set expected date". */}
        <div className={cn(
          "relative inline-flex items-center gap-1.5 h-7 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
          !date ? "border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            : late ? "bg-destructive/10 text-destructive border-destructive/20"
            : "bg-primary/10 text-primary border-primary/20"
        )}>
          <CalendarClock className="w-3.5 h-3.5 shrink-0" />
          <span>{date ? <>{t(late ? "Was due" : "Expected by")} <span className="font-semibold">{formatDateChip(date)}</span></> : t("Set expected date")}</span>
          <input
            type="date"
            value={date}
            onClick={openPicker}
            onChange={(e) => onPatch(item, { expected_date: e.target.value || null })}
            aria-label={t("Expected date")}
            title={t("When you expect this to be ready. Shown to the client when shared.")}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {date && (
            <button
              type="button"
              onClick={() => onPatch(item, { expected_date: null })}
              className="relative z-10 -mr-1 w-4 h-4 rounded-full flex items-center justify-center hover:bg-foreground/10"
              aria-label={t("Clear date")}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <label className="inline-flex items-center gap-1 h-7 rounded-full border border-border bg-muted/40 pl-2.5 pr-1 focus-within:ring-2 focus-within:ring-ring/40">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Qty")}</span>
          <input
            key={q}
            type="number" min={1} max={MAX_QTY} inputMode="numeric"
            defaultValue={q}
            onBlur={(e) => { const v = clampQty(e.target.value); e.target.value = v; if (v !== q) onPatch(item, { quantity: v }); }}
            className={cn("w-12", NUM_FIELD)}
            aria-label={t("Quantity")}
          />
        </label>
      </div>

      <input
        defaultValue={item.note || ""}
        onBlur={(e) => { if (e.target.value !== (item.note || "")) onPatch(item, { note: e.target.value }); }}
        placeholder={t("Add a note for the client (optional)")}
        maxLength={200}
        className="w-full h-8 rounded-lg bg-muted/40 border border-transparent px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:border-primary/40 focus:ring-2 focus:ring-ring/40 transition-all"
      />
    </li>
  );
}
