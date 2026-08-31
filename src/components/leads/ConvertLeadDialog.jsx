import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { convertLeadToClient } from "@/lib/leadService";
import { useNavigate } from "react-router-dom";

export default function ConvertLeadDialog({ open, onClose, lead, workspaceId, onConverted }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [converting, setConverting] = useState(false);

  const handleConvert = async () => {
    setConverting(true);
    try {
      const client = await convertLeadToClient(lead, workspaceId);
      toast({ title: "Lead converted to client!", description: client.name });
      onConverted?.(client);
      onClose?.();
      navigate(`/clients/${client.id}`);
    } catch (e) {
      toast({ title: "Failed to convert lead", description: e?.message, variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Lead to Client</DialogTitle>
          <DialogDescription>
            This will create a new client from "{lead?.name}" and mark the lead as won. You can then create a project for this client.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contact</span>
            <span className="font-medium">{lead?.name}</span>
          </div>
          {lead?.phone && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{lead.phone}</span>
            </div>
          )}
          {lead?.email && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{lead.email}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={converting}>Cancel</Button>
          <Button onClick={handleConvert} disabled={converting}>
            {converting ? "Converting..." : "Convert to Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}