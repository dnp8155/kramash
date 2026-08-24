import { cn } from "@/lib/utils";

export default function PageHeader({ title, subtitle, children, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 flex-wrap", className)}>
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}