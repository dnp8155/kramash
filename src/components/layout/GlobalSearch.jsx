import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setPageSearchQuery } from "@/lib/pageSearch";
import { Search, Calendar, Users, User, X, FileText, Receipt } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useT } from "@/hooks/useT";
import { fuzzyScore, normalize } from "@/lib/fuzzySearch";

const CACHE_TTL = 60000;
const EMPTY = { events: [], clients: [], team: [], quotations: [], invoices: [] };
const LIMIT = 30;

// Best match on the main text (typo tolerant), else a plain "contains" hit on any of the extra fields.
function rankItems(items, q, primary, extras = []) {
  const nq = normalize(q);
  const out = [];
  for (const item of items || []) {
    let score = fuzzyScore(q, primary(item) || "");
    if (score < 0.3) {
      for (const f of extras) {
        const v = normalize(f(item));
        if (v && v.includes(nq)) { score = Math.max(score, 0.6); break; }
      }
    }
    if (score >= 0.3) out.push({ ...item, _score: score });
  }
  return out.sort((a, b) => b._score - a._score).slice(0, LIMIT);
}

export default function GlobalSearch() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useWorkspace();
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const cacheRef = useRef({ wsId: null, events: null, clients: null, team: null, quotations: null, invoices: null, fetchedAt: 0 });
  const searchSeq = useRef(0);

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
    const [events, clients, team, quotations, invoices] = await Promise.all([
      base44.entities.Event.filter(ws, "-updated_date", 1000),
      base44.entities.Client.filter(ws, "-updated_date", 1000),
      base44.entities.TeamMember.filter(ws, "-updated_date", 1000),
      base44.entities.Quotation.filter(ws, "-updated_date", 1000).catch(() => []),
      base44.entities.Invoice.filter(ws, "-updated_date", 1000).catch(() => []),
    ]);
    const fresh = { wsId: workspaceId, events: events || [], clients: clients || [], team: team || [], quotations: quotations || [], invoices: invoices || [], fetchedAt: now };
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
        const { events, clients, team, quotations, invoices } = await loadLists();
        if (seq !== searchSeq.current) return; // a newer search is already running
        const clientName = {};
        clients.forEach((c) => { clientName[c.id] = c.name || ""; });
        setResults({
          events: rankItems(events, q, (e) => e.title, [(e) => e.venue, (e) => e.event_type, (e) => clientName[e.client_id]]),
          clients: rankItems(clients, q, (c) => c.name, [(c) => c.phone, (c) => c.email, (c) => c.city]),
          team: rankItems(team, q, (m) => m.name, [(m) => m.phone, (m) => m.email, (m) => m.profession]),
          quotations: rankItems(quotations, q, (x) => x.quotation_number, [(x) => clientName[x.client_id]]),
          invoices: rankItems(invoices, q, (x) => x.invoice_number, [(x) => clientName[x.client_id]]),
        });
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

  const total = results.events.length + results.clients.length + results.team.length + results.quotations.length + results.invoices.length;
  // Enter opens the top result; Escape closes the list.
  const onKeyDown = (e) => {
    if (localSearch) return;
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" && !loading && total > 0) {
      const r = results;
      if (r.events[0]) go(`/events/${r.events[0].id}`);
      else if (r.clients[0]) go(`/clients/${r.clients[0].id}`);
      else if (r.team[0]) go(`/team/${r.team[0].id}`);
      else if (r.quotations[0]) go(`/quotation/${r.quotations[0].id}`);
      else if (r.invoices[0]) go(`/invoices/${r.invoices[0].id}`);
    }
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
              {results.events.length > 0 && (
                <ResultGroup label={t("Events")} icon={Calendar} items={results.events} getTitle={(e) => e.title} getSub={(e) => e.venue} onClick={(e) => go(`/events/${e.id}`)} />
              )}
              {results.clients.length > 0 && (
                <ResultGroup label={t("Clients")} icon={Users} items={results.clients} getTitle={(c) => c.name} getSub={(c) => c.city} onClick={(c) => go(`/clients/${c.id}`)} />
              )}
              {results.team.length > 0 && (
                <ResultGroup label={t("Team")} icon={User} items={results.team} getTitle={(t) => t.name} getSub={(t) => t.profession} onClick={(t) => go(`/team/${t.id}`)} />
              )}
              {results.quotations.length > 0 && (
                <ResultGroup label={t("Quotations")} icon={FileText} items={results.quotations} getTitle={(x) => x.quotation_number} getSub={(x) => x.status} onClick={(x) => go(`/quotation/${x.id}`)} />
              )}
              {results.invoices.length > 0 && (
                <ResultGroup label={t("Invoices")} icon={Receipt} items={results.invoices} getTitle={(x) => x.invoice_number} getSub={(x) => x.status} onClick={(x) => go(`/invoices/${x.id}`)} />
              )}
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
