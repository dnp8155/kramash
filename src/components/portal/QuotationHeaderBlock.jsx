import { FileText } from "lucide-react";
import { formatDate } from "@/utils/format";
import { Image } from "@/components/ui/image";

export default function QuotationHeaderBlock({ quotation, workspace, client, event }) {
  const biz = quotation.business_snapshot || {};
  const cli = quotation.client_snapshot || client || {};
  const evt = quotation.event_snapshot || event || {};

  const bizName = biz.name || workspace?.name || "";
  const bizAddress = biz.address || [workspace?.address, workspace?.city, workspace?.state].filter(Boolean).join(", ");
  const bizPhone = biz.phone || workspace?.phone || "";
  const bizEmail = biz.email || workspace?.email || "";
  const bizGstin = biz.gstin || workspace?.gstin || "";

  const clientName = cli.name || "—";
  const clientPhone = cli.phone || "";
  const clientEmail = cli.email || "";
  const clientAddress = cli.address || "";

  const venue = evt.venue || quotation.custom_client?.venue || "";
  const sideOrCategory = quotation.context_side || quotation.property_type || "";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      {/* Top row: logo + quotation number */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          {workspace?.logo && (
            <Image src={workspace.logo} alt="" className="h-10 w-10 rounded-lg object-cover" fittingType="fill" />
          )}
          <div>
            <p className="text-lg font-bold text-foreground">{bizName}</p>
            {bizAddress && <p className="text-xs text-muted-foreground">{bizAddress}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <FileText className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold text-foreground">{quotation.quotation_number}</p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Date: {formatDate(quotation.quotation_date)}</p>
          {quotation.valid_until && (
            <p className="text-xs text-muted-foreground">Valid Till: {formatDate(quotation.valid_until)}</p>
          )}
        </div>
      </div>

      {/* Agency + Client grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Agency */}
        <div className="rounded-lg bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">From</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{bizName}</p>
          {bizGstin && <p className="text-xs text-muted-foreground">GSTIN: {bizGstin}</p>}
          {bizAddress && <p className="text-xs text-muted-foreground">{bizAddress}</p>}
          {bizPhone && <p className="text-xs text-muted-foreground">Ph: {bizPhone}</p>}
          {bizEmail && <p className="text-xs text-muted-foreground">{bizEmail}</p>}
        </div>

        {/* Client */}
        <div className="rounded-lg bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prepared For</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{clientName}</p>
          {clientPhone && <p className="text-xs text-muted-foreground">Ph: {clientPhone}</p>}
          {clientEmail && <p className="text-xs text-muted-foreground">{clientEmail}</p>}
          {clientAddress && <p className="text-xs text-muted-foreground">{clientAddress}</p>}
          {(venue || sideOrCategory) && (
            <div className="mt-2 border-t border-border/50 pt-2">
              {venue && <p className="text-xs text-muted-foreground">Venue: {venue}</p>}
              {sideOrCategory && <p className="text-xs text-muted-foreground">Side/Category: {sideOrCategory}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}