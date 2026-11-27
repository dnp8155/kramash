import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setPageSearchQuery } from "@/lib/pageSearch";
import { Search, Calendar, Users, User, X, FileText, UserPlus } from "lucide-react";
import CurrencyReceiptIcon from "@/components/common/CurrencyReceiptIcon";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useT } from "@/hooks/useT";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { fuzzyScore, normalize } from "@/lib/fuzzySearch";

const CACHE_TTL = 60000;
const EMPTY = { events: [], clients: [], team: [], quotations: [], invoices: [], leads: [] };
const LIMIT = 30;
const SHOW_PER_GROUP = 8;

const digitsOf = (v) => String(v || "").replace(/\D/g, "");
const LEAD_STATUS_LABEL = { new: "New", contacted: "Contacted", qualified: "Qualified", negotiation: "Negotiation", won: "Won", lost: "Lost" };

// How well one piece of text matches: typo-tolerant on the main text (name, title, number); on the extra fields
// (client name, phone, city…) only real hits count — the whole query inside it, or every word of a several-word
// query ("rahul wedding") — so loose look-alikes don't crowd the list.
function fieldScore(q, text, fuzzy) {
  const t = normalize(text);
  if (!t) return 0;
  if (fuzzy) {
    const f = fuzzyScore(q, t);
    if (f >= 0.5) return f; // typos like "rahl" still match; loose look-alikes don't
  }
  const nq = normalize(q);
  if (t === nq) return 1;
  if (t.includes(nq)) return t.startsWith(nq) || t.includes(` ${nq}`) ? 0.9 : 0.8;
  return 0;
}

// Scores every item. `fields` = [[getter, weight, fuzzy?]]: the main text first (weight 1). Also matches
//  - several words spread over different fields ("rahul goa" → client Rahul, venue Goa),
//  - phone numbers typed with or without spaces / +91 ("98250 12345", "9825012345").
function rankItems(items, q, fields) {
  const words = normalize(q).split(" ").filter(Boolean);
  const qDigits = digitsOf(q);
  const out = [];
  for (const item of items || []) {
    let score = 0;
    for (const [get, weight, fuzzy] of fields) {
      const v = get(item);
      if (!v) continue;
      score = Math.max(score, fieldScore(q, v, fuzzy) * weight);
      if (qDigits.length >= 4 && digitsOf(v).includes(qDigits)) score = Math.max(score, 0.9 * weight);
    }
    if (score < 0.8 && words.length > 1) {
      const all = normalize(fields.map(([get]) => get(item) || "").join(" "));
      if (words.every((w) => all.includes(w))) score = Math.max(score, 0.8);
    }
    if (score >= 0.45) out.push({ ...item, _score: score });
  }
  return out.sort((a, b) => b._score - a._score).slice(0, LIMIT);
}

// Result groups: a client whose name (or phone/email) clearly matches always comes first, then their events,
// quotations and invoices; otherwise the group with the best match leads. On a tie: clients, events, team,
// quotations, invoices, leads.
const GROUP_ORDER = ["clients", "events", "team", "quotations", "invoices", "leads"];
function orderedGroups(results) {
  const lead = (k) => (k === "clients" && results.clients[0]?._score >= 0.75 ? 1 : 0);
  return GROUP_ORDER
    .filter((k) => results[k].length > 0)
    .sort((a, b) => (lead(b) - lead(a)) || (results[b][0]._score - results[a][0]._score) || (GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)));
}

