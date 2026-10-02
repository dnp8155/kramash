import { Package } from "lucide-react";

// Displays included services from the quotation items.
export default function PortalServiceSection({ services }) {
  if (!services || services.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Services</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {services.map((s, idx) => (
          <div key={idx} className="py-1.5">
            <div className="text-sm font-medium text-foreground">{s.name}</div>
            {s.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}