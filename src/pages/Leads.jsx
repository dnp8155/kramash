import { formatMoney } from "@/utils/format";
import { useState, useMemo, useEffect } from "react";
import { useT } from "@/hooks/useT";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getBusinessTerminology } from "@/lib/businessTerminology";
import SearchInput from "@/components/common/SearchInput";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import EmptyState from "@/components/common/EmptyState";
import LeadsPageSkeleton from "@/components/leads/LeadsPageSkeleton";
import StatCard from "@/components/common/StatCard";
import PageHeader from "@/components/common/PageHeader";
import RoundIconButton from "@/components/common/RoundIconButton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePageCreateAction } from "@/lib/pageCreateAction";
import LeadForm from "@/components/leads/LeadForm";
import ConvertLeadDialog from "@/components/leads/ConvertLeadDialog";
import { useToast } from "@/components/ui/use-toast";
import { invalidateEntities } from "@/lib/queryInvalidation";
import RetryState from "@/components/common/RetryState";
import { usePartialErrorToast } from "@/hooks/usePartialErrorToast";
import { formatEventDate, formatDatesList, formatDate, isPastDate, todayISO, formatRelativeTime } from "@/lib/dates";
import { Plus, Pencil, Trash2, Phone, Mail, Calendar, CalendarClock, TrendingUp, Flame, Users, Target, CalendarPlus, ArrowRight, CheckCircle2, FileSpreadsheet, MessageCircle, History } from "lucide-react";
import SegmentedTabs from "@/components/common/SegmentedTabs";
import LeadFollowUpStrip from "@/components/leads/LeadFollowUpStrip";
import LeadsBoard from "@/components/leads/LeadsBoard";
import LeadsInsights from "@/components/leads/LeadsInsights";
import LeadDetailsDialog from "@/components/leads/LeadDetailsDialog";
import LeadMessageDialog from "@/components/leads/LeadMessageDialog";
import LostReasonDialog from "@/components/leads/LostReasonDialog";
import { STATUS_STYLES, PRIORITY_STYLES, SOURCE_STYLES, LOST_REASONS } from "@/constants/leadConfig";
import { classifyFollowUps } from "@/lib/leadManager";
import { changeLeadStatus, markLeadContacted } from "@/lib/leadService";
import { exportLeadsXlsx } from "@/lib/exportUtils";
import { useFeatureGate } from "@/components/common/ProGate";
import { usePlan } from "@/hooks/usePlan";
import PlanLimitDialog from "@/components/common/PlanLimitDialog";
import PlanLimitBanner from "@/components/common/PlanLimitBanner";
import { askConfirm } from "@/lib/confirmDialog";

const VIEW_KEY = "kramasha:leadsView";
const readView = () => { try { const v = localStorage.getItem(VIEW_KEY); return v === "board" || v === "insights" ? v : "list"; } catch { return "list"; } };

