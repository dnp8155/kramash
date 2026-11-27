import { Crown } from "lucide-react";

// The small PRO tag (crown + "Pro", amber) shown next to Pro options, in upgrade messages and on "Your Plan" — the same
// tag as Admin → Workspaces, so Pro looks the same everywhere in the app.
export default function ProTag({ children = "Pro", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 align-middle text-[10px] font-semibold uppercase tracking-wide bg-warning/10 text-warning px-1.5 py-0.5 rounded leading-none whitespace-nowrap ${className}`}>
      <Crown className="w-3 h-3 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}
