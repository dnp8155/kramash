import { cn } from "@/lib/utils";

export default function PageHeader({ title, subtitle, eyebrow, children, className }) {
  return (
    <div className={cn("flex items-end justify-between gap-4 flex-wrap", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80 mb-1.5">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl sm:text-[1.625rem] font-bold text-foreground tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}