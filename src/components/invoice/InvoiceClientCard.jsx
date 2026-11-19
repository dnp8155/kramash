import { Mail, Phone } from "lucide-react";
import { useT } from "@/hooks/useT";

export default function InvoiceClientCard({ client }) {
  const t = useT();
  if (!client) {
    return (
      <div className="bg-secondary/60 border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("Client")}</p>
        <p className="text-sm text-muted-foreground">{t("No client selected")}</p>
      </div>
    );
  }
  return (
    <div className="bg-secondary/60 border border-border rounded-xl p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("Client")}</p>
      <p className="text-lg font-semibold text-foreground">{client.name || "—"}</p>
      <div className="mt-2 space-y-1.5">
        {client.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{client.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}