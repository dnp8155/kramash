import { Calendar, MapPin } from "lucide-react";
import { formatDate } from "@/utils/format";

export default function ProjectHeader({ quotation, event, client }) {
  const projectName = event?.title || client?.name || quotation.quotation_number;
  const categoryLabel = quotation.category
    ? quotation.category === "PHOTOGRAPHY_VIDEOGRAPHY"
      ? "Photography / Videography"
      : quotation.category === "EVENT_MANAGEMENT"
        ? "Event Management"
        : quotation.category === "ARCHITECTURE_INTERIOR"
          ? "Architecture / Interior Design"
          : "Other Services"
    : null;
  const subType = quotation.context_side || quotation.property_type || null;
  const eventDate = quotation.project_start_date || event?.start_date || null;
  const venue = event?.venue || client?.venue || null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {projectName}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {categoryLabel && (
          <span className="font-medium text-foreground/80">{categoryLabel}</span>
        )}
        {subType && (
          <>
            <span className="text-border">·</span>
            <span>{subType}</span>
          </>
        )}
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:gap-6">
        {eventDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0 text-primary" />
            <span>{formatDate(eventDate)}</span>
          </div>
        )}
        {venue && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{venue}</span>
          </div>
        )}
      </div>
    </div>
  );
}