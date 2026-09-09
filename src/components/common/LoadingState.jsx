import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoadingState({ label = "Loading…", className }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-16 text-muted-foreground", className)}>
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}