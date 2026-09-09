import { cn } from "@/lib/utils";

// Compact [SELF] badge indicating the workspace owner.
// Use next to a team member or service provider name.
export default function SelfBadge({ className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary",
        className
      )}
      title="This is the workspace owner"
    >
      Self
    </span>
  );
}