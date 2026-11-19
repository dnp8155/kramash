import { HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

// A drive's coloured name tag, the same everywhere it is shown.
export default function DriveChip({ drive, name, className }) {
  const color = drive?.color || "#64748B";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium max-w-full", className)}
      style={{ borderColor: `${color}55`, backgroundColor: `${color}1A`, color }}
    >
      <HardDrive className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate text-foreground">{drive?.name || name || "Unknown drive"}</span>
    </span>
  );
}