export default function GlobalSearch() {
  const t = useT();
  const term = useBusinessTerminology(); // "Events" / "Projects" / "Shoots"… per business type
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useWorkspace();
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const cacheRef = useRef({ wsId: null, events: null, clients: null, team: null, quotations: null, invoices: null, leads: null, fetchedAt: 0 });
  const searchSeq = useRef(0);
  const clientNameRef = useRef(() => "");

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadLists = useCallback(async () => {
    const now = Date.now();
    const cache = cacheRef.current;
    if (cache.wsId === workspaceId && cache.fetchedAt && now - cache.fetchedAt < CACHE_TTL && cache.events) {
      return cache;
    }
    // Everything in this workspace (not just the latest few), so older items can be found too.
    const ws = { workspace_id: workspaceId };
    const [events, clients, team, quotations, invoices, leads] = await Promise.all([
      base44.entities.Event.filter(ws, "-updated_date", 1000),
      base44.entities.Client.filter(ws, "-updated_date", 1000),
      base44.entities.TeamMember.filter(ws, "-updated_date", 1000),
      base44.entities.Quotation.filter(ws, "-updated_date", 1000).catch(() => []),
      base44.entities.Invoice.filter(ws, "-updated_date", 1000).catch(() => []),
      base44.entities.Lead.filter(ws, "-updated_date", 1000).catch(() => []),
    ]);
    const fresh = { wsId: workspaceId, events: events || [], clients: clients || [], team: team || [], quotations: quotations || [], invoices: invoices || [], leads: leads || [], fetchedAt: now };
    cacheRef.current = fresh;
    return fresh;
  }, [workspaceId]);

  const runSearch = useCallback(
    async (q) => {
      const seq = ++searchSeq.current;
      if (!q.trim() || !workspaceId) {
        setResults(EMPTY);
        setLoading(false);
        return;
      }
      try {
        const { events, clients, team, quotations, invoices, leads } = await loadLists();
        if (seq !== searchSeq.current) return; // a newer search is already running
        const clientName = {};
        clients.forEach((c) => { clientName[c.id] = c.name || ""; });
        const snapName = (x) => { try { return JSON.parse(x.client_snapshot || "{}")?.name || ""; } catch { return ""; } };
        const cName = (x) => clientName[x.client_id] || snapName(x);
        // A client's own events, quotations and invoices rank almost as high as the client (weight 0.95).
        setResults({
          clients: rankItems(clients, q, [[(c) => c.name, 1, true], [(c) => c.phone, 0.95], [(c) => c.email, 0.9], [(c) => c.city, 0.7]]),
          events: rankItems(events, q, [[(e) => e.title, 1, true], [cName, 0.95], [(e) => e.venue, 0.75], [(e) => e.event_type, 0.7]]),
          team: rankItems(team, q, [[(m) => m.name, 1, true], [(m) => m.phone, 0.95], [(m) => m.email, 0.9], [(m) => m.profession, 0.7]]),
          quotations: rankItems(quotations, q, [[(x) => x.quotation_number, 1, true], [cName, 0.95], [(x) => x.project_title, 0.9]]),
          invoices: rankItems(invoices, q, [[(x) => x.invoice_number, 1, true], [cName, 0.95]]),
          leads: rankItems(leads, q, [[(l) => l.name, 1, true], [(l) => l.phone, 0.95], [(l) => l.email, 0.9], [(l) => l.event_type, 0.7]]),
        });
        clientNameRef.current = cName;
      } catch {
        if (seq === searchSeq.current) setResults(EMPTY);
      } finally {
        if (seq === searchSeq.current) setLoading(false);
      }
    },
    [workspaceId, loadLists]
  );

  // On the mobile More and Preferences pages the box filters that page's own content instead of
  // searching events/clients/team. On larger screens it always stays the global search.
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 1023px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const scope = isMobile ? ({ "/more": "more", "/preferences": "preferences" })[location.pathname] || null : null;
  const localSearch = !!scope;
  useEffect(() => {
    // Arriving on / leaving such a page always starts from an empty box.
    setQuery("");
    setPageSearchQuery("");
    setOpen(false);
    setResults(EMPTY);
  }, [scope]);

  const onChange = (val) => {
    setQuery(val);
    if (localSearch) { setPageSearchQuery(val); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      searchSeq.current++;
      setResults(EMPTY);
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(val), 300);
  };

  const go = (path) => {
    navigate(path);
    setQuery("");
    setOpen(false);
    setResults(EMPTY);
  };

  const total = results.events.length + results.clients.length + results.team.length + results.quotations.length + results.invoices.length + results.leads.length;
  const cName = clientNameRef.current;
  const GROUPS = {
    clients: { label: t("Clients"), icon: Users, title: (c) => c.name, sub: (c) => [c.city, c.phone].filter(Boolean).join(" · "), path: (c) => `/clients/${c.id}` },
    events: { label: term?.workItemPlural || t("Events"), icon: Calendar, title: (e) => e.title, sub: (e) => [cName(e), e.venue].filter(Boolean).join(" · "), path: (e) => `/events/${e.id}` },
    team: { label: t("Team"), icon: User, title: (m) => m.name, sub: (m) => m.profession, path: (m) => `/team/${m.id}` },
    quotations: { label: t("Quotations"), icon: FileText, title: (x) => x.quotation_number, sub: (x) => [cName(x), x.project_title, x.status].filter(Boolean).join(" · "), path: (x) => `/quotation/${x.id}` },
    invoices: { label: t("Invoices"), icon: CurrencyReceiptIcon, title: (x) => x.invoice_number, sub: (x) => [cName(x), x.status].filter(Boolean).join(" · "), path: (x) => `/invoices/${x.id}` },
    leads: { label: t("Leads"), icon: UserPlus, title: (l) => l.name, sub: (l) => [l.event_type, l.phone, LEAD_STATUS_LABEL[l.status] ? t(LEAD_STATUS_LABEL[l.status]) : ""].filter(Boolean).join(" · "), path: (l) => `/leads?lead=${l.id}` },
  };
  const order = orderedGroups(results);
  // Enter opens the top result (the first item of the first group shown); Escape closes the list.
  const onKeyDown = (e) => {
    if (localSearch) return;
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" && !loading && total > 0 && order[0]) go(GROUPS[order[0]].path(results[order[0]][0]));
  };

  return (
    <div className="relative w-full max-w-2xl" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          data-global-search
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => !localSearch && query.trim() && setOpen(true)}
          placeholder={scope === "more" ? t("Search more") : scope === "preferences" ? t("Search preferences") : t("Search")}
          className="w-full h-10 pl-10 pr-9 rounded-lg bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="no-press absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={t("Clear")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 animate-fade-in max-h-96 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">{t("Searching…")}</div>
          ) : total === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">{t("No results found.")}</div>
          ) : (
            <>
              {order.map((k) => {
                const g = GROUPS[k];
                return <ResultGroup key={k} label={g.label} icon={g.icon} items={results[k].slice(0, SHOW_PER_GROUP)} getTitle={g.title} getSub={g.sub} onClick={(x) => go(g.path(x))} />;
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ label, icon: Icon, items, getTitle, getSub, onClick }) {
  return (
    <div>
      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30 flex items-center gap-1.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onClick(item)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{getTitle(item)}</div>
            {getSub(item) && <div className="text-xs text-muted-foreground truncate">{getSub(item)}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}
