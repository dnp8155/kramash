import { cn } from "@/lib/utils";

/**
 * Standard circular icon button used for back (←) and close (✕) actions
 * across the app. Flat — no shadow — with a card-toned border.
 */
export default function RoundIconButton({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}