import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 text-xs px-2.5",
  md: "h-9 text-sm px-3"
};

export default function Input({ className, size = "md", ...props }) {
  return (
    <input
      className={cn(
        "w-full bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40",
        sizes[size],
        className
      )}
      {...props}
    />
  );
}