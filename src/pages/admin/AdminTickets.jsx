import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Bug, Lightbulb, CreditCard, UserCircle, HelpCircle, ChevronDown, Send, CheckCircle2, Loader2, Inbox } from "lucide-react";
import AdminBackButton from "@/components/admin/AdminBackButton";
import EmptyState from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/Skeletons";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import { useToast } from "@/components/ui/use-toast";
import { fetchAdminTickets, updateAdminTicket } from "@/lib/adminService";
import { cn } from "@/lib/utils";

const CATEGORIES = {
  bug: { label: "Bug report", icon: Bug, color: "text-destructive" },
  feature_request: { label: "Feature request", icon: Lightbulb, color: "text-warning" },
  billing: { label: "Billing", icon: CreditCard, color: "text-primary" },
  account: { label: "Account", icon: UserCircle, color: "text-primary" },
  general: { label: "General / feedback", icon: HelpCircle, color: "text-muted-foreground" },
};
const STATUSES = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In progress", color: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-600" },
};
const PRIORITIES = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-primary" },
  high: { label: "High", color: "text-warning" },
  urgent: { label: "Urgent", color: "text-destructive" },
};

function TicketCard({ ticket, open, onToggle, onSaved }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(ticket.status || "open");
  const [reply, setReply] = useState(ticket.admin_response || "");
  const [saving, setSaving] = useState(false);
  const cat = CATEGORIES[ticket.category] || CATEGORIES.general;
  const st = STATUSES[ticket.status] || STATUSES.open;
  const pr = PRIORITIES[ticket.priority] || PRIORITIES.medium;
  const CatIcon = cat.icon;
  const dirty = status !== ticket.status || reply.trim() !== (ticket.admin_response || "").trim();

  const save = async (nextStatus) => {
    setSaving(true);
    try {
      await updateAdminTicket(ticket, { status: nextStatus || status, admin_response: reply });
      if (nextStatus) setStatus(nextStatus);
      toast({ title: "Ticket updated", description: "The user will see this under Help & Support → My Tickets." });
      onSaved();
    } catch (e) {
      toast({ title: "Could not update the ticket", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/40 transition-colors">
        <CatIcon className={cn("w-4 h-4 mt-0.5 shrink-0", cat.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">{ticket.subject}</h3>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", st.color)}>{st.label}</span>
          </div>
          {!open && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.message}</p>}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className={pr.color}>{pr.label} priority</span><span>•</span>
            <span>{cat.label}</span><span>•</span>
            <span>{ticket.user_name || "Unknown"}{ticket.user_email ? ` · ${ticket.user_email}` : ""}</span>
            {ticket.workspace_name && <><span>•</span><span>{ticket.workspace_name}</span></>}<span>•</span>
            <span>{new Date(ticket.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 mt-1 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">
          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/40 rounded-lg p-3">{ticket.message}</div>
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Reply to the user (shown in their My Tickets)</label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={2000} placeholder="Thanks for the suggestion — we've added it to our list…" className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 resize-y" />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {status !== "resolved" && <Button size="sm" variant="outline" disabled={saving} onClick={() => save("resolved")}><CheckCircle2 className="w-3.5 h-3.5" /> Save & mark resolved</Button>}
            <Button size="sm" disabled={saving || !dirty} onClick={() => save()}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTickets() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("active");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: fetchAdminTickets,
    staleTime: 30 * 1000,
  });
  const tickets = useMemo(() => data || [], [data]);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, resolved: 0, closed: 0, feature: 0 };
    tickets.forEach((t) => { if (c[t.status] !== undefined) c[t.status] += 1; if (t.category === "feature_request" && ["open", "in_progress"].includes(t.status)) c.feature += 1; });
    return c;
  }, [tickets]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter === "active" ? !["open", "in_progress"].includes(t.status) : statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (!q) return true;
      return [t.subject, t.message, t.user_name, t.user_email, t.workspace_name].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [tickets, statusFilter, categoryFilter, search]);

  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] }); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <AdminBackButton />
        <div>
          <h1 className="text-xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Bug reports, feature requests and feedback from your users. Replies show up in their Help & Support → My Tickets.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[["Open", counts.open, "open"], ["In progress", counts.in_progress, "in_progress"], ["Resolved", counts.resolved, "resolved"], ["Closed", counts.closed, "closed"]].map(([label, n, key]) => (
          <button key={key} type="button" onClick={() => setStatusFilter(key)} className={cn("bg-card border rounded-xl p-3 text-left transition-colors", statusFilter === key ? "border-primary" : "border-border hover:bg-muted/40")}>
            <div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-bold text-foreground mt-0.5">{n}</div>
          </button>
        ))}
        <button type="button" onClick={() => { setCategoryFilter("feature_request"); setStatusFilter("active"); }} className="bg-card border border-border rounded-xl p-3 text-left hover:bg-muted/40 transition-colors">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Lightbulb className="w-3 h-3 text-warning" /> Feature requests</div><div className="text-xl font-bold text-foreground mt-0.5">{counts.feature}</div>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, message, user, workspace…" className="w-full h-9 pl-9 pr-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-44">
          <option value="active">Needs attention</option><option value="all">All statuses</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="sm:w-52">
          <option value="all">All categories</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-destructive mb-1">Unable to load tickets.</p>
          <p className="text-xs text-muted-foreground mb-3">If this is the first time, make sure the 0040 database update has been run.</p>
          <button onClick={() => refetch()} className="text-sm text-primary hover:underline">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl"><EmptyState title={tickets.length ? "No tickets match" : "No tickets yet"} description={tickets.length ? "Try a different filter or search." : "When a user submits a ticket from Help & Support it will appear here."} /></div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Inbox className="w-3.5 h-3.5" /> {rows.length} ticket{rows.length === 1 ? "" : "s"}</p>
          {rows.map((t) => <TicketCard key={t.id + (t.updated_at || "")} ticket={t} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} onSaved={refresh} />)}
        </div>
      )}
    </div>
  );
}