// The pipeline board needs room for six columns, so it is offered from the lg breakpoint up.
function useIsDesktop() {
  const q = "(min-width: 1024px)";
  const [on, setOn] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const h = () => setOn(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return on;
}

export default function Leads() {
  const { workspaceId, workspace } = useWorkspace();
  const term = getBusinessTerminology(workspace);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { checkFeature, FeatureGateDialog } = useFeatureGate();
  const t = useT();
  usePageTitle("Leads");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const { plan, usage, canCreate } = usePlan();
  const [showPlanLimit, setShowPlanLimit] = useState(false);
  const [convertLead, setConvertLead] = useState(null);
  const [view, setViewState] = useState(readView);
  const [detailsId, setDetailsId] = useState(null);
  const [messageLead, setMessageLead] = useState(null);
  const [lostLead, setLostLead] = useState(null);
  const isDesktop = useIsDesktop();
  const setView = (v) => { setViewState(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* not remembered */ } };
  // "board" is desktop-only; on a small screen it quietly falls back to the list.
  const activeView = view === "board" && !isDesktop ? "list" : view;

  const { data, isLoading, error } = useQuery({
    queryKey: ["leads", workspaceId],
    queryFn: async () => {
      return await base44.entities.Lead.filter({ workspace_id: workspaceId }, "-created_date", 500);
    },
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
    placeholderData: (prev) => prev
  });

  const leads = data || [];
  usePartialErrorToast(false, error, !!data);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] });
    invalidateEntities(queryClient, ["Lead"]);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (priorityFilter !== "all" && l.priority !== priorityFilter) return false;
      if (q && !`${l.name} ${l.phone || ""} ${l.email || ""} ${l.event_type || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leads, query, statusFilter, priorityFilter]);

  const followUps = useMemo(() => classifyFollowUps(leads, todayISO()), [leads]);
  const detailsLead = detailsId ? leads.find((l) => l.id === detailsId) || null : null;

  const stats = useMemo(() => ({
    total: leads.length,
    won: leads.filter((l) => l.status === "won").length,
    hot: leads.filter((l) => l.priority === "hot").length,
    active: leads.filter((l) => !["won", "lost"].includes(l.status)).length
  }), [leads]);

  const openNew = () => {
    if (!canCreate("max_leads").allowed) { setShowPlanLimit(true); return; }
    setEditingLead(null);
    setShowForm(true);
  };
  usePageCreateAction(openNew);
  const openEdit = (l) => { setEditingLead(l); setShowForm(true); };

  const handleDelete = async (lead) => {
    if (!await askConfirm(`${t("Delete lead")} "${lead.name}"?`)) return;
    try {
      await base44.entities.Lead.delete(lead.id);
      toast({ title: t("Lead deleted") });
      invalidate();
    } catch {
      toast({ title: t("Failed to delete lead"), variant: "destructive" });
    }
  };

  // Moving to Lost asks why first (so the pipeline summary can show it); every change lands in the lead's history.
  const handleStatusChange = async (lead, newStatus) => {
    if (newStatus === lead.status) return;
    if (newStatus === "lost") { setLostLead(lead); return; }
    try {
      await changeLeadStatus(workspaceId, lead, newStatus);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
    } catch {
      toast({ title: t("Failed to update status"), variant: "destructive" });
    }
  };

  const confirmLost = async (reason, note) => {
    try {
      await changeLeadStatus(workspaceId, lostLead, "lost", { lostReason: reason, note });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["lead-activities", lostLead.id] });
      setLostLead(null);
    } catch {
      toast({ title: t("Failed to update status"), variant: "destructive" });
    }
  };

  // Exports what is on screen (after search / filters) with each lead's history on a second sheet.
  const handleExport = async () => {
    if (!checkFeature("excel_csv_export_enabled", "Excel Export")) return;
    let activities = [];
    try { activities = await base44.entities.LeadActivity.filter({ workspace_id: workspaceId }, "-created_date", 5000); } catch { /* history sheet is skipped */ }
    exportLeadsXlsx(filtered, activities);
  };

  const callLead = async (lead) => {
    window.location.href = `tel:${String(lead.phone).replace(/[^\d+]/g, "")}`;
    try { await markLeadContacted(workspaceId, lead, "call"); invalidate(); queryClient.invalidateQueries({ queryKey: ["lead-activities", lead.id] }); } catch { /* the call still goes ahead */ }
  };

  const handleConverted = (eventId) => {
    invalidate();
    if (eventId) navigate(`/events/${eventId}`);
  };

  // The whole page is the skeleton while loading (it has its own header/stats/filters), so nothing is shown twice.
  if (isLoading) return <LeadsPageSkeleton />;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader title={t("Leads")} subtitle={t("Track and manage potential clients through your sales pipeline.")}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <FileSpreadsheet className="w-4 h-4" /> {t("Export")}
          </Button>
          <Button onClick={openNew} className="max-lg:hidden">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Add Lead")}</span>
          </Button>
        </div>
      </PageHeader>
      <PlanLimitBanner limitKey="max_leads" usageKey="leads" noun="leads used" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("Total Leads")} value={stats.total} icon={Users} tone="primary" />
        <StatCard label={t("Active")} value={stats.active} icon={Target} tone="info" />
        <StatCard label={t("Hot Leads")} value={stats.hot} icon={Flame} tone="warning" />
        <StatCard label={t("Won")} value={stats.won} icon={TrendingUp} tone="success" />
      </div>

      {activeView !== "insights" && (
        <LeadFollowUpStrip overdue={followUps.overdue} today={followUps.today} onOpen={(l) => setDetailsId(l.id)} />
      )}

      <SegmentedTabs
        items={[
          { value: "list", label: t("List") },
          ...(isDesktop ? [{ value: "board", label: t("Board") }] : []),
          { value: "insights", label: t("Insights") },
        ]}
        value={activeView}
        onChange={setView}
        layoutId="leads-view-indicator"
      />

      {activeView === "insights" ? (
        <LeadsInsights leads={leads} />
      ) : (<>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search leads...")} className="sm:w-80 sm:shrink-0" />
        <div className="flex items-center gap-2 sm:ml-auto">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex-1 min-w-[140px] sm:flex-none sm:w-44">
          <option value="all">{t("All Statuses")}</option>
          {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
        </Select>
        <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="flex-1 min-w-[140px] sm:flex-none sm:w-40">
          <option value="all">{t("All Priorities")}</option>
          {Object.entries(PRIORITY_STYLES).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
        </Select>
        </div>
      </div>

      {/* List */}
      {error && !data ? (
        <RetryState onRetry={() => queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] })} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query || statusFilter !== "all" || priorityFilter !== "all" ? t("No leads match your filters") : t("No leads yet")}
          description={query || statusFilter !== "all" || priorityFilter !== "all" ? t("Try adjusting your search or filters.") : t("Add your first lead to start tracking potential clients.")}
          action={!query && statusFilter === "all" && priorityFilter === "all" ? (
            <Button onClick={openNew}><Plus className="w-4 h-4" /> {t("Add Lead")}</Button>
          ) : null}
        />
      ) : activeView === "board" ? (
        <LeadsBoard leads={filtered} currency={workspace?.currency} onMove={handleStatusChange} onOpen={(l) => setDetailsId(l.id)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lead) => {
            const st = STATUS_STYLES[lead.status] || STATUS_STYLES.new;
            const pr = PRIORITY_STYLES[lead.priority] || PRIORITY_STYLES.warm;
            const PrIcon = pr.icon;
            return (
              <div key={lead.id} className="bg-card border border-border rounded-[15px] p-4 shadow-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <button type="button" onClick={() => setDetailsId(lead.id)} className="block max-w-full text-left"><h3 className="font-heading font-semibold text-foreground truncate hover:text-primary transition-colors">{lead.name}</h3></button>
                    {lead.event_type && <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.event_type}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${pr.bg} ${pr.color}`}>
                      <PrIcon className="w-3 h-3" />
                      {t(pr.label)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                    {t(st.label)}
                  </span>
                  {lead.status === "lost" && lead.lost_reason && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {t(LOST_REASONS.find((r) => r.value === lead.lost_reason)?.label || lead.lost_reason)}
                    </span>
                  )}
                  {lead.source && (() => {
                    const src = SOURCE_STYLES[lead.source] || SOURCE_STYLES.other;
                    const SrcIcon = src.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${src.bg} ${src.color}`}>
                        <SrcIcon className="w-3 h-3" />
                        {t(src.label)}
                      </span>
                    );
                  })()}
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{lead.phone}</span>
                      <RoundIconButton onClick={() => callLead(lead)} className="shrink-0 text-primary hover:text-primary" aria-label={t("Call")} title={t("Call")}>
                        <Phone className="w-3.5 h-3.5" />
                      </RoundIconButton>
                      <RoundIconButton onClick={() => setMessageLead(lead)} className="shrink-0 text-success hover:text-success" aria-label="WhatsApp" title="WhatsApp">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </RoundIconButton>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {(() => {
                    const dates = (lead.event_dates && lead.event_dates.length > 0)
                      ? lead.event_dates
                      : (lead.event_date ? [lead.event_date] : []);
                    if (dates.length === 0) return null;
                    return (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="break-anywhere">
                          {dates.length === 1 ? formatEventDate(dates[0], dates[0]) : formatDatesList(dates)}
                        </span>
                      </div>
                    );
                  })()}
                  {lead.next_followup_date && !["won", "lost"].includes(lead.status) && (() => {
                    const overdue = isPastDate(lead.next_followup_date);
                    return (
                      <div className={`flex items-center gap-2 ${overdue ? "text-warning font-medium" : ""}`}>
                        <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{t("Follow-up")} {overdue ? t("was due") : t("due")} {formatDate(lead.next_followup_date)}</span>
                      </div>
                    );
                  })()}
                  {lead.last_contacted_at && (
                    <div className="flex items-center gap-2 text-xs">
                      <History className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{t("Last contacted")} {formatRelativeTime(lead.last_contacted_at)}</span>
                    </div>
                  )}
                </div>

                {lead.budget > 0 && (
                  <div className="text-sm font-medium text-foreground mb-3">
                    {t("Budget")}: {formatMoney(lead.budget, workspace?.currency)}
                  </div>
                )}

                {lead.notes && (
                  <p className="text-xs text-muted-foreground mb-3 whitespace-pre-wrap break-anywhere">{lead.notes}</p>
                )}

                {lead.status === "won" && lead.converted_event_id ? (
                  <Button variant="primary" size="sm" className="w-full mb-3" onClick={() => navigate(`/events/${lead.converted_event_id}`)}>
                    {t("Go to")} {term.workItemSingular} <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : lead.status !== "won" ? (
                  <Button variant="primary" size="sm" className="w-full mb-3" onClick={() => setConvertLead(lead)}>
                    <CalendarPlus className="w-3.5 h-3.5" /> {t("Convert to")} {term.workItemSingular}
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t("Converted")}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Select
                    size="sm"
                    value={lead.status}
                    onChange={(e) => handleStatusChange(lead, e.target.value)}
                    className="flex-1"
                  >
                    {Object.entries(STATUS_STYLES).map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
                  </Select>
                  <RoundIconButton onClick={() => setDetailsId(lead.id)} className="shrink-0" aria-label={t("History")} title={t("History")}>
                    <History className="w-3.5 h-3.5" />
                  </RoundIconButton>
                  <RoundIconButton onClick={() => openEdit(lead)} className="shrink-0" aria-label={t("Edit")}>
                    <Pencil className="w-3.5 h-3.5" />
                  </RoundIconButton>
                  <RoundIconButton
                    onClick={() => handleDelete(lead)}
                    className="shrink-0 hover:text-destructive hover:bg-destructive/5"
                    aria-label={t("Delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </RoundIconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      </>)}

      <PlanLimitDialog
        open={showPlanLimit}
        onClose={() => setShowPlanLimit(false)}
        resource="leads"
        currentUsage={usage?.leads || 0}
        limit={plan?.limits?.max_leads || 0}
      />

      <LeadForm
        open={showForm}
        onClose={() => setShowForm(false)}
        editingLead={editingLead}
        onSaved={() => {}}
      />

      <LeadDetailsDialog
        open={!!detailsLead}
        lead={detailsLead}
        onClose={() => setDetailsId(null)}
        onEdit={(l) => { setDetailsId(null); openEdit(l); }}
        onMessage={(l) => setMessageLead(l)}
      />
      <LeadMessageDialog open={!!messageLead} lead={messageLead} onClose={() => setMessageLead(null)} />
      <LostReasonDialog open={!!lostLead} lead={lostLead} onClose={() => setLostLead(null)} onConfirm={confirmLost} />

      <ConvertLeadDialog
        open={!!convertLead}
        lead={convertLead}
        onClose={() => setConvertLead(null)}
        onConverted={handleConverted}
      />
      {FeatureGateDialog}
    </div>
  );
}