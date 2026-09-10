import { Package } from "lucide-react";

export default function PortalServiceSection({ serviceAssignments, quotationItems }) {
  const hasEventServices = serviceAssignments && serviceAssignments.length > 0;
  const serviceItems = (quotationItems || []).filter((i) => i.item_type === "service");

  if (!hasEventServices && serviceItems.length === 0) return null;

  // Build service name list
  let services = [];
  if (hasEventServices) {
    services = serviceAssignments.map((a) => a.service_name);
  } else {
    services = serviceItems.map((i) => i.name);
  }

  // Deduplicate
  const uniqueServices = [...new Set(services.filter(Boolean))];

  if (uniqueServices.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Services</h3>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {uniqueServices.map((name, idx) => (
          <span
            key={idx}
            className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}