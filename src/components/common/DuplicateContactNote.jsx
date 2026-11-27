import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useT } from "@/hooks/useT";

// "Already a client / Already a lead" under a contact form, so the same person isn't added twice by mistake.
// It only informs (a repeat entry can be on purpose) and never blocks saving.
// Phones match on their last 10 digits (so "+91 98250 12345" = "9825012345"); emails match ignoring case.
const digits = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const mail = (v) => String(v || "").trim().toLowerCase();
const OPEN_LEAD = (l) => l.status !== "won" && l.status !== "lost";

export default function DuplicateContactNote({ open, workspaceId, phone, email, excludeClientId, excludeLeadId, checkLeads = true }) {
  const t = useT();
  const enabled = open && !!workspaceId;
  const { data: clients = [] } = useQuery({
    queryKey: ["dup-check-clients", workspaceId],
    enabled,
    staleTime: 0, // reloads each time a form opens, so someone added a minute ago is recognised
    queryFn: async () => (await base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 2000)) || [],
  });
  const { data: leads = [] } = useQuery({
    queryKey: ["dup-check-leads", workspaceId],
    enabled: enabled && checkLeads,
    staleTime: 0, // reloads each time a form opens, so someone added a minute ago is recognised
    queryFn: async () => (await base44.entities.Lead.filter({ workspace_id: workspaceId }, "-created_date", 2000)) || [],
  });

  const p = digits(phone), e = mail(email);
  const same = (r) => (p.length === 10 && (digits(r.phone) === p || digits(r.alternate_phone) === p)) || (e && mail(r.email) === e);
  const client = (p.length === 10 || e) ? clients.find((c) => c.id !== excludeClientId && same(c)) : null;
  const lead = checkLeads && (p.length === 10 || e) ? leads.find((l) => l.id !== excludeLeadId && OPEN_LEAD(l) && same(l)) : null;
  if (!client && !lead) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
      <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        {client && <div>{t("Already a client")}: <b>{client.name}</b></div>}
        {lead && <div>{t("Already a lead")}: <b>{lead.name}</b></div>}
      </div>
    </div>
  );
}
