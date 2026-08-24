import { cn } from "@/lib/utils";

export default function PageHeader({ title, children, className }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}