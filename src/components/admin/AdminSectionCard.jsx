import { cn } from "@/lib/utils";

export default function AdminSectionCard({ icon: Icon, title, action, children, className, bodyClassName }) {
  return (
    <div className={cn("bg-card border border-border rounded-xl shadow-card overflow-hidden", className)}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}