import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 text-base md:text-xs px-2.5",
  md: "h-9 text-base md:text-sm px-3"
};

export default function Select({ className, size = "md", children, ...props }) {
  return (
    <select
      className={cn(
        "bg-card border border-border rounded-lg text-foreground transition-all",
        "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 hover:border-border/80 cursor-pointer",
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}