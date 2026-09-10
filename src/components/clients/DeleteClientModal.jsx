import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

export default function DeleteClientModal({ open, onClose, client, onDeleted }) {
  const [checking, setChecking] = useState(true);
  const [refs, setRefs] = useState({ events: 0, quotations: 0, invoices: 0, transactions: 0 });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    setChecking(true);
    Promise.all([
      base44.entities.Event.filter({ client_id: client.id }, null, 500).catch(() => []),
      base44.entities.Quotation.filter({ client_id: client.id }, null, 500).catch(() => []),
      base44.entities.Invoice.filter({ client_id: client.id }, null, 500).catch(() => []),
      base44.entities.FinancialTransaction.filter({ client_id: client.id }, null, 500).catch(() => []),
    ]).then(([ev, q, inv, txn]) => {
      setRefs({
        events: ev?.length || 0,
        quotations: q?.length || 0,
        invoices: inv?.length || 0,
        transactions: txn?.length || 0,
      });
      setChecking(false);
    });
  }, [open, client?.id]);

  const hasRefs = refs.events + refs.quotations + refs.invoices + refs.transactions > 0;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.Client.delete(client.id);
      toast({ title: "Client deleted successfully." });
      onDeleted();
    } catch (e) {
      toast({ title: "Delete failed", description: e?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Client"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting || checking}>
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete Client
          </Button>
        </>
      }
    >
      {checking ? (
        <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Checking references…</span>
        </div>
      ) : hasRefs ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-destructive/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">
                This client has associated business records.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Deleting the client may affect historical references. The associated events,
                quotations, invoices, and payments will <strong>not</strong> be deleted — they
                remain for audit and historical accuracy.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {refs.events > 0 && (
              <div className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                {refs.events} Event{refs.events !== 1 ? "s" : ""}
              </div>
            )}
            {refs.quotations > 0 && (
              <div className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                {refs.quotations} Quotation{refs.quotations !== 1 ? "s" : ""}
              </div>
            )}
            {refs.invoices > 0 && (
              <div className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                {refs.invoices} Invoice{refs.invoices !== 1 ? "s" : ""}
              </div>
            )}
            {refs.transactions > 0 && (
              <div className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
                {refs.transactions} Transaction{refs.transactions !== 1 ? "s" : ""}
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-foreground">
            Are you sure you want to continue?
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{client?.name}</span>?
          </p>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
        </div>
      )}
    </Modal>
  );
}