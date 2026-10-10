import { Gift } from "lucide-react";

// "Includes" card for the client project portal: the deliverables that come with the package (soft copies,
// edited video…), with quantities and an Add-on marker for optional extras. No prices — same as the other
// portal sections.
export default function PortalIncludesCard({ includes }) {
  if (!includes || includes.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Includes</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {includes.map((it, i) => (
          <div key={i} className="py-1.5">
            <div className="text-sm font-medium text-foreground">
              {it.quantity > 1 ? `${it.quantity} × ` : ""}{it.name}
              {it.is_addon && <span className="ml-1.5 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning whitespace-nowrap">Add-on</span>}
            </div>
            {it.description && <div className="text-xs text-muted-foreground mt-0.5">{it.description}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
