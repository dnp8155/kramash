import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 text-base md:text-xs px-2.5",
  md: "h-9 text-base md:text-sm px-3"
};

const Input = forwardRef(function Input({ className, size = "md", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground transition-all",
        "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 hover:border-border/80",
        sizes[size],
        className
      )}
      {...props}
    />
  );
});

export default Input;