import { formatMoney } from "@/utils/format";
import { currencyIcon } from "@/utils/currencyIcon";
import { base44 } from "@/api/base44Client";
import { useT } from "@/hooks/useT";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getBusinessTerminology } from "@/lib/businessTerminology";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import { Loader2, User, Calendar, Phone, Mail, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Select from "@/components/common/Select";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { todayISO, formatEventDate } from "@/lib/dates";
import { logLeadActivity } from "@/lib/leadService";

export default function ConvertLeadDialog({ open, onClose, lead, onConverted }) {
  const { workspaceId, workspace } = useWorkspace();
  const term = getBusinessTerminology(workspace);
  const CurrencyIcon = currencyIcon(workspace?.currency);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { saving, start, stop } = useSubmitGuard();
  const t = useT();

  // Which client the new event goes under: "new" (made from the lead's details) or an existing client's id.
  const [clientChoice, setClientChoice] = useState("new");
  const [autoMatched, setAutoMatched] = useState(false);
  const touched = useRef(false);
  const { data: clients = [] } = useQuery({
    queryKey: ["lead-form-clients", workspaceId],
    enabled: open && !!workspaceId,
    staleTime: 60 * 1000,
    queryFn: async () => (await base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 1000)) || [],
  });
  // Start from an existing client whose phone or email matches the lead, else a new client.
  useEffect(() => {
    if (!open) { touched.current = false; return; }
    if (touched.current || !lead) return;
    const digits = (v) => String(v || "").replace(/\D/g, "").slice(-10);
    const phone = digits(lead.phone), email = String(lead.email || "").trim().toLowerCase();
    const match = clients.find((c) => (phone.length === 10 && digits(c.phone) === phone) || (email && String(c.email || "").trim().toLowerCase() === email));
    setClientChoice(match ? match.id : "new");
    setAutoMatched(!!match);
  }, [open, lead?.id, clients]);
  const chosenClient = clientChoice !== "new" ? clients.find((c) => c.id === clientChoice) : null;
  const pick = (v) => { touched.current = true; setAutoMatched(false); setClientChoice(v || "new"); };

  if (!lead) return null;

  const workItem = term.workItemSingular || "Event";
  const workItemLower = workItem.toLowerCase();

  const clientName = lead.name || "—";
  const eventTitle = lead.event_type
    ? `${lead.event_type} — ${lead.name}`
    : `${lead.name} — ${workItem}`;
  const leadDates = (lead.event_dates && lead.event_dates.length > 0)
    ? lead.event_dates
    : (lead.event_date ? [lead.event_date] : []);
  const allDates = [...new Set([...leadDates, lead.event_date, lead.event_end_date].filter(Boolean))].sort();
  const startDate = allDates[0] || todayISO();
  const endDate = allDates.length > 1 ? allDates[allDates.length - 1] : (allDates[0] || "");
  const contractValue = lead.budget || 0;
  const existingClientId = chosenClient?.id || "";

  const handleConfirm = async () => {
    if (!start()) return;
    try {
      let client = null;
      if (existingClientId) {
        try { client = await base44.entities.Client.get(existingClientId); } catch { client = null; }
        if (client && client.workspace_id !== workspaceId) client = null;
      }
      // "New client", or the chosen client was deleted meanwhile: create one from the lead's details.
      if (!client) {
        client = await base44.entities.Client.create({
          workspace_id: workspaceId,
          name: lead.name,
          phone: lead.phone || "",
          email: lead.email || "",
          notes: lead.notes || ""
        });
      }

      const event = await base44.entities.Event.create({
        workspace_id: workspaceId,
        client_id: client.id,
        title: eventTitle,
        event_type: lead.event_type || "",
        start_date: startDate,
        end_date: endDate,
        event_dates: leadDates,
        venue: "",
        status: "upcoming",
        contract_value: contractValue,
        notes: lead.notes || ""
      });

      await Promise.all([
        base44.entities.Lead.update(lead.id, {
          status: "won",
          converted_client_id: client.id,
          converted_event_id: event.id
        }),
        logLeadActivity(workspaceId, lead.id, { kind: "status", from_status: lead.status, to_status: "won", body: `Converted to ${workItemLower}` }),
      ]);

      toast({ title: `${t("Lead converted to")} ${workItemLower}` });
      invalidateEntities(queryClient, ["Lead", "Event", "Client"]);
      queryClient.invalidateQueries({ queryKey: ["events", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] });
      onConverted?.(event.id);
      onClose();
    } catch (err) {
      toast({ title: t("Failed to convert lead"), description: err?.message, variant: "destructive" });
    } finally {
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onClose}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>{t("Convert to")} {workItem}</AppDialogTitle>
          <AppDialogDescription>
            {existingClientId
              ? <>{t("This will create a new")} {workItemLower} {t("for this existing client.")}</>
              : <>{t("This will create a new client and")} {workItemLower} {t("from this lead's details.")}</>}
          </AppDialogDescription>
        </AppDialogHeader>

        <AppDialogBody className="space-y-4">
          {clients.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("Client")}</label>
              <Select value={clientChoice} onChange={(e) => pick(e.target.value)} disabled={saving} className="w-full">
                <option value="new">{t("New client (from this lead)")}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
              </Select>
              {autoMatched && <p className="text-xs text-muted-foreground mt-1.5">{t("Picked because the phone or email matches this client. Change it if needed.")}</p>}
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <User className="w-3.5 h-3.5" /> {chosenClient ? t("Existing client") : t("New Client")}
            </div>
            <div className="text-sm font-medium text-foreground">{chosenClient ? chosenClient.name : clientName}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {(chosenClient ? chosenClient.phone : lead.phone) && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {chosenClient ? chosenClient.phone : lead.phone}
                </span>
              )}
              {(chosenClient ? chosenClient.email : lead.email) && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {chosenClient ? chosenClient.email : lead.email}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5" /> {t("New")} {workItem}
            </div>
            <div className="text-sm font-medium text-foreground">{eventTitle}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {lead.event_type && (
                <span>{term.workItemTypeLabel || `${workItem} ${t("Type")}`}: {lead.event_type}</span>
              )}
              {leadDates.length > 0 && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {leadDates.length === 1
                    ? formatEventDate(leadDates[0], leadDates[0])
                    : `${leadDates.length} ${t("dates")} · ${formatEventDate(leadDates[0], leadDates[0])}`}
                </span>
              )}
            </div>
            {contractValue > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CurrencyIcon className="w-3 h-3" />
                <span className="font-medium text-foreground">{formatMoney(contractValue, workspace?.currency)}</span>
                <span>{t("contract value")}</span>
              </div>
            )}
          </div>

          {lead.notes && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap break-anywhere">{lead.notes}</span>
            </div>
          )}

        </AppDialogBody>

        <AppDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t("Confirm & Create")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}