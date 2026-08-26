import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, Users, User, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { cn } from "@/lib/utils";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ events: [], clients: [], team: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runSearch = useCallback(
    async (q) => {
      if (!q.trim() || !workspaceId) {
        setResults({ events: [], clients: [], team: [] });
        setLoading(false);
        return;
      }
      try {
        const lower = q.toLowerCase();
        const [events, clients, team] = await Promise.all([
          base44.entities.Event.list("-updated_date", 50),
          base44.entities.Client.list("-updated_date", 50),
          base44.entities.TeamMember.list("-updated_date", 50),
        ]);
        setResults({
          events: (events || []).filter((e) => e.title?.toLowerCase().includes(lower)).slice(0, 5),
          clients: (clients || []).filter((c) => c.name?.toLowerCase().includes(lower)).slice(0, 5),
          team: (team || []).filter((t) => t.name?.toLowerCase().includes(lower)).slice(0, 5),
        });
      } catch {
        setResults({ events: [], clients: [], team: [] });
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  const onChange = (val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults({ events: [], clients: [], team: [] });
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
    setResults({ events: [], clients: [], team: [] });
  };

  const total = results.events.length + results.clients.length + results.team.length;

  return (
    <div className="relative flex-1 max-w-xl" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="Search events, clients, team…"
          className="w-full h-9 pl-9 pr-8 rounded-lg bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-colors"
        />
        {query && (
          <button
            onClick={() => onChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 animate-fade-in max-h-96 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Searching…</div>
          ) : total === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No results found.</div>
          ) : (
            <>
              {results.events.length > 0 && (
                <ResultGroup label="Events" icon={Calendar} items={results.events} getTitle={(e) => e.title} getSub={(e) => e.venue} onClick={(e) => go(`/events/${e.id}`)} />
              )}
              {results.clients.length > 0 && (
                <ResultGroup label="Clients" icon={Users} items={results.clients} getTitle={(c) => c.name} getSub={(c) => c.city} onClick={(c) => go(`/clients/${c.id}`)} />
              )}
              {results.team.length > 0 && (
                <ResultGroup label="Team" icon={User} items={results.team} getTitle={(t) => t.name} getSub={(t) => t.profession} onClick={(t) => go(`/team/${t.id}`)} />
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