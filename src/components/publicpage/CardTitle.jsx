import { cn } from "@/lib/utils";

// Card heading of the public page: a small primary-coloured icon beside the title, like the app's own cards.
export default function CardTitle({ icon: Icon, children, className }) {
  return (
    <h2 className={cn("flex items-center gap-2 text-sm font-semibold text-foreground mb-4", className)}>
      {Icon && <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
      <span className="min-w-0 break-words">{children}</span>
    </h2>
  );
}
