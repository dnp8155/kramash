import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getBusinessTerminology } from "@/lib/businessTerminology";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import { Loader2, User, Calendar, IndianRupee, Phone, Mail, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { todayISO, formatEventDate } from "@/lib/dates";

export default function ConvertLeadDialog({ open, onClose, lead, onConverted }) {
  const { workspaceId, workspace } = useWorkspace();
  const term = getBusinessTerminology(workspace);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { saving, start, stop } = useSubmitGuard();

  if (!lead) return null;

  const workItem = term.workItemSingular || "Event";
  const workItemLower = workItem.toLowerCase();

  // Preview values
  const clientName = lead.name || "—";
  const eventTitle = lead.event_type
    ? `${lead.event_type} — ${lead.name}`
    : `${lead.name} — ${workItem}`;
  const startDate = lead.event_date || todayISO();
  const endDate = lead.event_date || "";
  const contractValue = lead.budget || 0;

  const handleConfirm = async () => {
    if (!start()) return;
    try {
      const client = await base44.entities.Client.create({
        workspace_id: workspaceId,
        name: lead.name,
        phone: lead.phone || "",
        email: lead.email || "",
        notes: lead.notes || ""
      });

      const event = await base44.entities.Event.create({
        workspace_id: workspaceId,
        client_id: client.id,
        title: eventTitle,
        event_type: lead.event_type || "",
        start_date: startDate,
        end_date: endDate,
        event_dates: lead.event_date ? [lead.event_date] : [],
        venue: "",
        status: "upcoming",
        contract_value: contractValue,
        notes: lead.notes || ""
      });

      await base44.entities.Lead.update(lead.id, {
        status: "won",
        converted_client_id: client.id,
        converted_event_id: event.id
      });

      toast({ title: `Lead converted to ${workItemLower}` });
      invalidateEntities(queryClient, ["Lead", "Event", "Client"]);
      queryClient.invalidateQueries({ queryKey: ["events", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["leads", workspaceId] });
      onConverted?.(event.id);
      onClose();
    } catch (err) {
      toast({ title: "Failed to convert lead", description: err?.message, variant: "destructive" });
    } finally {
      stop();
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onClose}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>Convert to {workItem}</AppDialogTitle>
          <AppDialogDescription>
            This will create a new client and {workItemLower} from this lead's details.
          </AppDialogDescription>
        </AppDialogHeader>

        <AppDialogBody className="space-y-4">
          {/* Client preview */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <User className="w-3.5 h-3.5" /> New Client
            </div>
            <div className="text-sm font-medium text-foreground">{clientName}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {lead.phone}
                </span>
              )}
              {lead.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {lead.email}
                </span>
              )}
            </div>
          </div>

          {/* Event preview */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5" /> New {workItem}
            </div>
            <div className="text-sm font-medium text-foreground">{eventTitle}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {lead.event_type && (
                <span>{term.workItemTypeLabel || `${workItem} Type`}: {lead.event_type}</span>
              )}
              {lead.event_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {formatEventDate(lead.event_date, lead.event_date)}
                </span>
              )}
            </div>
            {contractValue > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <IndianRupee className="w-3 h-3" />
                <span className="font-medium text-foreground">₹{contractValue.toLocaleString("en-IN")}</span>
                <span>contract value</span>
              </div>
            )}
          </div>

          {lead.notes && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-3 break-anywhere">{lead.notes}</span>
            </div>
          )}

        </AppDialogBody>

        <AppDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Confirm & Create
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}